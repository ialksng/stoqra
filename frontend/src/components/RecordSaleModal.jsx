import React, { useState, useEffect } from 'react';
import { ShoppingCart, X, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react';
import { recordSale } from '../services/api.js';

export const RecordSaleModal = ({ isOpen, onClose, selectedItem, onSuccess }) => {
  const [sku, setSku] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [sellingPrice, setSellingPrice] = useState('');
  const [orderId, setOrderId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (selectedItem) {
      setSku(selectedItem.sku || '');
      setSellingPrice(selectedItem.sellingPrice || '');
    } else {
      setSku('');
      setSellingPrice('');
    }
    setQuantity(1);
    setOrderId(`ORD-${Date.now().toString().slice(-6)}`);
    setError('');
  }, [selectedItem, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!sku.trim()) {
      setError('Please enter a product SKU.');
      return;
    }
    if (Number(quantity) <= 0) {
      setError('Quantity must be greater than 0.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await recordSale({
        sku,
        quantity: Number(quantity),
        sellingPrice: sellingPrice ? Number(sellingPrice) : undefined,
        orderId: orderId.trim() || undefined,
      });

      if (onSuccess) {
        onSuccess(`Sale recorded successfully! ${quantity} unit(s) of ${sku} deducted.`);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to record sale.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShoppingCart size={22} color="#2563eb" />
            Record Outbound Sale
          </h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="alert-banner danger" style={{ padding: '10px 14px', marginBottom: '16px' }}>
            <AlertCircle size={18} color="#dc2626" />
            <span style={{ fontSize: '13px', color: '#991b1b' }}>{error}</span>
          </div>
        )}

        {selectedItem && (
          <div
            style={{
              backgroundColor: '#f1f5f9',
              padding: '12px 16px',
              borderRadius: '8px',
              marginBottom: '16px',
              fontSize: '13px',
            }}
          >
            <div><strong>Product:</strong> {selectedItem.name}</div>
            <div>
              <strong>Available Stock:</strong>{' '}
              <span style={{ color: selectedItem.currentStock <= selectedItem.reorderLevel ? '#d97706' : '#059669', fontWeight: 700 }}>
                {selectedItem.currentStock} units
              </span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Product SKU</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. WIDGET-01"
              value={sku}
              onChange={(e) => setSku(e.target.value.toUpperCase())}
              required
              disabled={!!selectedItem}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label">Quantity Sold</label>
              <input
                type="number"
                min="1"
                className="form-control"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Selling Price (₹/unit)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="form-control"
                placeholder="Optional"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Order Reference ID</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. ORD-10923"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Recording Sale...
                </>
              ) : (
                'Confirm Sale'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RecordSaleModal;
