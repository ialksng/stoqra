import React, { useState } from 'react';
import { UploadCloud, CheckCircle2, AlertCircle, Loader2, File, X } from 'lucide-react';
import { uploadInvoice } from '../services/api.js';
import { formatINR } from '../utils/formatters.js';

export const UploadInvoiceModal = ({ isOpen, onClose, onSuccess }) => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      if (selected.type !== 'application/pdf' && !selected.name.toLowerCase().endsWith('.pdf')) {
        setError('Please select a valid PDF file.');
        return;
      }
      setFile(selected);
      setError('');
      setResult(null);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please choose a PDF invoice file.');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await uploadInvoice(file);
      setResult(response.data);
      if (onSuccess) onSuccess('Invoice parsed & inventory restocked successfully!');
    } catch (err) {
      setError(err.message || 'Failed to upload and parse invoice.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setError('');
    setResult(null);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UploadCloud size={22} color="#2563eb" />
            Upload Inbound Invoice (PDF)
          </h2>
          <button className="close-btn" onClick={handleClose}>
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="alert-banner danger" style={{ padding: '10px 14px', marginBottom: '16px' }}>
            <AlertCircle size={18} color="#dc2626" />
            <span style={{ fontSize: '13px', color: '#991b1b' }}>{error}</span>
          </div>
        )}

        {result ? (
          <div>
            <div
              style={{
                backgroundColor: 'var(--success-light)',
                border: '1px solid #a7f3d0',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '18px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#065f46', fontWeight: 700 }}>
                <CheckCircle2 size={20} />
                Gemini Extracted & Restocked Successfully!
              </div>
              <div style={{ marginTop: '10px', fontSize: '13px', color: '#047857' }}>
                <div><strong>Invoice #:</strong> {result.invoice.invoiceNumber}</div>
                <div><strong>Vendor:</strong> {result.invoice.vendor}</div>
                <div><strong>Total Amount:</strong> {formatINR(result.invoice.totalAmount)}</div>
                <div><strong>Line Items:</strong> {result.invoice.items?.length || 0} product(s)</div>
              </div>
            </div>

            <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleClose}>
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleUpload}>
            <div
              style={{
                border: '2px dashed var(--border)',
                borderRadius: '10px',
                padding: '32px 20px',
                textAlign: 'center',
                backgroundColor: '#f8fafc',
                cursor: 'pointer',
                marginBottom: '18px',
              }}
              onClick={() => document.getElementById('pdf-file-input').click()}
            >
              <FileText size={36} color="#94a3b8" style={{ margin: '0 auto 10px auto' }} />
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#334155' }}>
                {file ? file.name : 'Click to select invoice PDF file'}
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                {file ? `${(file.size / 1024).toFixed(1)} KB` : 'Supports standard & Indian GST Tax Invoices up to 15MB'}
              </div>
              <input
                id="pdf-file-input"
                type="file"
                accept="application/pdf"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
            </div>

            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '18px', lineHeight: 1.4 }}>
              💡 <strong>Gemini 2.5 Flash</strong> document intelligence will automatically parse vendor details, GSTIN/tax info, item SKUs, quantities, and costs in Indian Rupees (₹).
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" className="btn btn-secondary" onClick={handleClose} disabled={loading}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={!file || loading}>
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Extracting via Gemini...
                  </>
                ) : (
                  'Upload & Restock'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default UploadInvoiceModal;
