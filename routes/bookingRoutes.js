const express = require('express');
const router = express.Router();
const { auth, checkRole } = require('../middlewares/auth');
const Booking = require('../models/Booking');
const {
  createBooking,
  verifyPayment,
  getUserBookings,
  getHospitalBookings,
  updateBookingStatus,
  downloadBooking,
  updateCodPaymentStatus,
  cancelBooking
} = require('../controllers/bookingController');

/**
 * @swagger
 * components:
 *   schemas:
 *     Booking:
 *       type: object
 *       properties:
 *         user:
 *           type: string
 *           description: User ID
 *         hospital:
 *           type: string
 *           description: Hospital ID
 *         appointmentDate:
 *           type: string
 *           format: date-time
 *         tokenNumber:
 *           type: number
 *         status:
 *           type: string
 *           enum: [pending, confirmed, rejected, cancelled, completed]
 *         symptoms:
 *           type: string
 *         specialization:
 *           type: string
 *         payment:
 *           type: object
 *           properties:
 *             orderId:
 *               type: string
 *             amount:
 *               type: number
 *             status:
 *               type: string
 *               enum: [pending, completed, failed]
 */

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

/**
 * @swagger
 * /api/bookings:
 *   post:
 *     summary: Create a new booking
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               hospitalId:
 *                 type: string
 *               appointmentDate:
 *                 type: string
 *                 format: date
 *               timeSlot:
 *                 type: string
 *                 description: Time in 12-hour format (e.g., "9:30 AM", "2:30 PM")
 *                 example: "9:30 AM"
 *               symptoms:
 *                 type: string
 *               specialization:
 *                 type: string
 *               preferredDoctor:
 *                 type: string
 *               paymentMethod:
 *                 type: string
 *                 enum: [online, cod]
 *               name:
 *                 type: string
 *               age:
 *                 type: number
 *               gender:
 *                 type: string
 *                 enum: [male, female, other]
 *               mobile:
 *                 type: string
 *               address:
 *                 type: string
 *     responses:
 *       201:
 *         description: Booking created successfully
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - Invalid role
 */
router.post('/bookings', auth, checkRole(['user', 'hospital', 'admin']), createBooking);

/**
 * @swagger
 * /api/bookings/verify-payment:
 *   post:
 *     summary: Verify payment for booking
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               bookingId:
 *                 type: string
 *               paymentId:
 *                 type: string
 *               signature:
 *                 type: string
 */
router.post('/bookings/verify-payment', auth, checkRole(['user']), verifyPayment);

/**
 * @swagger
 * /api/user/bookings:
 *   get:
 *     summary: Get user's bookings
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user's bookings
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Booking'
 */
router.get('/user/bookings', auth, checkRole(['user']), getUserBookings);
router.get('/bookings/:id/download', auth, checkRole(['user']), downloadBooking);

// Hospital routes
router.get('/hospital/bookings', auth, checkRole(['hospital']), getHospitalBookings);
router.patch(
  '/hospital/bookings/:id/status',
  auth,
  checkRole(['hospital']),
  updateBookingStatus
);

// Admin routes
router.get('/admin/bookings', auth, checkRole(['admin']), async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate('user', 'email')
      .populate('hospital', 'name')
      .sort('-createdAt');
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @swagger
 * /api/bookings/{id}/download:
 *   get:
 *     summary: Download booking details as PDF
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking ID
 *     responses:
 *       200:
 *         description: PDF file containing booking details
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 */
router.get('/bookings/:id/download', auth, checkRole(['user']), downloadBooking);

/**
 * @swagger
 * /api/hospital/bookings:
 *   get:
 *     summary: Get all bookings for a hospital
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of hospital bookings
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Booking'
 */
router.get('/hospital/bookings', auth, checkRole(['hospital']), getHospitalBookings);

/**
 * @swagger
 * /api/hospital/bookings/{id}/status:
 *   patch:
 *     summary: Update booking status
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [confirmed, rejected, cancelled, completed]
 *               rejectionReason:
 *                 type: string
 *                 description: Required when status is 'rejected'
 *     responses:
 *       200:
 *         description: Booking status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Booking'
 */
router.patch(
  '/hospital/bookings/:id/status',
  auth,
  checkRole(['hospital']),
  updateBookingStatus
);

/**
 * @swagger
 * /api/admin/bookings:
 *   get:
 *     summary: Get all bookings (admin only)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all bookings
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Booking'
 */
router.get('/admin/bookings', auth, checkRole(['admin']), async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate('user', 'email')
      .populate('hospital', 'name')
      .sort('-createdAt');
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * @swagger
 * /api/admin/bookings/{bookingId}/cod-payment:
 *   put:
 *     summary: Update COD payment status (Admin only)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - paymentStatus
 *             properties:
 *               paymentStatus:
 *                 type: string
 *                 enum: [completed, failed]
 *                 description: Payment status for COD booking
 *               remarks:
 *                 type: string
 *                 description: Optional remarks about the payment
 *           example:
 *             paymentStatus: "completed"
 *             remarks: "Payment collected at hospital"
 *     responses:
 *       200:
 *         description: COD payment status updated successfully
 *       400:
 *         description: Invalid request or booking is not COD
 *       404:
 *         description: Booking not found
 *       403:
 *         description: Not authorized - Admin only
 */
router.put(
  '/admin/bookings/:bookingId/cod-payment',
  auth,
  checkRole(['admin']),
  updateCodPaymentStatus
);

/**
 * @swagger
 * /api/bookings/{id}/cancel:
 *   post:
 *     summary: Cancel a booking
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Booking ID
 *     responses:
 *       200:
 *         description: Booking cancelled successfully
 *       400:
 *         description: Cannot cancel booking in current status
 *       404:
 *         description: Booking not found
 */
router.post('/bookings/:id/cancel', auth, checkRole(['user']), cancelBooking);

/**
 * @swagger
 * /api/admin/bookings/pending-payments:
 *   get:
 *     summary: Get all bookings with pending payments (Admin only)
 *     tags: [Bookings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of bookings with pending payments
 *       403:
 *         description: Not authorized - Admin only
 */
router.get('/admin/bookings/pending-payments', auth, checkRole(['admin']), async (req, res) => {
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
});

module.exports = router;
