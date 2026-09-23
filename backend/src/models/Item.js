import mongoose from 'mongoose';

const itemSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: [true, 'Organization ID is required'],
      index: true,
    },
    sku: {
      type: String,
      required: [true, 'SKU is required'],
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: [true, 'Item name is required'],
      trim: true,
      index: true,
    },
    currentStock: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Current stock cannot be negative'],
    },
    unitCost: {
      type: Number,
      default: 0,
      min: [0, 'Unit cost cannot be negative'],
    },
    sellingPrice: {
      type: Number,
      default: 0,
      min: [0, 'Selling price cannot be negative'],
    },
    reorderLevel: {
      type: Number,
      default: 10,
      min: [0, 'Reorder level cannot be negative'],
    },
    category: {
      type: String,
      trim: true,
      default: 'General',
      index: true,
    },
    supplier: {
      type: String,
      trim: true,
      default: 'Direct Supplier',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index: SKU is unique per organization (not globally)
itemSchema.index({ sku: 1, organizationId: 1 }, { unique: true });
itemSchema.index({ name: 'text', sku: 'text' });

const Item = mongoose.model('Item', itemSchema);

export default Item;
