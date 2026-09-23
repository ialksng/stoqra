import mongoose from 'mongoose';

const STORE_TYPES = [
  'Medical & Pharmacy',
  'Electronics',
  'FMCG & Grocery',
  'Clothing & Apparel',
  'Restaurant & Food',
  'Hardware & Tools',
  'General Retail',
  'Stationery & Office',
  'Automotive Parts',
  'Cosmetics & Beauty',
  'Agriculture & Seeds',
  'Furniture & Home',
  'Sports & Fitness',
  'Books & Education',
  'Other',
];

const organizationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Store name is required'],
      trim: true,
    },
    type: {
      type: String,
      required: [true, 'Store type is required'],
      enum: {
        values: STORE_TYPES,
        message: '{VALUE} is not a valid store type',
      },
      default: 'General Retail',
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Short slug for display
    slug: {
      type: String,
      trim: true,
      lowercase: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export const STORE_TYPES_LIST = STORE_TYPES;
const Organization = mongoose.model('Organization', organizationSchema);

export default Organization;
