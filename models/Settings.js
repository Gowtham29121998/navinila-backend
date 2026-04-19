import mongoose from 'mongoose';

const settingsSchema = mongoose.Schema(
  {
    gst: {
      type: Number,
      default: 0,
    },
    deliveryFee: {
      type: Number,
      default: 0,
    },
    freeDeliveryThreshold: {
      type: Number,
      default: 0,
    },
    heroSection: [
      {
        image: { type: String, required: true },
        title: { type: String },
        subtitle: { type: String },
        link: { type: String },
      },
    ],
  },
  {
    timestamps: true,
  }
);

const Settings = mongoose.model('Settings', settingsSchema);

export default Settings;
