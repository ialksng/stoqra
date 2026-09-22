# 📦 Stoqra Automated Inventory Management System

A full-stack, production-ready, automated Inventory Management System featuring a **Vite + React Dashboard**, **Node.js Express Backend (ES Modules)**, **MongoDB & Mongoose (Atomic Transactions & Append-Only Ledger)**, **Google Gemini 2.5 Flash Document Intelligence**, **Autonomous Gmail Ingestion Worker**, and **Nodemailer Alerting**.

---

## 🌟 System Architecture

```text
                                  +-----------------------------+
                                  |   Incoming Email Invoices   |
                                  |    (Gmail API + OAuth2)     |
                                  +--------------+--------------+
                                                 |
                                     (Cron: */15 * * * *)
                                                 v
+-----------------------------+   +-----------------------------+
|   Vite + React Dashboard    |   |   invoiceParser.js          |
|  (Frontend on Port 5173)    |   |   (@google/genai Gemini)    |
|   - Drag & Drop PDF Upload  |-->+--------------+--------------+
|   - Point-of-Sale Sale Modal|                  | (Structured JSON Extraction)
|   - Stock Health & Velocity |                  v
+--------------+--------------+   +-----------------------------+
               |                  |   inventoryService.js       |
               +----------------->|   (MongoDB Atomic Sessions) |
                                  +--------------+--------------+
                                                 |
                   +-----------------------------+-----------------------------+
                   |                             |                             |
                   v                             v                             v
        +--------------------+         +--------------------+        +--------------------+
        |   Item Collection  |         |InventoryTransaction|        | Invoice Collection |
        | ($inc/$gte atomic) |         | (Immutable Ledger) |        | (messageId dedup)  |
        +----------+---------+         +--------------------+        +--------------------+
                   |
                   | (Stock <= ReorderLevel via setImmediate)
                   v
        +--------------------+
        |  alertService.js   |
        | (Nodemailer HTML)  |
        +--------------------+
```

---

## 📁 Project Directory Structure

```text
stoqra/
├── backend/                            # Node.js + Express + MongoDB Service
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js                   # Mongoose connection & session management
│   │   │   ├── gemini.js               # @google/genai client initialization
│   │   │   └── googleAuth.js           # Google OAuth2 & Gmail API v1 client
│   │   ├── models/
│   │   │   ├── Item.js                 # Catalog & stock levels (SKU, currentStock)
│   │   │   ├── InventoryTransaction.js # Append-only audit ledger (PURCHASE_INVOICE, SALE)
│   │   │   └── Invoice.js              # Invoices register & messageId dedup
│   │   ├── services/
│   │   │   ├── invoiceParser.js        # Gemini PDF multimodal structured extraction
│   │   │   ├── inventoryService.js     # Atomic restock ($inc/$set) & sales ($gte guard)
│   │   │   ├── alertService.js         # Nodemailer HTML low-stock notifications
│   │   │   └── analyticsService.js     # Valuation, burn rate, and run-out projections
│   │   ├── workers/
│   │   │   └── gmailWatcher.js         # Scheduled node-cron (*/15 * * * *) Gmail poller
│   │   ├── controllers/
│   │   │   ├── inventoryController.js  # Uploads, sales, catalog, and worker triggers
│   │   │   └── analyticsController.js  # Stock health & sales velocity endpoints
│   │   ├── routes/
│   │   │   ├── inventoryRoutes.js      # Express router with Multer & Zod validation
│   │   │   └── analyticsRoutes.js      # Express router for analytics pipelines
│   │   ├── app.js                     # Express app setup (CORS, Helmet, Error handler)
│   │   └── server.js                  # Entry point, worker startup, graceful shutdown
│   ├── tests/
│   │   ├── test-flow.js               # Integration flow test suite
│   │   └── test-api.js                # Express API endpoint test suite
│   ├── .env.example                   # Backend configuration template
│   └── package.json                   # Backend dependencies & scripts
├── frontend/                           # React + Vite Interactive Dashboard
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx              # Header with Gmail sync trigger & quick actions
│   │   │   ├── MetricCards.jsx         # KPI summary cards & reorder deficit banner
│   │   │   ├── InventoryTable.jsx      # Catalog table with search & low-stock filter
│   │   │   ├── SalesVelocityView.jsx   # Burn rate, revenue, & run-out projections
│   │   │   ├── InvoicesView.jsx        # History of parsed invoices & line items
│   │   │   ├── TransactionsView.jsx    # Audit ledger history
│   │   │   ├── UploadInvoiceModal.jsx  # PDF upload modal with Gemini extraction feedback
│   │   │   └── RecordSaleModal.jsx     # POS outbound sale modal with atomic guard feedback
│   │   ├── services/
│   │   │   └── api.js                  # Centralized fetch API client with error handling
│   │   ├── App.jsx                     # Layout, navigation tabs, and global state
│   │   ├── index.css                   # Modern design system & responsive styling
│   │   └── main.jsx                    # React entry point
│   ├── index.html                      # HTML template
│   ├── vite.config.js                  # Vite config with backend proxy (/api -> :5000)
│   └── package.json                    # Frontend dependencies & scripts
├── .env.example                        # Root environment reference
├── package.json                        # Root monorepo orchestration scripts
└── README.md                           # Documentation
```

