import User from '../models/User.js';
import Cart from '../models/Cart.js';
import Favorite from '../models/Favorite.js';
import jwt from 'jsonwebtoken';
import Product from '../models/Product.js';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import sendEmail from '../utils/sendEmail.js';

// Helper function to generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// @desc    Register a new user
// @route   POST /api/users/signup
// @access  Public
const signup = async (req, res) => {
  const { username, email, phone } = req.body;

  try {
    const existingPhoneUser = await User.findOne({ phone });
    if (existingPhoneUser && existingPhoneUser.email !== email) {
      return res.status(400).json({ message: 'User with this phone number already exists' });
    }

    let user = await User.findOne({ email }).select('+password');

    if (user) {
      if (user.password) {
        return res.status(400).json({ message: 'User with this email already exists' });
      } else {
        // User exists but hasn't set password. Resend setup link.
        const setupToken = crypto.randomBytes(20).toString('hex');
        user.resetPasswordToken = crypto.createHash('sha256').update(setupToken).digest('hex');
        user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 mins

        await user.save();

        const setupUrl = `${process.env.FRONTEND_URL}/set-password/${setupToken}`;

        await sendEmail({
          email: user.email,
          subject: 'Complete your Navinila Registration',
          message: `Please complete your registration by setting your password at: \n\n ${setupUrl}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
              <h2 style="color: #38bdf8; text-align: center;">Complete Your Registration</h2>
              <p>Hello ${user.username || 'User'},</p>
              <p>You requested to sign up for a Navinila account. Click the button below to set your password and complete your registration:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${setupUrl}" style="background-color: #38bdf8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Set Password</a>
              </div>
              <p>This link will expire in 10 minutes.</p>
              <p>If you didn't request this, please ignore this email.</p>
              <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
              <p style="font-size: 12px; color: #94a3b8; text-align: center;">&copy; ${new Date().getFullYear()} Navinila. All rights reserved.</p>
            </div>
          `
        });

        return res.status(200).json({ message: 'Account exists but password is not set. A new setup link has been sent to your email.' });
      }
    }

    user = await User.create({
      username,
      email,
      phone,
    });

    const setupToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(setupToken).digest('hex');
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 mins

    await user.save();

    const setupUrl = `${process.env.FRONTEND_URL}/set-password/${setupToken}`;

    await sendEmail({
      email: user.email,
      subject: 'Complete your Navinila Registration',
      message: `Welcome to Navinila! Please complete your registration by setting your password at: \n\n ${setupUrl}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
          <h2 style="color: #38bdf8; text-align: center;">Complete Your Registration</h2>
          <p>Hello ${user.username || 'User'},</p>
          <p>Welcome to Navinila! Click the button below to set your password and complete your registration:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${setupUrl}" style="background-color: #38bdf8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Set Password</a>
          </div>
          <p>This link will expire in 10 minutes.</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="font-size: 12px; color: #94a3b8; text-align: center;">&copy; ${new Date().getFullYear()} Navinila. All rights reserved.</p>
        </div>
      `
    });

    res.status(201).json({
      message: 'Registration started! Please check your email to set your password.',
    });
  } catch (error) {
    if (error.code === 11000) {
      if (error.keyPattern && error.keyPattern.phone) {
        return res.status(400).json({ message: 'User with this phone number already exists' });
      }
      if (error.keyPattern && error.keyPattern.email) {
        return res.status(400).json({ message: 'User with this email already exists' });
      }
      return res.status(400).json({ message: 'An account with this information already exists' });
    }
    res.status(500).json({ message: error.message });
  }
};

