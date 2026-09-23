import Item from '../models/Item.js';
import InventoryTransaction from '../models/InventoryTransaction.js';
import Invoice from '../models/Invoice.js';
import ProcessedMail from '../models/ProcessedMail.js';
import { parseInvoicePDF } from '../services/invoiceParser.js';
import { processRestock, recordSale, InventoryError } from '../services/inventoryService.js';
import { syncGmailInvoices, getSyncProgress } from '../workers/gmailWatcher.js';

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

    const organizationId = req.user?.organizationId;
    console.log(`[InventoryController] Parsing uploaded invoice file "${req.file.originalname}" (${req.file.size} bytes) for org ${organizationId}...`);

    const extractedData = await parseInvoicePDF(req.file.buffer);
    const result = await processRestock(extractedData, null, organizationId);

    if (result.skipped) {
      return res.status(200).json({
        success: true,
        message: result.reason || `Invoice #${extractedData.invoiceNumber} was already processed previously.`,
        data: { invoice: result.invoice, itemsProcessed: [], skipped: true },
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Invoice processed and inventory successfully restocked.',
      data: { invoice: result.invoice, itemsProcessed: result.itemsProcessed, skipped: false },
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
    const {
      sku,
      quantity,
      sellingPrice,
      orderId,
      paymentMode,
      paymentAmount,
      paymentScreenshot,
      customerName,
      notes,
    } = req.body;

    const organizationId = req.user?.organizationId;

    const result = await recordSale({
      sku,
      quantity,
      sellingPrice,
      orderId,
      paymentMode,
      paymentAmount,
      paymentScreenshot,
      customerName,
      notes,
      organizationId,
    });

    return res.status(200).json({
      success: true,
      message: `Sale recorded successfully for SKU ${sku}.`,
      data: { item: result.item, transaction: result.transaction },
    });
  } catch (error) {
    if (error instanceof InventoryError) {
      return res.status(error.statusCode).json({ success: false, error: error.message });
    }
    next(error);
  }
};

/**
 * List inventory items with pagination, search, category, supplier, and low-stock filtering
 * GET /api/inventory/items
 */
export const getItems = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;
    const search = (req.query.search || '').trim();
    const lowStock = req.query.lowStock === 'true';
    const category = (req.query.category || '').trim();
    const supplier = (req.query.supplier || '').trim();

    const organizationId = req.user?.organizationId;
    const filter = organizationId ? { organizationId } : {};

    if (search) {
      const searchRegex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ sku: searchRegex }, { name: searchRegex }, { category: searchRegex }, { supplier: searchRegex }];
    }

    if (category) filter.category = category;
    if (supplier) filter.supplier = supplier;
    if (lowStock) filter.$expr = { $lte: ['$currentStock', '$reorderLevel'] };

    const [total, items] = await Promise.all([
      Item.countDocuments(filter),
      Item.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean(),
    ]);

    return res.status(200).json({
      success: true,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 },
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

    const organizationId = req.user?.organizationId;
    const filter = organizationId ? { organizationId } : {};
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
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 },
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

    const organizationId = req.user?.organizationId;
    const filter = organizationId ? { organizationId } : {};

    const [total, invoices] = await Promise.all([
      Invoice.countDocuments(filter),
      Invoice.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    ]);

    return res.status(200).json({
      success: true,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) || 1 },
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
    const forceRescan = req.body?.forceRescan === true || req.query?.force === 'true';
    const organizationId = req.user?.organizationId;
    console.log(`[InventoryController] Manual trigger received for Gmail sync (forceRescan=${forceRescan}, org=${organizationId})...`);

    // Launch sync process (runs asynchronously if already running or starts new cycle)
    const resultPromise = syncGmailInvoices({ forceRescan, organizationId });

    // If caller requests instant background execution
    if (req.query?.async === 'true') {
      return res.status(200).json({
        success: true,
        message: 'Gmail ingestion worker started in background.',
        progress: getSyncProgress(),
      });
    }

    const result = await resultPromise;

    return res.status(200).json({
      success: true,
      message: 'Gmail ingestion worker execution finished.',
      result,
      progress: getSyncProgress(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get real-time Gmail sync progress status
 * GET /api/worker/sync-status
 */
export const getGmailSyncStatus = async (req, res, next) => {
  try {
    const progress = getSyncProgress();
    return res.status(200).json({
      success: true,
      progress,
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
    const { name, sku, currentStock, unitCost, sellingPrice, reorderLevel, category, supplier } = req.body;

    const organizationId = req.user?.organizationId;
    const item = await Item.findOne({ _id: id, ...(organizationId && { organizationId }) });
    if (!item) {
      return res.status(404).json({ success: false, error: 'Item not found' });
    }

    // Check SKU collision if modified (within same org)
    if (sku && sku.toUpperCase() !== item.sku) {
      const existingSku = await Item.findOne({
        sku: sku.toUpperCase(),
        _id: { $ne: id },
        ...(organizationId && { organizationId }),
      });
      if (existingSku) {
        return res.status(400).json({
          success: false,
          error: `SKU '${sku.toUpperCase()}' is already in use by another item.`,
        });
      }
      item.sku = sku.toUpperCase();
    }

    if (name) item.name = name.trim();
    if (category) item.category = category.trim();
    if (supplier) item.supplier = supplier.trim();
    if (unitCost !== undefined) item.unitCost = Math.max(0, Number(unitCost));
    if (sellingPrice !== undefined) item.sellingPrice = Math.max(0, Number(sellingPrice));
    if (reorderLevel !== undefined) item.reorderLevel = Math.max(0, Number(reorderLevel));

    if (currentStock !== undefined && Number(currentStock) !== item.currentStock) {
      const delta = Number(currentStock) - item.currentStock;
      item.currentStock = Math.max(0, Number(currentStock));

      await InventoryTransaction.create({
        itemId: item._id,
        organizationId: item.organizationId,
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
    const organizationId = req.user?.organizationId;
    const item = await Item.findOneAndDelete({ _id: id, ...(organizationId && { organizationId }) });

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
    const organizationId = req.user?.organizationId;
    const invoice = await Invoice.findOneAndDelete({ _id: id, ...(organizationId && { organizationId }) });

    if (!invoice) {
      return res.status(404).json({ success: false, error: 'Invoice not found' });
    }

    if (invoice.messageId) {
      await ProcessedMail.deleteOne({ messageId: invoice.messageId, ...(organizationId && { organizationId }) });
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
 * Reset all records for the current organization only
 * POST /api/inventory/reset
 */
export const resetDatabase = async (req, res, next) => {
  try {
    const organizationId = req.user?.organizationId;
    const filter = organizationId ? { organizationId } : {};

    await Promise.all([
      Item.deleteMany(filter),
      Invoice.deleteMany(filter),
      InventoryTransaction.deleteMany(filter),
      ProcessedMail.deleteMany(filter),
    ]);

    return res.status(200).json({
      success: true,
      message: 'All inventory items, invoices, and transaction ledger records for your store have been reset.',
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
