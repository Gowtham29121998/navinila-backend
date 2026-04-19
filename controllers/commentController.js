import Comment from '../models/Comment.js';
import Product from '../models/Product.js';

// @desc    Create new comment
// @route   POST /api/comments/:productId
// @access  Private
const createComment = async (req, res) => {
  try {
    const { comment } = req.body;
    const { productId } = req.params;

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const newComment = new Comment({
      product: productId,
      user: req.user._id,
      username: req.user.username,
      comment,
    });

    const savedComment = await newComment.save();
    res.status(201).json(savedComment);
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get comments for a product
// @route   GET /api/comments/:productId
// @access  Public
const getProductComments = async (req, res) => {
  try {
    const comments = await Comment.find({ product: req.params.productId })
      .populate('user', 'username profileImage') // Aggregate user data
      .sort({ createdAt: -1 });

    res.json(comments);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

export { createComment, getProductComments };
