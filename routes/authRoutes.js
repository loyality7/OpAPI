const express = require('express');
const router = express.Router();
const {
  registerUser,
  registerHospital,
  loginUser,
  loginHospital,
  loginAdmin
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
 *             phoneNumber:
 *               type: string
 *             role:
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
 *     summary: Register a new user (Email/Password with Phone)
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
 *               - phoneNumber
 *             properties:
 *               name:
 *                 type: string
 *                 example: "John Doe"
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "john@example.com"
 *               password:
 *                 type: string
 *                 example: "Password123!"
 *               phoneNumber:
 *                 type: string
 *                 example: "9876543210"
 *     responses:
 *       201:
 *         description: User registered successfully
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
 *     summary: Login user (Email/Password based)
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
 *                 example: "john@example.com"
 *               password:
 *                 type: string
 *                 example: "Password123!"
 *     responses:
 *       200:
 *         description: Login successful
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
 *     summary: Login admin
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

module.exports = router;
