import Razorpay from 'razorpay';
import crypto from 'crypto';
import dotenv from 'dotenv';
import Order from '../models/Order.js';
import Cart from '../models/Cart.js';
import Product from '../models/Product.js';
import Address from '../models/Address.js';

dotenv.config();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// @desc    Create a Razorpay order ID (for frontend modal)
// @route   POST /api/payment/razorpay
const createRazorpayOrder = async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount <= 0) return res.status(400).json({ message: 'Invalid amount' });

    const options = {
      amount: Math.round(amount * 100),
      currency: 'INR',
      receipt: `receipt_order_${Date.now()}`,
    };
    const order = await razorpay.orders.create(options);
    res.status(200).json(order);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create payment order' });
  }
};

// @desc    Verify payment AND then create the database order
// @route   POST /api/payment/verify-and-order
const verifyAndOrder = async (req, res) => {
  try {
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature,
      orderDetails 
    } = req.body;

    const { addressId, promoCode, discount, deliveryFee, gstAmount } = orderDetails;

    // 1. Verify Signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: "Invalid payment signature" });
    }

    // 2. Signature match! Now create the order (Logic copied from orderController)
    const address = await Address.findOne({ _id: addressId, user: req.user._id });
    if (!address) return res.status(404).json({ message: 'Address not found' });

    const cartItems = await Cart.find({ user: req.user._id }).populate('product');
    if (!cartItems || cartItems.length === 0) return res.status(400).json({ message: 'Cart is empty' });

    const orderItems = [];
    for (const item of cartItems) {
      const product = item.product;
      if (!product) continue;

      let itemImage = product.image;
      if (item.selectedColor && product.colors?.length > 0) {
        const variant = product.colors.find(c => 
          (c.name?.toLowerCase().trim() === item.selectedColor.toLowerCase().trim()) || 
          (c.code?.toLowerCase().trim() === item.selectedColor.toLowerCase().trim())
        );
        if (variant?.images?.length > 0) itemImage = variant.images[0].url;
      }

      orderItems.push({
        product: product._id,
        name: product.name,
        image: itemImage || '',
        price: product.price,
        quantity: item.quantity,
        selectedColor: item.selectedColor,
      });
    }

    const subtotal = orderItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const totalPrice = Math.max(0, subtotal + deliveryFee + gstAmount - discount);

    const order = await Order.create({
      user: req.user._id,
      items: orderItems,
      shippingAddress: {
        fullName: address.fullName,
        phone: address.phone,
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2 || '',
        city: address.city,
        state: address.state,
        postalCode: address.postalCode,
        country: address.country,
      },
      paymentMethod: 'Razorpay',
      paymentResult: { id: razorpay_payment_id, orderId: razorpay_order_id, signature: razorpay_signature },
      isPaid: true,
      paidAt: Date.now(),
      status: 'confirmed',
      promoCode,
      subtotal,
      discount,
      deliveryFee,
      totalPrice,
    });

    // Deduct stock
    for (const item of orderItems) {
      if (item.selectedColor) {
        await Product.updateOne(
          { _id: item.product, "colors.name": item.selectedColor },
          { $inc: { "colors.$.countInStock": -item.quantity, countInStock: -item.quantity } }
        );
        await Product.updateOne(
          { _id: item.product, "colors.code": item.selectedColor, "colors.name": { $ne: item.selectedColor } },
          { $inc: { "colors.$.countInStock": -item.quantity, countInStock: -item.quantity } }
        );
      } else {
        await Product.findByIdAndUpdate(item.product, { $inc: { countInStock: -item.quantity } });
      }
    }

    // Clear user's cart
    await Cart.deleteMany({ user: req.user._id });

    res.status(201).json({ success: true, order });
  } catch (error) {
    console.error('Verify and Order Error:', error);
    res.status(500).json({ message: 'Server Error during order finalization' });
  }
};

export { createRazorpayOrder, verifyAndOrder as verifyPayment };
