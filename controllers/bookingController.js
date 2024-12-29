const Booking = require('../models/Booking');
const Hospital = require('../models/Hospital');
const Razorpay = require('razorpay');
const PDFDocument = require('pdfkit');
const crypto = require('crypto');

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

// Create booking
const createBooking = async (req, res) => {
  try {
    const { 
      hospitalId, 
      appointmentDate, 
      timeSlot,
      symptoms, 
      specialization, 
      preferredDoctor, 
      paymentMethod,
      // Additional fields from the form
      name,
      age,
      gender,
      mobile,
      address
    } = req.body;
    
    // Validate hospital status and timing
    const hospital = await Hospital.findOne({
      _id: hospitalId,
      status: 'approved',
      isOpen: true
    });

    if (!hospital) {
      return res.status(400).json({ message: 'Hospital is not available for booking' });
    }

    // Validate time slot format and availability
    const [startTime] = timeSlot.split(' - ');
    const appointmentDateTime = new Date(appointmentDate);
    const [hours, minutes] = startTime.split(':');
    appointmentDateTime.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);

    // Check if maximum bookings reached for the day
    const bookingsCount = await Booking.countDocuments({
      hospital: hospitalId,
      appointmentDate: {
        $gte: new Date(appointmentDate).setHours(0,0,0),
        $lt: new Date(appointmentDate).setHours(23,59,59)
      },
      status: { $in: ['confirmed', 'pending'] }
    });

    if (bookingsCount >= hospital.maxOpBookingsPerDay) {
      return res.status(400).json({ message: 'No slots available for this date' });
    }

    // Calculate fees using hospital's method
    const { basePrice, platformFee, gst, totalAmount } = hospital.calculateFees();

    let orderData = {
      amount: totalAmount,
      payment: {
        method: paymentMethod,
        amount: totalAmount,
        breakdown: {
          basePrice,
          platformFee,
          gst,
          total: totalAmount
        }
      }
    };

    // Set initial status based on payment method
    if (paymentMethod === 'online') {
      // For online payment, booking remains pending until payment verification
      orderData.payment.status = 'pending';
      orderData.status = 'pending';  // Booking status also stays pending
    } else {
      // For COD, payment stays pending but booking can be confirmed
      orderData.payment.status = 'pending';
      orderData.status = 'confirmed';
    }

    // Create booking with additional patient details
    const booking = new Booking({
      user: req.user.id,
      hospital: hospitalId,
      appointmentDate: appointmentDateTime,
      symptoms,
      specialization,
      preferredDoctor,
      tokenNumber: bookingsCount + 1,
      patientDetails: {
        name,
        age,
        gender,
        mobile,
        address
      },
      ...orderData
    });

    await booking.save();

    // Prepare response based on payment method
    const response = {
      booking,
      paymentBreakdown: {
        basePrice,
        platformFee,
        gst,
        totalAmount
      }
    };

    if (paymentMethod === 'online') {
      // Create Razorpay order
      const order = await razorpay.orders.create({
        amount: totalAmount * 100, // Razorpay expects amount in paise
        currency: 'INR',
        receipt: `booking_${booking._id}`
      });
      
      response.order = {
        id: order.id
      };
      response.message = 'Please complete the payment to confirm your booking';
    } else {
      response.message = 'Booking confirmed! Please pay at the hospital';
    }

    res.status(201).json(response);
  } catch (error) {
    console.error('Booking creation error:', error);
    res.status(400).json({ 
      message: error.message || 'Error creating booking',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
};

// Verify payment and confirm booking
const verifyPayment = async (req, res) => {
  try {
    const { bookingId, paymentId, signature } = req.body;
    
    // Verify payment signature
    const booking = await Booking.findById(bookingId);
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${booking.payment.orderId}|${paymentId}`)
      .digest('hex');

    if (generatedSignature !== signature) {
      return res.status(400).json({ message: 'Invalid payment' });
    }

    // Update booking payment status
    booking.payment.paymentId = paymentId;
    booking.payment.status = 'completed';
    booking.payment.paidAt = new Date();
    booking.status = 'confirmed';
    await booking.save();

    res.json(booking);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Get user bookings
const getUserBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user.id })
      .populate('hospital', 'name address')
      .sort('-appointmentDate');
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get hospital bookings
const getHospitalBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ hospital: req.params.hospitalId })
      .populate('user', 'email')
      .sort('-appointmentDate');
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Approve/reject booking
const updateBookingStatus = async (req, res) => {
  try {
    const { status, rejectionReason } = req.body;
    const booking = await Booking.findOne({
      _id: req.params.id,
      hospital: req.user.hospitalId
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

// Download booking details
const downloadBooking = async (req, res) => {
  try {
    const booking = await Booking.findOne({
      _id: req.params.id,
      user: req.user.id
    }).populate('hospital');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Generate PDF
    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=booking-${booking._id}.pdf`);
    
    doc.pipe(res);
    doc.fontSize(25).text('Booking Details', 100, 100);
    doc.fontSize(15)
      .text(`Hospital: ${booking.hospital.name}`)
      .text(`Date: ${booking.appointmentDate.toLocaleDateString()}`)
      .text(`Token Number: ${booking.tokenNumber}`)
      .text(`Status: ${booking.status}`)
      .moveDown()
      .text('Payment Details')
      .text(`Base Price: ₹${booking.payment.breakdown.basePrice}`)
      .text(`Platform Fee: ₹${booking.payment.breakdown.platformFee}`)
      .text(`GST (18%): ₹${booking.payment.breakdown.gst}`)
      .text(`Total Amount: ₹${booking.payment.breakdown.total}`);
    
    doc.end();
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createBooking,
  verifyPayment,
  getUserBookings,
  getHospitalBookings,
  updateBookingStatus,
  downloadBooking
};
