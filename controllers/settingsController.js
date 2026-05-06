import Settings from '../models/Settings.js';

// @desc    Get site settings
// @route   GET /api/settings
// @access  Public
const getSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      // Create default settings if none exist
      settings = await Settings.create({
        gst: 18,
        deliveryFee: 50,
        freeDeliveryThreshold: 0,
        heroSection: [
          {
            image: "https://res.cloudinary.com/demo/image/upload/v1631234567/sample.jpg",
            title: "Welcome to Elevate",
            subtitle: "Discover Premium Lifestyle",
            link: "/portfolio"
          }
        ]
      });
    }
    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Update site settings
// @route   PUT /api/settings
// @access  Private/Admin
const updateSettings = async (req, res) => {
  try {
    const { gst, deliveryFee, heroSection, freeDeliveryThreshold } = req.body;
    let settings = await Settings.findOne();

    if (settings) {
      // Find deleted hero section images and remove from Cloudinary
      if (heroSection) {
        const oldImages = settings.heroSection.map(item => item.image);
        const newImages = heroSection.map(item => item.image);
        const deletedImages = oldImages.filter(img => !newImages.includes(img) && img.includes('cloudinary.com'));

        if (deletedImages.length > 0) {
          const { v2: cloudinary } = await import('cloudinary');
          cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET,
          });

          for (const imgUrl of deletedImages) {
            try {
              const urlParts = imgUrl.split('/upload/');
              if (urlParts.length > 1) {
                const afterUpload = urlParts[1];
                const parts = afterUpload.split('/');
                if (parts[0].startsWith('v') && !isNaN(parts[0].substring(1))) {
                  parts.shift();
                }
                const pathWithExtension = parts.join('/');
                const publicId = pathWithExtension.split('.')[0];
                
                await cloudinary.uploader.destroy(publicId);
                console.log("Deleted from Cloudinary:", publicId);
              }
            } catch (err) {
              console.error("Cloudinary delete error:", err);
            }
          }
        }
      }

      settings.gst = gst !== undefined ? gst : settings.gst;
      settings.deliveryFee = deliveryFee !== undefined ? deliveryFee : settings.deliveryFee;
      settings.freeDeliveryThreshold = freeDeliveryThreshold !== undefined ? freeDeliveryThreshold : settings.freeDeliveryThreshold;
      settings.heroSection = heroSection || settings.heroSection;
      
      const updatedSettings = await settings.save();
      res.json(updatedSettings);
    } else {
      const newSettings = await Settings.create({
        gst,
        deliveryFee,
        freeDeliveryThreshold,
        heroSection
      });
      res.status(201).json(newSettings);
    }
  } catch (error) {
    res.status(400).json({ message: 'Invalid settings data' });
  }
};

export { getSettings, updateSettings };
