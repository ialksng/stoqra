import mongoose from 'mongoose';

const processedMailSchema = new mongoose.Schema(
  {
    messageId: {
      type: String,
      required: [true, 'messageId is required'],
      unique: true,
      trim: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['PROCESSED', 'SKIPPED', 'NO_ITEMS', 'DUPLICATE', 'ERROR'],
      default: 'PROCESSED',
      index: true,
    },
    invoiceNumber: {
      type: String,
      trim: true,
      index: true,
    },
    reason: {
      type: String,
      trim: true,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

const ProcessedMail = mongoose.model('ProcessedMail', processedMailSchema);

export default ProcessedMail;
