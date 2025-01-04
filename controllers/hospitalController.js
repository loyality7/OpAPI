const Hospital = require('../models/Hospital');
const Booking = require('../models/Booking');
const NotificationService = require('../services/notificationService');
const moment = require('moment');

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
    const { status, date } = req.query;
    const hospital = await Hospital.findOne({ createdBy: req.user.id });

    if (!hospital) {
      return res.status(404).json({ message: 'Hospital not found' });
    }

    // Build query
    const query = { hospital: hospital._id };

    // Add status filter if provided and valid
    const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled', 'rejected'];
    if (status && status !== 'all' && validStatuses.includes(status)) {
      query.status = status;
    }

    // Add date filter if provided
    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
      query.appointmentDate = { $gte: startDate, $lt: endDate };
    }

    // Get bookings with populated user data
    const bookings = await Booking.find(query)
      .populate('user', 'name email phoneNumber')
      .sort({ appointmentDate: 1, timeSlot: 1 })
      .lean();

    // Transform bookings to match UI format
    const formattedBookings = bookings.map(booking => ({
      id: booking._id,
      tokenNo: booking.tokenNumber,
      patientName: booking.patientDetails.name,
      patientAge: booking.patientDetails.age,
      patientGender: booking.patientDetails.gender,
      doctorName: booking.doctorName || 'To be assigned',
      department: booking.specialization,
      appointmentTime: booking.timeSlot,
      estimatedTime: booking.timeSlot,
      date: booking.appointmentDate.toISOString().split('T')[0],
      status: booking.status,
      contactNumber: booking.patientDetails.mobile,
      fee: booking.payment.breakdown.total,
      symptoms: booking.symptoms,
      priority: booking.priority || 'normal',
      user: {
        name: booking.user?.name,
        email: booking.user?.email,
        phone: booking.user?.phoneNumber
      },
      payment: {
        status: booking.payment.status,
        method: booking.payment.method,
        details: booking.payment.breakdown
      }
    }));

    res.json(formattedBookings);
  } catch (error) {
    console.error('Error fetching hospital bookings:', error);
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

    // Get date ranges
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Get all stats in parallel for better performance
    const [
      totalAppointments,
      todayAppointments,
      pendingAppointments,
      totalRevenue,
      yesterdayAppointments,
      yesterdayRevenue,
      recentAppointments
    ] = await Promise.all([
      // Total appointments
      Booking.countDocuments({ 
        hospital: hospital._id 
      }),

      // Today's appointments
      Booking.find({
        hospital: hospital._id,
        appointmentDate: { 
          $gte: today,
          $lt: tomorrow 
        }
      }).countDocuments(),

      // Pending requests (including payment pending)
      Booking.countDocuments({
        hospital: hospital._id,
        $or: [
          { status: 'pending' },
          { 'payment.status': 'pending' }
        ]
      }),

      // Updated total revenue calculation
      Booking.aggregate([
        {
          $match: {
            hospital: hospital._id,
            'payment.status': 'completed'
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$payment.breakdown.basePrice' }
          }
        }
      ]),

      // Yesterday's appointments
      Booking.countDocuments({
        hospital: hospital._id,
        appointmentDate: {
          $gte: yesterday,
          $lt: today
        }
      }),

      // Update yesterday's revenue calculation
      Booking.aggregate([
        {
          $match: {
            hospital: hospital._id,
            'payment.status': 'completed',
            appointmentDate: {
              $gte: yesterday,
              $lt: today
            }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$payment.breakdown.basePrice' }
          }
        }
      ]),

      // Recent appointments (last 5)
      Booking.find({ 
        hospital: hospital._id 
      })
      .populate('user', 'name')
      .sort({ appointmentDate: -1 })
      .limit(100000)
      .lean()
    ]);

    // Format recent appointments with payment status
    const formattedRecentAppointments = recentAppointments.map(appointment => ({
      id: appointment._id,
      patientName: appointment.patientDetails?.name || 'N/A',
      patientAge: appointment.patientDetails?.age || 'N/A',
      patientGender: appointment.patientDetails?.gender || 'N/A',
      time: appointment.timeSlot,
      date: new Date(appointment.appointmentDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }),
      status: appointment.payment.status === 'pending' ? 'pending payment' : appointment.status,
      tokenNumber: appointment.tokenNumber || 'N/A',
      paymentStatus: appointment.payment?.status || 'N/A',
      amount: appointment.payment?.amount || 0
    }));

    // Calculate yearly trends (all 12 months)
    const startOfYear = new Date();
    startOfYear.setMonth(0, 1); // January 1st of current year
    startOfYear.setHours(0, 0, 0, 0);

    const endOfYear = new Date();
    endOfYear.setMonth(11, 31); // December 31st of current year
    endOfYear.setHours(23, 59, 59, 999);

    const monthlyTrends = await Booking.aggregate([
      {
        $match: {
          hospital: hospital._id,
          appointmentDate: {
            $gte: startOfYear,
            $lte: endOfYear
          }
        }
      },
      {
        $group: {
          _id: { $month: "$appointmentDate" },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Define months mapping
    const monthsMap = {
      1: 'Jan', 2: 'Feb', 3: 'Mar', 4: 'Apr', 
      5: 'May', 6: 'Jun', 7: 'Jul', 8: 'Aug',
      9: 'Sep', 10: 'Oct', 11: 'Nov', 12: 'Dec'
    };

    // Format monthly trends
    const patientTrends = Object.entries(monthsMap).map(([monthNum, monthName]) => {
      const monthData = monthlyTrends.find(m => m._id === parseInt(monthNum));
      return {
        month: monthName,
        total: monthData?.count || 0
      };
    });

    // Get all appointments for today
    const todayAppointmentsHourly = await Booking.find({
      hospital: hospital._id,
      appointmentDate: {
        $gte: today,
        $lt: tomorrow
      }
    })
    .select('timeSlot tokenNumber status patientDetails payment')
    .lean();

    // Format hourly appointments with 30-minute slots
    const appointmentData = [];
    for (let hour = 9; hour <= 21; hour++) { // 9 AM to 9 PM
      [0, 30].forEach(minute => {
        // Format current slot time to match booking timeSlot format
        const formattedHour = hour === 12 ? 12 : hour % 12 || 12;
        const ampm = hour < 12 ? 'AM' : 'PM';
        const slotTimeString = `${formattedHour}:${minute.toString().padStart(2, '0')} ${ampm}`;
        
        // Find appointments for this time slot
        const slotAppointments = todayAppointmentsHourly.filter(appointment => 
          appointment.timeSlot === slotTimeString
        );

        appointmentData.push({
          time: slotTimeString,
          appointments: slotAppointments.length,
          slotTime: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
          matchedAppointments: slotAppointments.map(a => ({
            timeSlot: a.timeSlot,
            tokenNumber: a.tokenNumber
          }))
        });
      });
    }

    const stats = {
      totalAppointments,
      todayPatients: todayAppointments,
      pendingRequests: pendingAppointments,
      totalRevenue: totalRevenue[0]?.total || 0,
      doctorsAvailable: hospital.doctors.length,
      revenueYesterday: yesterdayRevenue[0]?.total || 0,
      yesterdayPatients: yesterdayAppointments,
      recentAppointments: formattedRecentAppointments,
      appointmentData,
      patientTrends
    };

    res.json(stats);
  } catch (error) {
    console.error('Dashboard stats error:', error);
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
    if (status === 'rejected') {
      hospital.rejectionReason = rejectionReason;
      await NotificationService.createHospitalNotification(hospital, 'HOSPITAL_REJECTED', {
        reason: rejectionReason
      });
    } else if (status === 'approved') {
      hospital.approvedBy = req.user.id;
      hospital.approvalDate = new Date();
      await NotificationService.createHospitalNotification(hospital, 'HOSPITAL_APPROVED');
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

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

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

    const hospitalsWithData = await Promise.all(hospitals.map(async hospital => {
      const totalSlotsPerDay = calculateTotalSlots(hospital.timings);
      const availableSlots = await calculateAvailableSlots(
        hospital._id,
        new Date(),
        totalSlotsPerDay,
        hospital.patientsPerSlot || 1
      );

      return {
        ...hospital.toJSON(),
        feeBreakdown: hospital.calculateFees(),
        todayBookingsCount: bookingCountMap.get(hospital._id.toString()) || 0,
        remainingSlots: hospital.maxOpBookingsPerDay - (bookingCountMap.get(hospital._id.toString()) || 0),
        totalSlotsPerDay,
        availableSlots,
        patientsPerSlot: hospital.patientsPerSlot || 1
      };
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

    const totalSlotsPerDay = calculateTotalSlots(hospital.timings);
    const availableSlots = await calculateAvailableSlots(
      hospital._id,
      new Date(),
      totalSlotsPerDay,
      hospital.patientsPerSlot || 1
    );

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
      remainingSlots: hospital.maxOpBookingsPerDay - todayBookingsCount,
      totalSlotsPerDay,
      availableSlots,
      patientsPerSlot: hospital.patientsPerSlot || 1
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
    let query = {
      isOpen: true // Only show active hospitals
    };
    
    // Check if user is authenticated
    if (req.user) {
      if (req.user.role === 'hospital') {
        // Hospital users can see their own hospitals (any status) and other approved & active hospitals
        query = {
          $or: [
            { createdBy: req.user.id },
            { status: 'approved', isOpen: true }
          ]
        };
      } else if (req.user.role === 'admin') {
        // Admin can see all hospitals (remove isOpen filter)
        query = {};
      } else {
        // Other authenticated users see only approved & active hospitals
        query.status = 'approved';
        query.isOpen = true;
      }
    } else {
      // Unauthenticated users see only approved & active hospitals
      query.status = 'approved';
      query.isOpen = true;
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

const updateHospitalActiveStatus = async (req, res) => {
  try {
    // First find the hospital using createdBy
    const hospital = await Hospital.findOne({
      createdBy: req.user.id  // Use createdBy instead of _id
    });

    if (!hospital) {
      return res.status(404).json({ message: 'Hospital not found' });
    }

    hospital.isOpen = req.body.isOpen;
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

const updateHospitalBookingPrice = async (req, res) => {
  try {
    const { price } = req.body;
    const hospital = await Hospital.findOne({ createdBy: req.user.id });

    if (!hospital) {
      return res.status(404).json({ message: 'Hospital not found' });
    }

    const { opBookingPrice } = req.body;
    
    if (typeof opBookingPrice !== 'number' || opBookingPrice < 0) {
      return res.status(400).json({ message: 'Invalid booking price' });
    }

    hospital.opBookingPrice = opBookingPrice;
    await hospital.save();

    // Send notification for price update
    await NotificationService.createHospitalUpdateNotification(hospital, 'PRICE_UPDATED', {
      newPrice: price
    });

    res.json(hospital);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const getHospitalProfile = async (req, res) => {
  try {
    const hospital = await Hospital.findById(req.params.id)
      .populate('createdBy', 'email role')
      .populate('updatedBy', 'email role')
      .populate('approvedBy', 'email role');

    if (!hospital) {
      return res.status(404).json({ message: 'Hospital not found' });
    }

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get bookings stats
    const [totalBookings, todayBookings, totalRevenue] = await Promise.all([
      Booking.countDocuments({ hospital: hospital._id }),
      Booking.countDocuments({
        hospital: hospital._id,
        appointmentDate: { $gte: today, $lt: tomorrow }
      }),
      Booking.aggregate([
        {
          $match: {
            hospital: hospital._id,
            'payment.status': 'completed'
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$payment.breakdown.basePrice' }
          }
        }
      ])
    ]);

    // Format the complete hospital profile
    const hospitalProfile = {
      basicInfo: {
        name: hospital.name,
        email: hospital.email,
        contactNumber: hospital.contactNumber,
        registrationNumber: hospital.registrationNumber,
        description: hospital.description,
        emergencyServices: hospital.emergencyServices
      },
      address: hospital.address,
      location: hospital.location,
      operationalDetails: {
        isOpen: hospital.isOpen,
        opBookingPrice: hospital.opBookingPrice,
        maxOpBookingsPerDay: hospital.maxOpBookingsPerDay,
        timings: hospital.timings,
        slotSettings: {
          patientsPerSlot: hospital.patientsPerSlot || 1,
          totalSlotsPerDay: calculateTotalSlots(hospital.timings)
        }
      },
      medicalServices: {
        categories: hospital.categories,
        doctors: hospital.doctors
      },
      facilities: {
        amenities: hospital.amenities,
        images: hospital.images
      },
      ratings: hospital.ratings,
      approvalStatus: {
        status: hospital.status,
        approvedBy: hospital.approvedBy,
        approvalDate: hospital.approvalDate,
        rejectionReason: hospital.rejectionReason
      },
      metadata: {
        createdBy: hospital.createdBy,
        updatedBy: hospital.updatedBy,
        createdAt: hospital.createdAt,
        updatedAt: hospital.updatedAt
      },
      stats: {
        totalBookings,
        totalRevenue: totalRevenue[0]?.total || 0,
        averageRating: hospital.ratings.averageRating,
        todayBookings,
        remainingSlots: hospital.maxOpBookingsPerDay - todayBookings
      }
    };

    // Calculate fee breakdown
    const feeBreakdown = hospital.calculateFees();

    res.json({
      ...hospitalProfile,
      feeBreakdown
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getOwnHospitalProfile = async (req, res) => {
  try {
    const hospital = await Hospital.findOne({ createdBy: req.user.id })
      .populate('createdBy', 'email role')
      .populate('updatedBy', 'email role')
      .populate('approvedBy', 'email role')
      .lean();
    
    if (!hospital) {
      return res.status(404).json({ message: 'Hospital not found' });
    }

    // Calculate total slots per day based on timings
    const calculateTotalSlots = (timings) => {
      if (!timings || !timings.length) return 0;
      
      const slotsPerDay = timings.map(timing => {
        if (!timing.isOpen) return 0;
        const start = moment(timing.openTime, 'HH:mm');
        const end = moment(timing.closeTime, 'HH:mm');
        const duration = moment.duration(end.diff(start));
        return Math.floor(duration.asMinutes() / 30);
      });

      return Math.max(...slotsPerDay);
    };

    // Calculate slots with patients per slot for each timing
    const timingsWithSlots = hospital.timings.map(timing => ({
      ...timing,
      maxPatientsPerSlot: hospital.patientsPerSlot || 1
    }));

    const totalSlotsPerDay = calculateTotalSlots(hospital.timings);

    // Get today's bookings count
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayBookings = await Booking.countDocuments({
      hospital: hospital._id,
      appointmentDate: {
        $gte: today,
        $lt: tomorrow
      },
      status: { $in: ['confirmed', 'pending'] }
    });

    const response = {
      basicInfo: {
        name: hospital.name,
        email: hospital.email,
        contactNumber: hospital.contactNumber,
        registrationNumber: hospital.registrationNumber,
        description: hospital.description,
        emergencyServices: hospital.emergencyServices
      },
      address: hospital.address,
      location: hospital.location,
      operationalDetails: {
        isOpen: hospital.isOpen,
        opBookingPrice: hospital.opBookingPrice,
        maxOpBookingsPerDay: hospital.maxOpBookingsPerDay,
        timings: timingsWithSlots,
        slotSettings: {
          patientsPerSlot: hospital.patientsPerSlot || 1,
          totalSlotsPerDay: totalSlotsPerDay,
          maxPatientsPerDay: totalSlotsPerDay * (hospital.patientsPerSlot || 1),
          totalCapacityPerSlot: hospital.patientsPerSlot || 1
        }
      },
      medicalServices: {
        categories: hospital.categories.map(cat => ({
          ...cat,
          id: cat._id
        })),
        doctors: hospital.doctors.map(doc => ({
          ...doc,
          id: doc._id
        }))
      },
      facilities: {
        amenities: hospital.amenities.map(amenity => ({
          ...amenity,
          id: amenity._id
        })),
        images: hospital.images
      },
      ratings: {
        averageRating: hospital.ratings?.averageRating || 0,
        totalReviews: hospital.ratings?.totalReviews || 0
      },
      approvalStatus: {
        status: hospital.status,
        approvedBy: hospital.approvedBy ? {
          ...hospital.approvedBy,
          id: hospital.approvedBy._id
        } : null,
        approvalDate: hospital.approvalDate
      },
      metadata: {
        createdBy: {
          ...hospital.createdBy,
          id: hospital.createdBy._id
        },
        createdAt: hospital.createdAt,
        updatedAt: hospital.updatedAt
      },
      stats: {
        totalBookings: hospital.stats?.totalBookings || 0,
        totalRevenue: hospital.stats?.totalRevenue || 0,
        averageRating: hospital.stats?.averageRating || 0,
        todayBookings: todayBookings,
        remainingSlots: hospital.maxOpBookingsPerDay - todayBookings
      },
      feeBreakdown: typeof hospital.calculateFees === 'function' 
        ? hospital.calculateFees() 
        : {
            basePrice: hospital.opBookingPrice,
            platformFee: Math.ceil(hospital.opBookingPrice * 0.018),
            gst: Math.ceil(hospital.opBookingPrice * 0.004),
            totalAmount: Math.ceil(hospital.opBookingPrice * 1.022)
          }
    };

    res.json(response);
  } catch (error) {
    console.error('Error in getOwnHospitalProfile:', error);
    res.status(500).json({ message: error.message });
  }
};

const updateHospitalProfile = async (req, res) => {
  try {
    const hospital = await Hospital.findOne({ createdBy: req.user.id });

    if (!hospital) {
      return res.status(404).json({ message: 'Hospital not found' });
    }

    const {
      basicInfo,
      address,
      operationalDetails,
      medicalServices,
      facilities
    } = req.body;

    // Update basic info if provided
    if (basicInfo) {
      if (basicInfo.name) hospital.name = basicInfo.name;
      if (basicInfo.contactNumber) hospital.contactNumber = basicInfo.contactNumber;
      if (basicInfo.description) hospital.description = basicInfo.description;
      if (typeof basicInfo.emergencyServices === 'boolean') {
        hospital.emergencyServices = basicInfo.emergencyServices;
      }
    }

    // Update address if provided
    if (address) {
      Object.keys(address).forEach(key => {
        if (address[key]) {
          hospital.address[key] = address[key];
        }
      });
    }

    // Update operational details if provided
    if (operationalDetails) {
      if (typeof operationalDetails.isOpen === 'boolean') {
        hospital.isOpen = operationalDetails.isOpen;
      }
      if (operationalDetails.opBookingPrice) {
        hospital.opBookingPrice = operationalDetails.opBookingPrice;
      }
      if (operationalDetails.maxOpBookingsPerDay) {
        hospital.maxOpBookingsPerDay = operationalDetails.maxOpBookingsPerDay;
      }
      if (operationalDetails.timings && Array.isArray(operationalDetails.timings)) {
        hospital.timings = operationalDetails.timings.map(timing => ({
          day: timing.day,
          openTime: timing.openTime,
          closeTime: timing.closeTime,
          isOpen: timing.isOpen
        }));
      }
      // Add slot settings update
      if (operationalDetails.slotSettings) {
        if (operationalDetails.slotSettings.patientsPerSlot && 
            operationalDetails.slotSettings.patientsPerSlot >= 1) {
          hospital.patientsPerSlot = operationalDetails.slotSettings.patientsPerSlot;
        }
      }
    }

    // Update medical services if provided
    if (medicalServices) {
      // Update categories if provided
      if (medicalServices.categories && Array.isArray(medicalServices.categories)) {
        // Filter only valid categories from the enum
        const validCategories = medicalServices.categories.filter(cat => 
          ['Dentistry', 'Cardiology', 'Pulmonology', 'General', 'Neurology', 
           'Gastroenterology', 'Laboratory', 'Vaccination'].includes(cat.name)
        );
        if (validCategories.length > 0) {
          hospital.categories = validCategories;
        }
      }

      // Update doctors if provided
      if (medicalServices.doctors && Array.isArray(medicalServices.doctors)) {
        hospital.doctors = medicalServices.doctors.map(doctor => ({
          name: doctor.name,
          profession: doctor.profession,
          experience: doctor.experience,
          specialization: doctor.specialization
        }));
      }
    }

    // Update facilities if provided
    if (facilities) {
      if (facilities.amenities && Array.isArray(facilities.amenities)) {
        hospital.amenities = facilities.amenities.map(amenity => ({
          name: amenity.name,
          icon: amenity.icon
        }));
      }
      if (facilities.images && Array.isArray(facilities.images)) {
        hospital.images = facilities.images;
      }
    }

    // Save with validation disabled for flexible updates
    const updatedHospital = await hospital.save({ validateBeforeSave: false });

    // Format the response with updated slot settings
    const response = {
      basicInfo: {
        name: updatedHospital.name,
        email: updatedHospital.email,
        contactNumber: updatedHospital.contactNumber,
        registrationNumber: updatedHospital.registrationNumber,
        description: updatedHospital.description,
        emergencyServices: updatedHospital.emergencyServices
      },
      address: updatedHospital.address,
      operationalDetails: {
        isOpen: updatedHospital.isOpen,
        opBookingPrice: updatedHospital.opBookingPrice,
        maxOpBookingsPerDay: updatedHospital.maxOpBookingsPerDay,
        timings: updatedHospital.timings,
        slotSettings: {
          patientsPerSlot: updatedHospital.patientsPerSlot || 1,
          totalSlotsPerDay: calculateTotalSlots(updatedHospital.timings)
        }
      },
      medicalServices: {
        categories: updatedHospital.categories,
        doctors: updatedHospital.doctors
      },
      facilities: {
        amenities: updatedHospital.amenities,
        images: updatedHospital.images
      },
      metadata: {
        updatedAt: updatedHospital.updatedAt
      }
    };

    res.json(response);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const getBookingDetails = async (req, res) => {
  try {
    // First find the hospital
    const hospital = await Hospital.findOne({ createdBy: req.user.id });
    if (!hospital) {
      return res.status(404).json({ message: 'Hospital not found' });
    }

    // Find the specific booking
    const booking = await Booking.findOne({
      _id: req.params.bookingId,
      hospital: hospital._id
    })
    .populate('user', 'name email phoneNumber')
    .lean();

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Format the booking details
    const formattedBooking = {
      id: booking._id,
      tokenNo: booking.tokenNumber,
      patientDetails: {
        name: booking.patientDetails.name,
        age: booking.patientDetails.age,
        gender: booking.patientDetails.gender,
        mobile: booking.patientDetails.mobile
      },
      appointmentDate: booking.appointmentDate,
      timeSlot: booking.timeSlot,
      status: booking.status,
      doctorName: booking.doctorName || 'To be assigned',
      department: booking.specialization,
      symptoms: booking.symptoms,
      priority: booking.priority || 'normal',
      payment: {
        status: booking.payment.status,
        amount: booking.payment.amount,
        method: booking.payment.method,
        breakdown: booking.payment.breakdown
      },
      user: {
        name: booking.user?.name,
        email: booking.user?.email,
        phone: booking.user?.phoneNumber
      },
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt
    };

    res.json(formattedBooking);
  } catch (error) {
    console.error('Error fetching booking details:', error);
    res.status(500).json({ message: error.message });
  }
};

const manageBooking = async (req, res) => {
  try {
    const { status, rejectionReason } = req.body;

    // Find the hospital first
    const hospital = await Hospital.findOne({ createdBy: req.user.id });
    if (!hospital) {
      return res.status(404).json({ message: 'Hospital not found' });
    }

    // Find the booking and use lean() to get a plain JavaScript object
    const booking = await Booking.findOne({
      _id: req.params.bookingId,
      hospital: hospital._id
    });

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Validate status
    const validStatuses = ['confirmed', 'rejected', 'completed'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ 
        message: 'Invalid status. Must be confirmed, rejected, or completed' 
      });
    }

    // Validate rejection reason if status is rejected
    if (status === 'rejected' && !rejectionReason) {
      return res.status(400).json({ 
        message: 'Rejection reason is required when rejecting a booking' 
      });
    }

    // Only update the status and rejection reason
    const updateData = { status };
    if (status === 'rejected') {
      updateData.rejectionReason = rejectionReason;
    }

    // Use findOneAndUpdate to avoid validation issues with required fields
    const updatedBooking = await Booking.findOneAndUpdate(
      { _id: booking._id },
      { $set: updateData },
      { 
        new: true, // Return the updated document
        runValidators: false // Skip validation since we're only updating status
      }
    ).populate('user', 'name email phoneNumber');

    if (!updatedBooking) {
      return res.status(404).json({ message: 'Booking not found after update' });
    }

    // Format the response
    const response = {
      id: updatedBooking._id,
      tokenNo: updatedBooking.tokenNumber,
      patientDetails: {
        name: updatedBooking.patientDetails.name,
        age: updatedBooking.patientDetails.age,
        gender: updatedBooking.patientDetails.gender,
        mobile: updatedBooking.patientDetails.mobile
      },
      appointmentDate: updatedBooking.appointmentDate,
      timeSlot: updatedBooking.timeSlot,
      status: updatedBooking.status,
      rejectionReason: updatedBooking.rejectionReason,
      payment: updatedBooking.payment,
      user: updatedBooking.user,
      createdAt: updatedBooking.createdAt,
      updatedAt: updatedBooking.updatedAt
    };

    res.json(response);
  } catch (error) {
    console.error('Error managing booking:', error);
    res.status(500).json({ message: error.message });
  }
};

const updateBookingToken = async (req, res) => {
  try {
    const { tokenNumber } = req.body;

    // Validate token number is provided
    if (!tokenNumber) {
      return res.status(400).json({ 
        message: 'Token number is required' 
      });
    }

    // Find the hospital first
    const hospital = await Hospital.findOne({ createdBy: req.user.id });
    if (!hospital) {
      return res.status(404).json({ message: 'Hospital not found' });
    }

    // Find the booking
    const booking = await Booking.findOne({
      _id: req.params.bookingId,
      hospital: hospital._id
    });

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Validate token number format (e.g., ABC001)
    const tokenRegex = /^[A-Z]{3}\d{3}$/;
    if (!tokenRegex.test(tokenNumber)) {
      return res.status(400).json({ 
        message: 'Invalid token number format. Must be 3 uppercase letters followed by 3 digits (e.g., ABC001)' 
      });
    }

    // Check if token number is already in use for the same day
    const sameDay = new Date(booking.appointmentDate);
    sameDay.setHours(0, 0, 0, 0);
    const nextDay = new Date(sameDay);
    nextDay.setDate(nextDay.getDate() + 1);

    const existingBooking = await Booking.findOne({
      hospital: hospital._id,
      tokenNumber,
      appointmentDate: {
        $gte: sameDay,
        $lt: nextDay
      },
      _id: { $ne: booking._id } // Exclude current booking
    });

    if (existingBooking) {
      return res.status(400).json({ 
        message: 'Token number already in use for this date' 
      });
    }

    // Store old token number for response
    const oldTokenNumber = booking.tokenNumber;

    // Update token number
    booking.tokenNumber = tokenNumber;
    await booking.save();

    // Return success response with old and new token numbers
    res.json({
      message: 'Token number updated successfully',
      bookingId: booking._id,
      oldTokenNumber,
      newTokenNumber: tokenNumber,
      patientName: booking.patientDetails.name,
      appointmentDate: booking.appointmentDate,
      timeSlot: booking.timeSlot,
      status: booking.status,
      updatedAt: booking.updatedAt
    });

  } catch (error) {
    console.error('Error updating token number:', error);
    res.status(500).json({ message: error.message });
  }
};

const getHospitalsForPatients = async (req, res) => {
  try {
    // Check if user is authenticated and is a hospital
    if (!req.user || req.user.role !== 'hospital') {
      return res.status(403).json({ message: 'Unauthorized. Only hospitals can access this endpoint.' });
    }

    // Find the hospital associated with the logged-in user
    const hospital = await Hospital.findOne({ createdBy: req.user.id });
    if (!hospital) {
      return res.status(404).json({ message: 'Hospital not found for this user' });
    }

    // Get today's date (start of day)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get bookings for this hospital with patient details
    const bookings = await Booking.find({
      hospital: hospital._id,
      status: { $in: ['confirmed', 'pending', 'completed', 'rejected', 'cancelled'] }
    })
    .populate('user', 'name email phone gender age') // Populate patient details
    .select('user appointmentDate status tokenNo');

    // Group patients by their booking status
    const patients = {
      today: [], // Today's patients
      upcoming: [], // Future appointments
      past: [] // Past appointments
    };

    bookings.forEach(booking => {
      const bookingDate = new Date(booking.appointmentDate);
      bookingDate.setHours(0, 0, 0, 0);

      const patientInfo = {
        id: booking.user._id,
        name: booking.user.name,
        email: booking.user.email,
        phone: booking.user.phone,
        gender: booking.user.gender,
        age: booking.user.age,
        appointmentDate: booking.appointmentDate,
        status: booking.status,
        tokenNo: booking.tokenNo
      };

      if (bookingDate.getTime() === today.getTime()) {
        patients.today.push(patientInfo);
      } else if (bookingDate > today) {
        patients.upcoming.push(patientInfo);
      } else {
        patients.past.push(patientInfo);
      }
    });

    // Sort patients by appointment date and token number
    const sortByDateAndToken = (a, b) => {
      if (a.appointmentDate === b.appointmentDate) {
        return (a.tokenNo || 0) - (b.tokenNo || 0);
      }
      return new Date(a.appointmentDate) - new Date(b.appointmentDate);
    };

    patients.today.sort(sortByDateAndToken);
    patients.upcoming.sort(sortByDateAndToken);
    patients.past.sort((a, b) => new Date(b.appointmentDate) - new Date(a.appointmentDate));

    // Add summary statistics
    const summary = {
      totalPatients: bookings.length,
      todayPatients: patients.today.length,
      upcomingAppointments: patients.upcoming.length,
      completedAppointments: bookings.filter(b => b.status === 'completed').length
    };

    res.json({
      summary,
      patients
    });

  } catch (error) {
    console.error('Error fetching hospital patients:', error);
    res.status(500).json({ message: error.message });
  }
};

const getHospitalReports = async (req, res) => {
  try {
    const { range = 'week' } = req.query;
    const hospital = await Hospital.findOne({ createdBy: req.user.id });

    if (!hospital) {
      return res.status(404).json({ message: 'Hospital not found' });
    }

    // Calculate date range
    const endDate = new Date();
    let startDate = new Date();
    
    switch (range) {
      case 'day':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(startDate.getDate() - 7);
    }

    // Get appointments data with detailed status including rejected
    const appointments = await Booking.aggregate([
      {
        $match: {
          hospital: hospital._id,
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$appointmentDate' } },
          count: { $sum: 1 },
          revenue: { 
            $sum: {
              $cond: [
                { $and: [
                  { $eq: ['$status', 'completed'] },
                  { $eq: ['$payment.status', 'completed'] }
                ]},
                '$payment.breakdown.basePrice',
                0
              ]
            }
          },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          cancelled: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
          },
          rejected: {
            $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
          },
          pending: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Get payment method distribution
    const payments = await Booking.aggregate([
      {
        $match: {
          hospital: hospital._id,
          createdAt: { $gte: startDate, $lte: endDate },
          status: 'completed',
          'payment.status': 'completed'
        }
      },
      {
        $group: {
          _id: '$payment.method',
          amount: { $sum: '$payment.amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    // Get patient distribution with more details
    const patients = await Booking.aggregate([
      {
        $match: {
          hospital: hospital._id,
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: { 
            date: { $dateToString: { format: '%Y-%m-%d', date: '$appointmentDate' } },
            patientId: '$user'
          },
          lastVisit: { $last: '$appointmentDate' }
        }
      },
      {
        $group: {
          _id: '$_id.date',
          total: { $sum: 1 },
          new: {
            $sum: {
              $cond: [
                { $eq: [{ $size: { $ifNull: ['$previousVisits', []] } }, 0] },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $project: {
          date: '$_id',
          new: '$new',
          returning: { $subtract: ['$total', '$new'] }
        }
      },
      { $sort: { date: 1 } }
    ]);

    // Calculate additional metrics for summary
    const totalRevenue = appointments.reduce((sum, day) => sum + (day.revenue || 0), 0);
    const totalAppointments = appointments.reduce((sum, day) => sum + day.count, 0);
    const totalPatients = patients.reduce((sum, day) => sum + day.new + day.returning, 0);
    const totalCompleted = appointments.reduce((sum, day) => sum + day.completed, 0);
    const totalCancelled = appointments.reduce((sum, day) => sum + day.cancelled, 0);
    const totalRejected = appointments.reduce((sum, day) => sum + day.rejected, 0);
    const totalPending = appointments.reduce((sum, day) => sum + day.pending, 0);

    // Calculate completion and rejection rates
    const completionRate = totalAppointments > 0 
      ? Math.round((totalCompleted / totalAppointments) * 100) 
      : 0;
    
    const rejectionRate = totalAppointments > 0
      ? Math.round((totalRejected / totalAppointments) * 100)
      : 0;

    // Format payment methods for pie chart
    const paymentMethodsDistribution = payments.map(p => ({
      name: {
        'cod': 'Cash',
        'online': 'Online',
        'card': 'Card',
        'upi': 'UPI'
      }[p._id.toLowerCase()] || p._id,  // Use original value if no mapping found
      value: p.count,
      amount: p.amount
    }));

    const summary = {
      totalRevenue,
      totalAppointments,
      totalPatients,
      avgRevenuePerPatient: totalPatients > 0 ? Math.round(totalRevenue / totalPatients) : 0,
      completionRate,
      rejectionRate,
      paymentDistribution: paymentMethodsDistribution,
      statusBreakdown: {
        completed: totalCompleted,
        cancelled: totalCancelled,
        rejected: totalRejected,
        pending: totalPending
      }
    };

    res.json({
      appointments: appointments.map(day => ({
        date: day._id,
        count: day.count,
        revenue: day.revenue || 0,
        completed: day.completed,
        cancelled: day.cancelled,
        rejected: day.rejected,
        pending: day.pending
      })),
      payments: paymentMethodsDistribution,
      patients: patients.map(day => ({
        date: day.date,
        new: day.new,
        returning: day.returning
      })),
      summary
    });
  } catch (error) {
    console.error('Error generating hospital reports:', error);
    res.status(500).json({ message: error.message });
  }
};

const getHospitalPatients = async (req, res) => {
  try {
    const hospital = await Hospital.findOne({ createdBy: req.user.id });
    if (!hospital) {
      return res.status(404).json({ message: 'Hospital not found' });
    }

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get all bookings for this hospital
    const [todayBookings, upcomingBookings, pastBookings, totalStats] = await Promise.all([
      // Today's bookings
      Booking.find({
        hospital: hospital._id,
        appointmentDate: {
          $gte: today,
          $lt: tomorrow
        }
      })
      .populate('user', 'name email phoneNumber')
      .sort({ timeSlot: 1 })
      .lean(),

      // Upcoming bookings (after today)
      Booking.find({
        hospital: hospital._id,
        appointmentDate: { $gt: tomorrow },
        status: { $in: ['confirmed', 'pending'] }
      })
      .populate('user', 'name email phoneNumber')
      .sort({ appointmentDate: 1, timeSlot: 1 })
      .lean(),

      // Past bookings (before today)
      Booking.find({
        hospital: hospital._id,
        appointmentDate: { $lt: today }
      })
      .populate('user', 'name email phoneNumber')
      .sort({ appointmentDate: -1 })
      .limit(50) // Limit to last 50 bookings
      .lean(),

      // Get summary statistics
      Booking.aggregate([
        {
          $match: { hospital: hospital._id }
        },
        {
          $group: {
            _id: null,
            totalPatients: { $addToSet: '$user' }, // Unique patients
            todayPatients: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $gte: ['$appointmentDate', today] },
                      { $lt: ['$appointmentDate', tomorrow] }
                    ]
                  },
                  1,
                  0
                ]
              }
            }
          }
        }
      ])
    ]);

    // Format patient data
    const formatBooking = (booking) => ({
      id: booking._id,
      patientName: booking.patientDetails.name,
      patientAge: booking.patientDetails.age,
      patientGender: booking.patientDetails.gender,
      appointmentDate: booking.appointmentDate,
      timeSlot: booking.timeSlot,
      tokenNumber: booking.tokenNumber,
      status: booking.status,
      contactNumber: booking.patientDetails.mobile,
      symptoms: booking.symptoms,
      department: booking.specialization,
      doctorName: booking.doctorName,
      user: {
        name: booking.user?.name,
        email: booking.user?.email,
        phone: booking.user?.phoneNumber
      },
      payment: {
        status: booking.payment.status,
        amount: booking.payment.amount
      }
    });

    const stats = totalStats[0] || {
      totalPatients: [],
      todayPatients: 0,
      upcomingAppointments: 0,
      completedAppointments: 0
    };

    res.json({
      summary: {
        totalPatients: stats.totalPatients.length,
        todayPatients: stats.todayPatients,
        upcomingAppointments: stats.upcomingAppointments,
        completedAppointments: stats.completedAppointments
      },
      patients: {
        today: todayBookings.map(formatBooking),
        upcoming: upcomingBookings.map(formatBooking),
        past: pastBookings.map(formatBooking)
      }
    });

  } catch (error) {
    console.error('Error fetching hospital patients:', error);
    res.status(500).json({ message: error.message });
  }
};

const getPaymentStats = async (req, res) => {
  try {
    const hospital = await Hospital.findOne({ createdBy: req.user.id });
    if (!hospital) {
      return res.status(404).json({ message: 'Hospital not found' });
    }

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get all payment metrics in parallel
    const [totalPayments, todayPayments, recentPayments] = await Promise.all([
      // Modified total payments aggregation to properly calculate pending amounts
      Booking.aggregate([
        {
          $match: {
            hospital: hospital._id,
          }
        },
        {
          $group: {
            _id: null,
            totalCollected: {
              $sum: {
                $cond: [
                  { $eq: ['$payment.status', 'completed'] },
                  '$payment.breakdown.basePrice',
                  0
                ]
              }
            },
            pendingAmount: {
              $sum: {
                $cond: [
                  { $ne: ['$payment.status', 'completed'] },
                  { $ifNull: ['$payment.breakdown.basePrice', 0] },
                  0
                ]
              }
            },
            totalCount: { $sum: 1 },
            completedCount: {
              $sum: {
                $cond: [
                  { $eq: ['$payment.status', 'completed'] },
                  1,
                  0
                ]
              }
            }
          }
        }
      ]),

      // Today's payments
      Booking.aggregate([
        {
          $match: {
            hospital: hospital._id,
            createdAt: {
              $gte: today,
              $lt: tomorrow
            }
          }
        },
        {
          $group: {
            _id: null,
            todayCollection: {
              $sum: {
                $cond: [
                  { $eq: ['$payment.status', 'completed'] },
                  '$payment.breakdown.basePrice',
                  0
                ]
              }
            }
          }
        }
      ]),

      // Modified recent payments query to get all payments
      Booking.find({
        hospital: hospital._id,
      })
      .sort({ createdAt: -1 }) // Sort by newest first
      .populate('user', 'name')
      .select('patientDetails payment createdAt appointmentType')
      .lean()
    ]);

    // Calculate metrics
    const paymentStats = totalPayments[0] || {
      totalCollected: 0,
      pendingAmount: 0,
      totalCount: 0,
      completedCount: 0
    };

    const successRate = paymentStats.totalCount > 0
      ? Math.round((paymentStats.completedCount / paymentStats.totalCount) * 100)
      : 0;

    // Format all payments
    const formattedPayments = recentPayments.map(booking => ({
      id: booking._id,
      patientName: booking.patientDetails?.name || 'N/A',
      amount: booking.payment?.amount || 0,
      date: new Date(booking.createdAt).toISOString().split('T')[0],
      method: booking.payment?.method || 'N/A',
      status: booking.payment?.status || 'N/A',
      appointmentType: booking.appointmentType || 'OPD'
    }));

    res.json({
      metrics: {
        totalCollected: paymentStats.totalCollected,
        pendingAmount: paymentStats.pendingAmount,
        todayCollection: todayPayments[0]?.todayCollection || 0,
        successRate
      },
      recentPayments: formattedPayments // Now contains all payments
    });

  } catch (error) {
    console.error('Error fetching payment stats:', error);
    res.status(500).json({ message: error.message });
  }
};

const updateSlotSettings = async (req, res) => {
  try {
    const { patientsPerSlot } = req.body;
    
    // Validate input
    if (!patientsPerSlot || patientsPerSlot < 1) {
      return res.status(400).json({ 
        message: 'Patients per slot must be at least 1' 
      });
    }

    // Find hospital using createdBy from the JWT token
    const hospital = await Hospital.findOne({ 
      createdBy: req.user.id
    });

    if (!hospital) {
      return res.status(404).json({ message: 'Hospital not found' });
    }

    // Check if hospital has timings set
    if (!hospital.timings || hospital.timings.length === 0) {
      return res.status(400).json({ 
        message: 'Please set hospital timings first before configuring slot settings' 
      });
    }

    // Update slot settings
    hospital.patientsPerSlot = patientsPerSlot;
    await hospital.save();

    // Return response
    res.json({
      status: 'success',
      message: 'Slot settings updated successfully',
      data: {
        patientsPerSlot: hospital.patientsPerSlot,
        hospitalName: hospital.name,
        timings: hospital.timings.map(timing => ({
          day: timing.day,
          openTime: timing.openTime,
          closeTime: timing.closeTime,
          isOpen: timing.isOpen,
          maxPatientsPerSlot: patientsPerSlot
        }))
      }
    });
  } catch (error) {
    console.error('Error updating slot settings:', error);
    res.status(400).json({ 
      status: 'error',
      message: error.message 
    });
  }
};

// Helper function to calculate total slots per day
const calculateTotalSlots = (timings) => {
  let totalSlots = 0;
  timings.forEach(timing => {
    if (timing.isOpen) {
      const [openHour, openMin] = timing.openTime.split(':').map(Number);
      const [closeHour, closeMin] = timing.closeTime.split(':').map(Number);
      
      // Calculate total minutes
      const totalMinutes = (closeHour * 60 + closeMin) - (openHour * 60 + openMin);
      // Each slot is 30 minutes
      totalSlots += Math.floor(totalMinutes / 30);
    }
  });
  return totalSlots;
};

// Helper function to calculate available slots
const calculateAvailableSlots = async (hospitalId, date, totalSlots, patientsPerSlot) => {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const bookedAppointments = await Booking.countDocuments({
    hospital: hospitalId,
    appointmentDate: {
      $gte: startOfDay,
      $lt: endOfDay
    },
    status: { $in: ['confirmed', 'pending'] }
  });

  const totalCapacity = totalSlots * patientsPerSlot;
  return totalCapacity - bookedAppointments;
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
  getFilteredHospitals,
  updateHospitalActiveStatus,
  updateHospitalBookingPrice,
  getHospitalProfile,
  getOwnHospitalProfile,
  updateHospitalProfile,
  getBookingDetails,
  manageBooking,
  updateBookingToken,
  getHospitalsForPatients,
  getHospitalReports,
  getHospitalPatients,
  getPaymentStats,
  updateSlotSettings
};