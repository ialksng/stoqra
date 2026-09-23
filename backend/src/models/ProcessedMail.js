import mongoose from 'mongoose';

const processedMailSchema = new mongoose.Schema(
  {
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      index: true,
      default: null,
    },
    messageId: {
      type: String,
      required: [true, 'messageId is required'],
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

// messageId unique per org
processedMailSchema.index({ messageId: 1, organizationId: 1 }, { unique: true });

const ProcessedMail = mongoose.model('ProcessedMail', processedMailSchema);

export default ProcessedMail;
