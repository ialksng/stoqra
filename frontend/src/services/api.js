/**
 * API Service for communicating with the backend inventory endpoints.
 * Dynamically resolves the API path based on Vite's base URL (e.g., /projects/stoqra/api).
 * Automatically injects the JWT authentication Bearer token from localStorage.
 */

const BASE_URL = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
const API_PREFIX = `${BASE_URL}/api`;

const TOKEN_KEY = 'stoqra_token';

export const getStoredToken = () => {
  return localStorage.getItem(TOKEN_KEY);
};

export const setStoredToken = (token) => {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
};

const getAuthHeaders = () => {
  const token = getStoredToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const handleResponse = async (response) => {
  const contentType = response.headers.get('content-type') || '';
  let data = null;

  if (contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  } else {
    try {
      const text = await response.text();
      data = JSON.parse(text);
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    let errorMsg = data?.error || data?.message;
    if (!errorMsg) {
      if (response.status === 502) {
        errorMsg = 'Server is currently restarting or deploying a new update. Please wait 15 seconds and retry.';
      } else if (response.status === 504) {
        errorMsg = 'Request timed out. Please try again.';
      } else if (response.status === 413) {
        errorMsg = 'File too large. Maximum PDF size is 15MB.';
      } else if (response.status === 401) {
        errorMsg = 'Your session has expired. Please sign in again.';
      } else {
        errorMsg = `Server error (${response.status} ${response.statusText})`;
      }
    }
    const error = new Error(errorMsg);
    error.status = response.status;
    error.details = data?.details;
    throw error;
  }

  return data || {};
};

/* ---------------- AUTHENTICATION APIS ---------------- */

export const getAuthConfig = async () => {
  const res = await fetch(`${API_PREFIX}/auth/config`);
  return handleResponse(res);
};

export const loginWithGoogle = async (credential) => {
  const res = await fetch(`${API_PREFIX}/auth/google`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ credential }),
  });
  return handleResponse(res);
};

export const demoLogin = async () => {
  const res = await fetch(`${API_PREFIX}/auth/demo`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  return handleResponse(res);
};

export const fetchCurrentUser = async () => {
  const res = await fetch(`${API_PREFIX}/auth/me`, {
    headers: {
      ...getAuthHeaders(),
    },
  });
  return handleResponse(res);
};

export const fetchUsers = async () => {
  const res = await fetch(`${API_PREFIX}/auth/users`, {
    headers: {
      ...getAuthHeaders(),
    },
  });
  return handleResponse(res);
};

export const updateUserRole = async (id, role) => {
  const res = await fetch(`${API_PREFIX}/auth/users/${id}/role`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ role }),
  });
  return handleResponse(res);
};

/* ---------------- INVENTORY & ANALYTICS APIS ---------------- */

export const fetchStockHealth = async () => {
  const res = await fetch(`${API_PREFIX}/analytics/stock-health`, {
    headers: {
      ...getAuthHeaders(),
    },
  });
  return handleResponse(res);
};

export const fetchSalesVelocity = async (days = 30) => {
  const res = await fetch(`${API_PREFIX}/analytics/sales-velocity?days=${days}`, {
    headers: {
      ...getAuthHeaders(),
    },
  });
  return handleResponse(res);
};

export const fetchAnalyticsDashboard = async (days = 30) => {
  const res = await fetch(`${API_PREFIX}/analytics/dashboard?days=${days}`, {
    headers: {
      ...getAuthHeaders(),
    },
  });
  return handleResponse(res);
};

export const fetchItems = async ({
  page = 1,
  limit = 20,
  search = '',
  lowStock = false,
  category = '',
  supplier = '',
} = {}) => {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (search) params.append('search', search);
  if (lowStock) params.append('lowStock', 'true');
  if (category) params.append('category', category);
  if (supplier) params.append('supplier', supplier);

  const res = await fetch(`${API_PREFIX}/inventory/items?${params.toString()}`, {
    headers: {
      ...getAuthHeaders(),
    },
  });
  return handleResponse(res);
};

export const createItem = async (itemData) => {
  const res = await fetch(`${API_PREFIX}/inventory/items`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(itemData),
  });
  return handleResponse(res);
};

