import React, { useState, useEffect } from 'react';
import {
  Store,
  Plus,
  Trash2,
  Check,
  Building2,
  AlertTriangle,
  X,
  ArrowRight,
  RefreshCw,
  Package,
  Receipt,
} from 'lucide-react';
import {
  listMyOrganizations,
  createOrganization,
  switchOrganization,
  deleteOrganization,
  getStoreTypes,
} from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';

const DEFAULT_STORE_TYPES = [
  'Medical & Pharmacy',
  'Electronics',
  'FMCG & Grocery',
  'Clothing & Apparel',
  'Restaurant & Food',
  'Hardware & Tools',
  'General Retail',
  'Stationery & Office',
  'Automotive Parts',
  'Cosmetics & Beauty',
  'Agriculture & Seeds',
  'Furniture & Home',
  'Sports & Fitness',
  'Books & Education',
  'Other',
];

export const StoreModal = ({ isOpen, onClose, initialTab = 'manage', onStoreChanged }) => {
  const { user, switchActiveOrg, completeOrgSetup } = useAuth();

  const [activeTab, setActiveTab] = useState(initialTab); // 'manage' | 'add'
  const [stores, setStores] = useState([]);
  const [storeTypes, setStoreTypes] = useState(DEFAULT_STORE_TYPES);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Add store form state
  const [newStoreName, setNewStoreName] = useState('');
  const [newStoreType, setNewStoreType] = useState('General Retail');
  const [creating, setCreating] = useState(false);

  // Delete confirmation state
  const [storeToDelete, setStoreToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setError('');
      setSuccessMsg('');
      setStoreToDelete(null);
      fetchStores();
      fetchTypes();
    }
  }, [isOpen, initialTab]);

  const fetchStores = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await listMyOrganizations();
      if (res.success && Array.isArray(res.stores)) {
        setStores(res.stores);
      }
    } catch (err) {
      setError(err.message || 'Could not load stores.');
    } finally {
      setLoading(false);
    }
  };

  const fetchTypes = async () => {
    try {
      const res = await getStoreTypes();
      if (res.success && Array.isArray(res.types)) {
        setStoreTypes(res.types);
      }
    } catch {
      // Keep default store types
    }
  };

  const handleCreateStore = async (e) => {
    e.preventDefault();
    if (!newStoreName.trim()) {
      setError('Please enter a store name.');
      return;
    }

    setCreating(true);
    setError('');
    try {
      const res = await createOrganization({
        name: newStoreName.trim(),
        type: newStoreType,
      });

      if (res.success) {
        setSuccessMsg(`Store "${res.organization?.name || newStoreName}" created successfully!`);
        setNewStoreName('');
        switchActiveOrg(res);
        if (onStoreChanged) onStoreChanged(res.organization);
        await fetchStores();
        setTimeout(() => {
          setActiveTab('manage');
          setSuccessMsg('');
        }, 1200);
      }
    } catch (err) {
      setError(err.message || 'Failed to create store.');
    } finally {
      setCreating(false);
    }
  };

  const handleSwitchStore = async (store) => {
    if (store.isActive) return;

    setLoading(true);
    setError('');
    try {
      const res = await switchOrganization(store.id || store._id);
      if (res.success) {
        switchActiveOrg(res);
        if (onStoreChanged) onStoreChanged(res.organization);
        await fetchStores();
        onClose();
      }
    } catch (err) {
      setError(err.message || 'Failed to switch store.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStore = async () => {
    if (!storeToDelete) return;

    setDeleting(true);
    setError('');
    try {
      const res = await deleteOrganization(storeToDelete.id || storeToDelete._id);
      if (res.success) {
        setStoreToDelete(null);
        if (res.token && res.user) {
          switchActiveOrg(res);
        }
        if (onStoreChanged) onStoreChanged(res.activeOrganization);
        await fetchStores();
      }
    } catch (err) {
      setError(err.message || 'Failed to delete store.');
    } finally {
      setDeleting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '580px', width: '100%', padding: '0', overflow: 'hidden' }}>
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#f8fafc',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: '#eff6ff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2563eb',
              }}
            >
              <Store size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-main)', margin: 0 }}>
                My Stores & Organizations
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                Manage multiple branches, stores, or retail locations
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn btn-secondary"
            style={{ padding: '6px', borderRadius: '50%', minWidth: 'auto', border: 'none' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab switcher */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--border)',
            padding: '0 24px',
            backgroundColor: '#ffffff',
            gap: '8px',
          }}
        >
          <button
            type="button"
            onClick={() => {
              setActiveTab('manage');
              setError('');
            }}
            style={{
              padding: '12px 16px',
              border: 'none',
              background: 'none',
              fontSize: '14px',
              fontWeight: '600',
              color: activeTab === 'manage' ? '#2563eb' : 'var(--text-secondary)',
              borderBottom: activeTab === 'manage' ? '2px solid #2563eb' : '2px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Building2 size={16} />
            All Stores ({stores.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('add');
              setError('');
            }}
            style={{
              padding: '12px 16px',
              border: 'none',
              background: 'none',
              fontSize: '14px',
              fontWeight: '600',
              color: activeTab === 'add' ? '#2563eb' : 'var(--text-secondary)',
              borderBottom: activeTab === 'add' ? '2px solid #2563eb' : '2px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Plus size={16} />
            + Add New Store
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '20px 24px', maxHeight: '65vh', overflowY: 'auto' }}>
          {error && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                backgroundColor: '#fee2e2',
                color: '#dc2626',
                fontSize: '13px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <AlertTriangle size={16} />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                backgroundColor: '#dcfce7',
                color: '#16a34a',
                fontSize: '13px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <Check size={16} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Delete Confirmation Warning */}
          {storeToDelete && (
            <div
              style={{
                padding: '16px',
                borderRadius: '10px',
                backgroundColor: '#fff1f2',
                border: '1px solid #fecdd3',
                marginBottom: '20px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#be123c', fontWeight: '700', marginBottom: '8px' }}>
                <AlertTriangle size={18} />
                <span>Delete Store "{storeToDelete.name}"?</span>
              </div>
              <p style={{ fontSize: '13px', color: '#4c0519', margin: '0 0 14px 0', lineHeight: 1.5 }}>
                This will <strong>permanently delete</strong> all products ({storeToDelete.itemsCount || 0}), invoices ({storeToDelete.invoicesCount || 0}), and sales records for this store. This action cannot be undone.
              </p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setStoreToDelete(null)}
                  disabled={deleting}
                  style={{ fontSize: '13px', padding: '6px 14px' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteStore}
                  disabled={deleting}
                  style={{
                    backgroundColor: '#dc2626',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '6px 14px',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: deleting ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  {deleting ? 'Deleting...' : 'Yes, Delete Permanently'}
                </button>
              </div>
            </div>
          )}

          {/* TAB 1: MANAGE STORES */}
          {activeTab === 'manage' && (
            <div>
              {loading && stores.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-secondary)' }}>
                  <RefreshCw className="spin" size={24} style={{ margin: '0 auto 8px auto' }} />
                  <p>Loading your stores...</p>
                </div>
              ) : stores.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 16px', color: 'var(--text-secondary)' }}>
                  <Store size={40} style={{ opacity: 0.3, margin: '0 auto 12px auto' }} />
                  <p style={{ fontWeight: '600', margin: '0 0 6px 0' }}>No stores found</p>
                  <p style={{ fontSize: '13px', margin: '0 0 16px 0' }}>Create your first store to get started.</p>
                  <button
                    className="btn btn-primary"
                    onClick={() => setActiveTab('add')}
                    style={{ margin: '0 auto' }}
                  >
                    <Plus size={16} />
                    <span>Create Store</span>
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {stores.map((store) => (
                    <div
                      key={store.id || store._id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '14px 16px',
                        borderRadius: '10px',
                        border: store.isActive ? '2px solid #2563eb' : '1px solid var(--border)',
                        backgroundColor: store.isActive ? '#eff6ff' : '#ffffff',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '8px',
                            backgroundColor: store.isActive ? '#2563eb' : '#f1f5f9',
                            color: store.isActive ? '#ffffff' : '#64748b',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <Building2 size={20} />
                        </div>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontWeight: '700', fontSize: '15px', color: 'var(--text-main)' }}>
                              {store.name}
                            </span>
                            {store.isActive && (
                              <span
                                style={{
                                  fontSize: '11px',
                                  fontWeight: '700',
                                  padding: '2px 8px',
                                  borderRadius: '9999px',
                                  backgroundColor: '#2563eb',
                                  color: '#ffffff',
                                }}
                              >
                                Active
                              </span>
                            )}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                            <span style={{ backgroundColor: '#e2e8f0', padding: '1px 6px', borderRadius: '4px', color: '#475569', fontWeight: '500' }}>
                              {store.type}
                            </span>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                              <Package size={12} /> {store.itemsCount || 0} products
                            </span>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                              <Receipt size={12} /> {store.invoicesCount || 0} bills
                            </span>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '12px', flexShrink: 0 }}>
                        {!store.isActive ? (
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => handleSwitchStore(store)}
                            style={{ fontSize: '12px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                            title="Switch to this store"
                          >
                            <span>Switch</span>
                            <ArrowRight size={13} />
                          </button>
                        ) : (
                          <span style={{ fontSize: '12px', color: '#2563eb', fontWeight: '600', padding: '6px 8px' }}>
                            Current
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => setStoreToDelete(store)}
                          style={{
                            padding: '6px 8px',
                            background: 'none',
                            border: '1px solid #fee2e2',
                            borderRadius: '6px',
                            color: '#ef4444',
                            cursor: 'pointer',
                          }}
                          title={`Delete ${store.name}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ADD NEW STORE */}
          {activeTab === 'add' && (
            <form onSubmit={handleCreateStore} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '6px' }}>
                  Store / Organization Name <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Apex Electronics, South City Branch"
                  value={newStoreName}
                  onChange={(e) => setNewStoreName(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: 'var(--text-main)', marginBottom: '6px' }}>
                  Store Industry / Business Category
                </label>
                <select
                  value={newStoreType}
                  onChange={(e) => setNewStoreType(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    fontSize: '14px',
                    outline: 'none',
                    backgroundColor: '#ffffff',
                    boxSizing: 'border-box',
                  }}
                >
                  {storeTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Stoqra tailors GST invoicing and category models according to your business type.
                </p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setActiveTab('manage')}
                  disabled={creating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={creating || !newStoreName.trim()}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Plus size={16} />
                  <span>{creating ? 'Creating Store...' : 'Create & Activate Store'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default StoreModal;
