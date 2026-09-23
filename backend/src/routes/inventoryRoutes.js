import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import {
  uploadInvoice,
  recordSaleController,
  getItems,
  getTransactions,
  getInvoices,
  triggerGmailSync,
  getGmailSyncStatus,
  updateItem,
  deleteItem,
  deleteInvoice,
  resetDatabase,
} from '../controllers/inventoryController.js';
import { requireAuth } from '../middlewares/auth.js';

const router = Router();

// Multer memory storage configuration for PDF buffer processing
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF documents are allowed for invoice upload.'), false);
    }
  },
});

// Zod validation middleware helper
const validateBody = (schema) => (req, res, next) => {
  const parseResult = schema.safeParse(req.body);
  if (!parseResult.success) {
    const formattedErrors = parseResult.error.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      details: formattedErrors,
    });
  }
  req.body = parseResult.data;
  next();
};

// Validation schemas
const recordSaleSchema = z.object({
  sku: z.string({ required_error: 'SKU is required' }).trim().min(1, 'SKU cannot be empty'),
  quantity: z
    .number({ required_error: 'Quantity is required' })
    .int('Quantity must be an integer')
    .positive('Quantity must be greater than 0'),
  sellingPrice: z.number().nonnegative('Selling price cannot be negative').optional(),
  orderId: z.string().trim().optional(),
});

const updateItemSchema = z.object({
  name: z.string().trim().min(1, 'Name cannot be empty').optional(),
  sku: z.string().trim().min(1, 'SKU cannot be empty').optional(),
  currentStock: z.number().int('Stock must be an integer').nonnegative('Stock cannot be negative').optional(),
  unitCost: z.number().nonnegative('Unit cost cannot be negative').optional(),
  sellingPrice: z.number().nonnegative('Selling price cannot be negative').optional(),
  reorderLevel: z.number().int().nonnegative('Reorder level cannot be negative').optional(),
});

/**
 * Routes definitions
 */

// 1. Multipart PDF invoice upload & automated stock ingestion
router.post('/invoices/upload', requireAuth, upload.single('invoice'), uploadInvoice);

// 2. Outbound sale recording with atomic $gte stock guard
router.post('/sales/record', requireAuth, validateBody(recordSaleSchema), recordSaleController);

// 3. Paginated inventory catalog lookup with search & low-stock filter
router.get('/inventory/items', requireAuth, getItems);

// 4. Update an existing catalog item
router.put('/inventory/items/:id', requireAuth, validateBody(updateItemSchema), updateItem);

// 5. Delete an item from the catalog
router.delete('/inventory/items/:id', requireAuth, deleteItem);

// 6. Ledger history of inventory transactions
router.get('/inventory/transactions', requireAuth, getTransactions);

// 7. Ingested invoice records
router.get('/invoices', requireAuth, getInvoices);

// 8. Delete an invoice record
router.delete('/invoices/:id', requireAuth, deleteInvoice);

// 9. Reset / delete all store data (org-scoped)
router.post('/inventory/reset', requireAuth, resetDatabase);

// 10. Manual trigger for Gmail background worker polling
router.post('/worker/sync-gmail', requireAuth, triggerGmailSync);

// 11. Real-time sync progress status
router.get('/worker/sync-status', requireAuth, getGmailSyncStatus);

export default router;
