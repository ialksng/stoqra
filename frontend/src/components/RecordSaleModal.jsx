import React, { useState, useEffect } from 'react';
import { ShoppingCart, X, AlertCircle, Loader2, Package, Info } from 'lucide-react';
import { recordSale, fetchItems } from '../services/api.js';
import { formatINR } from '../utils/formatters.js';

export const RecordSaleModal = ({ isOpen, onClose, selectedItem, onSuccess }) => {
  const [sku, setSku] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [sellingPrice, setSellingPrice] = useState('');
  const [orderId, setOrderId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Catalog items for dropdown selection when not opened directly from row
  const [catalogItems, setCatalogItems] = useState([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [activeItem, setActiveItem] = useState(null);

  useEffect(() => {
    if (!isOpen) return;

    setError('');
    setQuantity(1);
    setOrderId(`ORD-${Date.now().toString().slice(-6)}`);

    if (selectedItem) {
      setActiveItem(selectedItem);
      setSku(selectedItem.sku || '');
      setSellingPrice(selectedItem.sellingPrice || '');
    } else {
      setActiveItem(null);
      setSku('');
      setSellingPrice('');

      // Fetch existing items for dropdown
      setLoadingCatalog(true);
      fetchItems({ page: 1, limit: 100 })
        .then((res) => {
          setCatalogItems(res.items || []);
        })
        .catch((err) => {
          console.error('Failed to load inventory items for sale modal:', err);
        })
        .finally(() => {
          setLoadingCatalog(false);
        });
    }
  }, [selectedItem, isOpen]);

  if (!isOpen) return null;

  const handleSelectProduct = (selectedSku) => {
    setSku(selectedSku);
    setError('');
    const found = catalogItems.find((i) => i.sku === selectedSku);
    if (found) {
      setActiveItem(found);
      setSellingPrice(found.sellingPrice || '');
    } else {
      setActiveItem(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanSku = sku.trim().toUpperCase();

    if (!cleanSku) {
      setError('Please select or enter a product SKU.');
      return;
    }

    const qty = Number(quantity);
    if (isNaN(qty) || qty <= 0) {
      setError('Quantity must be greater than 0.');
      return;
    }

    if (activeItem && qty > activeItem.currentStock) {
      setError(`Cannot record sale: requested ${qty} unit(s), but only ${activeItem.currentStock} unit(s) are currently in stock.`);
      return;
    }

    setLoading(true);
    setError('');

    try {
      await recordSale({
        sku: cleanSku,
        quantity: qty,
        sellingPrice: sellingPrice ? Number(sellingPrice) : undefined,
        orderId: orderId.trim() || undefined,
      });

      if (onSuccess) {
        onSuccess(`Sale recorded successfully! ${qty} unit(s) of ${cleanSku} deducted from stock.`);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to record sale.');
    } finally {
      setLoading(false);
    }
  };

  const noCatalogItems = !selectedItem && !loadingCatalog && catalogItems.length === 0;

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

        {noCatalogItems && (
          <div
            style={{
              backgroundColor: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: '8px',
              padding: '12px 14px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '13px',
              color: '#92400e',
            }}
          >
            <Info size={18} color="#d97706" style={{ flexShrink: 0 }} />
            <div>
              <strong>No items in inventory.</strong> You need to add stock first via <strong>"Upload Invoice"</strong> or <strong>"Sync Gmail"</strong> before you can record sales.
            </div>
          </div>
        )}

        {activeItem && (
          <div
            style={{
              backgroundColor: '#f1f5f9',
              padding: '12px 16px',
              borderRadius: '8px',
              marginBottom: '16px',
              fontSize: '13px',
            }}
          >
            <div><strong>Product:</strong> {activeItem.name}</div>
            <div>
              <strong>Available Stock:</strong>{' '}
              <span
                style={{
                  color: activeItem.currentStock <= activeItem.reorderLevel ? '#d97706' : '#059669',
                  fontWeight: 700,
                }}
              >
                {activeItem.currentStock} units
              </span>
              {activeItem.sellingPrice > 0 && (
                <span style={{ marginLeft: '12px', color: '#64748b' }}>
                  (Default Price: {formatINR(activeItem.sellingPrice)})
                </span>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {!selectedItem && (
            <div className="form-group">
              <label className="form-label">Select Product from Inventory</label>
              {loadingCatalog ? (
                <div style={{ fontSize: '13px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Loader2 size={14} className="animate-spin" /> Loading inventory catalog...
                </div>
              ) : catalogItems.length > 0 ? (
                <select
                  className="form-control"
                  value={sku}
                  onChange={(e) => handleSelectProduct(e.target.value)}
                  required
                >
                  <option value="">-- Choose a product ({catalogItems.length} available) --</option>
                  {catalogItems.map((item) => (
                    <option key={item._id} value={item.sku}>
                      {item.name} [{item.sku}] — {item.currentStock} in stock
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  className="form-control"
                  placeholder="Enter Product SKU (e.g. WIDGET-01)"
                  value={sku}
                  onChange={(e) => setSku(e.target.value.toUpperCase())}
                  required
                  disabled={noCatalogItems}
                />
              )}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label">Quantity Sold</label>
              <input
                type="number"
                min="1"
                max={activeItem ? activeItem.currentStock : undefined}
                className="form-control"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
                disabled={noCatalogItems}
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
                disabled={noCatalogItems}
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
              disabled={noCatalogItems}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading || noCatalogItems}>
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