// @desc    Sign in user
// @route   POST /api/users/signin
// @access  Public
const signin = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Need to include password in select
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (!user.password) {
      // User hasn't set password yet. Resend setup link.
      const setupToken = crypto.randomBytes(20).toString('hex');
      user.resetPasswordToken = crypto.createHash('sha256').update(setupToken).digest('hex');
      user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 mins
      await user.save();

      const setupUrl = `${process.env.FRONTEND_URL}/set-password/${setupToken}`;
      
      try {
        await sendEmail({
          email: user.email,
          subject: 'Complete your Navinila Registration',
          message: `Please complete your registration by setting your password at: \n\n ${setupUrl}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
              <h2 style="color: #38bdf8; text-align: center;">Complete Your Registration</h2>
              <p>Hello ${user.username || 'User'},</p>
              <p>You tried to sign in but haven't set a password yet. Click the button below to set your password:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${setupUrl}" style="background-color: #38bdf8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Set Password</a>
              </div>
              <p>This link will expire in 10 minutes.</p>
              <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
              <p style="font-size: 12px; color: #94a3b8; text-align: center;">&copy; ${new Date().getFullYear()} Navinila. All rights reserved.</p>
            </div>
          `
        });
      } catch (err) {
        console.error("Email error:", err);
      }

      return res.status(403).json({ message: 'You haven\'t set a password yet. A setup link has been sent to your email.' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = generateToken(user._id);
    user.currentSessionToken = token;
    await user.save();

    // Fetch separate collections
    const [cart, favorites] = await Promise.all([
      Cart.find({ user: user._id }).populate('product'),
      Favorite.find({ user: user._id })
    ]);

    res.status(200).json({
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        role: user.role,
        favorites: favorites.map(f => f.product.toString()),
        cart: cart,
      },
      token,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Forgot Password - Send reset link
// @route   POST /api/users/forgotpassword
const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'There is no user with that email' });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 mins

    await user.save();

    // Reset URL
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    const message = `You are receiving this email because you (or someone else) has requested the reset of a password. Please make a PUT request to: \n\n ${resetUrl}`;

    try {
      await sendEmail({
        email: user.email,
        subject: 'Password reset token',
        message,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 10px;">
            <h2 style="color: #38bdf8; text-align: center;">Password Reset Request</h2>
            <p>Hello ${user.username || 'User'},</p>
            <p>You requested a password reset for your Navinila account. Click the button below to reset it:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background-color: #38bdf8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Password</a>
            </div>
            <p>This link will expire in 10 minutes.</p>
            <p>If you didn't request this, please ignore this email.</p>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="font-size: 12px; color: #94a3b8; text-align: center;">&copy; ${new Date().getFullYear()} Navinila. All rights reserved.</p>
          </div>
        `
      });

      res.status(200).json({
        success: true,
        message: 'Email sent',
      });
    } catch (err) {
      console.error(err);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;

      await user.save();

      return res.status(500).json({ message: 'Email could not be sent' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Reset Password
// @route   PUT /api/users/resetpassword/:resettoken
const resetPassword = async (req, res) => {
  try {
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.resettoken)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    // Set new password
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    
    // Generate token for automatic login
    const token = generateToken(user._id);
    user.currentSessionToken = token;
    await user.save();

    // Fetch separate collections for user data
    const [cart, favorites] = await Promise.all([
      Cart.find({ user: user._id }).populate('product'),
      Favorite.find({ user: user._id })
    ]);

    res.status(200).json({ 
      success: true, 
      message: 'Password update successful. Logging you in...',
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        role: user.role,
        favorites: favorites.map(f => f.product.toString()),
        cart: cart,
      },
      token,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add product to favorites
const addToFavorites = async (req, res) => {
  const { productId } = req.body;
  try {
    const existing = await Favorite.findOne({ user: req.user._id, product: productId });
    if (existing) return res.status(400).json({ message: 'Product already in favorites' });
    await Favorite.create({ user: req.user._id, product: productId });
    const favorites = await Favorite.find({ user: req.user._id });
    res.status(200).json({ message: 'Product added to favorites', favorites: favorites.map(f => f.product.toString()) });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const removeFromFavorites = async (req, res) => {
  const { productId } = req.params;
  try {
    await Favorite.findOneAndDelete({ user: req.user._id, product: productId });
    const favorites = await Favorite.find({ user: req.user._id });
    res.status(200).json({ message: 'Product removed from favorites', favorites: favorites.map(f => f.product.toString()) });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const getFavorites = async (req, res) => {
  try {
    const favorites = await Favorite.find({ user: req.user._id }).populate('product');
    res.status(200).json(favorites);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const addToCart = async (req, res) => {
  const { productId, quantity, selectedColor = null } = req.body;
  try {
    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    let cartItem = await Cart.findOne({ user: req.user._id, product: productId, selectedColor });
    if (cartItem) {
      cartItem.quantity += (quantity || 1);
      await cartItem.save();
    } else {
      await Cart.create({ user: req.user._id, product: productId, quantity: quantity || 1, selectedColor });
    }
    const cart = await Cart.find({ user: req.user._id }).populate('product');
    res.status(200).json({ message: 'Product added to cart', cart });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const removeFromCart = async (req, res) => {
  const { productId } = req.params;
  const selectedColor = req.query.selectedColor;
  try {
    await Cart.findOneAndDelete({ user: req.user._id, product: productId, selectedColor });
    const cart = await Cart.find({ user: req.user._id }).populate('product');
    res.status(200).json({ message: 'Product removed from cart', cart });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const updateCartQuantity = async (req, res) => {
  const { productId, quantity, selectedColor = null } = req.body;
  try {
    const cartItem = await Cart.findOne({ user: req.user._id, product: productId, selectedColor });
    if (cartItem) {
      cartItem.quantity = quantity;
      await cartItem.save();
      const cart = await Cart.find({ user: req.user._id }).populate('product');
      res.status(200).json({ message: 'Cart updated', cart });
    } else { res.status(404).json({ message: 'Product not found in cart' }); }
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const getCart = async (req, res) => {
  try {
    const cart = await Cart.find({ user: req.user._id }).populate('product');
    res.status(200).json(cart);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json(user);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('+password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Handle Password Update
    if (req.body.password) {
      if (!req.body.currentPassword) {
        return res.status(400).json({ message: 'Current password is required to set a new one' });
      }
      const isMatch = await user.matchPassword(req.body.currentPassword);
      if (!isMatch) {
        return res.status(401).json({ message: 'Current password is incorrect' });
      }
      user.password = req.body.password;
    }

    // Handle image cleanup from Cloudinary
    if (req.body.image && user.image && req.body.image !== user.image && user.image.includes('cloudinary.com')) {
      const urlParts = user.image.split('/upload/');
      if (urlParts.length === 2) {
        const afterUpload = urlParts[1];
        const publicIdWithExt = afterUpload.substring(afterUpload.indexOf('/') + 1);
        const publicId = publicIdWithExt.split('.')[0];
        try {
          const { v2: cloudinary } = await import('cloudinary');
          cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET,
          });
          await cloudinary.uploader.destroy(publicId);
          console.log("Deleted old profile image from Cloudinary:", publicId);
        } catch (err) {
          console.error("Cloudinary delete error:", err);
        }
      }
    }

    // Update other fields
    user.username = req.body.username || user.username;
    user.firstName = req.body.firstName || user.firstName;
    user.lastName = req.body.lastName || user.lastName;
    user.email = req.body.email || user.email;
    user.phone = req.body.phone || user.phone;
    user.gender = req.body.gender || user.gender;
    user.image = req.body.image || user.image;

    const updatedUser = await user.save();
    res.json({
      _id: updatedUser._id,
      username: updatedUser.username,
      email: updatedUser.email,
      phone: updatedUser.phone,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      image: updatedUser.image,
      gender: updatedUser.gender,
      role: updatedUser.role,
    });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({ role: { $ne: 'ADMIN' } }).sort({ createdAt: -1 });
    res.json(users);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

const updateUserRole = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { role: req.body.role }, { new: true });
    res.json(user);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export {
  signup,
  signin,
  forgotPassword,
  resetPassword,
  addToFavorites,
  removeFromFavorites,
  getFavorites,
  addToCart,
  removeFromCart,
  updateCartQuantity,
  getCart,
  getProfile,
  updateProfile,
  getAllUsers,
  updateUserRole,
};
