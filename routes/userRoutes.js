const express = require('express');
const router = express.Router();
const { auth } = require('../middlewares/auth');
const {
  getUserBookings,
  createBooking,
  getPaymentHistory,
  processPayment,
  getUserProfile,
  updateUserProfile
} = require('../controllers/userController');

/**
 * @swagger
 * tags:
 *   - name: User Bookings
 *     description: User booking management endpoints
 *   - name: User Profile
 *     description: User profile management endpoints
 *   - name: User Payments
 *     description: User payment management endpoints
 */

// User Booking Routes
/**
 * @swagger
 * /api/user/bookings:
 *   get:
 *     summary: Get user's bookings
 *     tags: [User Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, completed, cancelled]
 */
router.get('/bookings', auth, getUserBookings);

/**
 * @swagger
 * /api/user/bookings:
 *   post:
 *     summary: Create new booking
 *     tags: [User Bookings]
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
 *               symptoms:
 *                 type: string
 */
router.post('/bookings', auth, createBooking);

// User Payment Routes
/**
 * @swagger
 * /api/user/payments:
 *   get:
 *     summary: Get user's payment history
 *     tags: [User Payments]
 *   post:
 *     summary: Process new payment
 *     tags: [User Payments]
 */
router.get('/payments', auth, getPaymentHistory);
router.post('/payments', auth, processPayment);

// User Profile Routes
/**
 * @swagger
 * /api/user/profile:
 *   get:
 *     summary: Get user profile
 *     tags: [User Profile]
 *   put:
 *     summary: Update user profile
 *     tags: [User Profile]
 */
router.get('/profile', auth, getUserProfile);
router.put('/profile', auth, updateUserProfile);

module.exports = router; 