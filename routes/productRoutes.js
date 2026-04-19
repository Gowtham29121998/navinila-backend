import express from 'express';
import { getProducts, getProductById, getProductsByCategory, createProduct, updateProduct, deleteProduct, deleteImage, uploadImage, createProductReview } from '../controllers/productController.js';
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
router.post('/', createProduct);

// Admin / Review Routes
router.post('/upload', upload.single('image'), uploadImage);
router.post('/delete', deleteImage);

router.route('/:id')
  .put(updateProduct)
  .delete(deleteProduct);

router.post('/:id/reviews', protect, createProductReview);

export default router;
