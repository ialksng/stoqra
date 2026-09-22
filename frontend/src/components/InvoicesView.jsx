import React from 'react';
import { FileText, CheckCircle2, XCircle } from 'lucide-react';
import { formatINR, formatIndianDate } from '../utils/formatters.js';

export const InvoicesView = ({ invoices, loading }) => {
  return (
    <div className="table-card">
      <div className="table-header-bar">
        <div style={{ fontWeight: 700, fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileText size={18} color="#2563eb" />
          Ingested Invoices Register (GST & Tax Invoices)
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Invoice #</th>
              <th>Vendor / Supplier</th>
              <th>Total Amount (₹)</th>
              <th>Status</th>
              <th>Items Restocked</th>
              <th>Processed Date</th>
              <th>Source Ref</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                  Loading invoice history...
                </td>
              </tr>
            ) : invoices.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  No invoices ingested yet. Upload an Indian GST invoice PDF or run Gmail sync.
                </td>
              </tr>
            ) : (
              invoices.map((inv) => (
                <tr key={inv._id}>
                  <td>
                    <strong>{inv.invoiceNumber}</strong>
                  </td>
                  <td>{inv.vendor}</td>
                  <td>{formatINR(inv.totalAmount)}</td>
                  <td>
                    {inv.status === 'PROCESSED' ? (
                      <span className="badge badge-success">
                        <CheckCircle2 size={12} style={{ marginRight: '4px' }} /> Processed
                      </span>
                    ) : (
                      <span className="badge badge-danger">
                        <XCircle size={12} style={{ marginRight: '4px' }} /> Failed
                      </span>
                    )}
                  </td>
                  <td>
                    <span style={{ fontSize: '13px', color: '#475569' }}>
                      {inv.items?.length || 0} line item(s)
                    </span>
                  </td>
                  <td style={{ fontSize: '13px', color: '#64748b' }}>
                    {formatIndianDate(inv.createdAt)}
                  </td>
                  <td style={{ fontSize: '12px', fontFamily: 'monospace', color: '#64748b' }}>
                    {inv.messageId ? `Gmail: ${inv.messageId}` : 'Manual Upload'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InvoicesView;
