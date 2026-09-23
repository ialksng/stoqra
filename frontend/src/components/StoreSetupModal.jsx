import React, { useState } from 'react';
import {
  Store,
  Mail,
  PlusCircle,
  FileSpreadsheet,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  Download,
  Building2,
  Check,
  AlertCircle,
} from 'lucide-react';
import { setupOrganization, setStoredToken } from '../services/api.js';

const STORE_TYPES = [
  { label: 'Medical & Pharmacy', icon: '💊', desc: 'Prescription medicines, surgicals, wellness' },
  { label: 'Electronics', icon: '📱', desc: 'Mobile phones, components, accessories' },
  { label: 'FMCG & Grocery', icon: '🛒', desc: 'Packaged foods, household, daily essentials' },
  { label: 'Clothing & Apparel', icon: '👗', desc: 'Garments, fabrics, fashion accessories' },
  { label: 'Restaurant & Food', icon: '🍽️', desc: 'F&B supplies, kitchen inventory, ingredients' },
  { label: 'Hardware & Tools', icon: '🔧', desc: 'Tools, electrical, building materials' },
  { label: 'General Retail', icon: '🏪', desc: 'Departmental, multi-category retail' },
  { label: 'Stationery & Office', icon: '📎', desc: 'Books, writing supplies, office consumables' },
  { label: 'Automotive Parts', icon: '🚗', desc: 'Spares, lubricants, vehicle accessories' },
  { label: 'Cosmetics & Beauty', icon: '💄', desc: 'Skincare, makeup, salon supplies' },
  { label: 'Other', icon: '📦', desc: 'General business inventory' },
];

