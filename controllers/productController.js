import Product from '../models/Product.js';

// @desc    Get all products
// @route   GET /api/products
// @access  Public
const getProducts = async (req, res) => {
  try {
    const pageSize = Number(req.query.pageSize) || 12;
    const page = Number(req.query.pageNumber) || 1;

    const count = await Product.countDocuments({});
    const products = await Product.find({})
      .populate('category')
      .sort({ createdAt: -1 })
      .limit(pageSize)
      .skip(pageSize * (page - 1));

    res.json({ products, page, pages: Math.ceil(count / pageSize), total: count });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Get products by category
// @route   GET /api/products/category/:categoryId
// @access  Public
const getProductsByCategory = async (req, res) => {
  try {
    const pageSize = Number(req.query.pageSize) || 12;
    const page = Number(req.query.pageNumber) || 1;

    const query = { category: req.params.categoryId };
    const count = await Product.countDocuments(query);
    const products = await Product.find(query)
      .populate('category')
      .sort({ createdAt: -1 })
      .limit(pageSize)
      .skip(pageSize * (page - 1));

    res.json({ products, page, pages: Math.ceil(count / pageSize), total: count });
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

// @desc    Create a product
// @route   POST /api/products
// @access  Private/Admin
const createProduct = async (req, res) => {
  try {
    const { 
      name, price, description, image, images, colors, 
      showColors, category, type, brand, discount, 
      dimensions, countInStock 
    } = req.body;

    const product = new Product({
      name,
      price,
      description,
      image,
      images,
      colors,
      showColors,
      category,
      type,
      brand,
      discount,
      dimensions,
      countInStock,
    });

    const createdProduct = await product.save();
    res.status(201).json(createdProduct);
  } catch (error) {
    console.error("Product Creation Error:", error);
    res.status(400).json({ 
      message: 'Invalid product data', 
      error: error.message,
      details: error.errors 
    });
  }
};

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private/Admin
const updateProduct = async (req, res) => {
  try {
    const { 
      name, price, description, image, images, colors, 
      showColors, category, type, brand, discount, 
      dimensions, countInStock 
    } = req.body;

    const product = await Product.findById(req.params.id);

    if (product) {
      product.name = name || product.name;
      product.price = price || product.price;
      product.description = description || product.description;
      product.image = image || product.image;
      product.images = images || product.images;
      product.colors = colors || product.colors;
      product.showColors = showColors !== undefined ? showColors : product.showColors;
      product.category = category || product.category;
      product.type = type || product.type;
      product.brand = brand || product.brand;
      product.discount = discount || product.discount;
      product.dimensions = dimensions || product.dimensions;
      product.countInStock = countInStock !== undefined ? countInStock : product.countInStock;

      const updatedProduct = await product.save();
      res.json(updatedProduct);
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    res.status(400).json({ message: 'Invalid product data' });
  }
};

// @desc    Delete a product and all its Cloudinary images
// @route   DELETE /api/products/:id
// @access  Private/Admin
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (product) {
      // 1. Gather all public_ids for Cloudinary cleanup
      const publicIds = [];
      
      // General images
      if (product.images && product.images.length > 0) {
        product.images.forEach(img => { if (img.public_id) publicIds.push(img.public_id); });
      }
      
      // Color variant images
      if (product.colors && product.colors.length > 0) {
        product.colors.forEach(color => {
          if (color.images && color.images.length > 0) {
            color.images.forEach(img => { if (img.public_id) publicIds.push(img.public_id); });
          }
        });
      }

      // 2. Delete from Cloudinary
      if (publicIds.length > 0) {
        const { v2: cloudinary } = await import('cloudinary');
        cloudinary.config({
          cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
          api_key: process.env.CLOUDINARY_API_KEY,
          api_secret: process.env.CLOUDINARY_API_SECRET,
        });

        // Batch delete
        await Promise.all(publicIds.map(id => cloudinary.uploader.destroy(id)));
        console.log(`Cleaned up ${publicIds.length} images from Cloudinary for product: ${product.name}`);
      }

      // 3. Delete from Database
      await product.deleteOne();
      res.json({ message: 'Product and associated images removed' });
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    console.error("Delete Error:", error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Upload image to Cloudinary
// @route   POST /api/products/upload-image
// @access  Private/Admin
const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Dynamic import for Cloudinary
    const { v2: cloudinary } = await import('cloudinary');
    
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    // Upload using stream (direct buffer handling)
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'products' },
      (error, result) => {
        if (error) {
          console.error("Cloudinary Stream Error:", error);
          return res.status(500).json({ message: 'Cloudinary Upload Failed', error });
        }
        console.log("Cloudinary Upload Success:", result.secure_url);
        res.json({
          url: result.secure_url,
          public_id: result.public_id
        });
      }
    );

    stream.end(req.file.buffer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during upload' });
  }
};

// Helper to safely delete from Cloudinary
const deleteImage = async (req, res) => {
  const { public_id } = req.body;
  console.log("Attempting to delete image with public_id:", public_id);
  
  try {
    const { v2: cloudinary } = await import('cloudinary');
    
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    const result = await cloudinary.uploader.destroy(public_id);
    console.log("Cloudinary Delete Result:", result);
    res.json({ success: true, result });
  } catch (error) {
    console.error("Cloudinary Delete Error:", error);
    res.status(500).json({ 
      message: 'Deletion failed. Ensure variables are set and cloudinary is installed.',
      error: error.message 
    });
  }
};

// @desc    Get product by ID
// @route   GET /api/products/:id
// @access  Public
const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('category');
    if (product) {
      res.json(product);
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Create new review
// @route   POST /api/products/:id/reviews
// @access  Private
const createProductReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const product = await Product.findById(req.params.id);

    if (product) {
      const alreadyReviewed = product.reviews.find(
        (r) => r.user.toString() === req.user._id.toString()
      );

      if (alreadyReviewed) {
        return res.status(400).json({ message: 'Product already reviewed' });
      }

      const review = {
        name: req.user.username,
        rating: Number(rating),
        comment,
        user: req.user._id,
      };

      product.reviews.push(review);
      product.numReviews = product.reviews.length;
      product.rating =
        product.reviews.reduce((acc, item) => item.rating + acc, 0) /
        product.reviews.length;

      await product.save();
      res.status(201).json({ message: 'Review added' });
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error', error: error.message });
  }
};

export { 
  getProducts, 
  getProductById, 
  getProductsByCategory,
  createProduct, 
  updateProduct, 
  deleteProduct, 
  deleteImage, 
  uploadImage, 
  createProductReview 
};
