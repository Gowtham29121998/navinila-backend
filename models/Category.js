import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a category name'],
      unique: true,
      trim: true,
    },
    image: {
      url: String,
      public_id: String
    }
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('Category', categorySchema);
