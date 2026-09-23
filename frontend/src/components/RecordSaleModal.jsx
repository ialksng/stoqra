import React, { useState, useEffect, useMemo } from 'react';
import {
  ShoppingCart,
  X,
  AlertCircle,
  Loader2,
  Info,
  Search,
  Plus,
  Minus,
  Trash2,
  Check,
  IndianRupee,
  CreditCard,
  Banknote,
  Users,
  Percent,
  Sparkles,
} from 'lucide-react';
import { fetchItems, posCheckout } from '../services/api.js';
import { formatINR } from '../utils/formatters.js';

export const RecordSaleModal = ({ isOpen, onClose, selectedItem, onSuccess }) => {
  const [catalogItems, setCatalogItems] = useState([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Cart state: [ { item: itemObject, quantity: number, sellingPrice: number } ]
  const [cart, setCart] = useState([]);
  
  // Payment states
  // 'UPI' | 'CASH' | 'CARD' | 'CREDIT_UDHAR' | 'SPLIT'
  const [paymentMethod, setPaymentMethod] = useState('UPI');
  const [customerNote, setCustomerNote] = useState('');
  
  // Split payment state
  const [splitUpi, setSplitUpi] = useState('');
  const [splitCash, setSplitCash] = useState('');
  const [splitCard, setSplitCard] = useState('');
  const [splitUdhar, setSplitUdhar] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Quick custom item state
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickName, setQuickName] = useState('');
  const [quickPrice, setQuickPrice] = useState('');
  const [quickQty, setQuickQty] = useState(1);

  const handleAddCustomItem = (e) => {
    if (e) e.preventDefault();
    if (!quickName.trim()) return;
    const price = Number(quickPrice) || 0;
    const qty = Math.max(1, Number(quickQty) || 1);
    const customLine = {
      item: {
        _id: `custom_${Date.now()}`,
        name: quickName.trim(),
        sku: `CUST-${Date.now().toString().slice(-4)}`,
        sellingPrice: price,
        unitCost: price * 0.7,
        currentStock: 999,
      },
      quantity: qty,
      sellingPrice: price,
    };
    setCart((prev) => [...prev, customLine]);
    setQuickName('');
    setQuickPrice('');
    setQuickQty(1);
    setShowQuickAdd(false);
  };

  // Fetch catalog products
  useEffect(() => {
    if (!isOpen) return;

    setError('');
    setSearchQuery('');
    setPaymentMethod('UPI');
    setCustomerNote('');
    setSplitUpi('');
    setSplitCash('');
    setSplitCard('');
    setSplitUdhar('');

    setLoadingCatalog(true);
    fetchItems({ page: 1, limit: 100 })
      .then((res) => {
        const items = res.items || [];
        setCatalogItems(items);

        if (selectedItem) {
          const matched = items.find((i) => i._id === selectedItem._id || i.sku === selectedItem.sku) || selectedItem;
          setCart([
            {
              item: matched,
              quantity: 1,
              sellingPrice: Number(matched.sellingPrice) || Number(matched.unitCost) || 0,
            },
          ]);
        } else {
          setCart([]);
        }
      })
      .catch((err) => {
        console.error('Failed to load items for POS checkout:', err);
      })
      .finally(() => {
        setLoadingCatalog(false);
      });
  }, [isOpen, selectedItem]);

  // Cart financial calculations
  const { totalSubtotal, totalCost, projectedProfit, totalItemsCount } = useMemo(() => {
    let subtotal = 0;
    let cost = 0;
    let itemsCount = 0;

    cart.forEach((line) => {
      const qty = Number(line.quantity) || 0;
      const price = Number(line.sellingPrice) || 0;
      const unitCost = Number(line.item.unitCost) || Number(line.item.costPrice) || 0;

      subtotal += qty * price;
      cost += qty * unitCost;
      itemsCount += qty;
    });

    const profit = subtotal - cost;

    return {
      totalSubtotal: Math.round(subtotal * 100) / 100,
      totalCost: Math.round(cost * 100) / 100,
      projectedProfit: Math.round(profit * 100) / 100,
      totalItemsCount: itemsCount,
    };
  }, [cart]);

  // Automatically sync split values when toggled
  useEffect(() => {
    if (paymentMethod === 'SPLIT' && splitUpi === '' && splitCash === '') {
      setSplitUpi(String(totalSubtotal));
    }
  }, [paymentMethod, totalSubtotal]);

  if (!isOpen) return null;

  // Add item to cart
  const addToCart = (product) => {
    setCart((prev) => {
      const existingIdx = prev.findIndex((p) => p.item._id === product._id);
      if (existingIdx >= 0) {
        const updated = [...prev];
        const newQty = updated[existingIdx].quantity + 1;
        if (newQty > product.currentStock) {
          setError(`Cannot add more: only ${product.currentStock} in stock for ${product.name}.`);
          return prev;
        }
        updated[existingIdx].quantity = newQty;
        return updated;
      } else {
        if (product.currentStock < 1) {
          setError(`${product.name} is currently out of stock.`);
          return prev;
        }
        return [
          ...prev,
          {
            item: product,
            quantity: 1,
            sellingPrice: Number(product.sellingPrice) || Number(product.unitCost) || 0,
          },
        ];
      }
    });
    setError('');
  };

  // Modify quantity
  const updateQuantity = (index, delta) => {
    setCart((prev) => {
      const updated = [...prev];
      const target = updated[index];
      const newQty = target.quantity + delta;

      if (newQty <= 0) {
        return updated.filter((_, idx) => idx !== index);
      }
      if (newQty > target.item.currentStock) {
        setError(`Only ${target.item.currentStock} units available for ${target.item.name}.`);
        return prev;
      }
      target.quantity = newQty;
      return updated;
    });
    setError('');
  };

  // Modify selling price for custom negotiations
  const updatePrice = (index, newPrice) => {
    setCart((prev) => {
      const updated = [...prev];
      updated[index].sellingPrice = newPrice;
      return updated;
    });
  };

  // Remove from cart
  const removeFromCart = (index) => {
    setCart((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Filter products for quick-add list
  const filteredProducts = catalogItems.filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      (p.sku && p.sku.toLowerCase().includes(q)) ||
      (p.category && p.category.toLowerCase().includes(q))
    );
  });

  const handleCheckout = async (e) => {
    e.preventDefault();

    if (cart.length === 0) {
      setError('Please add at least one product to the cart before checking out.');
      return;
    }

    // Build splits if method is SPLIT
    let paymentSplits = [];
    if (paymentMethod === 'SPLIT') {
      const upi = Number(splitUpi) || 0;
      const cash = Number(splitCash) || 0;
      const card = Number(splitCard) || 0;
      const udhar = Number(splitUdhar) || 0;
      const splitSum = Math.round((upi + cash + card + udhar) * 100) / 100;

      if (Math.abs(splitSum - totalSubtotal) > 0.05) {
        setError(
          `Split amounts total (₹${splitSum}) does not equal total bill (₹${totalSubtotal}). Difference: ₹${(
            totalSubtotal - splitSum
          ).toFixed(2)}`
        );
        return;
      }

      if (upi > 0) paymentSplits.push({ method: 'UPI', amount: upi });
      if (cash > 0) paymentSplits.push({ method: 'CASH', amount: cash });
      if (card > 0) paymentSplits.push({ method: 'CARD', amount: card });
      if (udhar > 0) paymentSplits.push({ method: 'CREDIT_UDHAR', amount: udhar });
    }

    setLoading(true);
    setError('');

    try {
      const payload = {
        items: cart.map((line) => ({
          itemId: line.item._id,
          sku: line.item.sku,
          name: line.item.name,
          quantity: Number(line.quantity),
          sellingPrice: Number(line.sellingPrice),
        })),
        paymentMethod,
        paymentSplits,
        customerNote: customerNote.trim() || undefined,
      };

      const res = await posCheckout(payload);

      if (onSuccess) {
        onSuccess(
          `Checkout successful! ₹${totalSubtotal} collected via ${paymentMethod} (${totalItemsCount} units sold).`
        );
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to complete POS sale.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1040 }}>
      <div
        className="modal-content"
        style={{
          maxWidth: '1000px',
          width: '95%',
          height: '88vh',
          maxHeight: '750px',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden',
          borderRadius: '14px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* POS Header */}
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            color: '#ffffff',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'rgba(37, 99, 235, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(59, 130, 246, 0.5)',
              }}
            >
              <ShoppingCart size={20} color="#60a5fa" />
            </div>
            <div>
              <h2 style={{ fontSize: '17px', fontWeight: 700, margin: 0, color: '#f8fafc' }}>
                Stoqra Fast Point-of-Sale (POS)
              </h2>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
                Quick checkout in &lt;3s • Multi-item cart • Instant UPI &amp; Cash logging
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '6px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: '10px 24px',
              backgroundColor: '#fef2f2',
              borderBottom: '1px solid #fee2e2',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              color: '#b91c1c',
              fontSize: '13px',
              flexShrink: 0,
            }}
          >
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <div className="pos-modal-layout" style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '1.15fr 0.85fr', overflow: 'hidden' }}>
          {/* Left Column: Product Selection & Catalog Grid */}
          <div
            className="pos-modal-left"
            style={{
              padding: '16px 18px',
              borderRight: '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: '#f8fafc',
              overflowY: 'auto',
              minHeight: 0,
            }}
          >
            {/* Search Input */}
            <div style={{ position: 'relative', marginBottom: '14px' }}>
              <Search
                size={16}
                color="#64748b"
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="text"
                className="form-control"
                style={{ paddingLeft: '36px', backgroundColor: '#ffffff' }}
                placeholder="Search products by name, SKU or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Catalog Grid */}
            {loadingCatalog ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b' }}>
                <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 8px auto' }} />
                <span>Loading products...</span>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#64748b', fontSize: '13px' }}>
                No matching products found.
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                  gap: '10px',
                }}
              >
                {filteredProducts.map((p) => {
                  const inCartLine = cart.find((c) => c.item._id === p._id);
                  const inCartQty = inCartLine ? inCartLine.quantity : 0;
                  const isOutOfStock = p.currentStock <= 0;

                  return (
                    <div
                      key={p._id}
                      onClick={() => addToCart(p)}
                      style={{
                        backgroundColor: '#ffffff',
                        border: '1px solid',
                        borderColor: inCartQty > 0 ? 'var(--primary)' : 'var(--border)',
                        borderRadius: '8px',
                        padding: '12px',
                        cursor: 'pointer',
                        position: 'relative',
                        transition: 'all 0.15s ease',
                        boxShadow: inCartQty > 0 ? '0 0 0 1px var(--primary)' : 'none',
                      }}
                    >
                      {inCartQty > 0 && (
                        <div
                          style={{
                            position: 'absolute',
                            top: '8px',
                            right: '8px',
                            backgroundColor: 'var(--primary)',
                            color: '#ffffff',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 7px',
                          }}
                        >
                          {inCartQty} in cart
                        </div>
                      )}
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: '13px',
                          color: '#0f172a',
                          marginBottom: '4px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {p.name}
                      </div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '8px' }}>
                        SKU: {p.sku}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '13px', fontWeight: 700, color: '#059669' }}>
                          {formatINR(p.sellingPrice || p.unitCost || 0)}
                        </span>
                        <span
                          style={{
                            fontSize: '11px',
                            color: isOutOfStock ? '#dc2626' : p.currentStock <= p.reorderLevel ? '#d97706' : '#64748b',
                            fontWeight: 600,
                          }}
                        >
                          {isOutOfStock ? 'Out of Stock' : `${p.currentStock} left`}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column: Checkout Cart & Quick Payment */}
          <div
            className="pos-modal-right"
            style={{
              padding: '16px 18px',
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: '#ffffff',
              overflowY: 'auto',
              minHeight: 0,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>
                Cart ({totalItemsCount} item{totalItemsCount !== 1 ? 's' : ''})
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => setShowQuickAdd(!showQuickAdd)}
                  style={{
                    backgroundColor: '#f0fdf4',
                    border: '1px solid #86efac',
                    color: '#166534',
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '3px 8px',
                    borderRadius: '5px',
                    cursor: 'pointer',
                  }}
                >
                  {showQuickAdd ? '✕ Cancel' : '+ Custom Item'}
                </button>
                {cart.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setCart([])}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#dc2626',
                      fontSize: '11px',
                      cursor: 'pointer',
                    }}
                  >
                    Clear All
                  </button>
                )}
              </div>
            </div>

            {/* Quick Custom Item Inline Form */}
            {showQuickAdd && (
              <div
                style={{
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #bbf7d0',
                  borderRadius: '6px',
                  padding: '10px',
                  marginBottom: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#166534' }}>
                  Add Custom Ad-Hoc Product
                </div>
                <input
                  type="text"
                  placeholder="Item Name (e.g. Paracetamol 500mg)"
                  className="form-control"
                  style={{ fontSize: '12px', padding: '5px 8px' }}
                  value={quickName}
                  onChange={(e) => setQuickName(e.target.value)}
                  autoFocus
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '8px' }}>
                  <div>
                    <label style={{ fontSize: '10px', color: '#166534' }}>Qty</label>
                    <input
                      type="number"
                      min="1"
                      className="form-control"
                      style={{ fontSize: '12px', padding: '4px 6px' }}
                      value={quickQty}
                      onChange={(e) => setQuickQty(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '10px', color: '#166534' }}>Selling Price (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      className="form-control"
                      style={{ fontSize: '12px', padding: '4px 6px' }}
                      value={quickPrice}
                      onChange={(e) => setQuickPrice(e.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ alignSelf: 'flex-end', padding: '6px 12px', fontSize: '12px', backgroundColor: '#16a34a', borderColor: '#15803d' }}
                    onClick={handleAddCustomItem}
                  >
                    Add
                  </button>
                </div>
              </div>
            )}

            {/* Cart Items List */}
            <div
              style={{
                flex: 1,
                minHeight: '140px',
                maxHeight: '220px',
                overflowY: 'auto',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '8px',
                marginBottom: '14px',
                backgroundColor: '#f8fafc',
              }}
            >
              {cart.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 10px', color: '#64748b', fontSize: '13px' }}>
                  <ShoppingCart size={24} color="#94a3b8" style={{ margin: '0 auto 6px auto', display: 'block' }} />
                  <div style={{ fontWeight: 600, color: '#334155' }}>Your Cart is Empty</div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                    Click items on the left to add, or click "+ Custom Item" above to add ad-hoc items.
                  </div>
                </div>
              ) : (
                cart.map((line, idx) => (
                  <div
                    key={line.item._id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 10px',
                      backgroundColor: '#ffffff',
                      borderRadius: '6px',
                      marginBottom: '6px',
                      border: '1px solid #e2e8f0',
                      gap: '8px',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: '12px',
                          fontWeight: 600,
                          color: '#0f172a',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {line.item.name}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>₹</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          style={{
                            width: '70px',
                            padding: '2px 4px',
                            fontSize: '11px',
                            borderRadius: '4px',
                            border: '1px solid #cbd5e1',
                          }}
                          value={line.sellingPrice}
                          onChange={(e) => updatePrice(idx, Number(e.target.value))}
                          title="Selling price per unit"
                        />
                      </div>
                    </div>

                    {/* Stepper buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        type="button"
                        onClick={() => updateQuantity(idx, -1)}
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '4px',
                          border: '1px solid #cbd5e1',
                          backgroundColor: '#f1f5f9',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Minus size={12} />
                      </button>
                      <span style={{ fontSize: '12px', fontWeight: 700, minWidth: '18px', textAlign: 'center' }}>
                        {line.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(idx, 1)}
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '4px',
                          border: '1px solid #cbd5e1',
                          backgroundColor: '#f1f5f9',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Plus size={12} />
                      </button>
                    </div>

                    <div style={{ textAlign: 'right', minWidth: '60px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a' }}>
                        {formatINR(line.quantity * line.sellingPrice)}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeFromCart(idx)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        padding: '4px',
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Bill Summary & Live Profit Snapshot */}
            <div
              style={{
                backgroundColor: '#f1f5f9',
                borderRadius: '8px',
                padding: '12px 14px',
                marginBottom: '14px',
                fontSize: '13px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', color: '#64748b' }}>
                <span>Subtotal ({totalItemsCount} units)</span>
                <span>{formatINR(totalSubtotal)}</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '6px',
                  color: projectedProfit >= 0 ? '#059669' : '#dc2626',
                  fontSize: '12px',
                  fontWeight: 600,
                }}
              >
                <span>Live Margin / Profit</span>
                <span>
                  {projectedProfit >= 0 ? '+' : ''}
                  {formatINR(projectedProfit)}
                </span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  borderTop: '1px solid #cbd5e1',
                  paddingTop: '6px',
                  fontWeight: 800,
                  fontSize: '16px',
                  color: '#0f172a',
                }}
              >
                <span>Total Due</span>
                <span style={{ color: '#2563eb' }}>{formatINR(totalSubtotal)}</span>
              </div>
            </div>

            {/* Quick 1-Click Payment Mode Buttons */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#334155', display: 'block', marginBottom: '6px' }}>
                Payment Method
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginBottom: '6px' }}>
                {[
                  { id: 'UPI', label: 'UPI / QR', icon: <IndianRupee size={13} /> },
                  { id: 'CASH', label: 'Cash', icon: <Banknote size={13} /> },
                  { id: 'CARD', label: 'Card', icon: <CreditCard size={13} /> },
                  { id: 'CREDIT_UDHAR', label: 'Udhar', icon: <Users size={13} /> },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setPaymentMethod(mode.id)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '8px 4px',
                      borderRadius: '6px',
                      border: '1px solid',
                      borderColor: paymentMethod === mode.id ? 'var(--primary)' : 'var(--border)',
                      backgroundColor: paymentMethod === mode.id ? 'var(--primary-light)' : '#ffffff',
                      color: paymentMethod === mode.id ? 'var(--primary)' : 'var(--text-main)',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      gap: '3px',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {mode.icon}
                    {mode.label}
                  </button>
                ))}
              </div>

              {/* Split Toggle */}
              <button
                type="button"
                onClick={() => setPaymentMethod(paymentMethod === 'SPLIT' ? 'UPI' : 'SPLIT')}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '6px',
                  borderRadius: '6px',
                  border: '1px dashed',
                  borderColor: paymentMethod === 'SPLIT' ? 'var(--primary)' : '#cbd5e1',
                  backgroundColor: paymentMethod === 'SPLIT' ? '#eff6ff' : '#ffffff',
                  color: paymentMethod === 'SPLIT' ? 'var(--primary)' : '#64748b',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <Percent size={12} />
                {paymentMethod === 'SPLIT' ? 'Using Split Payment (Active)' : 'Enable Split Payment (UPI + Cash / Card)'}
              </button>
            </div>

            {/* Split Amount Inputs */}
            {paymentMethod === 'SPLIT' && (
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  padding: '10px',
                  marginBottom: '14px',
                  fontSize: '12px',
                }}
              >
                <div style={{ fontWeight: 600, marginBottom: '6px', color: '#0f172a' }}>Split Breakdown:</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <div>
                    <label style={{ fontSize: '11px', color: '#64748b' }}>UPI (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      style={{ padding: '4px 8px', fontSize: '12px' }}
                      value={splitUpi}
                      onChange={(e) => setSplitUpi(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: '#64748b' }}>Cash (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      style={{ padding: '4px 8px', fontSize: '12px' }}
                      value={splitCash}
                      onChange={(e) => setSplitCash(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: '#64748b' }}>Card (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      style={{ padding: '4px 8px', fontSize: '12px' }}
                      value={splitCard}
                      onChange={(e) => setSplitCard(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', color: '#64748b' }}>Udhar (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      style={{ padding: '4px 8px', fontSize: '12px' }}
                      value={splitUdhar}
                      onChange={(e) => setSplitUdhar(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Note / Customer Info */}
            <div style={{ marginBottom: '14px' }}>
              <input
                type="text"
                className="form-control"
                style={{ fontSize: '12px' }}
                placeholder="Customer Name or Note (Optional)..."
                value={customerNote}
                onChange={(e) => setCustomerNote(e.target.value)}
              />
            </div>

          </div>
        </div>

        {/* Pinned Dedicated Footer with Always-Visible Save Sale Button */}
        <div
          className="pos-modal-footer"
          style={{
            padding: '12px 24px',
            borderTop: '1px solid var(--border)',
            backgroundColor: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            flexShrink: 0,
            boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.05)',
            zIndex: 20,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div>
              <span style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600, display: 'block' }}>
                Total Due
              </span>
              <span style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a' }}>
                {formatINR(totalSubtotal)}
              </span>
            </div>
            <span style={{ height: '28px', width: '1px', backgroundColor: '#e2e8f0' }} />
            <span
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: '#2563eb',
                backgroundColor: '#eff6ff',
                padding: '4px 10px',
                borderRadius: '6px',
                border: '1px solid #bfdbfe',
              }}
            >
              {paymentMethod}
            </span>
            {totalItemsCount > 0 && (
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 500 }}>
                ({totalItemsCount} unit{totalItemsCount !== 1 ? 's' : ''})
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              style={{ padding: '10px 18px', fontSize: '13px' }}
            >
              Cancel
            </button>

            <button
              type="button"
              className="btn btn-primary"
              disabled={loading || cart.length === 0}
              onClick={handleCheckout}
              style={{
                padding: '12px 28px',
                fontSize: '15px',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: cart.length > 0 ? '#16a34a' : '#94a3b8',
                borderColor: cart.length > 0 ? '#15803d' : '#cbd5e1',
                cursor: cart.length > 0 ? 'pointer' : 'not-allowed',
                boxShadow: cart.length > 0 ? '0 4px 12px rgba(22, 163, 74, 0.35)' : 'none',
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Saving Sale to Ledger...
                </>
              ) : cart.length === 0 ? (
                <>
                  <ShoppingCart size={18} />
                  Add Products to Save Sale
                </>
              ) : (
                <>
                  <Check size={18} />
                  Save &amp; Complete Sale ({formatINR(totalSubtotal)})
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecordSaleModal;
