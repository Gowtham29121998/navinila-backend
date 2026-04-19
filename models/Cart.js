import mongoose from 'mongoose';

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    quantity: {
      type: Number,
      default: 1,
      min: 1
    },
    selectedColor: {
      type: String,
      default: null
    },
    image: { type: String },
    images: [{ url: String, public_id: String }]
  },
  {
    timestamps: true,
  }
);

// Ensuring a user can't have duplicate cart entries for the same product and color
cartSchema.index({ user: 1, product: 1, selectedColor: 1 }, { unique: true });

export default mongoose.model('Cart', cartSchema);
