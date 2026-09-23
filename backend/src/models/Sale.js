import mongoose from 'mongoose';

const saleItemSchema = new mongoose.Schema({
  itemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item',
    required: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  sku: {
    type: String,
    trim: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity must be at least 1'],
  },
  unitCostPrice: {
    type: Number,
    required: true,
    default: 0,
  },
  unitSellingPrice: {
    type: Number,
    required: true,
    default: 0,
  },
  subtotal: {
    type: Number,
    required: true,
    default: 0,
  },
});

const saleSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    items: [saleItemSchema],
    totalAmount: {
      type: Number,
      required: true,
      min: [0, 'Total amount cannot be negative'],
    },
    totalProfit: {
      type: Number,
      required: true,
      default: 0,
    },
    paymentMethod: {
      type: String,
      enum: {
        values: ['CASH', 'UPI', 'CARD', 'CREDIT_UDHAR', 'SPLIT'],
        message: '{VALUE} is not a valid payment method',
      },
      default: 'UPI',
      index: true,
    },
    paymentSplits: [
      {
        method: {
          type: String,
          enum: ['CASH', 'UPI', 'CARD', 'CREDIT_UDHAR'],
        },
        amount: {
          type: Number,
          default: 0,
        },
      },
    ],
    customerNote: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

saleSchema.index({ organizationId: 1, createdAt: -1 });
saleSchema.index({ organizationId: 1, paymentMethod: 1, createdAt: -1 });

const Sale = mongoose.model('Sale', saleSchema);

export default Sale;
