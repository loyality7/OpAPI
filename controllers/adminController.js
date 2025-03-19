const User = require('../models/User');
const Hospital = require('../models/Hospital');
const Booking = require('../models/Booking');

// User Management
const getUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select('-password')
      .sort('-createdAt');

    res.json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_USERS_FAILED',
        message: 'Unable to fetch users',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    });
  }
};

const createUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'USER_EXISTS',
          message: 'User with this email already exists'
        }
      });
    }

    const user = new User({
      name,
      email,
      password,
      role
    });

    await user.save();

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: userResponse
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'CREATE_USER_FAILED',
        message: 'Unable to create user',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    });
  }
};

const updateUser = async (req, res) => {
  try {
    const { name, email, role, isActive } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    // Update fields
    if (name) user.name = name;
    if (email) user.email = email;
    if (role) user.role = role;
    if (typeof isActive === 'boolean') user.isActive = isActive;

    await user.save();

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    res.json({
      success: true,
      message: 'User updated successfully',
      data: userResponse
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_USER_FAILED',
        message: 'Unable to update user',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    });
  }
};

const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    await user.remove();

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'DELETE_USER_FAILED',
        message: 'Unable to delete user',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    });
  }
};

// Hospital Management
const getHospitals = async (req, res) => {
  try {
    const hospitals = await Hospital.find()
      .populate('createdBy', 'name email')
      .sort('-createdAt');

    res.json({
      success: true,
      count: hospitals.length,
      data: hospitals
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_HOSPITALS_FAILED',
        message: 'Unable to fetch hospitals',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    });
  }
};

const updateHospitalStatus = async (req, res) => {
  try {
    const { status, remarks } = req.body;
    const hospital = await Hospital.findById(req.params.id);

    if (!hospital) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'HOSPITAL_NOT_FOUND',
          message: 'Hospital not found'
        }
      });
    }

    hospital.status = status;
    hospital.statusRemarks = remarks;
    hospital.statusUpdatedAt = new Date();
    hospital.statusUpdatedBy = req.user.id;

    await hospital.save();

    res.json({
      success: true,
      message: 'Hospital status updated successfully',
      data: hospital
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'UPDATE_HOSPITAL_FAILED',
        message: 'Unable to update hospital status',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    });
  }
};

// Booking Management
const getBookings = async (req, res) => {
  try {
    const { status, date, hospital } = req.query;
    const query = {};

    if (status) query.status = status;
    if (hospital) query.hospital = hospital;
    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
      query.appointmentDate = {
        $gte: startDate,
        $lt: endDate
      };
    }

    const bookings = await Booking.find(query)
      .populate('user', 'name email')
      .populate('hospital', 'name address')
      .sort('-appointmentDate');

    res.json({
      success: true,
      count: bookings.length,
      data: bookings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_BOOKINGS_FAILED',
        message: 'Unable to fetch bookings',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    });
  }
};

// Dashboard Metrics
const getDashboardMetrics = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      totalUsers,
      totalHospitals,
      totalBookings,
      todayBookings,
      pendingHospitals,
      recentBookings
    ] = await Promise.all([
      User.countDocuments(),
      Hospital.countDocuments(),
      Booking.countDocuments(),
      Booking.countDocuments({
        appointmentDate: {
          $gte: today,
          $lt: tomorrow
        }
      }),
      Hospital.countDocuments({ status: 'pending' }),
      Booking.find()
        .sort('-createdAt')
        .limit(10)
        .populate('user', 'name')
        .populate('hospital', 'name')
    ]);

    // Calculate revenue metrics
    const revenueStats = await Booking.aggregate([
      {
        $match: {
          'payment.status': 'completed'
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$payment.amount' },
          avgRevenue: { $avg: '$payment.amount' }
        }
      }
    ]);

    const revenue = revenueStats[0] || { totalRevenue: 0, avgRevenue: 0 };

    res.json({
      success: true,
      data: {
        users: {
          total: totalUsers
        },
        hospitals: {
          total: totalHospitals,
          pending: pendingHospitals
        },
        bookings: {
          total: totalBookings,
          today: todayBookings,
          recent: recentBookings
        },
        revenue: {
          total: revenue.totalRevenue,
          average: revenue.avgRevenue
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'FETCH_METRICS_FAILED',
        message: 'Unable to fetch dashboard metrics',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    });
  }
};

module.exports = {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  getHospitals,
  updateHospitalStatus,
  getBookings,
  getDashboardMetrics
};
