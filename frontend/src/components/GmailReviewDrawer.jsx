import React, { useState } from 'react';
import {
  Inbox,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Store,
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
  IndianRupee,
  Layers,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { formatINR, formatIndianDate } from '../utils/formatters.js';
import { approveStagedInvoice, rejectStagedInvoice } from '../services/api.js';

export const GmailReviewDrawer = ({ isOpen, onClose, stagedInvoices = [], onActionSuccess }) => {
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(
    stagedInvoices.length > 0 ? stagedInvoices[0]._id : null
  );
  // Track item selections: { [invoiceId]: { [itemIndex]: boolean } }
  const [itemSelections, setItemSelections] = useState({});
  const [processingId, setProcessingId] = useState(null);
  const [error, setError] = useState('');

  // Keep selectedInvoiceId valid
  const currentInvoice =
    stagedInvoices.find((inv) => inv._id === selectedInvoiceId) || stagedInvoices[0] || null;

  if (!isOpen) return null;

  const getIsSelected = (invoiceId, itemIdx) => {
    if (
      itemSelections[invoiceId] !== undefined &&
      itemSelections[invoiceId][itemIdx] !== undefined
    ) {
      return itemSelections[invoiceId][itemIdx];
    }
    return true; // Default selected
  };

  const toggleItemSelection = (invoiceId, itemIdx) => {
    setItemSelections((prev) => {
      const invMap = { ...(prev[invoiceId] || {}) };
      const currentVal = invMap[itemIdx] !== undefined ? invMap[itemIdx] : true;
      invMap[itemIdx] = !currentVal;
      return { ...prev, [invoiceId]: invMap };
    });
  };

  const handleSelectAll = (invoice) => {
    setItemSelections((prev) => {
      const invMap = {};
      invoice.items.forEach((_, idx) => {
        invMap[idx] = true;
      });
      return { ...prev, [invoice._id]: invMap };
    });
  };

  const handleDeselectAll = (invoice) => {
    setItemSelections((prev) => {
      const invMap = {};
      invoice.items.forEach((_, idx) => {
        invMap[idx] = false;
      });
      return { ...prev, [invoice._id]: invMap };
    });
  };

  const handleApprove = async (invoice) => {
    const selectedItems = invoice.items.filter((_, idx) => getIsSelected(invoice._id, idx));

    if (selectedItems.length === 0) {
      setError('Please select at least one item from the invoice to add to shelf.');
      return;
    }

    setProcessingId(invoice._id);
    setError('');

    try {
      const res = await approveStagedInvoice(invoice._id, selectedItems);
      if (onActionSuccess) {
        onActionSuccess(res.message || `Invoice #${invoice.invoiceNumber} approved to inventory shelf!`);
      }
    } catch (err) {
      setError(err.message || 'Failed to approve invoice items.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (invoice) => {
    if (!window.confirm(`Are you sure you want to dismiss Invoice #${invoice.invoiceNumber} from ${invoice.vendorName}? This will not add items to your store shelf.`)) {
      return;
    }

    setProcessingId(invoice._id);
    setError('');

    try {
      const res = await rejectStagedInvoice(invoice._id);
      if (onActionSuccess) {
        onActionSuccess(res.message || `Invoice #${invoice.invoiceNumber} dismissed.`);
      }
    } catch (err) {
      setError(err.message || 'Failed to dismiss invoice.');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1050 }}>
      <div
        className="modal-content"
        style={{
          maxWidth: '900px',
          width: '95%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            color: '#ffffff',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(59, 130, 246, 0.4)',
              }}
            >
              <Inbox size={20} color="#60a5fa" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: '#f8fafc' }}>
                  Gmail Ingestion Review Pipeline
                </h2>
                <span
                  style={{
                    backgroundColor: '#f59e0b',
                    color: '#000000',
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '12px',
                  }}
                >
                  {stagedInvoices.length} Pending
                </span>
              </div>
              <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
                Review AI-parsed items before adding them to your live store shelf. Deselect personal or non-inventory bills.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '6px',
            }}
          >
            <XCircle size={22} />
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: '10px 24px',
              backgroundColor: '#fef2f2',
              borderBottom: '1px solid #fee2e2',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              color: '#b91c1c',
              fontSize: '13px',
            }}
          >
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Content Body */}
        {stagedInvoices.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center' }}>
            <CheckCircle2 size={48} color="#10b981" style={{ margin: '0 auto 16px auto' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#0f172a', marginBottom: '6px' }}>
              All Caught Up!
            </h3>
            <p style={{ fontSize: '13px', color: '#64748b', maxWidth: '400px', margin: '0 auto' }}>
              No pending invoices to review. New bills received via Gmail sync will appear here for verification before being added to your catalog.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', flex: 1, minHeight: 0 }}>
            {/* Left Sidebar: Invoices List */}
            <div
              style={{
                borderRight: '1px solid var(--border)',
                backgroundColor: '#f8fafc',
                overflowY: 'auto',
                maxHeight: 'calc(90vh - 140px)',
              }}
            >
              {stagedInvoices.map((inv) => {
                const isSelected = currentInvoice && currentInvoice._id === inv._id;
                const itemsCount = inv.items?.length || 0;
                return (
                  <div
                    key={inv._id}
                    onClick={() => {
                      setSelectedInvoiceId(inv._id);
                      setError('');
                    }}
                    style={{
                      padding: '14px 16px',
                      borderBottom: '1px solid var(--border)',
                      cursor: 'pointer',
                      backgroundColor: isSelected ? '#ffffff' : 'transparent',
                      borderLeft: isSelected ? '4px solid var(--primary)' : '4px solid transparent',
                      transition: 'background 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 600, fontSize: '13px', color: '#0f172a' }}>
                        {inv.vendorName || 'Unknown Vendor'}
                      </span>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#2563eb' }}>
                        {formatINR(inv.totalAmount)}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>
                      Invoice #{inv.invoiceNumber}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#94a3b8' }}>
                      <span>{formatIndianDate(inv.invoiceDate || inv.createdAt)}</span>
                      <span className="badge badge-neutral" style={{ fontSize: '10px' }}>
                        {itemsCount} item{itemsCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right Pane: Selected Invoice Inspection */}
            {currentInvoice ? (
              <div
                style={{
                  padding: '20px 24px',
                  overflowY: 'auto',
                  maxHeight: 'calc(90vh - 140px)',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {/* Meta details banner */}
                <div
                  style={{
                    backgroundColor: '#f1f5f9',
                    borderRadius: '8px',
                    padding: '14px 18px',
                    marginBottom: '16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '12px',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                      {currentInvoice.vendorName}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                      Invoice No: <strong>{currentInvoice.invoiceNumber}</strong> • Date:{' '}
                      {formatIndianDate(currentInvoice.invoiceDate || currentInvoice.createdAt)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>
                      Invoice Total
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: 800, color: '#059669' }}>
                      {formatINR(currentInvoice.totalAmount)}
                    </div>
                  </div>
                </div>

                {/* Items selection control */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '10px',
                  }}
                >
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                    Select Items to Restock into Store:
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => handleSelectAll(currentInvoice)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--primary)',
                        fontSize: '11px',
                        cursor: 'pointer',
                        fontWeight: 600,
                      }}
                    >
                      Select All
                    </button>
                    <span style={{ color: '#cbd5e1' }}>|</span>
                    <button
                      type="button"
                      onClick={() => handleDeselectAll(currentInvoice)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#64748b',
                        fontSize: '11px',
                        cursor: 'pointer',
                        fontWeight: 600,
                      }}
                    >
                      Deselect All
                    </button>
                  </div>
                </div>

                {/* Items list */}
                <div style={{ flex: 1, border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden', marginBottom: '20px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border)', textAlign: 'left' }}>
                        <th style={{ padding: '8px 12px', width: '36px' }}></th>
                        <th style={{ padding: '8px 12px' }}>Product / Description</th>
                        <th style={{ padding: '8px 12px' }}>Category</th>
                        <th style={{ padding: '8px 12px', textAlign: 'right' }}>Qty</th>
                        <th style={{ padding: '8px 12px', textAlign: 'right' }}>Cost Price (₹)</th>
                        <th style={{ padding: '8px 12px', textAlign: 'right' }}>Selling Price (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentInvoice.items.map((item, idx) => {
                        const checked = getIsSelected(currentInvoice._id, idx);
                        return (
                          <tr
                            key={idx}
                            onClick={() => toggleItemSelection(currentInvoice._id, idx)}
                            style={{
                              borderBottom: '1px solid var(--border)',
                              cursor: 'pointer',
                              backgroundColor: checked ? '#ffffff' : '#fcfcfd',
                              opacity: checked ? 1 : 0.5,
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => {}} // handled by row onClick
                                style={{ cursor: 'pointer' }}
                              />
                            </td>
                            <td style={{ padding: '10px 12px' }}>
                              <div style={{ fontWeight: 600, color: '#0f172a' }}>{item.name}</div>
                              {item.sku && (
                                <div style={{ fontSize: '11px', color: '#64748b' }}>SKU: {item.sku}</div>
                              )}
                            </td>
                            <td style={{ padding: '10px 12px' }}>
                              <span className="badge badge-neutral" style={{ fontSize: '11px' }}>
                                {item.category || 'General'}
                              </span>
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>
                              {item.quantity}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                              {formatINR(item.costPrice)}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', color: '#059669', fontWeight: 600 }}>
                              {item.sellingPrice > 0 ? formatINR(item.sellingPrice) : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Action buttons */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: 'auto',
                    paddingTop: '16px',
                    borderTop: '1px solid var(--border)',
                  }}
                >
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ color: '#dc2626', borderColor: '#fca5a5' }}
                    onClick={() => handleReject(currentInvoice)}
                    disabled={processingId === currentInvoice._id}
                  >
                    {processingId === currentInvoice._id ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <XCircle size={16} />
                    )}
                    Dismiss / Not Retail Stock
                  </button>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => handleApprove(currentInvoice)}
                      disabled={processingId === currentInvoice._id}
                      style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                      {processingId === currentInvoice._id ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Adding to Shelf...
                        </>
                      ) : (
                        <>
                          <Check size={16} />
                          Approve Selected to Store Shelf
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
};

export default GmailReviewDrawer;
