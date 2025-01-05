const express = require('express');
const router = express.Router();
const {
  registerUser,
  registerHospital,
  loginUser,
  loginHospital,
  loginAdmin,
  verifyOTP,
  getAllOTPs
} = require('../controllers/authController');
const { auth, checkRole } = require('../middlewares/auth');

/**
 * @swagger
 * components:
 *   schemas:
 *     AuthResponse:
 *       type: object
 *       properties:
 *         token:
 *           type: string
 *           description: JWT token for authentication
 *         user:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *             name:
 *               type: string
 *             email:
 *               type: string
 *             role:
 *               type: string
 *             phoneNumber:
 *               type: string
 */

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: User authentication endpoints
 */

/**
 * @swagger
 * /api/auth/register/user:
 *   post:
 *     summary: Register a new user (OTP based)
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - phoneNumber
 *               - email
 *             properties:
 *               name:
 *                 type: string
 *                 example: "John Doe"
 *               phoneNumber:
 *                 type: string
 *                 example: "+919876543210"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "john@example.com"
 *     responses:
 *       200:
 *         description: OTP sent successfully
 */
router.post('/register/user', registerUser);

/**
 * @swagger
 * /api/auth/register/hospital:
 *   post:
 *     summary: Register a new hospital
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 example: "City Hospital"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "hospital@example.com"
 *               password:
 *                 type: string
 *                 example: "Hospital@123"
 *     responses:
 *       201:
 *         description: Hospital registered successfully
 */
router.post('/register/hospital', registerHospital);

/**
 * @swagger
 * /api/auth/login/user:
 *   post:
 *     summary: Login user (OTP based)
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - phoneNumber
 *             properties:
 *               phoneNumber:
 *                 type: string
 *                 example: "+919876543210"
 *     responses:
 *       200:
 *         description: OTP sent successfully
 */
router.post('/login/user', loginUser);

/**
 * @swagger
 * /api/auth/login/hospital:
 *   post:
 *     summary: Login hospital
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "hospital@example.com"
 *               password:
 *                 type: string
 *                 example: "Hospital@123"
 *     responses:
 *       200:
 *         description: Login successful
 */
router.post('/login/hospital', loginHospital);

/**
 * @swagger
 * /api/auth/login/admin:
 *   post:
 *     summary: Login admin (Default admin credentials)
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "admin@example.com"
 *               password:
 *                 type: string
 *                 example: "Admin@123456"
 *     responses:
 *       200:
 *         description: Login successful
 */
router.post('/login/admin', loginAdmin);

/**
 * @swagger
 * /api/auth/verify-otp:
 *   post:
 *     summary: Verify OTP for user registration/login
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - verificationId
 *               - otp
 *             properties:
 *               verificationId:
 *                 type: string
 *                 example: "ver_abc123"
 *               otp:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: OTP verified successfully
 */
router.post('/verify-otp', verifyOTP);

/**
 * @swagger
 * /api/auth/otps:
 *   get:
 *     summary: Get all active OTPs (Admin only)
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of all active OTPs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: number
 *                   example: 2
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       verificationId:
 *                         type: string
 *                         example: "ver_abc123"
 *                       otp:
 *                         type: string
 *                         example: "123456"
 *                       isLogin:
 *                         type: boolean
 *                         example: false
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       phoneNumber:
 *                         type: string
 *                         example: "9876543210"
 *                       email:
 *                         type: string
 *                         example: "user@example.com"
 *                       name:
 *                         type: string
 *                         example: "John Doe"
 *                       expiresAt:
 *                         type: string
 *                         format: date-time
 *       403:
 *         description: Access denied. Admin only route.
 *       500:
 *         description: Server error
 */
router.get('/otps', auth, checkRole(['admin']), getAllOTPs);

module.exports = router;
