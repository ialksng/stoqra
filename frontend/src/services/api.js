/**
 * API Service for communicating with the backend inventory endpoints.
 * Dynamically resolves the API path based on Vite's base URL (e.g., /projects/stoqra/api).
 */

const BASE_URL = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
const API_PREFIX = `${BASE_URL}/api`;

const handleResponse = async (response) => {
  const json = await response.json();
  if (!response.ok) {
    const errorMsg = json.error || json.message || 'Request failed';
    const error = new Error(errorMsg);
    error.status = response.status;
    error.details = json.details;
    throw error;
  }
  return json;
};

export const fetchStockHealth = async () => {
  const res = await fetch(`${API_PREFIX}/analytics/stock-health`);
  return handleResponse(res);
};

export const fetchSalesVelocity = async (days = 30) => {
  const res = await fetch(`${API_PREFIX}/analytics/sales-velocity?days=${days}`);
  return handleResponse(res);
};

export const fetchItems = async ({ page = 1, limit = 20, search = '', lowStock = false } = {}) => {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (search) params.append('search', search);
  if (lowStock) params.append('lowStock', 'true');

  const res = await fetch(`${API_PREFIX}/inventory/items?${params.toString()}`);
  return handleResponse(res);
};

export const recordSale = async ({ sku, quantity, sellingPrice, orderId }) => {
  const res = await fetch(`${API_PREFIX}/sales/record`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sku,
      quantity: Number(quantity),
      sellingPrice: sellingPrice ? Number(sellingPrice) : undefined,
      orderId: orderId || undefined,
    }),
  });
  return handleResponse(res);
};

export const uploadInvoice = async (file) => {
  const formData = new FormData();
  formData.append('invoice', file);

  const res = await fetch(`${API_PREFIX}/invoices/upload`, {
    method: 'POST',
    body: formData,
  });
  return handleResponse(res);
};

export const fetchTransactions = async ({ page = 1, limit = 20, type = '' } = {}) => {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (type) params.append('type', type);

  const res = await fetch(`${API_PREFIX}/inventory/transactions?${params.toString()}`);
  return handleResponse(res);
};

export const fetchInvoices = async ({ page = 1, limit = 20 } = {}) => {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  const res = await fetch(`${API_PREFIX}/invoices?${params.toString()}`);
  return handleResponse(res);
};

export const triggerGmailSync = async () => {
  const res = await fetch(`${API_PREFIX}/worker/sync-gmail`, {
    method: 'POST',
  });
  return handleResponse(res);
};

export default {
  fetchStockHealth,
  fetchSalesVelocity,
  fetchItems,
  recordSale,
  uploadInvoice,
  fetchTransactions,
  fetchInvoices,
  triggerGmailSync,
};
