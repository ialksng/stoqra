import React from 'react';
import { Search, Filter, ShoppingCart, ChevronLeft, ChevronRight, RefreshCw, AlertTriangle, FileSpreadsheet, Edit3, Trash2, PlusCircle } from 'lucide-react';
import { formatINR, formatIndianNumber } from '../utils/formatters.js';
import { exportInventoryToExcel } from '../utils/excelExport.js';

export const InventoryTable = ({
  items,
  pagination,
  loading,
  search,
  setSearch,
  lowStockOnly,
  setLowStockOnly,
  page,
  setPage,
  onOpenAddItem,
  onOpenSaleModal,
  onEditItem,
  onDeleteItem,
  onRefresh,
}) => {
  return (
    <div className="table-card">
      <div className="table-header-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <Search
              size={18}
              color="#94a3b8"
              style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
            />
            <input
              type="text"
              placeholder="Search by SKU or item name..."
              className="search-input"
              style={{ paddingLeft: '36px' }}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              userSelect: 'none',
              padding: '6px 12px',
              borderRadius: '8px',
              backgroundColor: lowStockOnly ? 'var(--warning-light)' : '#f1f5f9',
              color: lowStockOnly ? '#92400e' : '#475569',
              border: '1px solid',
              borderColor: lowStockOnly ? '#fde68a' : '#e2e8f0',
            }}
          >
            <input
              type="checkbox"
              checked={lowStockOnly}
              onChange={(e) => {
                setLowStockOnly(e.target.checked);
                setPage(1);
              }}
              style={{ cursor: 'pointer' }}
            />
            <Filter size={14} />
            Low Stock Only
          </label>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {onOpenAddItem && (
            <button
              className="btn btn-primary btn-sm"
              onClick={onOpenAddItem}
              title="Add a new product manually"
            >
              <PlusCircle size={14} />
              <span>Add Product</span>
            </button>
          )}

          <button
            className="btn btn-secondary btn-sm"
            onClick={() => exportInventoryToExcel(items)}
            disabled={!items || items.length === 0}
            title="Export current inventory catalog to Excel (.xlsx)"
          >
            <FileSpreadsheet size={14} />
            Export Excel
          </button>

          <button className="btn btn-secondary btn-sm" onClick={onRefresh} title="Refresh Table">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>Product Name</th>
              <th>Category</th>
              <th>Supplier</th>
              <th>Current Stock</th>
              <th>Reorder Level</th>
              <th>Unit Cost (₹)</th>
              <th>Selling Price (₹)</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="10" style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                  Loading catalog inventory...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan="10" style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  No inventory items match the current filters.
                </td>
              </tr>
            ) : (
              items.map((item) => {
                const isOutOfStock = item.currentStock <= 0;
                const isLowStock = item.currentStock <= item.reorderLevel;

                let statusBadge = <span className="badge badge-success">In Stock</span>;
                if (isOutOfStock) {
                  statusBadge = <span className="badge badge-danger">Out of Stock</span>;
                } else if (isLowStock) {
                  statusBadge = <span className="badge badge-warning">Low Stock ({formatIndianNumber(item.currentStock)}/{formatIndianNumber(item.reorderLevel)})</span>;
                }

                return (
                  <tr key={item._id}>
                    <td>
                      <strong>{item.sku}</strong>
                    </td>
                    <td>{item.name}</td>
                    <td>
                      <span className="badge badge-neutral" style={{ fontSize: '11px' }}>
                        {item.category || 'General'}
                      </span>
                    </td>
                    <td style={{ fontSize: '12px', color: '#475569' }}>
                      {item.supplier || 'Direct Supplier'}
                    </td>
                    <td>
                      <span
                        style={{
                          fontWeight: 700,
                          color: isOutOfStock ? '#dc2626' : isLowStock ? '#d97706' : '#1e293b',
                        }}
                      >
                        {formatIndianNumber(item.currentStock)}
                      </span>
                    </td>
                    <td>{formatIndianNumber(item.reorderLevel)}</td>
                    <td>{formatINR(item.unitCost)}</td>
                    <td>{formatINR(item.sellingPrice)}</td>
                    <td>{statusBadge}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => onOpenSaleModal(item)}
                          disabled={item.currentStock <= 0}
                          style={{ opacity: item.currentStock <= 0 ? 0.5 : 1 }}
                          title={item.currentStock <= 0 ? 'Cannot sell out of stock item' : 'Record sale'}
                        >
                          <ShoppingCart size={13} />
                          Sell
                        </button>

                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => onEditItem(item)}
                          title="Edit item properties"
                        >
                          <Edit3 size={13} />
                          Edit
                        </button>

                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => onDeleteItem(item)}
                          title="Delete item"
                          style={{ color: '#dc2626' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      {pagination && pagination.totalPages > 1 && (
        <div
          style={{
            padding: '14px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: '1px solid var(--border)',
            fontSize: '13px',
            color: '#64748b',
          }}
        >
          <div>
            Showing {(page - 1) * pagination.limit + 1} to{' '}
            {Math.min(page * pagination.limit, pagination.total)} of {pagination.total} items
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="btn btn-secondary btn-sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft size={14} /> Previous
            </button>
            <span style={{ display: 'flex', alignItems: 'center', padding: '0 8px', fontWeight: 600 }}>
              Page {page} of {pagination.totalPages}
            </span>
            <button
              className="btn btn-secondary btn-sm"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryTable;