---

## ⚡ Quick Start

### 1. Install Dependencies for Both Tiers
From the project root:
```bash
npm run install:all
```

### 2. Configure Backend Environment Variables
Copy `backend/.env.example` to `backend/.env`:
```bash
cp backend/.env.example backend/.env
```
Fill in your configuration:
```env
PORT=5000
NODE_ENV=development

# MongoDB Connection (Replica Set required for transactions)
MONGODB_URI=mongodb://localhost:27017/inventory_db?replicaSet=rs0
# Or MongoDB Atlas:
# MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/inventory_db?retryWrites=true&w=majority

# Google Gemini Document Intelligence API
GEMINI_API_KEY=AIzaSy...
GEMINI_MODEL=gemini-2.5-flash

# Google OAuth2 Credentials for Gmail Ingestion
GMAIL_CLIENT_ID=your-client-id.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=GOCSPX-...
GMAIL_REFRESH_TOKEN=1//04...
GMAIL_REDIRECT_URI=https://developers.google.com/oauthplayground

# Low-Stock Alerting via Nodemailer
ALERT_SENDER_EMAIL=alerts@yourcompany.com
ALERT_APP_PASSWORD=your_gmail_app_password
ADMIN_ALERT_EMAIL=admin_inventory@yourcompany.com
```

