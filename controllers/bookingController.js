const Booking = require('../models/Booking');
const Hospital = require('../models/Hospital');
const Razorpay = require('razorpay');
const PDFDocument = require('pdfkit');
const crypto = require('crypto');
const NotificationService = require('../services/notificationService');

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
      name,
      age,
      gender,
      mobile,
      address,
      healthIssue,
      doctorName,
      specialty
    } = req.body;
    
    // Validate date format (DD-MM-YYYY)
    const dateRegex = /^(0[1-9]|[12][0-9]|3[01])-(0[1-9]|1[0-2])-\d{4}$/;
    if (!dateRegex.test(appointmentDate)) {
      return res.status(400).json({ 
        message: 'Invalid date format. Please use DD-MM-YYYY (e.g., 25-12-2024)' 
      });
    }

    // Validate time slot format (HH:MM AM/PM)
    const timeRegex = /^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/;
    if (!timeRegex.test(timeSlot)) {
      return res.status(400).json({ 
        message: 'Invalid time format. Please use HH:MM AM/PM (e.g., 09:30 AM)' 
      });
    }

    // Get current time in IST
    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000; // 5.5 hours in milliseconds
    const istNow = new Date(now.getTime() + istOffset);

    // Parse the appointment date
    const [day, month, year] = appointmentDate.split('-').map(Number);
    const [time, period] = timeSlot.split(' ');
    const [hours, minutes] = time.split(':').map(Number);

    // Convert to 24-hour format
    let hour24 = hours;
    if (period === 'PM' && hours !== 12) {
      hour24 += 12;
    } else if (period === 'AM' && hours === 12) {
      hour24 = 0; // 12:00 AM should be 00:00
    }

    // Create appointment date in UTC
    const appointmentDateTime = new Date(Date.UTC(year, month - 1, day, hour24, minutes));

    // Add IST offset to appointment time
    const appointmentDateTimeIST = new Date(appointmentDateTime.getTime() + istOffset);

    // Debug logs
    console.log('Raw input:', { appointmentDate, timeSlot, hour24 });
    console.log('Current Date (IST):', istNow.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
    console.log('Appointment Date (IST):', appointmentDateTimeIST.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }));
    console.log('Is Future Date:', appointmentDateTimeIST > istNow);

    // Compare dates in IST
    if (appointmentDateTimeIST <= istNow) {
      return res.status(400).json({ 
        message: 'Appointment date and time must be in the future' 
      });
    }

    // Check if time slot is available
    const existingBooking = await Booking.findOne({
      hospital: hospitalId,
      appointmentDate: appointmentDateTime,
      status: { $in: ['pending', 'pending'] }
    });

    if (existingBooking) {
      return res.status(400).json({ 
        message: 'This time slot is already booked' 
      });
    }

    // Get hospital details
    const hospital = await Hospital.findOne({
      _id: hospitalId,
      status: 'approved',
      isOpen: true
    });

    if (!hospital) {
      return res.status(400).json({ message: 'Hospital is not available for booking' });
    }

    // Check slot capacity
    const startOfSlot = new Date(appointmentDateTime);
    const slotDuration = hospital.slotSettings?.slotDuration || 30;
    const patientsPerSlot = hospital.slotSettings?.patientsPerSlot || 1;
    
    const endOfSlot = new Date(startOfSlot.getTime() + slotDuration * 60000);

    // Count existing bookings in this slot
    const existingBookingsInSlot = await Booking.countDocuments({
      hospital: hospitalId,
      appointmentDate: {
        $gte: startOfSlot,
        $lt: endOfSlot
      },
      status: { $in: ['pending', 'confirmed'] }
    });

    if (existingBookingsInSlot >= patientsPerSlot) {
      return res.status(400).json({ 
        message: 'This time slot is fully booked. Please select another slot.' 
      });
    }

    // Calculate fees
    const { basePrice, platformFee, gst, totalAmount } = hospital.calculateFees();

    // Get the count of existing bookings for this hospital and date
    const startOfDay = new Date(appointmentDateTime);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(appointmentDateTime);
    endOfDay.setHours(23, 59, 59, 999);

    const existingBookingsCount = await Booking.countDocuments({
      hospital: hospitalId,
      appointmentDate: {
        $gte: startOfDay,
        $lt: endOfDay
      }
    });

    // Generate token number
    const hospitalPrefix = hospital.name.substring(0, 3).toUpperCase();
    const tokenNumber = `${hospitalPrefix}${(existingBookingsCount + 1).toString().padStart(3, '0')}`;

    // Create booking with the generated token number
    const booking = new Booking({
      user: req.user.id,
      hospital: hospitalId,
      appointmentDate: appointmentDateTime,
      timeSlot,
      tokenNumber,
      status: 'pending',
      symptoms,
      specialization,
      preferredDoctor,
      doctorName,
      specialty,
      doctorAssigned: null,
      patientDetails: {
        name,
        age,
        gender,
        mobile,
        address,
        healthIssue
      },
      payment: {
        method: paymentMethod,
        amount: totalAmount,
        status: 'pending',
        breakdown: {
          basePrice,
          platformFee,
          gst,
          total: totalAmount
        }
      }
    });

    await booking.save();
    await booking.populate('hospital', 'name address');
    await NotificationService.createBookingNotifications(booking, 'BOOKING_CREATED');

    // If online payment, create Razorpay order
    if (paymentMethod === 'online') {
      const order = await razorpay.orders.create({
        amount: totalAmount * 100,
        currency: 'INR',
        receipt: booking._id.toString()
      });

      return res.status(201).json({
        booking,
        paymentDetails: {
          orderId: order.id,
          amount: order.amount,
          currency: order.currency
        }
      });
    }

    res.status(201).json(booking);
  } catch (error) {
    console.error('Booking creation error:', error);
    res.status(400).json({ message: error.message });
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
    await NotificationService.createBookingNotifications(booking, 'PAYMENT_RECEIVED');

    res.json(booking);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Get user bookings
const getUserBookings = async (req, res) => {
  try {
    // First, get all bookings with populated hospital data
    let bookings = await Booking.find({ user: req.user.id })
      .populate({
        path: 'hospital',
        select: 'name address',
        model: 'Hospital'  // Make sure to specify the correct model name
      })
      .sort('-appointmentDate');

    // Fix any bookings with missing hospital references
    for (const booking of bookings) {
      try {
        // If hospital is null, try to find it
        if (!booking.hospital) {
          const hospital = await Hospital.findById(booking.hospital);
          if (hospital) {
            booking.hospital = hospital;
          }
        }

        // Generate or update token number if hospital exists
        if (booking.hospital && (!booking.tokenNumber || typeof booking.tokenNumber === 'number')) {
          // Get hospital prefix
          const hospitalPrefix = booking.hospital.name.substring(0, 3).toUpperCase();
          
          // Find bookings for the same hospital and date
          const startOfDay = new Date(booking.appointmentDate);
          startOfDay.setHours(0, 0, 0, 0);
          const endOfDay = new Date(booking.appointmentDate);
          endOfDay.setHours(23, 59, 59, 999);

          const sameDayBookings = await Booking.find({
            hospital: booking.hospital._id,
            appointmentDate: {
              $gte: startOfDay,
              $lt: endOfDay
            },
            createdAt: { $lt: booking.createdAt }  // Only count bookings created before this one
          }).sort('createdAt');

          // Calculate sequential number based on creation order
          const sequentialNumber = sameDayBookings.length + 1;
          
          // Update token number with new format
          booking.tokenNumber = `${hospitalPrefix}${sequentialNumber.toString().padStart(3, '0')}`;
          await booking.save();
        }
      } catch (error) {
        console.error(`Error processing booking ${booking._id}:`, error);
      }
    }

    // Refresh bookings list after updates
    bookings = await Booking.find({ user: req.user.id })
      .populate({
        path: 'hospital',
        select: 'name address',
        model: 'Hospital'
      })
      .sort('-appointmentDate');

    res.json(bookings);
  } catch (error) {
    console.error('Error fetching user bookings:', error);
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
    const { status, rejectionReason, completionNotes } = req.body;
    const booking = await Booking.findOne({
      _id: req.params.id,
      hospital: req.user.hospitalId
    });

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Validate status transitions
    const validTransitions = {
      pending: ['confirmed', 'rejected'],
      confirmed: ['completed', 'cancelled'],
      rejected: [],
      cancelled: [],
      completed: []
    };

    if (!validTransitions[booking.status].includes(status)) {
      return res.status(400).json({ 
        message: `Cannot change status from ${booking.status} to ${status}` 
      });
    }

    // Additional validation for rejection
    if (status === 'rejected' && !rejectionReason) {
      return res.status(400).json({ 
        message: 'Rejection reason is required' 
      });
    }

    // Update booking status
    booking.status = status;
    booking.statusUpdatedAt = new Date();

    if (status === 'rejected') {
      booking.rejectionReason = rejectionReason;
    }

    if (status === 'completed') {
      booking.completionNotes = completionNotes;
      booking.completedAt = new Date();
    }

    await booking.save();
    await NotificationService.createBookingNotifications(booking, `BOOKING_${status.toUpperCase()}`);

    res.json({
      message: 'Booking status updated successfully',
      booking
    });
  } catch (error) {
    console.error('Error updating booking status:', error);
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

const updateCodPaymentStatus = async (req, res) => {
  try {
    const { paymentStatus, remarks } = req.body;

    // Validate payment status
    if (!['completed', 'failed'].includes(paymentStatus)) {
      return res.status(400).json({
        message: 'Invalid payment status. Must be either completed or failed'
      });
    }

    // Find the booking first to check if it exists and is COD
    const existingBooking = await Booking.findById(req.params.bookingId);
    if (!existingBooking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Verify this is a COD booking
    if (existingBooking.payment.method !== 'cod') {
      return res.status(400).json({
        message: 'This booking is not a COD payment'
      });
    }

    // Prepare update data
    const updateData = {
      'payment.status': paymentStatus,
      'payment.remarks': remarks || undefined
    };

    // Add additional fields if payment is completed
    if (paymentStatus === 'completed') {
      updateData['payment.paidAt'] = new Date();
      if (existingBooking.status === 'pending') {
        updateData.status = 'confirmed';
      }
    }

    // Use findOneAndUpdate to avoid validation issues
    const booking = await Booking.findOneAndUpdate(
      { _id: req.params.bookingId },
      { $set: updateData },
      { 
        new: true, // Return updated document
        runValidators: false // Skip validation since we're only updating payment status
      }
    );

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found after update' });
    }

    // Format the response
    const response = {
      bookingId: booking._id,
      tokenNumber: booking.tokenNumber,
      patientName: booking.patientDetails.name,
      payment: {
        method: booking.payment.method,
        status: booking.payment.status,
        amount: booking.payment.amount,
        paidAt: booking.payment.paidAt,
        remarks: booking.payment.remarks
      },
      bookingStatus: booking.status,
      updatedAt: booking.updatedAt
    };

    res.json({
      message: 'COD payment status updated successfully',
      booking: response
    });

  } catch (error) {
    console.error('Error updating COD payment status:', error);
    res.status(500).json({ message: error.message });
  }
};

// Add this new controller function
const cancelBooking = async (req, res) => {
  try {
    const booking = await Booking.findOne({
      _id: req.params.id,
      user: req.user.id
    }).populate('hospital');

    if (!booking) {
      return res.status(404).json({ 
        success: false,
        message: 'Booking not found' 
      });
    }

    // Only allow cancellation of pending or confirmed bookings
    if (!['pending', 'confirmed'].includes(booking.status)) {
      return res.status(400).json({ 
        success: false,
        message: 'Cannot cancel booking in current status' 
      });
    }

    // If payment was made online and completed, initiate refund process
    if (booking.payment.method === 'online' && booking.payment.status === 'completed') {
      try {
        await razorpay.payments.refund(booking.payment.paymentId, {
          amount: booking.payment.amount * 100,
          speed: 'normal'
        });
        booking.payment.status = 'refunded';
      } catch (refundError) {
        console.error('Refund failed:', refundError);
        return res.status(500).json({ 
          success: false,
          message: 'Unable to process refund. Please contact support.' 
        });
      }
    }

    booking.status = 'cancelled';
    booking.cancelledAt = new Date();
    await booking.save();

    // Create notifications for both user and hospital
    await NotificationService.createBookingNotifications(booking, 'BOOKING_CANCELLED', {
      bookingId: booking._id,
      hospitalName: booking.hospital.name,
      appointmentDate: booking.appointmentDate,
      timeSlot: booking.timeSlot,
      patientName: booking.patientDetails.name
    });

    res.json({
      success: true,
      message: 'Booking cancelled successfully',
      booking
    });
  } catch (error) {
    console.error('Error cancelling booking:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

// In updateBookingToken function
const updateBookingToken = async (req, res) => {
  try {
    const { tokenNumber } = req.body;
    const booking = await Booking.findById(req.params.id)
      .populate('hospital');
    
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    booking.tokenNumber = tokenNumber;
    await booking.save();

    // Send notification for token update
    await NotificationService.createBookingNotifications(booking, 'TOKEN_UPDATED');

    res.json(booking);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// In assignDoctor function (if you have one)
const assignDoctor = async (req, res) => {
  try {
    const { doctorId, doctorName } = req.body;
    const booking = await Booking.findById(req.params.id)
      .populate('hospital');

    booking.doctorAssigned = doctorId;
    booking.doctorName = doctorName;
    await booking.save();

    // Send notification for doctor assignment
    await NotificationService.createBookingNotifications(booking, 'DOCTOR_ASSIGNED', {
      doctorName
    });

    res.json(booking);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Add this to your existing controller functions
const getPendingPayments = async (req, res) => {
  try {
    const pendingPayments = await Booking.find({
      'payment.status': 'pending'
    })
    .populate('user', 'email name')
    .populate('hospital', 'name address')
    .sort('-createdAt')
    .select('tokenNumber patientDetails payment appointmentDate timeSlot status createdAt');

    res.json({
      success: true,
      count: pendingPayments.length,
      data: pendingPayments
    });
  } catch (error) {
    console.error('Error fetching pending payments:', error);
    res.status(500).json({ 
      success: false,
      message: error.message 
    });
  }
};

module.exports = {
  createBooking,
  verifyPayment,
  getUserBookings,
  getHospitalBookings,
  updateBookingStatus,
  downloadBooking,
  updateCodPaymentStatus,
  cancelBooking,
  updateBookingToken,
  assignDoctor,
  getPendingPayments
};

