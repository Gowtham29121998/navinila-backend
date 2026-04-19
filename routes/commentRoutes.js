import express from 'express';
import { createComment, getProductComments } from '../controllers/commentController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.route('/:productId')
    .post(protect, createComment)
    .get(getProductComments);

export default router;
