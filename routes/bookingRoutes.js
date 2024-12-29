const express = require('express');
const router = express.Router();
const { auth, checkRole } = require('../middlewares/auth');
const {
  createBooking,
  verifyPayment,
  getUserBookings,
  getHospitalBookings,
  updateBookingStatus,
  downloadBooking
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
 *                 format: date-time
 *               timeSlot:
 *                 type: string
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

module.exports = router;
