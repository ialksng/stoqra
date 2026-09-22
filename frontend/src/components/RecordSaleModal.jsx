import React, { useState, useEffect } from 'react';
import { ShoppingCart, X, AlertCircle, Loader2, Info, Upload, Image as ImageIcon, Trash2, IndianRupee, CreditCard, Banknote, Landmark } from 'lucide-react';
import { recordSale, fetchItems } from '../services/api.js';
import { formatINR } from '../utils/formatters.js';

export const RecordSaleModal = ({ isOpen, onClose, selectedItem, onSuccess }) => {
  const [sku, setSku] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [sellingPrice, setSellingPrice] = useState('');
  const [orderId, setOrderId] = useState('');
  const [paymentMode, setPaymentMode] = useState('UPI');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [isManualAmount, setIsManualAmount] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [notes, setNotes] = useState('');
  const [screenshotData, setScreenshotData] = useState(null);
  const [screenshotFileName, setScreenshotFileName] = useState('');
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
    setPaymentMode('UPI');
    setCustomerName('');
    setNotes('');
    setScreenshotData(null);
    setScreenshotFileName('');
    setIsManualAmount(false);

    if (selectedItem) {
      setActiveItem(selectedItem);
      setSku(selectedItem.sku || '');
      const price = selectedItem.sellingPrice || 0;
      setSellingPrice(price || '');
      setPaymentAmount(price > 0 ? String(price) : '');
    } else {
      setActiveItem(null);
      setSku('');
      setSellingPrice('');
      setPaymentAmount('');

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

  // Update calculated total amount when quantity or selling price changes, unless user manually customized it
  useEffect(() => {
    if (!isManualAmount) {
      const qty = Number(quantity) || 0;
      const price = Number(sellingPrice) || 0;
      const calc = qty * price;
      setPaymentAmount(calc > 0 ? String(calc) : '');
    }
  }, [quantity, sellingPrice, isManualAmount]);

  if (!isOpen) return null;

  const handleSelectProduct = (selectedSku) => {
    setSku(selectedSku);
    setError('');
    const found = catalogItems.find((i) => i.sku === selectedSku);
    if (found) {
      setActiveItem(found);
      const price = found.sellingPrice || 0;
      setSellingPrice(price || '');
      if (!isManualAmount) {
        setPaymentAmount(price > 0 ? String(price * (Number(quantity) || 1)) : '');
      }
    } else {
      setActiveItem(null);
    }
  };

  const handleScreenshotChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (PNG, JPG, JPEG, WebP) for the payment proof.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image file is too large. Please select a screenshot under 5MB.');
      return;
    }

    setScreenshotFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      setScreenshotData(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveScreenshot = () => {
    setScreenshotData(null);
    setScreenshotFileName('');
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
        paymentMode,
        paymentAmount: paymentAmount !== '' ? Number(paymentAmount) : undefined,
        paymentScreenshot: screenshotData,
        customerName: customerName.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      if (onSuccess) {
        onSuccess(`Sale recorded successfully! ${qty} unit(s) of ${cleanSku} sold via ${paymentMode}.`);
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
      <div className="modal-content" style={{ maxWidth: '580px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShoppingCart size={22} color="#2563eb" />
            Record Outbound Sale / Selling Order
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
              <strong>No items in inventory.</strong> Restock catalog first via <strong>"Upload Invoice"</strong> or <strong>"Sync Gmail"</strong> before recording sales.
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
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ fontWeight: 600, color: '#0f172a' }}>{activeItem.name}</div>
              <div style={{ color: '#64748b', fontSize: '12px' }}>
                SKU: {activeItem.sku} • Category: {activeItem.category || 'General'}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div>
                Stock:{' '}
                <span
                  style={{
                    color: activeItem.currentStock <= activeItem.reorderLevel ? '#d97706' : '#059669',
                    fontWeight: 700,
                  }}
                >
                  {activeItem.currentStock} units
                </span>
              </div>
              {activeItem.sellingPrice > 0 && (
                <div style={{ fontSize: '12px', color: '#64748b' }}>
                  Price: {formatINR(activeItem.sellingPrice)}
                </div>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {!selectedItem && (
            <div className="form-group">
              <label className="form-label">Select Product</label>
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
                      {item.name} [{item.sku}] — {item.currentStock} in stock ({formatINR(item.sellingPrice)})
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  className="form-control"
                  placeholder="Enter Product SKU"
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
                placeholder="Unit selling price"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
                disabled={noCatalogItems}
              />
            </div>
          </div>

          {/* Payment Mode Selector */}
          <div className="form-group">
            <label className="form-label">Type of Payment</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {[
                { id: 'UPI', label: 'UPI / QR', icon: <IndianRupee size={14} /> },
                { id: 'CASH', label: 'Cash', icon: <Banknote size={14} /> },
                { id: 'CARD', label: 'Debit / Card', icon: <CreditCard size={14} /> },
                { id: 'BANK_TRANSFER', label: 'Net Banking', icon: <Landmark size={14} /> },
                { id: 'CREDIT', label: 'Credit / Due', icon: <Info size={14} /> },
                { id: 'OTHER', label: 'Other Mode', icon: <ShoppingCart size={14} /> },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setPaymentMode(opt.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '8px 10px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: '1px solid',
                    borderColor: paymentMode === opt.id ? 'var(--primary)' : 'var(--border)',
                    backgroundColor: paymentMode === opt.id ? 'var(--primary-light)' : '#ffffff',
                    color: paymentMode === opt.id ? 'var(--primary)' : 'var(--text-main)',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {opt.icon}
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Payment Amount / Add Money Manually */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label className="form-label" style={{ margin: 0 }}>
                  Money Collected (₹)
                </label>
                {isManualAmount && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsManualAmount(false);
                      const calc = (Number(quantity) || 0) * (Number(sellingPrice) || 0);
                      setPaymentAmount(calc > 0 ? String(calc) : '');
                    }}
                    style={{ fontSize: '11px', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    Reset to calculated
                  </button>
                )}
              </div>
              <input
                type="number"
                step="0.01"
                min="0"
                className="form-control"
                placeholder="Money received"
                value={paymentAmount}
                onChange={(e) => {
                  setPaymentAmount(e.target.value);
                  setIsManualAmount(true);
                }}
                disabled={noCatalogItems}
              />
              <span style={{ fontSize: '11px', color: '#64748b' }}>
                {isManualAmount ? 'Custom payment amount entered manually' : 'Auto-calculated from quantity × unit price'}
              </span>
            </div>

            <div className="form-group">
              <label className="form-label">Customer / Buyer Name</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Ramesh Kumar / Walk-in"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                disabled={noCatalogItems}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
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

            <div className="form-group">
              <label className="form-label">Order Notes / Remark</label>
              <input
                type="text"
                className="form-control"
                placeholder="Optional notes or bill memo"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={noCatalogItems}
              />
            </div>
          </div>

          {/* Payment Proof Screenshot Attachment */}
          <div className="form-group">
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Upload size={14} color="#2563eb" />
              Attach Payment Screenshot / Proof (Optional)
            </label>
            {screenshotData ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  backgroundColor: '#f8fafc',
                }}
              >
                <img
                  src={screenshotData}
                  alt="Proof"
                  style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {screenshotFileName || 'Payment_Screenshot.png'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    Screenshot attached successfully
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ color: '#dc2626' }}
                  onClick={handleRemoveScreenshot}
                  title="Remove screenshot"
                >
                  <Trash2 size={14} />
                  Remove
                </button>
              </div>
            ) : (
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px dashed #cbd5e1',
                  backgroundColor: '#f8fafc',
                  cursor: 'pointer',
                  fontSize: '13px',
                  color: '#64748b',
                  transition: 'background-color 0.15s',
                }}
              >
                <ImageIcon size={16} color="#64748b" />
                <span>Click to upload UPI / Bank transfer payment screenshot</span>
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  onChange={handleScreenshotChange}
                  style={{ display: 'none' }}
                />
              </label>
            )}
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
                'Confirm Sale & Deduct Stock'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RecordSaleModal;
