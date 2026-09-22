import mongoose from 'mongoose';
import Item from '../models/Item.js';
import InventoryTransaction from '../models/InventoryTransaction.js';
import Invoice from '../models/Invoice.js';
import { dispatchLowStockAlert } from './alertService.js';

/**
 * Helper to escape special regex characters for safe case-insensitive matching
 */
const escapeRegex = (string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * Custom error class for inventory domain validation (400 Bad Request)
 */
export class InventoryError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = 'InventoryError';
    this.statusCode = statusCode;
  }
}

/**
 * Runs a task inside a MongoDB atomic transaction session.
 * Gracefully handles standalone MongoDB fallback if replica set is not initialized.
 * @param {Function} workFn - (session: ClientSession | null) => Promise<any>
 * @returns {Promise<any>}
 */
export const runInTransaction = async (workFn) => {
  const session = await mongoose.startSession();
  try {
    let result;
    try {
      await session.withTransaction(async () => {
        result = await workFn(session);
      });
    } catch (error) {
      // If standalone MongoDB does not support replica set transactions
      if (
        error.message &&
        (error.message.includes('replica set') ||
          error.message.includes('Transaction numbers are only allowed'))
      ) {
        console.warn(
          '[InventoryService] Standalone MongoDB detected (no replica set). Falling back to direct atomic operations.'
        );
        result = await workFn(null);
      } else {
        throw error;
      }
    }
    return result;
  } finally {
    await session.endSession();
  }
};

/**
 * Process inbound restock from parsed invoice data
 * @param {Object} invoiceData - Parsed invoice object
 * @param {string} [messageId] - Optional Gmail message ID for deduplication
 * @returns {Promise<{ invoice: Object, itemsProcessed: Array }>}
 */
