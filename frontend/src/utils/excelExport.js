import * as XLSX from 'xlsx';
import { formatIndianDate } from './formatters.js';

/**
 * Trigger browser download for a generated XLSX workbook
 * @param {XLSX.WorkBook} workbook
 * @param {string} fileName
 */
const downloadWorkbook = (workbook, fileName) => {
  XLSX.writeFile(workbook, `${fileName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
};

/**
 * Export Inventory Catalog to Excel (.xlsx)
 * @param {Array} items - List of inventory items
 */
export const exportInventoryToExcel = (items = []) => {
  const data = items.map((item, index) => {
    const stock = Number(item.currentStock) || 0;
    const unitCost = Number(item.unitCost) || 0;
    const sellingPrice = Number(item.sellingPrice) || 0;
    const reorderLevel = Number(item.reorderLevel) || 10;
    const totalValue = stock * unitCost;

    let status = 'Healthy';
    if (stock === 0) status = 'Out of Stock';
    else if (stock <= reorderLevel) status = 'Low Stock';

    return {
      'S.No': index + 1,
      'SKU / Part Code': item.sku || 'N/A',
      'Product Name': item.name || 'N/A',
      'Current Stock (Units)': stock,
      'Unit Cost (INR)': unitCost,
      'Selling Price (INR)': sellingPrice,
      'Total Value (INR)': totalValue,
      'Reorder Level': reorderLevel,
      'Stock Health': status,
      'Last Restocked / Updated': item.updatedAt ? formatIndianDate(item.updatedAt) : 'N/A',
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventory_Catalog');

  downloadWorkbook(workbook, 'Stoqra_Inventory_Report');
};

/**
 * Export Sales Velocity to Excel (.xlsx)
 * @param {Array} velocityData - Sales velocity metrics list
 * @param {number} days - Number of days analyzed
 */
export const exportVelocityToExcel = (velocityData = [], days = 30) => {
  const data = velocityData.map((item, index) => {
    const runout = item.estimatedRunoutDays;
    let runoutDisplay = 'Infinite / No Sales';
    if (runout !== null && runout !== undefined) {
      runoutDisplay = runout === 0 ? 'Out of Stock' : `${runout} days`;
    }

    return {
      'S.No': index + 1,
      'SKU': item.sku || 'N/A',
      'Product Name': item.name || 'N/A',
      'Current Stock (Units)': item.currentStock || 0,
      [`Units Sold (${days}d)`]: item.totalSold || 0,
      'Daily Sales Velocity (Units/day)': Number(item.dailyVelocity || 0).toFixed(2),
      'Estimated Days to Run-out': runoutDisplay,
      'Urgency Status': item.status || 'STABLE',
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sales_Velocity');

  downloadWorkbook(workbook, `Stoqra_Sales_Velocity_${days}d`);
};

/**
 * Export Ingested Invoices to Excel (.xlsx)
 * @param {Array} invoices - List of processed invoices
 */
export const exportInvoicesToExcel = (invoices = []) => {
  const data = invoices.map((inv, index) => ({
    'S.No': index + 1,
    'Invoice Number': inv.invoiceNumber || 'N/A',
    'Vendor / Supplier': inv.vendor || 'Unknown',
    'Total Amount (INR)': Number(inv.totalAmount) || 0,
    'Line Items Count': inv.items?.length || 0,
    'Status': inv.status || 'PROCESSED',
    'Date Processed': inv.createdAt ? formatIndianDate(inv.createdAt) : 'N/A',
    'Gmail Message ID': inv.messageId || 'Direct Upload',
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Invoices');

  downloadWorkbook(workbook, 'Stoqra_Invoices_Report');
};

/**
 * Export Audit Ledger Transactions to Excel (.xlsx)
 * @param {Array} transactions - List of inventory transactions
 */
export const exportTransactionsToExcel = (transactions = []) => {
  const data = transactions.map((tx, index) => ({
    'S.No': index + 1,
    'Date & Time': tx.createdAt ? formatIndianDate(tx.createdAt) : 'N/A',
    'Type': tx.type || 'N/A',
    'Product Name': tx.itemId?.name || 'Item Removed',
    'SKU': tx.itemId?.sku || 'N/A',
    'Quantity Change': tx.quantityDelta,
    'Unit Price (INR)': tx.unitPrice !== undefined ? tx.unitPrice : 'N/A',
    'Reference / Order #': tx.sourceReference || 'N/A',
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Audit_Ledger');

  downloadWorkbook(workbook, 'Stoqra_Audit_Ledger_Report');
};

/**
 * Export Complete Multi-Tab Business Excel Workbook
 * @param {Object} allData - { items, velocity, invoices, transactions, days }
 */
export const exportCompleteReportToExcel = ({
  items = [],
  velocity = [],
  invoices = [],
  transactions = [],
  days = 30,
} = {}) => {
  const workbook = XLSX.utils.book_new();

  // 1. Inventory Catalog Sheet
  const invData = items.map((item, index) => ({
    'S.No': index + 1,
    'SKU': item.sku,
    'Product Name': item.name,
    'Current Stock': item.currentStock,
    'Unit Cost (₹)': item.unitCost,
    'Selling Price (₹)': item.sellingPrice,
    'Stock Value (₹)': item.currentStock * item.unitCost,
    'Reorder Level': item.reorderLevel,
    'Status': item.currentStock === 0 ? 'Out of Stock' : item.currentStock <= item.reorderLevel ? 'Low Stock' : 'Healthy',
    'Updated At': item.updatedAt ? formatIndianDate(item.updatedAt) : 'N/A',
  }));
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(invData), 'Inventory_Stock');

  // 2. Sales Velocity Sheet
  const velData = velocity.map((v, index) => ({
    'S.No': index + 1,
    'SKU': v.sku,
    'Product Name': v.name,
    'Current Stock': v.currentStock,
    [`Sold (${days}d)`]: v.totalSold,
    'Velocity (Units/Day)': Number(v.dailyVelocity || 0).toFixed(2),
    'Days to Run-out': v.estimatedRunoutDays !== null ? `${v.estimatedRunoutDays} days` : 'No Sales',
    'Urgency': v.status,
  }));
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(velData), 'Sales_Velocity');

  // 3. Invoices Sheet
  const invSheetData = invoices.map((inv, index) => ({
    'S.No': index + 1,
    'Invoice #': inv.invoiceNumber,
    'Vendor': inv.vendor,
    'Amount (₹)': inv.totalAmount,
    'Items Count': inv.items?.length || 0,
    'Date': inv.createdAt ? formatIndianDate(inv.createdAt) : 'N/A',
    'Reference': inv.messageId || 'Direct Upload',
  }));
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(invSheetData), 'Invoices');

  // 4. Ledger Sheet
  const txData = transactions.map((t, index) => ({
    'S.No': index + 1,
    'Timestamp': t.createdAt ? formatIndianDate(t.createdAt) : 'N/A',
    'Type': t.type,
    'Product': t.itemId?.name || 'N/A',
    'SKU': t.itemId?.sku || 'N/A',
    'Qty Change': t.quantityDelta,
    'Price (₹)': t.unitPrice,
    'Reference': t.sourceReference || 'N/A',
  }));
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(txData), 'Transactions_Ledger');

  downloadWorkbook(workbook, 'Stoqra_Complete_Business_Report');
};

/**
 * Export Comprehensive Multi-Tab Analytics Report to Excel (.xlsx)
 * @param {Object} params
 * @param {Object} params.analytics - Comprehensive analytics object from API
 * @param {number} params.days - Analysis timeframe in days
 */
export const exportComprehensiveAnalyticsToExcel = ({ analytics, days = 30 }) => {
  if (!analytics) return;

  const workbook = XLSX.utils.book_new();
  const kpi = analytics.kpi || {};

  // 1. Executive Summary Sheet
  const summaryData = [
    { Metric: 'Timeframe Analyzed', Value: `${days} Days` },
    { Metric: 'Total Catalog Valuation (₹)', Value: kpi.totalValuation || 0 },
    { Metric: 'Total Inventory Stock Units', Value: kpi.totalStockUnits || 0 },
    { Metric: 'Total Active SKUs Tracked', Value: kpi.totalSkus || 0 },
    { Metric: 'Healthy Stock SKUs', Value: kpi.healthyStockCount || 0 },
    { Metric: 'Low Stock SKUs (Reorder Needed)', Value: kpi.lowStockCount || 0 },
    { Metric: 'Out of Stock SKUs', Value: kpi.outOfStockCount || 0 },
    { Metric: `Period Sales Revenue (₹)`, Value: kpi.periodRevenue || 0 },
    { Metric: `Period Units Sold`, Value: kpi.periodUnitsSold || 0 },
    { Metric: `Period Realized Gross Profit (₹)`, Value: kpi.realizedGrossMargin || 0 },
    { Metric: 'Gross Profit Margin (%)', Value: `${kpi.grossMarginPercent || 0}%` },
    { Metric: `Period Procurement Spend (₹)`, Value: kpi.periodProcurementSpend || 0 },
    { Metric: `Net Operational Cash Flow (₹)`, Value: kpi.netCashFlow || 0 },
    { Metric: 'Completed Sales Orders', Value: kpi.salesCount || 0 },
    { Metric: 'Processed Supplier Invoices', Value: kpi.invoiceCount || 0 },
  ];
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summaryData), 'Executive_Summary');

  // 2. Category Analytics Sheet
  const categoryData = (analytics.categories || []).map((cat, idx) => ({
    'S.No': idx + 1,
    'Category Name': cat.category,
    'SKU Count': cat.skuCount,
    'Stock Units': cat.totalUnits,
    'Inventory Valuation (₹)': cat.totalValuation,
    'Valuation Share (%)': `${cat.percentValuation}%`,
    [`Period Revenue (${days}d ₹)`]: cat.periodRevenue,
    [`Units Sold (${days}d)`]: cat.periodUnitsSold,
  }));
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(categoryData), 'Category_Analytics');

  // 3. Supplier Intelligence Sheet
  const supplierData = (analytics.suppliers || []).map((supp, idx) => ({
    'S.No': idx + 1,
    'Supplier / Vendor': supp.supplier,
    'Total Spend (₹)': supp.totalSpend,
    'Invoices Count': supp.invoiceCount,
    'SKUs Supplied': supp.skuCount,
    'Last Invoice Date': supp.lastInvoiceDate ? formatIndianDate(supp.lastInvoiceDate) : 'N/A',
  }));
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(supplierData), 'Supplier_Intelligence');

  // 4. Selling Orders & Payments Sheet
  const ordersData = (analytics.recentOrders || []).map((ord, idx) => ({
    'S.No': idx + 1,
    'Order Date': ord.date ? formatIndianDate(ord.date) : 'N/A',
    'Order Reference': ord.orderId,
    'SKU': ord.sku,
    'Product Name': ord.productName,
    'Category': ord.category,
    'Quantity Sold': ord.quantity,
    'Unit Price (₹)': ord.unitPrice,
    'Payment Mode': ord.paymentMode,
    'Money Collected (₹)': ord.paymentAmount,
    'Customer Name': ord.customerName || 'Walk-in',
    'Order Notes': ord.notes || '',
    'Has Payment Proof Screenshot': ord.hasScreenshot ? 'YES' : 'NO',
  }));
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(ordersData), 'Selling_Orders');

  // 5. ABC Pareto Classification Sheet
  const abcData = (analytics.abc?.items || []).map((item, idx) => ({
    'Rank': idx + 1,
    'ABC Class': item.abcClass,
    'SKU': item.sku,
    'Product Name': item.name,
    'Category': item.category,
    'Supplier': item.supplier,
    'Current Stock': item.currentStock,
    'Unit Cost (₹)': item.unitCost,
    'Total Valuation (₹)': item.valuation,
    'Cumulative Share (%)': `${item.cumulativePercent}%`,
    'Strategy': item.abcClass === 'A' ? 'Tight Control / Frequent Audit' : item.abcClass === 'B' ? 'Normal Control' : 'Bulk Minimums',
  }));
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(abcData), 'ABC_Pareto');

  // 6. SKU Economics & Profit Margins Sheet
  const marginData = (analytics.margins || []).map((m, idx) => ({
    'S.No': idx + 1,
    'SKU': m.sku,
    'Product Name': m.name,
    'Category': m.category,
    'Unit Cost (₹)': m.unitCost,
    'Selling Price (₹)': m.sellingPrice,
    'Unit Margin (₹)': m.unitMargin,
    'Margin (%)': `${m.marginPercent}%`,
    [`Units Sold (${days}d)`]: m.unitsSoldInPeriod,
    [`Period Revenue (${days}d ₹)`]: m.periodRevenue,
    [`Realized Profit (${days}d ₹)`]: m.realizedProfit,
  }));
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(marginData), 'SKU_Margins');

  // 7. Cash Flow Timeline Sheet
  const timelineData = (analytics.cashFlowTimeline || []).map((t, idx) => ({
    'S.No': idx + 1,
    'Date': t.date,
    'Sales Inflow (₹)': t.inflow,
    'Procurement Outflow (₹)': t.outflow,
    'Net Cash Flow (₹)': t.netFlow,
    'Sales Orders Count': t.salesCount,
    'Invoices Count': t.invoiceCount,
  }));
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(timelineData), 'Cash_Flow_Timeline');

  downloadWorkbook(workbook, `Stoqra_Analytics_Dashboard_${days}d`);
};