### 3. Run the Full Application (Backend + Frontend in Development)
Run both tiers concurrently with a single command:
```bash
npm run dev
```
- **Frontend Dashboard:** [http://localhost:5173/projects/stoqra/](http://localhost:5173/projects/stoqra/)
- **Backend API:** [http://localhost:5000/api](http://localhost:5000/api)
- **Health Check:** [http://localhost:5000/health](http://localhost:5000/health)

---

## 🚀 Deploying to Render (`ialksng.me/projects/stoqra`)

The repository includes full production configuration to run both the Node.js API backend and the compiled React dashboard on a single Render Web Service hosted under the subpath `https://ialksng.me/projects/stoqra`.

### Option A: 1-Click Render Blueprint Deployment
1. Push your repository to GitHub / GitLab.
2. In the [Render Dashboard](https://dashboard.render.com/), click **New > Blueprint**.
3. Select this repository. Render will automatically read [`render.yaml`](file:///c:/stoqra/render.yaml) and configure the web service.
4. Fill in the secret environment variables in the Render dashboard:
   - `MONGODB_URI`: Your MongoDB Atlas connection URI with replica set.
   - `GEMINI_API_KEY`: Your Google AI Studio API key.
   - `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN` (optional for email ingestion).
   - `ALERT_SENDER_EMAIL`, `ALERT_APP_PASSWORD`, `ADMIN_ALERT_EMAIL` (for low-stock alerts).

### Option B: Manual Web Service Setup on Render
1. In Render, click **New > Web Service**.
2. Select your repository and set the following settings:
   - **Name:** `stoqra-inventory-system`
   - **Environment:** `Node`
   - **Branch:** `main`
   - **Build Command:** `npm run build`
   - **Start Command:** `npm start`
   - **Health Check Path:** `/health` (or `/projects/stoqra/health`)
3. Add the environment variables listed in `.env.example`.

### Subpath Reverse Proxying (`ialksng.me/projects/stoqra`)
The application is pre-configured with:
- **Vite Base Path:** Pre-compiled with `base: '/projects/stoqra/'` so all bundle scripts and styles resolve to `/projects/stoqra/assets/...`.
- **Dual Express Routes:** Express mounts routes on both `/projects/stoqra/api` and `/api` (and SPA fallback on `/projects/stoqra` and `/`).

If your domain `ialksng.me` uses an **Nginx** reverse proxy:
```nginx
location /projects/stoqra {
    proxy_pass https://your-render-service.onrender.com;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

If using **Cloudflare** Transform Rules or a Worker:
Simply proxy requests matching `ialksng.me/projects/stoqra*` to your Render service origin hostname. Both the frontend and API will function seamlessly out-of-the-box!

---

## 🖥️ Frontend Dashboard Features

1. **Executive KPI Cards**:
   - Total inventory valuation ($) calculated live via aggregation pipeline.
   - Total active SKUs and physical stock units on hand.
   - Low stock and out-of-stock indicator cards with click-to-filter capability.
   - Reorder alert banner highlighting specific items and deficit units.
2. **Product Catalog & Stock Management**:
   - Debounced instant search by SKU or item name.
   - One-click "Low Stock Only" filter.
   - Paginated display with direct "Record Sale" action per row.
3. **Sales Velocity & Inventory Projections**:
   - Period revenue, units sold, and average daily burn rate across configurable timeframes (7, 14, 30, 60 days).
   - Itemized burn rates and projected `daysOfInventoryRemaining` with estimated stockout dates.
4. **Interactive Inbound & Outbound Modals**:
   - **Upload Invoice PDF Modal**: Drag & drop or pick an invoice PDF. Gemini extracts line items with progress feedback and automatically updates stock and ledger.
   - **Record Outbound Sale Modal**: Record sales with atomic stock deduction and instant validation feedback.
5. **One-Click Gmail Sync**:
   - Header button to trigger the Gmail poller immediately and view ingestion feedback in toast notifications.
6. **Audit Logs & Registers**:
   - Dedicated views for ingested invoices and the append-only ledger transaction history.

---

## ⚙️ Available npm Scripts

### Root Monorepo Commands
| Command | Description |
|---|---|
| `npm run dev` | Runs both backend and frontend concurrently with color-coded logs. |
| `npm run dev:backend` | Starts the Express backend in development mode with nodemon. |
| `npm run dev:frontend` | Starts the Vite React frontend development server. |
| `npm start` | Starts the backend server in production mode. |
| `npm run build:frontend` | Compiles the production frontend bundle into `frontend/dist/`. |
| `npm test` | Runs the full backend test suite (`test:flow` and `test:api`). |
| `npm run install:all` | Installs dependencies for both `backend` and `frontend`. |

---

## 📡 REST API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/invoices/upload` | Multipart PDF upload. Extracts line items via Gemini and restocks atomically. |
| `POST` | `/api/sales/record` | Body: `{ sku, quantity, sellingPrice, orderId }`. Atomic stock deduction with `$gte` guard. |
| `GET` | `/api/inventory/items` | Query params: `page`, `limit`, `search`, `lowStock`. Paginated catalog items. |
| `GET` | `/api/inventory/transactions` | Query params: `page`, `limit`, `type`. Append-only ledger transactions. |
| `GET` | `/api/invoices` | Paginated history of ingested invoices. |
| `GET` | `/api/analytics/stock-health` | Total inventory valuation, out-of-stock items, and reorder alerts. |
| `GET` | `/api/analytics/sales-velocity` | Query param: `days` (default: 30). Daily burn rate and days of remaining inventory. |
| `POST` | `/api/worker/sync-gmail` | Triggers immediate polling of Gmail for unread invoice PDFs. |
| `GET` | `/health` | System health and uptime diagnostics. |

---

## 🧪 Testing

Run the automated test suite from the root:
```bash
npm test
```
The test suite validates:
- Gemini structured JSON extraction schema.
- Inbound restock atomic upserts and `PURCHASE_INVOICE` ledger records.
- Duplicate invoice deduplication via `messageId`.
- Atomic sales deductions with `$gte` negative inventory prevention.
- Insufficient stock 400 error rejections.
- Non-blocking low-stock alert email triggering.
- Valuation and sales velocity MongoDB aggregation pipelines.
- Express API HTTP routes and Zod validation middleware.
