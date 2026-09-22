import mongoose from 'mongoose';

const inventoryTransactionSchema = new mongoose.Schema(
  {
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Item',
      required: [true, 'Item ID reference is required'],
      index: true,
    },
    type: {
      type: String,
      enum: {
        values: ['PURCHASE_INVOICE', 'SALE', 'ADJUSTMENT'],
        message: '{VALUE} is not a supported transaction type',
      },
      required: [true, 'Transaction type is required'],
      index: true,
    },
    quantityDelta: {
      type: Number,
      required: [true, 'Quantity delta is required'],
    },
    unitPrice: {
      type: Number,
      default: 0,
    },
    sourceReference: {
      type: String,
      trim: true,
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    versionKey: false,
  }
);

// Compound index for time-range sales velocity queries
inventoryTransactionSchema.index({ type: 1, createdAt: -1 });
inventoryTransactionSchema.index({ itemId: 1, type: 1, createdAt: -1 });

const InventoryTransaction = mongoose.model('InventoryTransaction', inventoryTransactionSchema);

export default InventoryTransaction;
