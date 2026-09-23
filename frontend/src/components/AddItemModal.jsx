import React, { useState } from 'react';
import { PlusCircle, X, AlertCircle, Loader2, PackagePlus } from 'lucide-react';
import { createItem } from '../services/api.js';

export const AddItemModal = ({ isOpen, onClose, onSuccess }) => {
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState('General');
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategory, setCustomCategory] = useState('');
  const [supplier, setSupplier] = useState('');
  const [currentStock, setCurrentStock] = useState(1);
  const [unitCost, setUnitCost] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [reorderLevel, setReorderLevel] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Product name is required.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const resolvedCategory = isCustomCategory
        ? (customCategory.trim() || 'General')
        : (category.trim() || 'General');

      const payload = {
        name: name.trim(),
        sku: sku.trim().toUpperCase() || undefined,
        category: resolvedCategory,
        supplier: supplier.trim() || 'Direct Supplier',
        currentStock: Math.max(0, parseInt(currentStock, 10) || 0),
        unitCost: Math.max(0, parseFloat(unitCost) || 0),
        sellingPrice: Math.max(0, parseFloat(sellingPrice) || parseFloat(unitCost) || 0),
        reorderLevel: Math.max(0, parseInt(reorderLevel, 10) || 5),
      };

      const res = await createItem(payload);

      if (onSuccess) {
        onSuccess(res.message || `Product "${name.trim()}" added to inventory!`);
      }
      handleClose();
    } catch (err) {
      setError(err.message || 'Failed to add product.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setName('');
    setSku('');
    setCategory('General');
    setIsCustomCategory(false);
    setCustomCategory('');
    setSupplier('');
    setCurrentStock(1);
    setUnitCost('');
    setSellingPrice('');
    setReorderLevel(5);
    setError('');
    onClose();
  };

  const margin = sellingPrice && unitCost && Number(sellingPrice) > 0
    ? (((Number(sellingPrice) - Number(unitCost)) / Number(sellingPrice)) * 100).toFixed(1)
    : null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <PackagePlus size={22} color="#2563eb" />
            Add New Product
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

        <form onSubmit={handleSubmit}>
          {/* Product Name */}
          <div className="form-group">
            <label className="form-label">
              Product Name <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Parle-G Gold 1kg, Basmati Rice 5kg"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>

          {/* Category & Supplier */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label className="form-label" style={{ margin: 0 }}>Category</label>
                <button
                  type="button"
                  onClick={() => {
                    setIsCustomCategory(!isCustomCategory);
                    if (!isCustomCategory) {
                      setCustomCategory('');
                    }
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#2563eb',
                    fontSize: '11px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    padding: '0 2px',
                    textDecoration: 'underline',
                  }}
                >
                  {isCustomCategory ? '← Standard List' : '+ Custom Category'}
                </button>
              </div>

              {isCustomCategory ? (
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Dairy, Spices, Bakery, Footwear"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  autoFocus
                />
              ) : (
                <select
                  className="form-control"
                  value={category}
                  onChange={(e) => {
                    if (e.target.value === '__custom__') {
                      setIsCustomCategory(true);
                      setCustomCategory('');
                    } else {
                      setCategory(e.target.value);
                    }
                  }}
                >
                  <option value="General">General</option>
                  <option value="FMCG & Groceries">FMCG & Groceries</option>
                  <option value="Electronics">Electronics</option>
                  <option value="Hardware & Tools">Hardware & Tools</option>
                  <option value="Apparel & Clothing">Apparel & Clothing</option>
                  <option value="Stationery & Office">Stationery & Office</option>
                  <option value="Pharmacy & Health">Pharmacy & Health</option>
                  <option value="Raw Materials">Raw Materials</option>
                  <option value="__custom__">+ Enter Custom Category...</option>
                </select>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Supplier / Brand (Optional)</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Parle Products, local wholesaler"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
              />
            </div>
          </div>

          {/* Stock in Hand & Alert Threshold */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label">Stock in Hand (Quantity)</label>
              <input
                type="number"
                min="0"
                className="form-control"
                placeholder="Initial quantity"
                value={currentStock}
                onChange={(e) => setCurrentStock(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Low Stock Alert at (Units)</label>
              <input
                type="number"
                min="0"
                className="form-control"
                placeholder="e.g. 5"
                value={reorderLevel}
                onChange={(e) => setReorderLevel(e.target.value)}
                required
              />
              <span style={{ fontSize: '11px', color: '#64748b' }}>
                Alerts when stock drops to this level
              </span>
            </div>
          </div>

          {/* Cost Price & Selling Price */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label">Cost / Purchase Price (₹)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="form-control"
                placeholder="e.g. 80.00"
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
                placeholder="e.g. 100.00"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
              />
              {margin !== null && (
                <span style={{ fontSize: '11px', color: Number(margin) >= 0 ? '#059669' : '#dc2626' }}>
                  Profit Margin: {margin}%
                </span>
              )}
            </div>
          </div>

          {/* Optional SKU */}
          <div className="form-group">
            <label className="form-label">
              Barcode / SKU / Code <span style={{ fontSize: '12px', color: '#64748b' }}>(Optional)</span>
            </label>
            <input
              type="text"
              className="form-control"
              placeholder="Leave empty to auto-generate code"
              value={sku}
              onChange={(e) => setSku(e.target.value.toUpperCase())}
            />
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
            <button type="button" className="btn btn-secondary" onClick={handleClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Adding Product...
                </>
              ) : (
                <>
                  <PlusCircle size={16} />
                  Add Product to Store
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddItemModal;
