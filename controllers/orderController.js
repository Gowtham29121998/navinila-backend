import Order from '../models/Order.js';
import Cart from '../models/Cart.js';
import Product from '../models/Product.js';
import Address from '../models/Address.js';

// @desc    Create a new order
// @route   POST /api/orders
// @access  Private
const createOrder = async (req, res) => {
  try {
    const { addressId, paymentMethod = 'Cash on Delivery', promoCode = '', discount = 0, deliveryFee = 0 } = req.body;

    // 1. Validate address belongs to user
    const address = await Address.findOne({ _id: addressId, user: req.user._id });
    if (!address) {
      return res.status(404).json({ message: 'Address not found' });
    }

    // 2. Get cart items with product details
    const cartItems = await Cart.find({ user: req.user._id }).populate('product');
    if (!cartItems || cartItems.length === 0) {
      return res.status(400).json({ message: 'Cart is empty' });
    }

    // 3. Validate stock and build order items
    const orderItems = [];
    for (const item of cartItems) {
      const product = item.product;
      if (!product) continue;

      let availableStock = product.countInStock;

      // If color was selected, check variant stock
      if (item.selectedColor) {
        const variant = product.colors.find(c => c.name === item.selectedColor || c.code === item.selectedColor);
        if (variant) {
          availableStock = variant.countInStock;
        }
      }

      if (availableStock < item.quantity) {
        return res.status(400).json({
          message: `Insufficient stock for "${product.name}"${item.selectedColor ? ` in color ${item.selectedColor}` : ""}. Available: ${availableStock}`,
        });
      }

      // Determine the specific images for this variant
      let itemImage = product.image;
      let itemImages = !product.showColors ? product.images : [];

      if (item.selectedColor && product.colors?.length > 0) {
        const variant = product.colors.find(c => 
          (c.name?.toLowerCase().trim() === item.selectedColor.toLowerCase().trim()) || 
          (c.code?.toLowerCase().trim() === item.selectedColor.toLowerCase().trim())
        );
        if (variant) {
            itemImages = variant.images || [];
            if (itemImages.length > 0) {
                itemImage = itemImages[0].url;
            }
        }
      }

      orderItems.push({
        product: product._id,
        name: product.name,
        image: itemImage || '',
        images: itemImages,
        price: product.price,
        quantity: item.quantity,
        selectedColor: item.selectedColor,
      });
    }

    if (orderItems.length === 0) {
      return res.status(400).json({ message: 'No valid items to order' });
    }

    // 4. Calculate subtotal
    const subtotal = orderItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const totalPrice = Math.max(0, subtotal + deliveryFee - discount);

    // 5. Create the order
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
        lat: address.lat,
        lng: address.lng,
      },
      paymentMethod,
      promoCode,
      subtotal,
      discount,
      deliveryFee,
      totalPrice,
    });

    // 6. Deduct stock (atomic updates for variants)
    for (const item of orderItems) {
      if (item.selectedColor) {
        // Try to decrement variant stock first
        await Product.updateOne(
          { _id: item.product, "colors.name": item.selectedColor },
          { $inc: { "colors.$.countInStock": -item.quantity, countInStock: -item.quantity } }
        );
        // If name didn't match, maybe it was a code
        await Product.updateOne(
          { _id: item.product, "colors.code": item.selectedColor, "colors.name": { $ne: item.selectedColor } },
          { $inc: { "colors.$.countInStock": -item.quantity, countInStock: -item.quantity } }
        );
      } else {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { countInStock: -item.quantity },
        });
      }
    }

    // 7. Clear user's cart
    await Cart.deleteMany({ user: req.user._id });

    res.status(201).json({
      order,
      cart: [], // empty cart to sync frontend
    });
  } catch (error) {
    console.error('Order creation error:', error);
    res.status(500).json({ message: error.message || 'Server Error' });
  }
};

// @desc    Get logged-in user's orders
// @route   GET /api/orders/my
// @access  Private
const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .populate('items.product', 'name image price');
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
const getOrderById = async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user._id })
      .populate('items.product', 'name image price brand');
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get ALL orders (admin)
// @route   GET /api/orders
// @access  Private/Admin
const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find({})
      .sort({ createdAt: -1 })
      .populate('user', 'username email')
      .populate('items.product', 'name image');
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Update order status (admin)
// @route   PUT /api/orders/:id/status
// @access  Private/Admin
const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status, ...(status === 'delivered' ? { isDelivered: true, deliveredAt: new Date() } : {}) },
      { new: true }
    );
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

export { createOrder, getMyOrders, getOrderById, getAllOrders, updateOrderStatus };
