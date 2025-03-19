const express = require('express');
const router = express.Router();
const { auth, checkRole } = require('../middlewares/auth');
const {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  getHospitals,
  updateHospitalStatus,
  getBookings,
  getDashboardMetrics
} = require('../controllers/adminController');

// Create admin middleware by combining auth and role check
const isAdmin = [auth, checkRole(['admin'])];

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *         email:
 *           type: string
 *         role:
 *           type: string
 *           enum: [user, admin, hospital]
 *         isActive:
 *           type: boolean
 *     Hospital:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *         status:
 *           type: string
 *           enum: [pending, approved, rejected]
 *         remarks:
 *           type: string
 *     Booking:
 *       type: object
 *       properties:
 *         user:
 *           type: string
 *         hospital:
 *           type: string
 *         appointmentDate:
 *           type: string
 *           format: date-time
 *         status:
 *           type: string
 *           enum: [pending, confirmed, rejected, cancelled, completed]
 *     DashboardMetrics:
 *       type: object
 *       properties:
 *         users:
 *           type: object
 *           properties:
 *             total:
 *               type: number
 *         hospitals:
 *           type: object
 *           properties:
 *             total:
 *               type: number
 *             pending:
 *               type: number
 *         bookings:
 *           type: object
 *           properties:
 *             total:
 *               type: number
 *             today:
 *               type: number
 *             recent:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Booking'
 *         revenue:
 *           type: object
 *           properties:
 *             total:
 *               type: number
 *             average:
 *               type: number
 */

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Admin management endpoints
 */

/**
 * @swagger
 * /api/admin/dashboard:
 *   get:
 *     summary: Get dashboard metrics
 *     description: Retrieve various metrics including user counts, hospital stats, booking information, and revenue data
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard metrics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/DashboardMetrics'
 *       403:
 *         description: Not authorized to access admin dashboard
 *       500:
 *         description: Server error while fetching metrics
 */
router.get('/dashboard', isAdmin, getDashboardMetrics);

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Get all users
 *     description: Retrieve a list of all users in the system
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: number
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *       403:
 *         description: Not authorized to access user list
 *       500:
 *         description: Server error while fetching users
 *   post:
 *     summary: Create a new user
 *     description: Create a new user with specified role and details
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
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
 *               - role
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *               role:
 *                 type: string
 *                 enum: [user, admin, hospital]
 *     responses:
 *       201:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Invalid request body or user already exists
 *       403:
 *         description: Not authorized to create users
 *       500:
 *         description: Server error while creating user
 */
router.get('/users', isAdmin, getUsers);
router.post('/users', isAdmin, createUser);

/**
 * @swagger
 * /api/admin/users/{id}:
 *   put:
 *     summary: Update a user
 *     description: Update user details including name, email, role, and active status
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
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
 *                 format: email
 *               role:
 *                 type: string
 *                 enum: [user, admin, hospital]
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: User updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       404:
 *         description: User not found
 *       403:
 *         description: Not authorized to update users
 *       500:
 *         description: Server error while updating user
 *   delete:
 *     summary: Delete a user
 *     description: Permanently remove a user from the system
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       404:
 *         description: User not found
 *       403:
 *         description: Not authorized to delete users
 *       500:
 *         description: Server error while deleting user
 */
router.put('/users/:id', isAdmin, updateUser);
router.delete('/users/:id', isAdmin, deleteUser);

/**
 * @swagger
 * /api/admin/hospitals:
 *   get:
 *     summary: Get all hospitals
 *     description: Retrieve a list of all hospitals with their details
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of hospitals retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: number
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Hospital'
 *       403:
 *         description: Not authorized to access hospital list
 *       500:
 *         description: Server error while fetching hospitals
 */
router.get('/hospitals', isAdmin, getHospitals);

/**
 * @swagger
 * /api/admin/hospitals/{id}/status:
 *   put:
 *     summary: Update hospital status
 *     description: Update the approval status of a hospital
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Hospital ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, approved, rejected]
 *               remarks:
 *                 type: string
 *     responses:
 *       200:
 *         description: Hospital status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Hospital'
 *       404:
 *         description: Hospital not found
 *       403:
 *         description: Not authorized to update hospital status
 *       500:
 *         description: Server error while updating hospital status
 */
router.put('/hospitals/:id/status', isAdmin, updateHospitalStatus);

/**
 * @swagger
 * /api/admin/bookings:
 *   get:
 *     summary: Get all bookings
 *     description: Retrieve a list of all bookings with optional filters
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, rejected, cancelled, completed]
 *         description: Filter bookings by status
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter bookings by date (YYYY-MM-DD)
 *       - in: query
 *         name: hospital
 *         schema:
 *           type: string
 *         description: Filter bookings by hospital ID
 *     responses:
 *       200:
 *         description: List of bookings retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: number
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Booking'
 *       403:
 *         description: Not authorized to access bookings
 *       500:
 *         description: Server error while fetching bookings
 */
router.get('/bookings', isAdmin, getBookings);

module.exports = router; 