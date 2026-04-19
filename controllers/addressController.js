import Address from '../models/Address.js';

// @desc    Get all addresses for logged-in user
// @route   GET /api/addresses
// @access  Private
const getAddresses = async (req, res) => {
  try {
    const addresses = await Address.find({ user: req.user._id }).sort({
      isDefault: -1,
      createdAt: -1,
    });
    res.json(addresses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add a new address
// @route   POST /api/addresses
// @access  Private
const addAddress = async (req, res) => {
  try {
    const {
      fullName, phone, addressLine1, addressLine2,
      city, state, postalCode, country, lat, lng, isDefault,
    } = req.body;

    // If this is the default address, unset all others
    if (isDefault) {
      await Address.updateMany({ user: req.user._id }, { isDefault: false });
    }

    // If user has no addresses, make first one default automatically
    const count = await Address.countDocuments({ user: req.user._id });
    const shouldBeDefault = count === 0 ? true : !!isDefault;

    const address = await Address.create({
      user: req.user._id,
      fullName, phone, addressLine1, addressLine2,
      city, state, postalCode, country: country || 'India',
      lat, lng,
      isDefault: shouldBeDefault,
    });

    res.status(201).json(address);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Update an address
// @route   PUT /api/addresses/:id
// @access  Private
const updateAddress = async (req, res) => {
  try {
    const address = await Address.findOne({ _id: req.params.id, user: req.user._id });
    if (!address) return res.status(404).json({ message: 'Address not found' });

    if (req.body.isDefault) {
      await Address.updateMany({ user: req.user._id }, { isDefault: false });
    }

    Object.assign(address, req.body);
    const updated = await address.save();
    res.json(updated);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete an address
// @route   DELETE /api/addresses/:id
// @access  Private
const deleteAddress = async (req, res) => {
  try {
    const address = await Address.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!address) return res.status(404).json({ message: 'Address not found' });
    res.json({ message: 'Address removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Set an address as default
// @route   PATCH /api/addresses/:id/default
// @access  Private
const setDefaultAddress = async (req, res) => {
  try {
    await Address.updateMany({ user: req.user._id }, { isDefault: false });
    const address = await Address.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { isDefault: true },
      { new: true }
    );
    if (!address) return res.status(404).json({ message: 'Address not found' });
    res.json(address);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export { getAddresses, addAddress, updateAddress, deleteAddress, setDefaultAddress };
