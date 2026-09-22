import React, { useState } from 'react';
import { History, ArrowDownLeft, ArrowUpRight, FileSpreadsheet, Eye, X, Image as ImageIcon, IndianRupee, CreditCard, Banknote, Landmark } from 'lucide-react';
import { formatINR, formatIndianDate, formatIndianNumber } from '../utils/formatters.js';
import { exportTransactionsToExcel } from '../utils/excelExport.js';

export const TransactionsView = ({ transactions, loading, typeFilter, setTypeFilter }) => {
  const [activeProofImage, setActiveProofImage] = useState(null);

  const getPaymentBadge = (mode) => {
    switch (mode) {
      case 'UPI':
        return <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}><IndianRupee size={11} /> UPI</span>;
      case 'CASH':
        return <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}><Banknote size={11} /> Cash</span>;
      case 'CARD':
        return <span className="badge badge-neutral" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}><CreditCard size={11} /> Card</span>;
      case 'BANK_TRANSFER':
        return <span className="badge badge-neutral" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}><Landmark size={11} /> NetBank</span>;
      case 'CREDIT':
        return <span className="badge badge-danger">Credit/Due</span>;
      default:
        return mode ? <span className="badge badge-neutral">{mode}</span> : null;
    }
  };

  return (
    <div className="table-card">
      <div className="table-header-bar">
        <div style={{ fontWeight: 700, fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <History size={18} color="#2563eb" />
          Append-Only Inventory Ledger & Selling Orders Audit Trail
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '13px', color: '#64748b' }}>Filter Type:</span>
          <select
            className="form-control"
            style={{ width: 'auto', padding: '6px 12px' }}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="">All Transactions</option>
            <option value="PURCHASE_INVOICE">Inbound Purchases</option>
            <option value="SALE">Outbound Sales & Orders</option>
            <option value="ADJUSTMENT">Adjustments</option>
          </select>

          <button
            className="btn btn-secondary btn-sm"
            onClick={() => exportTransactionsToExcel(transactions)}
            disabled={!transactions || transactions.length === 0}
            title="Export transaction ledger to Excel (.xlsx)"
          >
            <FileSpreadsheet size={14} />
            Export Excel
          </button>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Timestamp (IST)</th>
              <th>Item SKU & Name</th>
              <th>Category</th>
              <th>Type</th>
              <th>Units Delta</th>
              <th>Unit Price (₹)</th>
              <th>Payment & Money</th>
              <th>Reference / Customer</th>
              <th>Proof / Screenshot</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                  Loading ledger transactions...
                </td>
              </tr>
            ) : transactions.length === 0 ? (
              <tr>
                <td colSpan="9" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  No transactions recorded yet.
                </td>
              </tr>
            ) : (
              transactions.map((tx) => {
                const isInbound = tx.quantityDelta > 0;
                const isSale = tx.type === 'SALE';
                const totalMoney = tx.paymentAmount !== undefined && tx.paymentAmount !== null && tx.paymentAmount > 0
                  ? tx.paymentAmount
                  : Math.abs(tx.quantityDelta) * (tx.unitPrice || 0);

                return (
                  <tr key={tx._id}>
                    <td style={{ fontSize: '13px', color: '#64748b', whiteSpace: 'nowrap' }}>
                      {formatIndianDate(tx.createdAt)}
                    </td>
                    <td>
                      <div>
                        <strong>{tx.itemId?.sku || 'UNKNOWN'}</strong>
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>
                        {tx.itemId?.name || 'N/A'}
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-neutral" style={{ fontSize: '11px' }}>
                        {tx.category || tx.itemId?.category || 'General'}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${isInbound ? 'badge-success' : isSale ? 'badge-neutral' : 'badge-warning'}`}>
                        {isInbound ? (
                          <ArrowDownLeft size={12} style={{ marginRight: '4px' }} />
                        ) : (
                          <ArrowUpRight size={12} style={{ marginRight: '4px' }} />
                        )}
                        {tx.type}
                      </span>
                    </td>
                    <td>
                      <strong style={{ color: isInbound ? '#059669' : '#dc2626', fontSize: '14px' }}>
                        {isInbound ? `+${formatIndianNumber(tx.quantityDelta)}` : formatIndianNumber(tx.quantityDelta)}
                      </strong>
                    </td>
                    <td>{formatINR(tx.unitPrice)}</td>
                    <td>
                      {isSale ? (
                        <div>
                          <div style={{ fontWeight: 700, color: '#059669' }}>
                            {formatINR(totalMoney)}
                          </div>
                          <div style={{ marginTop: '2px' }}>
                            {getPaymentBadge(tx.paymentMode)}
                          </div>
                        </div>
                      ) : (
                        <div style={{ fontSize: '13px', color: '#64748b' }}>
                          {formatINR(totalMoney)}
                        </div>
                      )}
                    </td>
                    <td style={{ fontSize: '12px' }}>
                      <div style={{ fontFamily: 'monospace', color: '#334155' }}>
                        {tx.sourceReference || 'N/A'}
                      </div>
                      {tx.customerName && (
                        <div style={{ color: '#64748b', marginTop: '2px' }}>
                          Customer: <strong>{tx.customerName}</strong>
                        </div>
                      )}
                      {tx.notes && (
                        <div style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '11px' }}>
                          {tx.notes}
                        </div>
                      )}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      {tx.paymentScreenshot ? (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '4px 8px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          onClick={() => setActiveProofImage(tx.paymentScreenshot)}
                          title="View attached payment proof screenshot"
                        >
                          <ImageIcon size={13} color="#2563eb" />
                          View Proof
                        </button>
                      ) : (
                        <span style={{ fontSize: '12px', color: '#cbd5e1' }}>—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Lightbox Modal for Payment Screenshot Proof */}
      {activeProofImage && (
        <div className="modal-overlay" onClick={() => setActiveProofImage(null)}>
          <div
            className="modal-content"
            style={{ maxWidth: '650px', padding: '16px', textAlign: 'center' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ fontWeight: 700, fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ImageIcon size={18} color="#2563eb" />
                Payment Proof Screenshot
              </div>
              <button className="close-btn" onClick={() => setActiveProofImage(null)}>
                <X size={20} />
              </button>
            </div>
            <div style={{ backgroundColor: '#0f172a', padding: '12px', borderRadius: '8px', overflow: 'hidden' }}>
              <img
                src={activeProofImage}
                alt="Payment Proof"
                style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: '4px' }}
              />
            </div>
            <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setActiveProofImage(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionsView;
