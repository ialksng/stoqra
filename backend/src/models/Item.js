import mongoose from 'mongoose';

const itemSchema = new mongoose.Schema(
  {
    sku: {
      type: String,
      required: [true, 'SKU is required'],
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
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

// Compound indexes or search indexes if needed
itemSchema.index({ name: 'text', sku: 'text' });

const Item = mongoose.model('Item', itemSchema);

export default Item;