export const processRestock = async (invoiceData, messageId = null) => {
  if (!invoiceData || !invoiceData.invoiceNumber) {
    throw new InventoryError('Invalid invoice data: missing invoiceNumber', 400);
  }

  return await runInTransaction(async (session) => {
    const sessionOption = session ? { session } : {};

    // 1. Deduplication check if messageId is supplied
    if (messageId) {
      const existingInvoice = await Invoice.findOne({ messageId }).setOptions(sessionOption);
      if (existingInvoice) {
        console.log(`[InventoryService] Invoice with messageId ${messageId} already processed. Skipping.`);
        return {
          invoice: existingInvoice,
          skipped: true,
          reason: 'Duplicate messageId',
        };
      }
    }

    // 2. Persist Invoice document
    const invoiceDoc = new Invoice({
      messageId: messageId || null,
      invoiceNumber: invoiceData.invoiceNumber,
      vendor: invoiceData.vendorName || invoiceData.vendor || 'Unknown Vendor',
      totalAmount: Number(invoiceData.totalAmount) || 0,
      status: 'PROCESSED',
      items: invoiceData.items || [],
    });

    await invoiceDoc.save(sessionOption);

    const processedItems = [];

    // 3. Process each line item atomically
    for (const lineItem of invoiceData.items || []) {
      const sku = (lineItem.sku || '').trim().toUpperCase();
      const name = (lineItem.name || '').trim();
      const quantity = Math.max(0, Number(lineItem.quantity) || 0);
      const unitCost = Math.max(0, Number(lineItem.unitCost) || 0);

      if (quantity === 0) continue;

      // Match atomically by SKU or case-insensitive name
      const query = {
        $or: [
          ...(sku ? [{ sku }] : []),
          { name: { $regex: new RegExp(`^${escapeRegex(name)}$`, 'i') } },
        ],
      };

      let item = await Item.findOne(query).setOptions(sessionOption);

      if (item) {
        // Increment stock and update latest unit cost
        item.currentStock += quantity;
        item.unitCost = unitCost;
        if (!item.sku && sku) item.sku = sku;
        await item.save(sessionOption);
      } else {
        // Upsert new item
        const fallbackSku = sku || `SKU-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const [newItem] = await Item.create(
          [
            {
              sku: fallbackSku,
              name: name || fallbackSku,
              currentStock: quantity,
              unitCost,
              sellingPrice: unitCost * 1.5, // sensible default markup
              reorderLevel: 10,
            },
          ],
          sessionOption
        );
        item = newItem;
      }

      // 4. Create corresponding InventoryTransaction record (PURCHASE_INVOICE)
      const [tx] = await InventoryTransaction.create(
        [
          {
            itemId: item._id,
            type: 'PURCHASE_INVOICE',
            quantityDelta: quantity,
            unitPrice: unitCost,
            sourceReference: invoiceDoc.invoiceNumber || invoiceDoc._id.toString(),
          },
        ],
        sessionOption
      );

      processedItems.push({
        item,
        transaction: tx,
      });
    }

    return {
      invoice: invoiceDoc,
      itemsProcessed: processedItems,
    };
  });
};

/**
 * Record an outbound sale with atomic $gte guard and low-stock check
 * @param {Object} params
 * @param {string} params.sku - Item SKU
 * @param {number} params.quantity - Quantity sold
 * @param {number} [params.sellingPrice] - Sale price per unit
 * @param {string} [params.orderId] - Reference order identifier
 * @returns {Promise<{ success: boolean, item: Object, transaction: Object }>}
 */
export const recordSale = async ({ sku, quantity, sellingPrice, orderId }) => {
  const normalizedSku = (sku || '').trim().toUpperCase();
  const qty = Number(quantity);

  if (!normalizedSku) {
    throw new InventoryError('SKU is required', 400);
  }

  if (isNaN(qty) || qty <= 0) {
    throw new InventoryError('Sale quantity must be a positive integer greater than 0', 400);
  }

  let updatedItem = null;
  let transactionRecord = null;

  await runInTransaction(async (session) => {
    const sessionOption = session ? { session } : {};

    // 1. Atomic deduction with $gte guard to ensure stock never drops below 0
    updatedItem = await Item.findOneAndUpdate(
      {
        sku: normalizedSku,
        currentStock: { $gte: qty },
      },
      {
        $inc: { currentStock: -qty },
      },
      {
        ...sessionOption,
        new: true,
      }
    );

    // 2. If update returned null, diagnose whether item does not exist or has insufficient stock
    if (!updatedItem) {
      const existingItem = await Item.findOne({ sku: normalizedSku }).setOptions(sessionOption);

      if (!existingItem) {
        throw new InventoryError(`Item with SKU '${normalizedSku}' not found.`, 400);
      }

      throw new InventoryError(
        `Insufficient stock for SKU '${normalizedSku}'. Available: ${existingItem.currentStock}, Requested: ${qty}.`,
        400
      );
    }

    const finalUnitPrice = sellingPrice !== undefined && sellingPrice !== null
      ? Number(sellingPrice)
      : updatedItem.sellingPrice;

    // 3. Append to immutable InventoryTransaction ledger
    const [tx] = await InventoryTransaction.create(
      [
        {
          itemId: updatedItem._id,
          type: 'SALE',
          quantityDelta: -qty,
          unitPrice: finalUnitPrice,
          sourceReference: orderId || `ORDER-${Date.now()}`,
        },
      ],
      sessionOption
    );

    transactionRecord = tx;
  });

  // 4. Check low stock threshold non-blockingly via setImmediate
  if (updatedItem && updatedItem.currentStock <= updatedItem.reorderLevel) {
    setImmediate(() => {
      dispatchLowStockAlert(updatedItem).catch((err) => {
        console.error(`[InventoryService] Error dispatching alert for SKU ${updatedItem.sku}:`, err.message);
      });
    });
  }

  return {
    success: true,
    item: updatedItem,
    transaction: transactionRecord,
  };
};

export default {
  runInTransaction,
  processRestock,
  recordSale,
  InventoryError,
};
