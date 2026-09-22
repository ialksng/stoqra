import mongoose from 'mongoose';

const invoiceItemSchema = new mongoose.Schema(
  {
    sku: {
      type: String,
      trim: true,
      uppercase: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    unitCost: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);

const invoiceSchema = new mongoose.Schema(
  {
    messageId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      index: true,
    },
    invoiceNumber: {
      type: String,
      required: [true, 'Invoice number is required'],
      trim: true,
      index: true,
    },
    vendor: {
      type: String,
      trim: true,
      default: 'Unknown Vendor',
    },
    totalAmount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: {
        values: ['PROCESSED', 'FAILED'],
        message: '{VALUE} is not a valid invoice status',
      },
      default: 'PROCESSED',
      index: true,
    },
    errorMessage: {
      type: String,
      default: null,
    },
    items: {
      type: [invoiceItemSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

const Invoice = mongoose.model('Invoice', invoiceSchema);

export default Invoice;
