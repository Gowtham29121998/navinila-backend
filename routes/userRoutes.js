import express from 'express';
import {
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
} from '../controllers/userController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Authentication routes
router.post('/signup', signup);
router.post('/signin', signin);
router.post('/forgotpassword', forgotPassword);
router.put('/resetpassword/:resettoken', resetPassword);

// Profile routes
router.route('/profile')
  .get(protect, getProfile)
  .put(protect, updateProfile);


// Favorites routes
router.route('/favorites')
  .post(protect, addToFavorites)
  .get(protect, getFavorites);

router.route('/favorites/:productId')
  .delete(protect, removeFromFavorites);

// Cart routes
router.route('/cart')
  .post(protect, addToCart)
  .put(protect, updateCartQuantity)
  .get(protect, getCart);

router.route('/cart/:productId')
  .delete(protect, removeFromCart);
// Admin User Management routes
router.route('/')
  .get(protect, admin, getAllUsers);

router.route('/:id/role')
  .put(protect, admin, updateUserRole);

export default router;
