import React, { useState, useEffect } from 'react';
import {
  LifeBuoy,
  PlusCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  X,
  MessageSquare,
  AlertOctagon,
  FileQuestion,
  HelpCircle,
  Send,
} from 'lucide-react';
import { reportIssue, fetchMyStoreIssues } from '../services/api.js';

export const ShopIssuePortal = ({ onToast }) => {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('GMAIL_SYNC');
  const [priority, setPriority] = useState('MEDIUM');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState('');

  const loadIssues = async () => {
    setLoading(true);
    try {
      const res = await fetchMyStoreIssues();
      if (res.success) {
        setIssues(res.issues || []);
      }
    } catch (err) {
      console.error('[ShopIssuePortal] Failed to load issues:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIssues();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setFormError('Please enter a brief issue title.');
      return;
    }
    if (!description.trim()) {
      setFormError('Please describe the technical issue or error you experienced.');
      return;
    }

    setSubmitting(true);
    setFormError('');

    try {
      const res = await reportIssue({
        title: title.trim(),
        category,
        priority,
        description: description.trim(),
      });

      if (res.success) {
        if (onToast) onToast('Issue report sent to Platform Admin (ialksng@gmail.com)!', 'success');
        setTitle('');
        setDescription('');
        setCategory('GMAIL_SYNC');
        setPriority('MEDIUM');
        setModalOpen(false);
        loadIssues();
      }
    } catch (err) {
      setFormError(err.message || 'Failed to submit issue report.');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'OPEN':
        return (
          <span
            style={{
              fontSize: '11px',
              fontWeight: '700',
              padding: '3px 8px',
              borderRadius: '6px',
              backgroundColor: '#eff6ff',
              color: '#2563eb',
              border: '1px solid #bfdbfe',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Clock size={12} /> Pending Review
          </span>
        );
      case 'IN_PROGRESS':
        return (
          <span
            style={{
              fontSize: '11px',
              fontWeight: '700',
              padding: '3px 8px',
              borderRadius: '6px',
              backgroundColor: '#fffbeb',
              color: '#b45309',
              border: '1px solid #fde68a',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <RotateCw size={12} className="spin" /> Under Investigation
          </span>
        );
      case 'RESOLVED':
        return (
          <span
            style={{
              fontSize: '11px',
              fontWeight: '700',
              padding: '3px 8px',
              borderRadius: '6px',
              backgroundColor: '#f0fdf4',
              color: '#15803d',
              border: '1px solid #bbf7d0',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <CheckCircle2 size={12} /> Resolved
          </span>
        );
      case 'CLOSED':
        return (
          <span
            style={{
              fontSize: '11px',
              fontWeight: '700',
              padding: '3px 8px',
              borderRadius: '6px',
              backgroundColor: '#f1f5f9',
              color: '#64748b',
              border: '1px solid #e2e8f0',
            }}
          >
            Closed
          </span>
        );
      default:
        return null;
    }
  };

  const getPriorityBadge = (p) => {
    switch (p) {
      case 'CRITICAL':
        return (
          <span style={{ fontSize: '10px', fontWeight: '800', color: '#dc2626', backgroundColor: '#fee2e2', padding: '2px 6px', borderRadius: '4px' }}>
            CRITICAL
          </span>
        );
      case 'HIGH':
        return (
          <span style={{ fontSize: '10px', fontWeight: '800', color: '#ea580c', backgroundColor: '#ffedd5', padding: '2px 6px', borderRadius: '4px' }}>
            HIGH
          </span>
        );
      case 'MEDIUM':
        return (
          <span style={{ fontSize: '10px', fontWeight: '700', color: '#2563eb', backgroundColor: '#eff6ff', padding: '2px 6px', borderRadius: '4px' }}>
            MEDIUM
          </span>
        );
      case 'LOW':
        return (
          <span style={{ fontSize: '10px', fontWeight: '600', color: '#64748b', backgroundColor: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
            LOW
          </span>
        );
      default:
        return null;
    }
  };

  const formatCategory = (cat) => {
    const map = {
      GMAIL_SYNC: 'Gmail Sync & Ingestion',
      INVOICE_PARSING: 'Invoice / PDF Parsing',
      POS_SALES: 'Point of Sale & Payments',
      INVENTORY: 'Inventory & Stock Levels',
      AUTHENTICATION: 'Login & Accounts',
      PERFORMANCE: 'Speed & Responsiveness',
      OTHER: 'General Inquiry / Feature',
    };
    return map[cat] || cat;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Banner */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px',
          padding: '16px 20px',
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              backgroundColor: '#eff6ff',
              color: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <LifeBuoy size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: '17px', fontWeight: '800', color: '#0f172a', margin: 0 }}>
              Shop Technical Support & Issue Portal
            </h2>
            <p style={{ fontSize: '13px', color: '#64748b', margin: '2px 0 0 0' }}>
              Experiencing an issue with Gmail sync, bills, or sales? Report it directly to Platform Support (<strong>ialksng@gmail.com</strong>).
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={loadIssues}
            className="btn btn-secondary btn-sm"
            title="Refresh tickets"
          >
            <RotateCw size={14} className={loading ? 'spin' : ''} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <PlusCircle size={16} />
            Report Issue
          </button>
        </div>
      </div>

      {/* Issues Table */}
      <div className="table-card">
        <div className="table-header-bar">
          <div style={{ fontWeight: 700, fontSize: '15px', color: '#0f172a' }}>
            Submitted Support Tickets ({issues.length})
          </div>
          <span style={{ fontSize: '12px', color: '#64748b' }}>
            Directly monitored by platform administrator
          </span>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Priority</th>
                <th>Issue Subject</th>
                <th>Category</th>
                <th>Reported On</th>
                <th>Admin Resolution / Notes</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                    <RotateCw size={20} className="spin" style={{ margin: '0 auto 8px auto' }} />
                    Loading support tickets...
                  </td>
                </tr>
              ) : issues.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px 16px', color: '#64748b' }}>
                    <CheckCircle2 size={36} color="#10b981" style={{ margin: '0 auto 8px auto', opacity: 0.8 }} />
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>No technical issues reported</div>
                    <div style={{ fontSize: '12px', marginTop: '4px' }}>
                      Everything running smoothly! If you ever face an error, click "Report Issue" above.
                    </div>
                  </td>
                </tr>
              ) : (
                issues.map((iss) => (
                  <tr key={iss._id}>
                    <td>{getStatusBadge(iss.status)}</td>
                    <td>{getPriorityBadge(iss.priority)}</td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>{iss.title}</div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', maxWidth: '320px', lineHeight: 1.4 }}>
                        {iss.description}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: '12px', color: '#475569', fontWeight: 500 }}>
                        {formatCategory(iss.category)}
                      </span>
                    </td>
                    <td style={{ fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap' }}>
                      {formatDate(iss.createdAt)}
                    </td>
                    <td>
                      {iss.adminNotes ? (
                        <div
                          style={{
                            fontSize: '12px',
                            color: '#1e293b',
                            backgroundColor: '#f8fafc',
                            border: '1px solid #e2e8f0',
                            borderRadius: '6px',
                            padding: '6px 10px',
                            lineHeight: 1.4,
                          }}
                        >
                          <strong>Admin:</strong> {iss.adminNotes}
                        </div>
                      ) : (
                        <span style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>
                          Awaiting admin review
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Report Technical Issue Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '540px' }}
          >
            <div className="modal-header">
              <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <LifeBuoy size={20} color="#2563eb" />
                Report Technical Issue
              </h2>
              <button className="close-btn" onClick={() => setModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div className="alert-banner danger" style={{ padding: '10px 14px', marginBottom: '16px' }}>
                <AlertTriangle size={16} color="#dc2626" />
                <span style={{ fontSize: '13px', color: '#991b1b' }}>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">
                  Issue Summary / Title <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Gmail sync timed out, or Bill total parsed incorrectly"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Category</label>
                  <select
                    className="form-control"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    <option value="GMAIL_SYNC">Gmail Sync & Ingestion</option>
                    <option value="INVOICE_PARSING">Invoice / PDF Parsing</option>
                    <option value="POS_SALES">Point of Sale & Payments</option>
                    <option value="INVENTORY">Inventory & Stock</option>
                    <option value="AUTHENTICATION">Login & Accounts</option>
                    <option value="PERFORMANCE">Speed & Performance</option>
                    <option value="OTHER">Other / Feedback</option>
                  </select>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Severity Level</label>
                  <select
                    className="form-control"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                  >
                    <option value="LOW">Low (Cosmetic, minor question)</option>
                    <option value="MEDIUM">Medium (Normal functional issue)</option>
                    <option value="HIGH">High (Important feature blocked)</option>
                    <option value="CRITICAL">Critical (Cannot sell or operate)</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Detailed Description & Steps <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <textarea
                  className="form-control"
                  rows={4}
                  placeholder="Describe what happened, any error messages shown, and steps to reproduce..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  marginBottom: '18px',
                  fontSize: '12px',
                  color: '#64748b',
                  lineHeight: 1.4,
                }}
              >
                ℹ️ This ticket will immediately notify <strong>ialksng@gmail.com</strong> in the Platform Command Center for investigation.
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setModalOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  {submitting ? (
                    <>
                      <RotateCw size={14} className="spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send size={14} />
                      Submit Issue Report
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShopIssuePortal;
