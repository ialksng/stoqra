import Item from '../models/Item.js';
import InventoryTransaction from '../models/InventoryTransaction.js';
import Invoice from '../models/Invoice.js';
import ProcessedMail from '../models/ProcessedMail.js';
import { parseInvoicePDF } from '../services/invoiceParser.js';
import { processRestock, recordSale, InventoryError } from '../services/inventoryService.js';
import { syncGmailInvoices } from '../workers/gmailWatcher.js';

/**
 * Upload and process a PDF invoice manually via multipart/form-data
 * POST /api/invoices/upload
 */
export const uploadInvoice = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded. Please supply a PDF invoice file under the field name "invoice".',
      });
    }

    if (req.file.mimetype !== 'application/pdf') {
      return res.status(400).json({
        success: false,
        error: `Invalid file format: ${req.file.mimetype}. Only application/pdf files are supported.`,
      });
    }

    console.log(`[InventoryController] Parsing uploaded invoice file "${req.file.originalname}" (${req.file.size} bytes)...`);

    // 1. Extract invoice data via Gemini
    const extractedData = await parseInvoicePDF(req.file.buffer);

    // 2. Ingest into inventory via atomic transaction
    const result = await processRestock(extractedData);

    if (result.skipped) {
      return res.status(200).json({
        success: true,
        message: result.reason || `Invoice #${extractedData.invoiceNumber} was already processed previously. Duplicate restock avoided.`,
        data: {
          invoice: result.invoice,
          itemsProcessed: [],
          skipped: true,
        },
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Invoice processed and inventory successfully restocked.',
      data: {
        invoice: result.invoice,
        itemsProcessed: result.itemsProcessed,
        skipped: false,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Record an outbound sale with atomic stock deduction and low-stock checks
 * POST /api/sales/record
 */
export const recordSaleController = async (req, res, next) => {
  try {
    const { sku, quantity, sellingPrice, orderId } = req.body;

    const result = await recordSale({
      sku,
      quantity,
      sellingPrice,
      orderId,
    });

    return res.status(200).json({
      success: true,
      message: `Sale recorded successfully for SKU ${sku}.`,
      data: {
        item: result.item,
        transaction: result.transaction,
      },
    });
  } catch (error) {
    if (error instanceof InventoryError) {
      return res.status(error.statusCode).json({
        success: false,
        error: error.message,
      });
    }
    next(error);
  }
};

/**
 * List inventory items with pagination, search, and low-stock filtering
 * GET /api/inventory/items
 */
export const getItems = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;
    const search = (req.query.search || '').trim();
    const lowStock = req.query.lowStock === 'true';

    const filter = {};

    if (search) {
      const searchRegex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ sku: searchRegex }, { name: searchRegex }];
    }

    if (lowStock) {
      filter.$expr = { $lte: ['$currentStock', '$reorderLevel'] };
    }

    const [total, items] = await Promise.all([
      Item.countDocuments(filter),
      Item.find(filter)
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    return res.status(200).json({
      success: true,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
      items,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * List transactions ledger history with pagination
 * GET /api/inventory/transactions
 */
export const getTransactions = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;
    const { type, itemId } = req.query;

    const filter = {};
    if (type) filter.type = type;
    if (itemId) filter.itemId = itemId;

    const [total, transactions] = await Promise.all([
      InventoryTransaction.countDocuments(filter),
      InventoryTransaction.find(filter)
        .populate('itemId', 'sku name currentStock')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    return res.status(200).json({
      success: true,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
      transactions,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * List processed invoices
 * GET /api/invoices
 */
export const getInvoices = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const [total, invoices] = await Promise.all([
      Invoice.countDocuments(),
      Invoice.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    return res.status(200).json({
      success: true,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
      invoices,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Trigger manual Gmail invoice synchronization worker run
 * POST /api/worker/sync-gmail
 */
export const triggerGmailSync = async (req, res, next) => {
  try {
    console.log('[InventoryController] Manual trigger received for Gmail sync...');
    const result = await syncGmailInvoices();

    return res.status(200).json({
      success: true,
      message: 'Gmail ingestion worker execution finished.',
      result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update an existing inventory item
 * PUT /api/inventory/items/:id
 */
export const updateItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, sku, currentStock, unitCost, sellingPrice, reorderLevel } = req.body;

    const item = await Item.findById(id);
    if (!item) {
      return res.status(404).json({ success: false, error: 'Item not found' });
    }

    // Check SKU collision if modified
    if (sku && sku.toUpperCase() !== item.sku) {
      const existingSku = await Item.findOne({ sku: sku.toUpperCase(), _id: { $ne: id } });
      if (existingSku) {
        return res.status(400).json({
          success: false,
          error: `SKU '${sku.toUpperCase()}' is already in use by another item.`,
        });
      }
      item.sku = sku.toUpperCase();
    }

    if (name) item.name = name.trim();
    if (unitCost !== undefined) item.unitCost = Math.max(0, Number(unitCost));
    if (sellingPrice !== undefined) item.sellingPrice = Math.max(0, Number(sellingPrice));
    if (reorderLevel !== undefined) item.reorderLevel = Math.max(0, Number(reorderLevel));

    // If stock changed manually, log an ADJUSTMENT transaction in the ledger
    if (currentStock !== undefined && Number(currentStock) !== item.currentStock) {
      const delta = Number(currentStock) - item.currentStock;
      item.currentStock = Math.max(0, Number(currentStock));

      await InventoryTransaction.create({
        itemId: item._id,
        type: 'ADJUSTMENT',
        quantityDelta: delta,
        unitPrice: item.unitCost,
        sourceReference: `Manual Adjustment by ${req.user?.name || req.user?.email || 'Admin'}`,
      });
    }

    await item.save();

    return res.status(200).json({
      success: true,
      message: `Item '${item.name}' updated successfully.`,
      item,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete an inventory item by ID
 * DELETE /api/inventory/items/:id
 */
export const deleteItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const item = await Item.findByIdAndDelete(id);

    if (!item) {
      return res.status(404).json({ success: false, error: 'Item not found' });
    }

    return res.status(200).json({
      success: true,
      message: `Item '${item.name}' (${item.sku}) deleted successfully.`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete an invoice record by ID
 * DELETE /api/invoices/:id
 */
export const deleteInvoice = async (req, res, next) => {
  try {
    const { id } = req.params;
    const invoice = await Invoice.findByIdAndDelete(id);

    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }

    // Remove from ProcessedMail cache if it was synced from Gmail
    if (invoice.messageId) {
      await ProcessedMail.deleteOne({ messageId: invoice.messageId });
    }

    return res.status(200).json({
      success: true,
      message: `Invoice #${invoice.invoiceNumber} deleted successfully.`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reset all records (Catalog, Invoices, Transactions, Mail Cache) for testing
 * POST /api/inventory/reset
 */
export const resetDatabase = async (req, res, next) => {
  try {
    await Promise.all([
      Item.deleteMany({}),
      Invoice.deleteMany({}),
      InventoryTransaction.deleteMany({}),
      ProcessedMail.deleteMany({}),
    ]);

    return res.status(200).json({
      success: true,
      message: 'All inventory items, invoices, and transaction ledger records have been reset.',
    });
  } catch (error) {
    next(error);
  }
};

export default {
  uploadInvoice,
  recordSaleController,
  getItems,
  getTransactions,
  getInvoices,
  triggerGmailSync,
  updateItem,
  deleteItem,
  deleteInvoice,
  resetDatabase,
};