export const StoreSetupModal = ({ user, onSetupComplete }) => {
  const [step, setStep] = useState(1); // 1 | 2 | 3
  const [storeName, setStoreName] = useState('');
  const [storeType, setStoreType] = useState('General Retail');
  const [ingestionChoice, setIngestionChoice] = useState('GMAIL'); // 'GMAIL' | 'MANUAL' | 'EXCEL'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const downloadSampleCsv = () => {
    const csvContent =
      'Item Name,Category,Cost Price,Selling Price,Quantity,Low Stock Alert,SKU\n' +
      'Paracetamol 500mg,Medicines,20,35,100,10,MED-001\n' +
      'Amoxicillin 250mg,Medicines,45,70,50,5,MED-002\n' +
      'Digital Thermometer,Devices,120,220,25,3,DEV-001\n' +
      'Cotton Bandage 5cm,Surgicals,15,30,80,15,SUR-001\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'Stoqra_Inventory_Template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleStep1Submit = (e) => {
    e.preventDefault();
    if (!storeName.trim()) {
      setError('Please enter your store or business name.');
      return;
    }
    setError('');
    setStep(2);
  };

  const handleStep2Submit = () => {
    setStep(3);
  };

  const handleFinalLaunch = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await setupOrganization({
        name: storeName.trim(),
        type: storeType,
      });

      if (res.success) {
        if (res.token) {
          setStoredToken(res.token);
        }
        onSetupComplete(res, ingestionChoice);
      } else {
        setError(res.error || 'Store setup failed. Please try again.');
      }
    } catch (err) {
      setError(err.message || 'Failed to setup store.');
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
          background: '#ffffff',
          borderRadius: '20px',
          padding: '36px',
          maxWidth: '540px',
          width: '100%',
          boxShadow: '0 25px 60px rgba(0,0,0,0.25)',
          animation: 'fadeInUp 0.3s ease',
        }}
      >
        {/* Stoqra Official Branding Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <img
            src="/projects/stoqra/stoqra-logo.png"
            alt="Stoqra"
            style={{ height: '48px', objectFit: 'contain', margin: '0 auto 12px auto', display: 'block' }}
          />

          {/* Stepper Progress Indicator */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '16px' }}>
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                backgroundColor: step >= 1 ? '#2563eb' : '#e2e8f0',
                color: step >= 1 ? '#fff' : '#64748b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: '700',
              }}
            >
              1
            </div>
            <div style={{ width: '40px', height: '3px', backgroundColor: step >= 2 ? '#2563eb' : '#e2e8f0' }}></div>
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                backgroundColor: step >= 2 ? '#2563eb' : '#e2e8f0',
                color: step >= 2 ? '#fff' : '#64748b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: '700',
              }}
            >
              2
            </div>
            <div style={{ width: '40px', height: '3px', backgroundColor: step >= 3 ? '#2563eb' : '#e2e8f0' }}></div>
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                backgroundColor: step >= 3 ? '#2563eb' : '#e2e8f0',
                color: step >= 3 ? '#fff' : '#64748b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: '700',
              }}
            >
              3
            </div>
          </div>
        </div>

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
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* ─── STEP 1: STORE PROFILE ─── */}
        {step === 1 && (
          <form onSubmit={handleStep1Submit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ textAlign: 'center', marginBottom: '8px' }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#0f172a' }}>
                Step 1: Setup Your Store Profile
              </h2>
              <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '13px' }}>
                Tell us about your business to tailor AI filtering and catalog models.
              </p>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                Store / Business Name *
              </label>
              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="e.g. Apex Pharmacy, Krishna Electronics"
                autoFocus
                required
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1.5px solid #e2e8f0',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                Business Category
              </label>
              <select
                value={storeType}
                onChange={(e) => setStoreType(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1.5px solid #e2e8f0',
                  fontSize: '14px',
                  outline: 'none',
                  backgroundColor: '#fff',
                  boxSizing: 'border-box',
                }}
              >
                {STORE_TYPES.map((t) => (
                  <option key={t.label} value={t.label}>
                    {t.icon} {t.label} — {t.desc}
                  </option>
                ))}
              </select>
              <p style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', lineHeight: 1.4 }}>
                💡 <strong>Smart AI Filtering:</strong> Selecting your category ensures Stoqra AI automatically ignores personal expenses (like dining receipts or video streaming subscriptions).
              </p>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>
                Operating Currency
              </label>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  backgroundColor: '#f1f5f9',
                  border: '1px solid #e2e8f0',
                  fontSize: '14px',
                  color: '#334155',
                  fontWeight: '600',
                }}
              >
                <span>₹ INR (Indian Rupee) — GST Compliant</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px' }}
              >
                <span>Next: Ingestion Choice</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </form>
        )}

        {/* ─── STEP 2: INGESTION CHOICE ─── */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ textAlign: 'center', marginBottom: '4px' }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#0f172a' }}>
                Step 2: Choose How to Add Products
              </h2>
              <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '13px' }}>
                Select how you'd like to populate your store inventory shelf initially.
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Option A: Gmail Sync */}
              <div
                onClick={() => setIngestionChoice('GMAIL')}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '14px',
                  borderRadius: '12px',
                  border: ingestionChoice === 'GMAIL' ? '2px solid #2563eb' : '1px solid #e2e8f0',
                  backgroundColor: ingestionChoice === 'GMAIL' ? '#eff6ff' : '#fff',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    backgroundColor: ingestionChoice === 'GMAIL' ? '#2563eb' : '#f1f5f9',
                    color: ingestionChoice === 'GMAIL' ? '#fff' : '#2563eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Mail size={18} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: '700', fontSize: '14px', color: '#0f172a' }}>
                      Option A: Connect Gmail (Auto-Import Invoices)
                    </span>
                    <span
                      style={{
                        fontSize: '10px',
                        padding: '1px 6px',
                        borderRadius: '9999px',
                        backgroundColor: '#dbeafe',
                        color: '#1d4ed8',
                        fontWeight: '700',
                      }}
                    >
                      Recommended
                    </span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: '3px 0 0', lineHeight: 1.4 }}>
                    Automatically fetch supplier PDFs and stage them in a review drawer before adding to shelf.
                  </p>
                </div>
              </div>

              {/* Option B: Manual */}
              <div
                onClick={() => setIngestionChoice('MANUAL')}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '14px',
                  borderRadius: '12px',
                  border: ingestionChoice === 'MANUAL' ? '2px solid #2563eb' : '1px solid #e2e8f0',
                  backgroundColor: ingestionChoice === 'MANUAL' ? '#eff6ff' : '#fff',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    backgroundColor: ingestionChoice === 'MANUAL' ? '#2563eb' : '#f1f5f9',
                    color: ingestionChoice === 'MANUAL' ? '#fff' : '#2563eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <PlusCircle size={18} />
                </div>
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: '700', fontSize: '14px', color: '#0f172a' }}>
                    Option B: Add Items Manually
                  </span>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: '3px 0 0', lineHeight: 1.4 }}>
                    Start fresh and add products one by one with live markup % margin calculation.
                  </p>
                </div>
              </div>

              {/* Option C: Excel */}
              <div
                onClick={() => setIngestionChoice('EXCEL')}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '14px',
                  borderRadius: '12px',
                  border: ingestionChoice === 'EXCEL' ? '2px solid #2563eb' : '1px solid #e2e8f0',
                  backgroundColor: ingestionChoice === 'EXCEL' ? '#eff6ff' : '#fff',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    backgroundColor: ingestionChoice === 'EXCEL' ? '#2563eb' : '#f1f5f9',
                    color: ingestionChoice === 'EXCEL' ? '#fff' : '#2563eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <FileSpreadsheet size={18} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: '700', fontSize: '14px', color: '#0f172a' }}>
                      Option C: Import from Excel / CSV
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadSampleCsv();
                      }}
                      style={{
                        border: 'none',
                        background: 'none',
                        color: '#2563eb',
                        fontSize: '11px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                      }}
                    >
                      <Download size={12} />
                      Sample CSV
                    </button>
                  </div>
                  <p style={{ fontSize: '12px', color: '#64748b', margin: '3px 0 0', lineHeight: 1.4 }}>
                    Upload or import existing inventory records from spreadsheets using our template.
                  </p>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setStep(1)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <ArrowLeft size={16} />
                <span>Back</span>
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleStep2Submit}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px' }}
              >
                <span>Next: Shelf Launch</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ─── STEP 3: SHELF LAUNCH ─── */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', textAlign: 'center' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: '#dcfce7',
                color: '#16a34a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto',
              }}
            >
              <Sparkles size={28} />
            </div>

            <div>
              <h2 style={{ margin: 0, fontSize: '22px', fontWeight: '800', color: '#0f172a' }}>
                Your Store is Ready for Launch!
              </h2>
              <p style={{ margin: '6px 0 0', color: '#64748b', fontSize: '13px' }}>
                Confirm your configuration and launch your live inventory dashboard.
              </p>
            </div>

            <div
              style={{
                backgroundColor: '#f8fafc',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                padding: '16px',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: '#64748b' }}>Store Name:</span>
                <span style={{ fontWeight: '700', color: '#0f172a' }}>{storeName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: '#64748b' }}>Business Category:</span>
                <span style={{ fontWeight: '600', color: '#2563eb' }}>{storeType}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: '#64748b' }}>Currency:</span>
                <span style={{ fontWeight: '600', color: '#0f172a' }}>₹ INR</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: '#64748b' }}>Starting Ingestion:</span>
                <span style={{ fontWeight: '600', color: '#0f172a' }}>
                  {ingestionChoice === 'GMAIL'
                    ? 'Gmail Ingestion (Staged Review)'
                    : ingestionChoice === 'MANUAL'
                    ? 'Manual Add Products'
                    : 'Excel / CSV Import'}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setStep(2)}
                disabled={loading}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <ArrowLeft size={16} />
                <span>Back</span>
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleFinalLaunch}
                disabled={loading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 24px',
                  backgroundColor: '#2563eb',
                  fontSize: '15px',
                  fontWeight: '700',
                }}
              >
                <Check size={18} />
                <span>{loading ? 'Launching Shelf...' : '🚀 Launch My Dashboard'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StoreSetupModal;