export const updateItem = async (id, itemData) => {
  const res = await fetch(`${API_PREFIX}/inventory/items/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(itemData),
  });
  return handleResponse(res);
};

export const deleteItem = async (id) => {
  const res = await fetch(`${API_PREFIX}/inventory/items/${id}`, {
    method: 'DELETE',
    headers: {
      ...getAuthHeaders(),
    },
  });
  return handleResponse(res);
};

export const recordSale = async ({
  sku,
  quantity,
  sellingPrice,
  orderId,
  paymentMode,
  paymentAmount,
  paymentScreenshot,
  customerName,
  notes,
}) => {
  const res = await fetch(`${API_PREFIX}/sales/record`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({
      sku,
      quantity: Number(quantity),
      sellingPrice: sellingPrice !== undefined && sellingPrice !== '' ? Number(sellingPrice) : undefined,
      orderId: orderId || undefined,
      paymentMode: paymentMode || 'CASH',
      paymentAmount: paymentAmount !== undefined && paymentAmount !== '' ? Number(paymentAmount) : undefined,
      paymentScreenshot: paymentScreenshot || undefined,
      customerName: customerName || undefined,
      notes: notes || undefined,
    }),
  });
  return handleResponse(res);
};

export const posCheckout = async ({
  items,
  paymentMethod = 'UPI',
  paymentSplits = [],
  customerNote = '',
}) => {
  const res = await fetch(`${API_PREFIX}/sales/pos`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({
      items,
      paymentMethod,
      paymentSplits,
      customerNote,
    }),
  });
  return handleResponse(res);
};

export const fetchStagedInvoices = async () => {
  const res = await fetch(`${API_PREFIX}/staged`, {
    headers: {
      ...getAuthHeaders(),
    },
  });
  return handleResponse(res);
};

export const approveStagedInvoice = async (id, approvedItems = null) => {
  const res = await fetch(`${API_PREFIX}/staged/${id}/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ approvedItems }),
  });
  return handleResponse(res);
};

export const rejectStagedInvoice = async (id) => {
  const res = await fetch(`${API_PREFIX}/staged/${id}`, {
    method: 'DELETE',
    headers: {
      ...getAuthHeaders(),
    },
  });
  return handleResponse(res);
};

export const uploadInvoice = async (file) => {
  const formData = new FormData();
  formData.append('invoice', file);

  const res = await fetch(`${API_PREFIX}/invoices/upload`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
    },
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

  const res = await fetch(`${API_PREFIX}/inventory/transactions?${params.toString()}`, {
    headers: {
      ...getAuthHeaders(),
    },
  });
  return handleResponse(res);
};

export const fetchInvoices = async ({ page = 1, limit = 20 } = {}) => {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  const res = await fetch(`${API_PREFIX}/invoices?${params.toString()}`, {
    headers: {
      ...getAuthHeaders(),
    },
  });
  return handleResponse(res);
};

export const deleteInvoice = async (id) => {
  const res = await fetch(`${API_PREFIX}/invoices/${id}`, {
    method: 'DELETE',
    headers: {
      ...getAuthHeaders(),
    },
  });
  return handleResponse(res);
};

export const resetDatabase = async () => {
  const res = await fetch(`${API_PREFIX}/inventory/reset`, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
    },
  });
  return handleResponse(res);
};

export const triggerGmailSync = async (options = {}) => {
  const res = await fetch(`${API_PREFIX}/worker/sync-gmail`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(options),
  });
  return handleResponse(res);
};

export const getGmailSyncStatus = async () => {
  const res = await fetch(`${API_PREFIX}/worker/sync-status`, {
    headers: {
      ...getAuthHeaders(),
    },
  });
  return handleResponse(res);
};

// ─── Organization API ─────────────────────────────────────────────────────────

export const getStoreTypes = async () => {
  const res = await fetch(`${API_PREFIX}/org/types`, {
    headers: { ...getAuthHeaders() },
  });
  return handleResponse(res);
};

export const setupOrganization = async ({ name, type }) => {
  const res = await fetch(`${API_PREFIX}/org/setup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ name, type }),
  });
  return handleResponse(res);
};

export const getMyOrganization = async () => {
  const res = await fetch(`${API_PREFIX}/org/me`, {
    headers: { ...getAuthHeaders() },
  });
  return handleResponse(res);
};

export const listMyOrganizations = async () => {
  const res = await fetch(`${API_PREFIX}/org/list`, {
    headers: { ...getAuthHeaders() },
  });
  return handleResponse(res);
};

export const createOrganization = async ({ name, type }) => {
  const res = await fetch(`${API_PREFIX}/org/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ name, type }),
  });
  return handleResponse(res);
};

export const switchOrganization = async (id) => {
  const res = await fetch(`${API_PREFIX}/org/switch/${id}`, {
    method: 'POST',
    headers: { ...getAuthHeaders() },
  });
  return handleResponse(res);
};

export const deleteOrganization = async (id) => {
  const res = await fetch(`${API_PREFIX}/org/${id}`, {
    method: 'DELETE',
    headers: { ...getAuthHeaders() },
  });
  return handleResponse(res);
};

// ─── Admin User Management ────────────────────────────────────────────────────

export const deleteUser = async (id) => {
  const res = await fetch(`${API_PREFIX}/auth/users/${id}`, {
    method: 'DELETE',
    headers: { ...getAuthHeaders() },
  });
  return handleResponse(res);
};

export default {
  getStoredToken,
  setStoredToken,
  getAuthConfig,
  loginWithGoogle,
  demoLogin,
  fetchCurrentUser,
  fetchStockHealth,
  fetchSalesVelocity,
  fetchItems,
  recordSale,
  uploadInvoice,
  fetchTransactions,
  fetchInvoices,
  triggerGmailSync,
  fetchUsers,
  updateUserRole,
  deleteUser,
  getStoreTypes,
  setupOrganization,
  getMyOrganization,
};
