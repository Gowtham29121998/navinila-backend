import mongoose from 'mongoose';

const reviewSchema = mongoose.Schema(
  {
    name: { type: String, required: true },
    rating: { type: Number, required: true },
    comment: { type: String, required: true },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a product name'],
      trim: true,
    },
    price: {
      type: Number,
      required: [true, 'Please add a price'],
      default: 0,
    },
    description: {
      type: String,
      required: [true, 'Please add a description'],
    },
    image: {
      type: String,
      required: [true, 'Please add a main image'],
    },
    images: [{
      url: String,
      public_id: String
    }],
    colors: [{
      name: String, // e.g. 'Red'
      code: String, // e.g. '#ff0000'
      countInStock: {
        type: Number,
        default: 0
      },
      images: [{
        url: String,
        public_id: String
      }]
    }],
    showColors: {
      type: Boolean,
      default: false
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Please add a category'],
    },
    type: {
      type: String,
    },
    brand: {
      type: String,
    },
    discount: {
      type: Number,
      default: 0,
    },
    material: {
      type: String,
    },
    packageIncludes: {
      type: String,
    },
    dimensions: {
      width: Number,
      height: Number,
      length: Number,
    },
    reviews: [reviewSchema],
    rating: {
      type: Number,
      required: true,
      default: 0,
    },
    numReviews: {
      type: Number,
      required: true,
      default: 0,
    },
    countInStock: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('Product', productSchema);
