import React, { useState, useEffect } from 'react';
import { Edit3, X, AlertCircle, Loader2, Save } from 'lucide-react';
import { updateItem } from '../services/api.js';
import { formatINR } from '../utils/formatters.js';

export const EditItemModal = ({ isOpen, onClose, item, onSuccess }) => {
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState('General');
  const [supplier, setSupplier] = useState('');
  const [currentStock, setCurrentStock] = useState(0);
  const [unitCost, setUnitCost] = useState(0);
  const [sellingPrice, setSellingPrice] = useState(0);
  const [reorderLevel, setReorderLevel] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (item && isOpen) {
      setName(item.name || '');
      setSku(item.sku || '');
      setCategory(item.category || 'General');
      setSupplier(item.supplier || 'Direct Supplier');
      setCurrentStock(item.currentStock ?? 0);
      setUnitCost(item.unitCost ?? 0);
      setSellingPrice(item.sellingPrice ?? 0);
      setReorderLevel(item.reorderLevel ?? 10);
      setError('');
    }
  }, [item, isOpen]);

  if (!isOpen || !item) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Product name cannot be empty.');
      return;
    }
    if (!sku.trim()) {
      setError('Product SKU cannot be empty.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await updateItem(item._id, {
        name: name.trim(),
        sku: sku.trim().toUpperCase(),
        category: category.trim() || 'General',
        supplier: supplier.trim() || 'Direct Supplier',
        currentStock: Math.max(0, parseInt(currentStock, 10) || 0),
        unitCost: Math.max(0, parseFloat(unitCost) || 0),
        sellingPrice: Math.max(0, parseFloat(sellingPrice) || 0),
        reorderLevel: Math.max(0, parseInt(reorderLevel, 10) || 0),
      });

      if (onSuccess) {
        onSuccess(`Item "${name.trim()}" updated successfully!`);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to update item.');
    } finally {
      setLoading(false);
    }
  };

  const margin = sellingPrice > 0 && unitCost > 0
    ? (((sellingPrice - unitCost) / sellingPrice) * 100).toFixed(1)
    : 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Edit3 size={22} color="#2563eb" />
            Edit Inventory Item
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

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Product Name</label>
            <input
              type="text"
              className="form-control"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Category</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Electronics, Grocery"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Supplier / Vendor</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Acme Supplies"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
              />
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Product SKU</label>
              <input
                type="text"
                className="form-control"
                value={sku}
                onChange={(e) => setSku(e.target.value.toUpperCase())}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Current Stock (units)</label>
              <input
                type="number"
                min="0"
                className="form-control"
                value={currentStock}
                onChange={(e) => setCurrentStock(e.target.value)}
                required
              />
              <span style={{ fontSize: '11px', color: '#64748b' }}>
                Changes will log an ADJUSTMENT ledger record
              </span>
            </div>
          </div>

          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Unit Cost (₹)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="form-control"
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Selling Price (₹)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="form-control"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
                required
              />
              {sellingPrice > 0 && unitCost > 0 && (
                <span style={{ fontSize: '11px', color: margin >= 0 ? '#059669' : '#dc2626' }}>
                  Margin: {margin}%
                </span>
              )}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Reorder Alert Threshold (units)</label>
            <input
              type="number"
              min="0"
              className="form-control"
              value={reorderLevel}
              onChange={(e) => setReorderLevel(e.target.value)}
              required
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
                  Saving Changes...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Save Item Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditItemModal;
