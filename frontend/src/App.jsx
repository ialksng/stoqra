import React, { useState, useEffect, useCallback } from 'react';
import { Package, Activity, FileText, History, CheckCircle2, AlertCircle, Loader2, Users } from 'lucide-react';
import Navbar from './components/Navbar.jsx';
import MetricCards from './components/MetricCards.jsx';
import InventoryTable from './components/InventoryTable.jsx';
import SalesVelocityView from './components/SalesVelocityView.jsx';
import InvoicesView from './components/InvoicesView.jsx';
import TransactionsView from './components/TransactionsView.jsx';
import TeamView from './components/TeamView.jsx';
import UploadInvoiceModal from './components/UploadInvoiceModal.jsx';
import RecordSaleModal from './components/RecordSaleModal.jsx';
import LoginView from './components/LoginView.jsx';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import {
  fetchStockHealth,
  fetchSalesVelocity,
  fetchItems,
  fetchTransactions,
  fetchInvoices,
} from './services/api.js';
import { exportCompleteReportToExcel } from './utils/excelExport.js';

function Dashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory' | 'velocity' | 'invoices' | 'ledger' | 'team'

  // Analytics & Health state
  const [healthData, setHealthData] = useState(null);
  const [velocityData, setVelocityData] = useState(null);
  const [velocityDays, setVelocityDays] = useState(30);

  // Inventory Table state
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [search, setSearch] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [loadingItems, setLoadingItems] = useState(false);

  // Invoices & Transactions state
  const [invoices, setInvoices] = useState([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [txTypeFilter, setTxTypeFilter] = useState('');
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  // Modals
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [saleModalOpen, setSaleModalOpen] = useState(false);
  const [selectedSaleItem, setSelectedSaleItem] = useState(null);

  // Toast notifications
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // Fetch Stock Health
  const loadStockHealth = useCallback(async () => {
    try {
      const res = await fetchStockHealth();
      setHealthData(res.data);
    } catch (err) {
      console.error('Failed to load stock health:', err);
    }
  }, []);

  // Fetch Sales Velocity
  const loadSalesVelocity = useCallback(async () => {
    try {
      const res = await fetchSalesVelocity(velocityDays);
      setVelocityData(res.data);
    } catch (err) {
      console.error('Failed to load sales velocity:', err);
    }
  }, [velocityDays]);

  // Fetch Inventory Items
  const loadItems = useCallback(async () => {
    setLoadingItems(true);
    try {
      const res = await fetchItems({
        page,
        limit: 15,
        search,
        lowStock: lowStockOnly,
      });
      setItems(res.items);
      setPagination(res.pagination);
    } catch (err) {
      console.error('Failed to load items:', err);
      addToast(`Error loading items: ${err.message}`, 'error');
    } finally {
      setLoadingItems(false);
    }
  }, [page, search, lowStockOnly]);

  // Fetch Invoices
  const loadInvoices = useCallback(async () => {
    setLoadingInvoices(true);
    try {
      const res = await fetchInvoices({ page: 1, limit: 30 });
      setInvoices(res.invoices);
    } catch (err) {
      console.error('Failed to load invoices:', err);
    } finally {
      setLoadingInvoices(false);
    }
  }, []);

  // Fetch Transactions
  const loadTransactions = useCallback(async () => {
    setLoadingTransactions(true);
    try {
      const res = await fetchTransactions({ page: 1, limit: 30, type: txTypeFilter });
      setTransactions(res.transactions);
    } catch (err) {
      console.error('Failed to load transactions:', err);
    } finally {
      setLoadingTransactions(false);
    }
  }, [txTypeFilter]);

  // Refresh all state after actions
  const refreshAllData = () => {
    loadStockHealth();
    loadItems();
    if (activeTab === 'velocity') loadSalesVelocity();
    if (activeTab === 'invoices') loadInvoices();
    if (activeTab === 'ledger') loadTransactions();
  };

  useEffect(() => {
    loadStockHealth();
  }, [loadStockHealth]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  useEffect(() => {
    if (activeTab === 'velocity') loadSalesVelocity();
    if (activeTab === 'invoices') loadInvoices();
    if (activeTab === 'ledger') loadTransactions();
  }, [activeTab, loadSalesVelocity, loadInvoices, loadTransactions]);

  const handleOpenSaleModal = (item = null) => {
    setSelectedSaleItem(item);
    setSaleModalOpen(true);
  };

  return (
    <div className="app-container">
      {/* Top Navbar */}
      <Navbar
        onOpenUpload={() => setUploadModalOpen(true)}
        onOpenSale={handleOpenSaleModal}
        onExportReport={() => {
          if (items.length === 0 && invoices.length === 0 && transactions.length === 0) {
            addToast('No data available to export yet. Restock items first.', 'info');
            return;
          }
          exportCompleteReportToExcel({
            items,
            velocity: velocityData?.items || [],
            invoices,
            transactions,
            days: velocityDays,
          });
          addToast('Complete business report downloaded as Excel (.xlsx)!', 'success');
        }}
        onSyncComplete={(msg, type) => {
          addToast(msg, type);
          refreshAllData();
        }}
      />

      {/* Main Workspace */}
      <main className="main-content">
        {/* Top KPI Metrics Cards */}
        <MetricCards
          healthData={healthData}
          onFilterLowStock={() => {
            setActiveTab('inventory');
            setLowStockOnly(true);
          }}
        />

        {/* View Tabs */}
        <nav className="tabs">
          <button
            className={`tab ${activeTab === 'inventory' ? 'active' : ''}`}
            onClick={() => setActiveTab('inventory')}
          >
            <Package size={16} />
            Inventory Catalog
          </button>
          <button
            className={`tab ${activeTab === 'velocity' ? 'active' : ''}`}
            onClick={() => setActiveTab('velocity')}
          >
            <Activity size={16} />
            Sales Velocity & Run-out
          </button>
          <button
            className={`tab ${activeTab === 'invoices' ? 'active' : ''}`}
            onClick={() => setActiveTab('invoices')}
          >
            <FileText size={16} />
            Ingested Invoices
          </button>
          <button
            className={`tab ${activeTab === 'ledger' ? 'active' : ''}`}
            onClick={() => setActiveTab('ledger')}
          >
            <History size={16} />
            Audit Ledger
          </button>
          {user?.role === 'admin' && (
            <button
              className={`tab ${activeTab === 'team' ? 'active' : ''}`}
              onClick={() => setActiveTab('team')}
            >
              <Users size={16} />
              Team Admins
            </button>
          )}
        </nav>

        {/* Tab Views */}
        {activeTab === 'inventory' && (
          <InventoryTable
            items={items}
            pagination={pagination}
            loading={loadingItems}
            search={search}
            setSearch={setSearch}
            lowStockOnly={lowStockOnly}
            setLowStockOnly={setLowStockOnly}
            page={page}
            setPage={setPage}
            onOpenSaleModal={handleOpenSaleModal}
            onRefresh={loadItems}
          />
        )}

        {activeTab === 'velocity' && (
          <SalesVelocityView
            velocityData={velocityData}
            days={velocityDays}
            setDays={setVelocityDays}
            loading={false}
            onRefresh={loadSalesVelocity}
          />
        )}

        {activeTab === 'invoices' && (
          <InvoicesView invoices={invoices} loading={loadingInvoices} />
        )}

        {activeTab === 'ledger' && (
          <TransactionsView
            transactions={transactions}
            loading={loadingTransactions}
            typeFilter={txTypeFilter}
            setTypeFilter={setTxTypeFilter}
          />
        )}

        {activeTab === 'team' && (
          <TeamView onToast={addToast} />
        )}
      </main>

      {/* Modals */}
      <UploadInvoiceModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onSuccess={(msg) => {
          addToast(msg, 'success');
          refreshAllData();
        }}
      />

      <RecordSaleModal
        isOpen={saleModalOpen}
        selectedItem={selectedSaleItem}
        onClose={() => {
          setSaleModalOpen(false);
          setSelectedSaleItem(null);
        }}
        onSuccess={(msg) => {
          addToast(msg, 'success');
          refreshAllData();
        }}
      />

      {/* Toast Notification Container */}
      <div className="toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast ${toast.type}`}>
            {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AppShell() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="app-loading-screen">
        <div className="app-loading-card">
          <Loader2 size={36} className="animate-spin text-primary" />
          <h2>Stoqra</h2>
          <p>Verifying secure session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginView />;
  }

  return <Dashboard />;
}

export function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}

export default App;
