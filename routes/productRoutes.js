import express from 'express';
import { getProducts, getProductById, getProductsByCategory, createProduct, updateProduct, deleteProduct, deleteImage, uploadImage, uploadImages, createProductReview } from '../controllers/productController.js';
import { protect } from '../middleware/authMiddleware.js';
import { admin } from '../middleware/adminMiddleware.js';
import multer from 'multer';

// Multer Config
const storage = multer.memoryStorage();
const upload = multer({ storage });

const router = express.Router();

// Public Routes
router.get('/', getProducts);
router.get('/category/:categoryId', getProductsByCategory);
router.get('/:id', getProductById);

// Admin Routes (Protected)
router.post('/', protect, admin, createProduct);
router.post('/upload', protect, admin, upload.single('image'), uploadImage);
router.post('/upload-multiple', protect, admin, upload.array('images', 10), uploadImages);
router.post('/delete', protect, admin, deleteImage);

router.route('/:id')
  .put(protect, admin, updateProduct)
  .delete(protect, admin, deleteProduct);

router.post('/:id/reviews', protect, createProductReview);

export default router;
