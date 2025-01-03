const User = require('../models/User');
const Booking = require('../models/Booking');

// Get user profile
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password -otp -otpExpires')
      .lean(); // Using lean() for better performance
    
    if (!user) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    // Format the response to include all fields with proper formatting
    const response = {
      ...user,
      dateOfBirth: user.dateOfBirth ? user.dateOfBirth.toISOString().split('T')[0] : null,
      gender: user.gender || null,
      bloodGroup: user.bloodGroup || null,
      location: user.location || {
        address: null,
        city: null,
        state: null,
        country: null,
        pincode: null,
        coordinates: {
          type: "Point",
          coordinates: [0, 0]
        }
      },
      emergencyContact: user.emergencyContact || {
        name: null,
        relationship: null,
        phoneNumber: null
      },
      medicalInfo: user.medicalInfo || {
        allergies: [],
        chronicConditions: [],
        currentMedications: []
      },
      profilePicture: user.profilePicture || null
    };

    res.json(response);
  } catch (error) {
    console.error('Get Profile Error:', error);
    res.status(500).json({ 
      message: 'Error retrieving profile',
      error: error.message 
    });
  }
};

// Update user profile
const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    const {
      name,
      phoneNumber,
      dateOfBirth,
      gender,
      bloodGroup,
      location,
      emergencyContact,
      medicalInfo,
      profilePicture
    } = req.body;

    // Direct update approach
    const updateData = {
      ...(name && { name }),
      ...(phoneNumber && { phoneNumber }),
      ...(dateOfBirth && { dateOfBirth: new Date(dateOfBirth) }),
      ...(gender && { gender }),
      ...(bloodGroup && { bloodGroup }),
      ...(profilePicture && { profilePicture })
    };

    // Handle nested objects
    if (location) {
      updateData.location = {
        address: location.address,
        city: location.city,
        state: location.state,
        country: location.country,
        pincode: location.pincode,
        coordinates: {
          type: "Point",
          coordinates: location.coordinates?.coordinates || [0, 0]
        }
      };
    }

    if (emergencyContact) {
      updateData.emergencyContact = {
        name: emergencyContact.name,
        relationship: emergencyContact.relationship,
        phoneNumber: emergencyContact.phoneNumber
      };
    }

    if (medicalInfo) {
      updateData.medicalInfo = {
        allergies: medicalInfo.allergies || [],
        chronicConditions: medicalInfo.chronicConditions || [],
        currentMedications: medicalInfo.currentMedications || []
      };
    }

    // Phone number validation for user role
    if (user.role === 'user' && phoneNumber) {
      const phoneExists = await User.findOne({ 
        phoneNumber, 
        _id: { $ne: req.user.id } 
      });
      if (phoneExists) {
        return res.status(400).json({ message: 'Phone number already in use' });
      }
    }

    // Validate coordinates if provided
    if (location?.coordinates?.coordinates) {
      const [longitude, latitude] = location.coordinates.coordinates;
      if (longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) {
        return res.status(400).json({ message: 'Invalid coordinates' });
      }
    }

    // Update the user
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      updateData,
      {
        new: true,
        runValidators: true,
        select: '-password -otp -otpExpires'
      }
    ).lean();

    // Format date for response
    const response = {
      ...updatedUser,
      dateOfBirth: updatedUser.dateOfBirth ? updatedUser.dateOfBirth.toISOString().split('T')[0] : null,
      location: updatedUser.location || {
        address: null,
        city: null,
        state: null,
        country: null,
        pincode: null,
        coordinates: {
          type: "Point",
          coordinates: [0, 0]
        }
      },
      emergencyContact: updatedUser.emergencyContact || {
        name: null,
        relationship: null,
        phoneNumber: null
      },
      medicalInfo: updatedUser.medicalInfo || {
        allergies: [],
        chronicConditions: [],
        currentMedications: []
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Update Profile Error:', error);
    res.status(500).json({ 
      message: 'Error updating profile',
      error: error.message 
    });
  }
};

// Delete user profile
const deleteUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    await User.findByIdAndDelete(req.user.id);
    res.json({ message: 'Profile deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMyBookings = async (req, res) => {
  try {
    // Create query with user filter
    const query = { user: req.user.id };

    // Add status filter if provided
    if (req.query.status) {
      query.status = req.query.status;
    }

    const bookings = await Booking.find(query)
      .populate('hospital', 'name location')
      .sort({ appointmentDate: -1 })
      .lean();

    if (!bookings.length) {
      return res.status(404).json({ message: 'No bookings found' });
    }

    // Format the response
    const formattedBookings = bookings.map(booking => ({
      ...booking,
      appointmentDate: booking.appointmentDate.toISOString().split('T')[0],
      appointmentTime: booking.timeSlot,
      status: booking.status,
      hospital: {
        id: booking.hospital._id,
        name: booking.hospital.name,
        location: booking.hospital.location
      },
      doctorName: booking.doctorName || null,
      specialty: booking.specialty || null,
      tokenNumber: booking.tokenNumber || null,
      payment: {
        ...booking.payment,
        status: booking.payment?.status || 'pending'
      }
    }));

    res.json({
      count: bookings.length,
      bookings: formattedBookings
    });
  } catch (error) {
    console.error('Get My Bookings Error:', error);
    res.status(500).json({ 
      message: 'Error retrieving bookings',
      error: error.message 
    });
  }
};

module.exports = {
  getUserProfile,
  updateUserProfile,
  deleteUserProfile,
  getMyBookings
}; 