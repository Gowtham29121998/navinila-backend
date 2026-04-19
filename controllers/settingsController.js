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
    const { gst, deliveryFee, heroSection } = req.body;
    let settings = await Settings.findOne();

    if (settings) {
      settings.gst = gst !== undefined ? gst : settings.gst;
      settings.deliveryFee = deliveryFee !== undefined ? deliveryFee : settings.deliveryFee;
      settings.heroSection = heroSection || settings.heroSection;
      
      const updatedSettings = await settings.save();
      res.json(updatedSettings);
    } else {
      const newSettings = await Settings.create({
        gst,
        deliveryFee,
        heroSection
      });
      res.status(201).json(newSettings);
    }
  } catch (error) {
    res.status(400).json({ message: 'Invalid settings data' });
  }
};

export { getSettings, updateSettings };
