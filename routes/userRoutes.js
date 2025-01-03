const express = require('express');
const router = express.Router();
const { auth } = require('../middlewares/auth');
const {
  getUserProfile,
  updateUserProfile,
  deleteUserProfile,
  getMyBookings
} = require('../controllers/userController');

/**
 * @swagger
 * components:
 *   schemas:
 *     UserProfile:
 *       type: object
 *       required:
 *         - name
 *         - role
 *       properties:
 *         name:
 *           type: string
 *           description: User's full name
 *         email:
 *           type: string
 *           description: User's email (required for hospital and admin)
 *         phoneNumber:
 *           type: string
 *           description: User's phone number (required for regular users)
 *         dateOfBirth:
 *           type: string
 *           format: date
 *           description: User's date of birth
 *         gender:
 *           type: string
 *           enum: [male, female, other]
 *           description: User's gender
 *         bloodGroup:
 *           type: string
 *           enum: [A+, A-, B+, B-, AB+, AB-, O+, O-]
 *           description: User's blood group
 *         location:
 *           type: object
 *           properties:
 *             address:
 *               type: string
 *             city:
 *               type: string
 *             state:
 *               type: string
 *             country:
 *               type: string
 *             pincode:
 *               type: string
 *             coordinates:
 *               type: object
 *               properties:
 *                 type:
 *                   type: string
 *                   enum: [Point]
 *                 coordinates:
 *                   type: array
 *                   items:
 *                     type: number
 *                   description: [longitude, latitude]
 *         emergencyContact:
 *           type: object
 *           properties:
 *             name:
 *               type: string
 *             relationship:
 *               type: string
 *             phoneNumber:
 *               type: string
 *         medicalInfo:
 *           type: object
 *           properties:
 *             allergies:
 *               type: array
 *               items:
 *                 type: string
 *             chronicConditions:
 *               type: array
 *               items:
 *                 type: string
 *             currentMedications:
 *               type: array
 *               items:
 *                 type: string
 *         profilePicture:
 *           type: string
 *           description: URL of user's profile picture
 *         role:
 *           type: string
 *           enum: [user, hospital, admin]
 *           description: User's role in the system
 */

/**
 * @swagger
 * /api/user/profile:
 *   get:
 *     summary: Get user profile
 *     tags: [User Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserProfile'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Profile not found
 *   
 *   put:
 *     summary: Update user profile
 *     tags: [User Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 description: Only for hospital and admin roles
 *               phoneNumber:
 *                 type: string
 *                 description: Only for user role
 *               profilePicture:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: Invalid input or duplicate email/phone
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Profile not found
 *   
 *   delete:
 *     summary: Delete user profile
 *     tags: [User Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Profile not found
 */

/**
 * @swagger
 * /api/user/my-bookings:
 *   get:
 *     summary: Get authenticated user's bookings
 *     tags: [User Profile]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, completed, cancelled]
 *         description: Filter bookings by status (optional)
 *     responses:
 *       200:
 *         description: User bookings retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: number
 *                 bookings:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Booking'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: No bookings found
 */

router.get('/profile', auth, getUserProfile);
router.put('/profile', auth, updateUserProfile);
router.delete('/profile', auth, deleteUserProfile);
router.get('/my-bookings', auth, getMyBookings);

module.exports = router; 