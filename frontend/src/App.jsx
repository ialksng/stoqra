import React, { useState, useEffect, useCallback } from 'react';
import { Package, Activity, FileText, History, CheckCircle2, AlertCircle, Loader2, Users, BarChart3, ShieldAlert } from 'lucide-react';
import Navbar from './components/Navbar.jsx';
import MetricCards from './components/MetricCards.jsx';
import InventoryTable from './components/InventoryTable.jsx';
import SalesVelocityView from './components/SalesVelocityView.jsx';
import InvoicesView from './components/InvoicesView.jsx';
import TransactionsView from './components/TransactionsView.jsx';
import TeamView from './components/TeamView.jsx';
import AnalyticsDashboardView from './components/AnalyticsDashboardView.jsx';
import SuperAdminView from './components/SuperAdminView.jsx';
import UploadInvoiceModal from './components/UploadInvoiceModal.jsx';
import RecordSaleModal from './components/RecordSaleModal.jsx';
import EditItemModal from './components/EditItemModal.jsx';
import AddItemModal from './components/AddItemModal.jsx';
import DeleteConfirmModal from './components/DeleteConfirmModal.jsx';
import StoreSetupModal from './components/StoreSetupModal.jsx';
import StoreModal from './components/StoreModal.jsx';
import GmailSyncModal from './components/GmailSyncModal.jsx';
import GmailReviewDrawer from './components/GmailReviewDrawer.jsx';
import LoginView from './components/LoginView.jsx';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import {
  fetchStockHealth,
  fetchSalesVelocity,
  fetchItems,
  fetchTransactions,
  fetchInvoices,
  fetchStagedInvoices,
  deleteItem,
  deleteInvoice,
  resetDatabase,
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
  const [stagedInvoices, setStagedInvoices] = useState([]);
  const [stagedDrawerOpen, setStagedDrawerOpen] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [txTypeFilter, setTxTypeFilter] = useState('');
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  // Modals
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [syncForceRescan, setSyncForceRescan] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [saleModalOpen, setSaleModalOpen] = useState(false);
  const [selectedSaleItem, setSelectedSaleItem] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [itemToEdit, setItemToEdit] = useState(null);
  const [addItemModalOpen, setAddItemModalOpen] = useState(false);
  const [storeModalOpen, setStoreModalOpen] = useState(false);
  const [storeModalInitialTab, setStoreModalInitialTab] = useState('manage');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfig, setDeleteConfig] = useState({
    title: '',
    message: '',
    itemLabel: '',
    onConfirm: () => {},
  });

  const handleOpenEditItem = (item) => {
    setItemToEdit(item);
    setEditModalOpen(true);
  };

  const handleOpenDeleteItem = (item) => {
    setDeleteConfig({
      title: 'Delete Inventory Item',
      message: 'Are you sure you want to permanently delete this product from the inventory catalog?',
      itemLabel: `${item.name} [SKU: ${item.sku}]`,
      onConfirm: async () => {
        await deleteItem(item._id);
        addToast(`Item "${item.name}" deleted successfully.`, 'success');
        refreshAllData();
      },
    });
    setDeleteModalOpen(true);
  };

  const handleOpenDeleteInvoice = (inv) => {
    setDeleteConfig({
      title: 'Delete Ingested Invoice',
      message: 'Are you sure you want to delete this invoice record from the register?',
      itemLabel: `Invoice #${inv.invoiceNumber} — ${inv.vendor}`,
      onConfirm: async () => {
        await deleteInvoice(inv._id);
        addToast(`Invoice #${inv.invoiceNumber} deleted.`, 'success');
        refreshAllData();
      },
    });
    setDeleteModalOpen(true);
  };

  // Toast notifications
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // PWA Install Prompt Listener
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      addToast('Stoqra app installed to your home screen!', 'success');
    }
    setDeferredPrompt(null);
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

  // Fetch Staged Invoices waiting for review
  const loadStaged = useCallback(async () => {
    try {
      const res = await fetchStagedInvoices();
      setStagedInvoices(res.staged || []);
    } catch (err) {
      console.error('Failed to load staged invoices:', err);
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
    loadStaged();
    if (activeTab === 'velocity') loadSalesVelocity();
    if (activeTab === 'invoices') loadInvoices();
    if (activeTab === 'ledger') loadTransactions();
  };

  useEffect(() => {
    loadStockHealth();
    loadStaged();
  }, [loadStockHealth, loadStaged]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  useEffect(() => {
    if (activeTab === 'velocity') loadSalesVelocity();
    if (activeTab === 'invoices') loadInvoices();
    if (activeTab === 'ledger') loadTransactions();
  }, [activeTab, loadSalesVelocity, loadInvoices, loadTransactions]);

  useEffect(() => {
    if (user?.organizationId) {
      refreshAllData();
    }
  }, [user?.organizationId]);

  const handleOpenSaleModal = (item = null) => {
    setSelectedSaleItem(item);
    setSaleModalOpen(true);
  };

  return (
    <div className="app-container">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        onNavigateTab={setActiveTab}
        onOpenUpload={() => setUploadModalOpen(true)}
        onOpenSale={handleOpenSaleModal}
        onOpenAddItem={() => setAddItemModalOpen(true)}
        onOpenStoreModal={(tab = 'manage') => {
          setStoreModalInitialTab(tab);
          setStoreModalOpen(true);
        }}
        onInstall={deferredPrompt ? handleInstallClick : null}
        onOpenSyncModal={(force = false) => {
          setSyncForceRescan(force);
          setSyncModalOpen(true);
        }}
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

        {/* Pending Ingestion Review Banner */}
        {stagedInvoices.length > 0 && (
          <div
            style={{
              backgroundColor: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: '10px',
              padding: '12px 18px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              boxShadow: '0 2px 4px rgba(245, 158, 11, 0.08)',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: '#fef3c7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#d97706',
                  fontWeight: 700,
                  fontSize: '14px',
                }}
              >
                {stagedInvoices.length}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '14px', color: '#92400e' }}>
                  {stagedInvoices.length} New Inbound Bill{stagedInvoices.length !== 1 ? 's' : ''} Ready for Review
                </div>
                <div style={{ fontSize: '12px', color: '#b45309' }}>
                  AI parsed items from your Gmail sync. Verify and select retail products before committing them to your store shelf.
                </div>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setStagedDrawerOpen(true)}
              style={{
                backgroundColor: '#d97706',
                borderColor: '#b45309',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontWeight: 600,
              }}
            >
              Review Inbound Stock ({stagedInvoices.length})
            </button>
          </div>
        )}

        {/* View Tabs */}
        <nav className="tabs">
          <button
            className={`tab ${activeTab === 'inventory' ? 'active' : ''}`}
            onClick={() => setActiveTab('inventory')}
          >
            <Package size={16} />
            Products & Stock
          </button>
          <button
            className={`tab ${activeTab === 'invoices' ? 'active' : ''}`}
            onClick={() => setActiveTab('invoices')}
          >
            <FileText size={16} />
            Bills & Purchases
          </button>
          <button
            className={`tab ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
          >
            <BarChart3 size={16} />
            Store Analytics
          </button>
          <button
            className={`tab ${activeTab === 'velocity' ? 'active' : ''}`}
            onClick={() => setActiveTab('velocity')}
          >
            <Activity size={16} />
            Sales & Run-out
          </button>
          <button
            className={`tab ${activeTab === 'ledger' ? 'active' : ''}`}
            onClick={() => setActiveTab('ledger')}
          >
            <History size={16} />
            Stock History
          </button>
          {user?.role === 'admin' && (
            <button
              className={`tab ${activeTab === 'team' ? 'active' : ''}`}
              onClick={() => setActiveTab('team')}
            >
              <Users size={16} />
              Team
            </button>
          )}
          {(user?.isSuperAdmin || user?.email?.toLowerCase() === 'ialksng@gmail.com') && (
            <button
              className={`tab ${activeTab === 'superadmin' ? 'active' : ''}`}
              onClick={() => setActiveTab('superadmin')}
              style={{
                color: activeTab === 'superadmin' ? '#ea580c' : '#c2410c',
                borderBottomColor: activeTab === 'superadmin' ? '#ea580c' : 'transparent',
                backgroundColor: activeTab === 'superadmin' ? '#fff7ed' : 'transparent',
                borderRadius: '6px 6px 0 0',
              }}
            >
              <ShieldAlert size={16} />
              Platform Admin
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
            onOpenAddItem={() => setAddItemModalOpen(true)}
            onOpenSaleModal={handleOpenSaleModal}
            onEditItem={handleOpenEditItem}
            onDeleteItem={handleOpenDeleteItem}
            onRefresh={loadItems}
          />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsDashboardView />
        )}

        {activeTab === 'superadmin' && (
          <SuperAdminView onToast={addToast} />
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
          <InvoicesView
            invoices={invoices}
            loading={loadingInvoices}
            onDeleteInvoice={handleOpenDeleteInvoice}
          />
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

      <EditItemModal
        isOpen={editModalOpen}
        item={itemToEdit}
        onClose={() => {
          setEditModalOpen(false);
          setItemToEdit(null);
        }}
        onSuccess={(msg) => {
          addToast(msg, 'success');
          refreshAllData();
        }}
      />

      <AddItemModal
        isOpen={addItemModalOpen}
        onClose={() => setAddItemModalOpen(false)}
        onSuccess={(msg) => {
          addToast(msg, 'success');
          refreshAllData();
        }}
      />

      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        title={deleteConfig.title}
        message={deleteConfig.message}
        itemLabel={deleteConfig.itemLabel}
        onConfirm={deleteConfig.onConfirm}
        onClose={() => setDeleteModalOpen(false)}
      />

      {/* Multi-Store & Organization Switcher Modal */}
      <StoreModal
        isOpen={storeModalOpen}
        initialTab={storeModalInitialTab}
        onClose={() => setStoreModalOpen(false)}
        onStoreChanged={(newStore) => {
          if (newStore) {
            addToast(`Active store set to "${newStore.name}"`, 'success');
          } else {
            addToast('Store updated', 'info');
          }
          refreshAllData();
        }}
      />

      {/* Live Gmail Sync Progress Modal */}
      <GmailSyncModal
        isOpen={syncModalOpen}
        onClose={() => {
          setSyncModalOpen(false);
          refreshAllData();
        }}
        forceRescan={syncForceRescan}
        onSyncFinished={() => {
          refreshAllData();
        }}
      />

      {/* Gmail Ingestion Review Pipeline Drawer */}
      <GmailReviewDrawer
        isOpen={stagedDrawerOpen}
        onClose={() => setStagedDrawerOpen(false)}
        stagedInvoices={stagedInvoices}
        onActionSuccess={(msg) => {
          addToast(msg, 'success');
          refreshAllData();
          loadStaged();
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
  const { isAuthenticated, loading, isOnboarded, user, completeOrgSetup } = useAuth();

  if (loading) {
    return (
      <div className="app-loading-screen">
        <div className="app-loading-card" style={{ textAlign: 'center' }}>
          <img
            src="/projects/stoqra/stoqra-logo.png"
            alt="Stoqra"
            style={{ height: '48px', objectFit: 'contain', margin: '0 auto 16px auto', display: 'block' }}
          />
          <Loader2 size={24} className="animate-spin text-primary" style={{ margin: '0 auto 8px auto' }} />
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Verifying secure session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginView />;
  }

  // Show store setup modal for new users who haven't set up their store yet
  if (!isOnboarded) {
    return (
      <>
        <StoreSetupModal user={user} onSetupComplete={completeOrgSetup} />
        {/* Blurred placeholder dashboard in background */}
        <div style={{ filter: 'blur(4px)', pointerEvents: 'none', opacity: 0.3 }}>
          <Dashboard />
        </div>
      </>
    );
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
