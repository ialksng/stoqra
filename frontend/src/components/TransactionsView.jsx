import React from 'react';
import { History, ArrowDownLeft, ArrowUpRight, FileSpreadsheet } from 'lucide-react';
import { formatINR, formatIndianDate, formatIndianNumber } from '../utils/formatters.js';
import { exportTransactionsToExcel } from '../utils/excelExport.js';

export const TransactionsView = ({ transactions, loading, typeFilter, setTypeFilter }) => {
  return (
    <div className="table-card">
      <div className="table-header-bar">
        <div style={{ fontWeight: 700, fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <History size={18} color="#2563eb" />
          Append-Only Inventory Ledger Audit Trail
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
            <option value="SALE">Outbound Sales</option>
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
              <th>Item SKU</th>
              <th>Product Name</th>
              <th>Type</th>
              <th>Quantity Delta</th>
              <th>Unit Price (₹)</th>
              <th>Reference</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                  Loading ledger transactions...
                </td>
              </tr>
            ) : transactions.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  No transactions recorded yet.
                </td>
              </tr>
            ) : (
              transactions.map((tx) => {
                const isInbound = tx.quantityDelta > 0;
                return (
                  <tr key={tx._id}>
                    <td style={{ fontSize: '13px', color: '#64748b' }}>
                      {formatIndianDate(tx.createdAt)}
                    </td>
                    <td>
                      <strong>{tx.itemId?.sku || 'UNKNOWN'}</strong>
                    </td>
                    <td>{tx.itemId?.name || 'N/A'}</td>
                    <td>
                      <span className={`badge ${isInbound ? 'badge-success' : 'badge-neutral'}`}>
                        {isInbound ? (
                          <ArrowDownLeft size={12} style={{ marginRight: '4px' }} />
                        ) : (
                          <ArrowUpRight size={12} style={{ marginRight: '4px' }} />
                        )}
                        {tx.type}
                      </span>
                    </td>
                    <td>
                      <strong style={{ color: isInbound ? '#059669' : '#dc2626', fontSize: '15px' }}>
                        {isInbound ? `+${formatIndianNumber(tx.quantityDelta)}` : formatIndianNumber(tx.quantityDelta)}
                      </strong>
                    </td>
                    <td>{formatINR(tx.unitPrice)}</td>
                    <td style={{ fontSize: '13px', color: '#64748b', fontFamily: 'monospace' }}>
                      {tx.sourceReference || 'N/A'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TransactionsView;
