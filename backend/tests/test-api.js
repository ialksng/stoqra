import http from 'http';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

import app from '../src/app.js';
import Item from '../src/models/Item.js';
import InventoryTransaction from '../src/models/InventoryTransaction.js';

const runApiTests = async () => {
  console.log('🧪 Starting Express HTTP API Verification Tests...\n');

  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/inventory_test_db?replicaSet=rs0&directConnection=true';
  let isDbConnected = false;
  try {
    await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 2000 });
    isDbConnected = true;
    console.log('✅ Connected to MongoDB for API tests.\n');
  } catch (err) {
    console.warn(`⚠️ Could not connect to MongoDB for API tests (${err.message}). Testing non-DB endpoints only.\n`);
  }

  // Start temporary server on dynamic port
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;
  console.log(`Server listening on ${baseUrl} for API testing.\n`);

  try {
    // 1. Health check
    console.log('Test 1: GET /health');
    const healthRes = await fetch(`${baseUrl}/health`);
    const healthJson = await healthRes.json();
    if (healthRes.status !== 200 || healthJson.status !== 'healthy') {
      throw new Error(`Health check failed: ${JSON.stringify(healthJson)}`);
    }
    console.log('✅ GET /health returned 200 OK\n');

    // 2. Auth config test
    console.log('Test 2: GET /api/auth/config');
    const authConfigRes = await fetch(`${baseUrl}/api/auth/config`);
    const authConfigJson = await authConfigRes.json();
    if (authConfigRes.status !== 200 || !authConfigJson.success) {
      throw new Error(`Auth config failed: ${JSON.stringify(authConfigJson)}`);
    }
    console.log('✅ GET /api/auth/config returned 200 OK\n');

    if (!isDbConnected) {
      console.log('⚠️ Skipping database API tests since MongoDB is not running locally.');
      console.log('🎉 API Health & Route structure verified!\n');
      return;
    }

    // 3. Demo login to obtain JWT token for protected routes
    console.log('Test 3: POST /api/auth/demo');
    const demoLoginRes = await fetch(`${baseUrl}/api/auth/demo`, { method: 'POST' });
    const demoLoginJson = await demoLoginRes.json();
    if (demoLoginRes.status !== 200 || !demoLoginJson.token) {
      throw new Error(`Demo login failed: ${JSON.stringify(demoLoginJson)}`);
    }
    const authToken = demoLoginJson.token;
    console.log(`✅ Demo login succeeded for user: ${demoLoginJson.user.name}\n`);

    // 4. Seed an item for sales testing
    const testSku = `API-TEST-${Date.now()}`;
    const testItem = await Item.create({
      sku: testSku,
      name: 'API Test Widget',
      currentStock: 50,
      unitCost: 12.0,
      sellingPrice: 25.0,
      reorderLevel: 10,
    });

    // 5. GET /api/inventory/items
    console.log('Test 4: GET /api/inventory/items');
    const itemsRes = await fetch(`${baseUrl}/api/inventory/items?search=${testSku}`);
    const itemsJson = await itemsRes.json();
    if (itemsRes.status !== 200 || !itemsJson.success || itemsJson.items.length === 0) {
      throw new Error(`GET /api/inventory/items failed: ${JSON.stringify(itemsJson)}`);
    }
    console.log(`✅ GET /api/inventory/items returned item ${itemsJson.items[0].sku}\n`);

    // 6. POST /api/sales/record (Unauthorized check)
    console.log('Test 5: POST /api/sales/record - Missing Auth Header Guard (401)');
    const unauthSaleRes = await fetch(`${baseUrl}/api/sales/record`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sku: testSku, quantity: 1 }),
    });
    if (unauthSaleRes.status !== 401) {
      throw new Error(`Expected 401 Unauthorized without token, got: ${unauthSaleRes.status}`);
    }
    console.log('✅ Unauthenticated request correctly rejected with 401.\n');

    // 7. POST /api/sales/record (Zod validation failure with valid auth)
    console.log('Test 6: POST /api/sales/record - Validation failure check');
    const badSaleRes = await fetch(`${baseUrl}/api/sales/record`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ sku: testSku, quantity: -5 }), // Negative quantity should fail Zod
    });
    const badSaleJson = await badSaleRes.json();
    if (badSaleRes.status !== 400 || badSaleJson.error !== 'Validation Error') {
      throw new Error(`Expected Zod validation error, got: ${JSON.stringify(badSaleJson)}`);
    }
    console.log('✅ Zod schema validation correctly caught negative quantity.\n');

    // 8. POST /api/sales/record (Success with valid auth)
    console.log('Test 7: POST /api/sales/record - Valid authenticated sale');
    const goodSaleRes = await fetch(`${baseUrl}/api/sales/record`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        sku: testSku,
        quantity: 5,
        sellingPrice: 25.0,
        orderId: 'ORDER-API-101',
      }),
    });
    const goodSaleJson = await goodSaleRes.json();
    if (goodSaleRes.status !== 200 || goodSaleJson.data.item.currentStock !== 45) {
      throw new Error(`Sale failed: ${JSON.stringify(goodSaleJson)}`);
    }
    console.log(`✅ Sale recorded. Updated stock: ${goodSaleJson.data.item.currentStock}\n`);

    // 6. GET /api/analytics/stock-health
    console.log('Test 5: GET /api/analytics/stock-health');
    const healthReportRes = await fetch(`${baseUrl}/api/analytics/stock-health`);
    const healthReportJson = await healthReportRes.json();
    if (healthReportRes.status !== 200 || !healthReportJson.success) {
      throw new Error(`GET /api/analytics/stock-health failed: ${JSON.stringify(healthReportJson)}`);
    }
    console.log(`✅ Stock health report: totalSkus=${healthReportJson.data.metrics.totalSkus}, valuation=$${healthReportJson.data.metrics.totalValuation}\n`);

    // 7. GET /api/analytics/sales-velocity
    console.log('Test 6: GET /api/analytics/sales-velocity');
    const velocityRes = await fetch(`${baseUrl}/api/analytics/sales-velocity?days=30`);
    const velocityJson = await velocityRes.json();
    if (velocityRes.status !== 200 || !velocityJson.success) {
      throw new Error(`GET /api/analytics/sales-velocity failed: ${JSON.stringify(velocityJson)}`);
    }
    console.log(`✅ Sales velocity report: totalRevenue=$${velocityJson.data.summary.totalRevenue}, items=${velocityJson.data.items.length}\n`);

    // 10. POST /api/worker/sync-gmail (Graceful behavior when credentials are dummy)
    console.log('Test 9: POST /api/worker/sync-gmail');
    const syncRes = await fetch(`${baseUrl}/api/worker/sync-gmail`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });
    const syncJson = await syncRes.json();
    if (syncRes.status !== 200) {
      throw new Error(`POST /api/worker/sync-gmail failed: ${JSON.stringify(syncJson)}`);
    }
    console.log(`✅ Worker trigger response: status=${syncJson.result?.status || 'completed'}\n`);

    // Cleanup
    await Item.deleteOne({ _id: testItem._id });
    await InventoryTransaction.deleteMany({ itemId: testItem._id });
    console.log('🧹 Cleaned up API test records.');

    console.log('\n🎉 ALL API ENDPOINT TESTS PASSED SUCCESSFULLY!');
  } finally {
    server.close();
    await mongoose.disconnect();
  }
};

runApiTests().catch((err) => {
  console.error('\n❌ API Test failure:', err);
  process.exit(1);
});
