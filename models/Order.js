import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  name: { type: String, required: true },
  image: { type: String }, // First image for quick view
  images: [{ url: String, public_id: String }], // Entire set of images for this variant
  price: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
  selectedColor: { type: String }, // Stores color name/code chosen by user
});

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    items: [orderItemSchema],

    shippingAddress: {
      fullName: { type: String, required: true },
      phone: { type: String, required: true },
      addressLine1: { type: String, required: true },
      addressLine2: { type: String, default: '' },
      city: { type: String, required: true },
      state: { type: String, required: true },
      postalCode: { type: String, required: true },
      country: { type: String, required: true },
      lat: { type: Number },
      lng: { type: Number },
    },

    paymentMethod: {
      type: String,
      enum: ['Cash on Delivery', 'Razorpay'],
      default: 'Cash on Delivery',
    },
    paymentResult: {
      id: { type: String }, // razorpay_payment_id
      orderId: { type: String }, // razorpay_order_id
      signature: { type: String }, // razorpay_signature
    },

    promoCode: { type: String, default: '' },
    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    deliveryFee: { type: Number, default: 0 },
    totalPrice: { type: Number, required: true },

    status: {
      type: String,
      enum: ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'],
      default: 'pending',
    },

    isPaid: { type: Boolean, default: false },
    paidAt: { type: Date },
    isDelivered: { type: Boolean, default: false },
    deliveredAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model('Order', orderSchema);
