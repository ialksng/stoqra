import mongoose from 'mongoose';

const stagedInvoiceItemSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  sku: { type: String, trim: true },
  category: { type: String, default: 'General', trim: true },
  quantity: { type: Number, required: true, default: 1 },
  costPrice: { type: Number, required: true, default: 0 },
  sellingPrice: { type: Number, default: 0 },
  selected: { type: Boolean, default: true },
});

const stagedInvoiceSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    messageId: {
      type: String,
      trim: true,
      index: true,
      default: null,
    },
    invoiceNumber: {
      type: String,
      required: true,
      trim: true,
    },
    vendorName: {
      type: String,
      required: true,
      trim: true,
    },
    invoiceDate: {
      type: Date,
      default: Date.now,
    },
    totalAmount: {
      type: Number,
      default: 0,
    },
    taxAmount: {
      type: Number,
      default: 0,
    },
    items: [stagedInvoiceItemSchema],
    status: {
      type: String,
      enum: ['PENDING_REVIEW', 'APPROVED', 'REJECTED'],
      default: 'PENDING_REVIEW',
      index: true,
    },
    source: {
      type: String,
      enum: ['GMAIL', 'MANUAL_UPLOAD'],
      default: 'GMAIL',
    },
  },
  {
    timestamps: true,
  }
);

stagedInvoiceSchema.index({ organizationId: 1, status: 1, createdAt: -1 });

const StagedInvoice = mongoose.model('StagedInvoice', stagedInvoiceSchema);

export default StagedInvoice;
