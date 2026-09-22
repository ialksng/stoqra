import http from 'http';
import app from '../src/app.js';

const runProductionServingTest = async () => {
  console.log('🧪 Testing Production Subpath & Static Serving (/projects/stoqra)...\n');

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  try {
    // 1. Test /health
    console.log('Test 1: GET /health');
    const healthRes = await fetch(`${baseUrl}/health`);
    const healthJson = await healthRes.json();
    if (healthRes.status !== 200 || healthJson.status !== 'healthy') {
      throw new Error(`Health check failed: ${JSON.stringify(healthJson)}`);
    }
    console.log('✅ GET /health returned 200 OK\n');

    // 2. Test /projects/stoqra/health
    console.log('Test 2: GET /projects/stoqra/health');
    const subpathHealthRes = await fetch(`${baseUrl}/projects/stoqra/health`);
    const subpathHealthJson = await subpathHealthRes.json();
    if (subpathHealthRes.status !== 200 || subpathHealthJson.subpath !== '/projects/stoqra') {
      throw new Error(`Subpath health check failed: ${JSON.stringify(subpathHealthJson)}`);
    }
    console.log('✅ GET /projects/stoqra/health returned 200 OK\n');

    // 3. Test /projects/stoqra SPA entry
    console.log('Test 3: GET /projects/stoqra (Frontend SPA)');
    const spaRes = await fetch(`${baseUrl}/projects/stoqra`);
    const spaHtml = await spaRes.text();
    if (spaRes.status !== 200 || !spaHtml.includes('/projects/stoqra/assets/')) {
      throw new Error('SPA index.html was not returned or lacked /projects/stoqra assets');
    }
    console.log('✅ GET /projects/stoqra returned index.html with subpath asset references\n');

    // 4. Test client-side fallback route /projects/stoqra/inventory
    console.log('Test 4: GET /projects/stoqra/inventory (SPA Deep link)');
    const deepLinkRes = await fetch(`${baseUrl}/projects/stoqra/inventory`);
    const deepLinkHtml = await deepLinkRes.text();
    if (deepLinkRes.status !== 200 || !deepLinkHtml.includes('<div id="root"></div>')) {
      throw new Error('SPA deep link did not fallback to index.html');
    }
    console.log('✅ GET /projects/stoqra/inventory successfully fell back to index.html\n');

    // 5. Test root fallback
    console.log('Test 5: GET / (Root path)');
    const rootRes = await fetch(`${baseUrl}/`);
    if (rootRes.status !== 200) {
      throw new Error(`Root path returned status ${rootRes.status}`);
    }
    console.log('✅ GET / returned 200 OK\n');

    console.log('🎉 ALL SUBPATH & PRODUCTION SERVING TESTS PASSED!\n');
  } finally {
    server.close();
  }
};

runProductionServingTest().catch((err) => {
  console.error('❌ Serving test failed:', err);
  process.exit(1);
});
