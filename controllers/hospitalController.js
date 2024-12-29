const Hospital = require('../models/Hospital');
const Booking = require('../models/Booking');

const createHospital = async (req, res) => {
  try {
    if (!req.user || !['hospital', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Unauthorized access' });
    }

    // Check if hospital user already has a hospital
    if (req.user.role === 'hospital') {
      const existingHospital = await Hospital.findOne({ createdBy: req.user.id });
      if (existingHospital) {
        return res.status(400).json({ 
          message: 'Hospital user can only create one hospital' 
        });
      }
    }

    // Validate required fields
    const requiredFields = [
      'name', 
      'address', 
      'contactNumber', 
      'email', 
      'registrationNumber',
      'opBookingPrice',
      'maxOpBookingsPerDay',
      'description',
      'location.coordinates',
      'categories'
    ];

    const missingFields = requiredFields.filter(field => {
      if (field.includes('.')) {
        const [parent, child] = field.split('.');
        return !req.body[parent] || !req.body[parent][child];
      }
      return !req.body[field];
    });

    if (missingFields.length > 0) {
      return res.status(400).json({ 
        message: 'Missing required fields', 
        fields: missingFields 
      });
    }

    // Process categories
    if (req.body.categories) {
      req.body.categories = req.body.categories.map(category => ({
        name: category.name
      }));
    }

    // Create hospital with explicit fields
    const hospital = new Hospital({
      name: req.body.name,
      address: req.body.address,
      contactNumber: req.body.contactNumber,
      email: req.body.email,
      registrationNumber: req.body.registrationNumber,
      opBookingPrice: req.body.opBookingPrice,
      maxOpBookingsPerDay: req.body.maxOpBookingsPerDay,
      description: req.body.description,
      location: {
        type: 'Point',
        coordinates: req.body.location.coordinates
      },
      categories: req.body.categories,
      doctors: req.body.doctors || [],
      timings: req.body.timings || [],
      images: req.body.images || [],
      amenities: req.body.amenities || [],
      emergencyServices: req.body.emergencyServices || false,
      ratings: {
        averageRating: 0,
        totalReviews: 0
      },
      createdBy: req.user.id,
      status: 'pending'
    });
    
    await hospital.save();
    res.status(201).json(hospital);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const updateHospital = async (req, res) => {
  try {
    const hospital = await Hospital.findOne({
      _id: req.params.id,
      ...(req.user.role === 'hospital' ? { createdBy: req.user.id } : {})
    });

    if (!hospital) {
      return res.status(404).json({ message: 'Hospital not found or unauthorized' });
    }

    // Process categories if provided
    if (req.body.categories) {
      req.body.categories = req.body.categories.map(category => ({
        name: category.name
      }));
    }

    // Process location if provided
    if (req.body.location?.coordinates) {
      req.body.location = {
        type: 'Point',
        coordinates: req.body.location.coordinates
      };
    }

    // Update allowed fields
    const allowedUpdates = [
      'name', 'address', 'contactNumber', 'email', 
      'opBookingPrice', 'maxOpBookingsPerDay', 'description',
      'doctors', 'timings', 'categories', 'images',
      'amenities', 'location', 'emergencyServices'
    ];

    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        hospital[field] = req.body[field];
      }
    });

    hospital.updatedBy = req.user.id;
    await hospital.save();
    
    const feeBreakdown = hospital.calculateFees();
    res.json({
      ...hospital.toJSON(),
      feeBreakdown
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const updateBookingSettings = async (req, res) => {
  try {
    const { maxOpBookingsPerDay, isOpen, timings } = req.body;
    const hospital = await Hospital.findOne({
      _id: req.params.id,
      createdBy: req.user.id
    });

    if (!hospital) {
      return res.status(404).json({ message: 'Hospital not found' });
    }

    if (maxOpBookingsPerDay) hospital.maxOpBookingsPerDay = maxOpBookingsPerDay;
    if (typeof isOpen !== 'undefined') hospital.isOpen = isOpen;
    if (timings) hospital.timings = timings;

    await hospital.save();
    res.json(hospital);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const getHospitalBookings = async (req, res) => {
  try {
    const hospital = await Hospital.findOne({ createdBy: req.user.id });

    if (!hospital) {
      return res.status(404).json({ message: 'Hospital not found' });
    }

    const { status, date } = req.query;
    const query = { hospital: hospital._id };

    if (status) {
      query.status = status;
    }

    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
      query.appointmentDate = { $gte: startDate, $lt: endDate };
    }

    const bookings = await Booking.find(query)
      .populate('user', 'name email phoneNumber')
      .sort({ appointmentDate: 1 });

    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateBookingStatus = async (req, res) => {
  try {
    const { status, rejectionReason } = req.body;
    const booking = await Booking.findOne({
      _id: req.params.bookingId,
      hospital: req.params.id
    });

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    booking.status = status;
    if (status === 'rejected') {
      booking.rejectionReason = rejectionReason;
    }
    await booking.save();

    res.json(booking);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const getDashboardStats = async (req, res) => {
  try {
    const hospital = await Hospital.findOne({ createdBy: req.user.id });

    if (!hospital) {
      return res.status(404).json({ message: 'Hospital not found' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [todayBookings, pendingBookings, totalBookings, recentBookings] = await Promise.all([
      Booking.countDocuments({
        hospital: hospital._id,
        appointmentDate: { $gte: today, $lt: tomorrow }
      }),
      Booking.countDocuments({
        hospital: hospital._id,
        status: 'pending'
      }),
      Booking.countDocuments({ hospital: hospital._id }),
      Booking.find({ hospital: hospital._id })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('user', 'name')
    ]);

    const stats = {
      totalDoctors: hospital.doctors.length,
      todayBookings,
      pendingBookings,
      totalBookings,
      recentBookings,
      revenue: {
        today: await calculateRevenue(hospital._id, today, tomorrow),
        total: await calculateRevenue(hospital._id)
      }
    };

    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateHospitalStatus = async (req, res) => {
  try {
    const { status, rejectionReason } = req.body;
    const hospital = await Hospital.findById(req.params.id);

    if (!hospital) {
      return res.status(404).json({ message: 'Hospital not found' });
    }

    hospital.status = status;
    hospital.approvedBy = req.user.id;
    hospital.approvalDate = new Date();
    
    if (status === 'rejected') {
      hospital.rejectionReason = rejectionReason;
    }

    await hospital.save();
    res.json(hospital);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const getHospitals = async (req, res) => {
  try {
    const hospitals = await Hospital.find()
      .populate('createdBy', 'email role')
      .populate('updatedBy', 'email role');

    // Get today's date (start of day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get all hospitals' booking counts for today in one query
    const bookingCounts = await Booking.aggregate([
      {
        $match: {
          appointmentDate: {
            $gte: today,
            $lt: tomorrow
          },
          status: { $in: ['confirmed', 'pending'] }
        }
      },
      {
        $group: {
          _id: '$hospital',
          todayBookingsCount: { $sum: 1 }
        }
      }
    ]);

    // Create a map of hospital ID to booking count
    const bookingCountMap = new Map(
      bookingCounts.map(item => [item._id.toString(), item.todayBookingsCount])
    );

    const hospitalsWithData = hospitals.map(hospital => ({
      ...hospital.toJSON(),
      feeBreakdown: hospital.calculateFees(),
      todayBookingsCount: bookingCountMap.get(hospital._id.toString()) || 0,
      remainingSlots: hospital.maxOpBookingsPerDay - (bookingCountMap.get(hospital._id.toString()) || 0)
    }));

    res.json(hospitalsWithData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getHospital = async (req, res) => {
  try {
    const hospital = await Hospital.findById(req.params.id)
      .populate('createdBy', 'email role')
      .populate('updatedBy', 'email role');
    
    if (!hospital) {
      return res.status(404).json({ message: 'Hospital not found' });
    }

    // Get today's booking count
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayBookingsCount = await Booking.countDocuments({
      hospital: hospital._id,
      appointmentDate: {
        $gte: today,
        $lt: tomorrow
      },
      status: { $in: ['confirmed', 'pending'] }
    });

    const feeBreakdown = hospital.calculateFees();
    res.json({
      ...hospital.toJSON(),
      feeBreakdown,
      todayBookingsCount,
      remainingSlots: hospital.maxOpBookingsPerDay - todayBookingsCount
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteHospital = async (req, res) => {
  try {
    const hospital = await Hospital.findOne({
      _id: req.params.id,
      ...(req.user.role === 'hospital' ? { createdBy: req.user.id } : {})
    });
    
    if (!hospital) {
      return res.status(404).json({ message: 'Hospital not found' });
    }

    await hospital.remove();
    res.json({ message: 'Hospital deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getFilteredHospitals = async (req, res) => {
  try {
    let query = {};
    
    // Check if user is authenticated
    if (req.user) {
      // User is authenticated
      if (req.user.role === 'hospital') {
        // Hospital users can see their own hospitals (any status) and other approved hospitals
        query = {
          $or: [
            { createdBy: req.user.id },
            { status: 'approved' }
          ]
        };
      } else if (req.user.role === 'admin') {
        // Admin can see all hospitals (no query filter needed)
        query = {};
      } else {
        // Other authenticated users see only approved hospitals
        query.status = 'approved';
      }
    } else {
      // Unauthenticated users see only approved hospitals
      query.status = 'approved';
    }

    const hospitals = await Hospital.find(query)
      .populate('createdBy', 'email role')
      .populate('updatedBy', 'email role')
      .populate('approvedBy', 'email role');

    // Get today's date (start of day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get booking counts for today
    const bookingCounts = await Booking.aggregate([
      {
        $match: {
          appointmentDate: {
            $gte: today,
            $lt: tomorrow
          },
          status: { $in: ['confirmed', 'pending'] }
        }
      },
      {
        $group: {
          _id: '$hospital',
          todayBookingsCount: { $sum: 1 }
        }
      }
    ]);

    const bookingCountMap = new Map(
      bookingCounts.map(item => [item._id.toString(), item.todayBookingsCount])
    );

    const hospitalsWithData = hospitals.map(hospital => ({
      ...hospital.toJSON(),
      feeBreakdown: hospital.calculateFees(),
      todayBookingsCount: bookingCountMap.get(hospital._id.toString()) || 0,
      remainingSlots: hospital.maxOpBookingsPerDay - (bookingCountMap.get(hospital._id.toString()) || 0)
    }));

    res.json(hospitalsWithData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getHospitalSettings = async (req, res) => {
  try {
    const hospital = await Hospital.findOne({ createdBy: req.user.id });
    
    if (!hospital) {
      return res.status(404).json({ message: 'Hospital not found' });
    }

    const settings = {
      maxOpBookingsPerDay: hospital.maxOpBookingsPerDay,
      timings: hospital.timings,
      opBookingPrice: hospital.opBookingPrice,
      emergencyServices: hospital.emergencyServices,
      doctors: hospital.doctors,
      categories: hospital.categories
    };

    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateHospitalSettings = async (req, res) => {
  try {
    const hospital = await Hospital.findOne({ createdBy: req.user.id });
    
    if (!hospital) {
      return res.status(404).json({ message: 'Hospital not found' });
    }

    const allowedUpdates = [
      'maxOpBookingsPerDay',
      'timings',
      'opBookingPrice',
      'emergencyServices',
      'doctors',
      'categories'
    ];

    allowedUpdates.forEach(update => {
      if (req.body[update] !== undefined) {
        hospital[update] = req.body[update];
      }
    });

    await hospital.save();
    res.json(hospital);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Helper function for revenue calculation
const calculateRevenue = async (hospitalId, startDate, endDate) => {
  const query = {
    hospital: hospitalId,
    'payment.status': 'completed'
  };

  if (startDate && endDate) {
    query.createdAt = { $gte: startDate, $lt: endDate };
  }

  const bookings = await Booking.find(query);
  return bookings.reduce((total, booking) => total + (booking.payment?.amount || 0), 0);
};

module.exports = {
  createHospital,
  updateHospital,
  getHospitals,
  getHospital,
  deleteHospital,
  updateHospitalStatus,
  getHospitalBookings,
  updateBookingStatus,
  getDashboardStats,
  getHospitalSettings,
  updateHospitalSettings,
  updateBookingSettings,
  getFilteredHospitals
};