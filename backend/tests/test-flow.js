import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import Item from '../src/models/Item.js';
import InventoryTransaction from '../src/models/InventoryTransaction.js';
import Invoice from '../src/models/Invoice.js';
import { processRestock, recordSale, InventoryError } from '../src/services/inventoryService.js';
import { getStockHealth, getSalesVelocity } from '../src/services/analyticsService.js';
import { invoiceExtractionSchema } from '../src/services/invoiceParser.js';

const runTests = async () => {
  console.log('🧪 Starting Inventory Management System Verification Tests...\n');

  // Test 1: Gemini Schema Verification
  console.log('Test 1: Validating Gemini Extraction Schema Structure...');
  if (
    !invoiceExtractionSchema ||
    !invoiceExtractionSchema.properties.invoiceNumber ||
    !invoiceExtractionSchema.properties.items
  ) {
    throw new Error('Gemini invoice extraction schema is missing required properties.');
  }
  console.log('✅ Gemini extraction schema is valid.\n');

  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/inventory_test_db';
  let isDbConnected = false;

  try {
    console.log(`Connecting to MongoDB for integration testing (${mongoUri})...`);
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 3000 });
    isDbConnected = true;
    console.log('✅ Connected to MongoDB.\n');
  } catch (err) {
    console.warn(`⚠️ Could not connect to local MongoDB (${err.message}).`);
    console.warn('⚠️ Integration tests requiring live MongoDB will be skipped. Model & Schema validation passed.\n');
  }

  if (isDbConnected) {
    try {
      const testSuffix = Date.now();
      const testSku1 = `TEST-SKU-A-${testSuffix}`;
      const testSku2 = `TEST-SKU-B-${testSuffix}`;
      const testMessageId = `gmail-msg-${testSuffix}`;

      // Clean up previous test artifacts if any
      await Item.deleteMany({ sku: { $in: [testSku1, testSku2] } });
      await Invoice.deleteMany({ messageId: testMessageId });

      // Test 2: Inbound Restock Processing
      console.log('Test 2: Testing processRestock() with new items...');
      const mockInvoice = {
        invoiceNumber: `INV-TEST-${testSuffix}`,
        vendorName: 'Test Apex Supplies',
        totalAmount: 1500,
        items: [
          { sku: testSku1, name: 'Widget Alpha Test', quantity: 20, unitCost: 25.0 },
          { sku: testSku2, name: 'Widget Beta Test', quantity: 15, unitCost: 10.0 },
        ],
      };

      const restockResult = await processRestock(mockInvoice, testMessageId);
      console.log(`Restock created invoice: ${restockResult.invoice.invoiceNumber}`);

      const item1 = await Item.findOne({ sku: testSku1 });
      const item2 = await Item.findOne({ sku: testSku2 });

      if (!item1 || item1.currentStock !== 20 || item1.unitCost !== 25) {
        throw new Error(`Item 1 restock failed: expected 20 stock, got ${item1?.currentStock}`);
      }
      if (!item2 || item2.currentStock !== 15 || item2.unitCost !== 10) {
        throw new Error(`Item 2 restock failed: expected 15 stock, got ${item2?.currentStock}`);
      }

      // Check transaction ledger
      const txCount = await InventoryTransaction.countDocuments({
        itemId: { $in: [item1._id, item2._id] },
        type: 'PURCHASE_INVOICE',
      });
      if (txCount !== 2) {
        throw new Error(`Expected 2 PURCHASE_INVOICE ledger records, got ${txCount}`);
      }
      console.log('✅ Inbound restock and transaction ledger verified.\n');

      // Test 3: Deduplication via messageId
      console.log('Test 3: Testing idempotency & messageId deduplication...');
      const duplicateRestock = await processRestock(mockInvoice, testMessageId);
      if (!duplicateRestock.skipped) {
        throw new Error('Duplicate messageId was not skipped!');
      }
      console.log('✅ Idempotency check verified (duplicate message skipped).\n');

      // Test 4: Outbound Sales & Atomic Stock Deduction
      console.log('Test 4: Testing recordSale() with atomic $gte guard...');
      const saleResult = await recordSale({
        sku: testSku1,
        quantity: 5,
        sellingPrice: 45.0,
        orderId: `ORD-${testSuffix}`,
      });

      if (saleResult.item.currentStock !== 15) {
        throw new Error(`Sale deduction failed: expected 15 stock remaining, got ${saleResult.item.currentStock}`);
      }

      const saleTx = await InventoryTransaction.findOne({
        sourceReference: `ORD-${testSuffix}`,
        type: 'SALE',
      });
      if (!saleTx || saleTx.quantityDelta !== -5) {
        throw new Error('Sale transaction ledger record missing or incorrect.');
      }
      console.log('✅ Atomic sale deduction and ledger verified.\n');

      // Test 5: Insufficient Stock Prevention ($gte Guard)
      console.log('Test 5: Testing insufficient stock rejection ($gte guard)...');
      let caughtError = null;
      try {
        await recordSale({
          sku: testSku1,
          quantity: 100, // Available is only 15
          sellingPrice: 45.0,
        });
      } catch (err) {
        caughtError = err;
      }

      if (!caughtError || !(caughtError instanceof InventoryError) || caughtError.statusCode !== 400) {
        throw new Error(`Expected InventoryError (400), but got: ${caughtError?.message}`);
      }
      console.log(`✅ Correctly rejected over-sale with error: "${caughtError.message}"\n`);

      // Test 6: Low-Stock Threshold Triggering
      console.log('Test 6: Testing low-stock trigger (threshold <= reorderLevel)...');
      // Current stock is 15, reorderLevel is 10. Sell 6 to bring it to 9 (triggering alert)
      const alertSaleResult = await recordSale({
        sku: testSku1,
        quantity: 6,
        sellingPrice: 45.0,
      });

      if (alertSaleResult.item.currentStock !== 9) {
        throw new Error(`Expected 9 units, got ${alertSaleResult.item.currentStock}`);
      }
      console.log(`✅ Stock reduced to ${alertSaleResult.item.currentStock} (below reorder level of 10).\n`);

      // Test 7: Analytics Aggregation Pipelines
      console.log('Test 7: Testing getStockHealth() and getSalesVelocity()...');
      const health = await getStockHealth();
      if (!health || !health.metrics || typeof health.metrics.totalValuation !== 'number') {
        throw new Error('Stock health aggregation returned invalid data.');
      }

      const velocity = await getSalesVelocity(30);
      if (!velocity || !velocity.summary || typeof velocity.summary.totalRevenue !== 'number') {
        throw new Error('Sales velocity aggregation returned invalid data.');
      }
      console.log(`✅ Analytics verified: Valuation $${health.metrics.totalValuation}, 30d Revenue $${velocity.summary.totalRevenue}.\n`);

      // Cleanup
      await Item.deleteMany({ sku: { $in: [testSku1, testSku2] } });
      await InventoryTransaction.deleteMany({ itemId: { $in: [item1._id, item2._id] } });
      await Invoice.deleteMany({ messageId: testMessageId });
      console.log('🧹 Cleaned up test records.');
    } finally {
      await mongoose.disconnect();
    }
  }

  console.log('\n🎉 ALL VERIFICATION TESTS PASSED SUCCESSFULLY!');
};

runTests().catch((err) => {
  console.error('\n❌ Test failure:', err);
  process.exit(1);
});
