import React, { useState, useEffect } from 'react';
import { Store, ChevronDown, Loader2, Sparkles } from 'lucide-react';
import { getStoreTypes, setupOrganization } from '../services/api.js';
import { setStoredToken } from '../services/api.js';

const STORE_TYPES = [
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

const STORE_TYPE_ICONS = {
  'Medical & Pharmacy': '💊',
  'Electronics': '📱',
  'FMCG & Grocery': '🛒',
  'Clothing & Apparel': '👗',
  'Restaurant & Food': '🍽️',
  'Hardware & Tools': '🔧',
  'General Retail': '🏪',
  'Stationery & Office': '📎',
  'Automotive Parts': '🚗',
  'Cosmetics & Beauty': '💄',
  'Agriculture & Seeds': '🌱',
  'Furniture & Home': '🛋️',
  'Sports & Fitness': '⚽',
  'Books & Education': '📚',
  'Other': '📦',
};

export const StoreSetupModal = ({ user, onSetupComplete }) => {
  const [storeName, setStoreName] = useState('');
  const [storeType, setStoreType] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!storeName.trim()) {
      setError('Please enter your store name.');
      return;
    }
    if (!storeType) {
      setError('Please select the type of your store.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await setupOrganization({ name: storeName.trim(), type: storeType });
      if (res.success) {
        // Update the stored token with the new one that contains organizationId
        if (res.token) {
          setStoredToken(res.token);
        }
        onSetupComplete(res);
      } else {
        setError(res.error || 'Setup failed. Please try again.');
      }
    } catch (err) {
      setError(err.message || 'Failed to create store. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px',
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: '20px',
          padding: '40px',
          maxWidth: '480px',
          width: '100%',
          boxShadow: '0 25px 60px rgba(0,0,0,0.25)',
          animation: 'fadeInUp 0.35s ease',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <img
            src="/projects/stoqra/stoqra-logo.png"
            alt="Stoqra"
            style={{ height: '52px', objectFit: 'contain', margin: '0 auto 16px auto', display: 'block' }}
          />

          <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: '#0f172a' }}>
            Welcome, {user?.name?.split(' ')[0] || 'there'}! 👋
          </h2>
          <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: '14px' }}>
            Let's set up your store. You can always change these later.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Store Name */}
          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
              Store / Business Name *
            </label>
            <input
              type="text"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              placeholder="e.g. Ram Medicals, Krishna Electronics"
              maxLength={80}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '10px',
                border: '1.5px solid #e2e8f0',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.15s',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#2563eb')}
              onBlur={(e) => (e.target.style.borderColor = '#e2e8f0')}
              autoFocus
            />
          </div>

          {/* Store Type */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>
              Type of Store *
            </label>
            <div style={{ position: 'relative' }}>
              <select
                value={storeType}
                onChange={(e) => setStoreType(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 36px 10px 14px',
                  borderRadius: '10px',
                  border: '1.5px solid #e2e8f0',
                  fontSize: '14px',
                  outline: 'none',
                  appearance: 'none',
                  background: '#fff',
                  color: storeType ? '#0f172a' : '#94a3b8',
                  cursor: 'pointer',
                  boxSizing: 'border-box',
                }}
              >
                <option value="" disabled>Select store type...</option>
                {STORE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {STORE_TYPE_ICONS[t]} {t}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={16}
                color="#94a3b8"
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
              />
            </div>
          </div>

          {/* Preview badge if type selected */}
          {storeType && (
            <div
              style={{
                background: '#f0f4ff',
                border: '1px solid #c7d7fe',
                borderRadius: '10px',
                padding: '12px 16px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                fontSize: '13px',
                color: '#2563eb',
              }}
            >
              <Sparkles size={15} />
              <span>
                <strong>{storeName || 'Your Store'}</strong> will be set up as a{' '}
                <strong>{storeType}</strong> store. All your inventory data will be private to your store.
              </span>
            </div>
          )}

          {error && (
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                padding: '10px 14px',
                color: '#dc2626',
                fontSize: '13px',
                marginBottom: '16px',
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !storeName.trim() || !storeType}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '10px',
              border: 'none',
              background: loading || !storeName.trim() || !storeType
                ? '#94a3b8'
                : 'linear-gradient(135deg, #2563eb, #7c3aed)',
              color: '#fff',
              fontSize: '15px',
              fontWeight: 600,
              cursor: loading || !storeName.trim() || !storeType ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'opacity 0.15s',
            }}
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Creating your store...
              </>
            ) : (
              <>
                <Store size={16} />
                Create My Store
              </>
            )}
          </button>
        </form>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default StoreSetupModal;
