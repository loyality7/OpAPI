const express = require('express');
const router = express.Router();
const { auth, checkRole } = require('../middlewares/auth');
const {
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
  getFilteredHospitals
} = require('../controllers/hospitalController');

/**
 * @swagger
 * components:
 *   schemas:
 *     Error:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           example: "Error message description"
 *         status:
 *           type: number
 *           example: 400
 *
 *     Hospital:
 *       type: object
 *       required:
 *         - name
 *         - address
 *         - contactNumber
 *         - email
 *         - registrationNumber
 *         - opBookingPrice
 *         - maxOpBookingsPerDay
 *         - description
 *         - location
 *         - categories
 *       properties:
 *         name:
 *           type: string
 *           example: "City General Hospital"
 *         address:
 *           type: object
 *           required:
 *             - street
 *             - city
 *             - state
 *             - pincode
 *           properties:
 *             street:
 *               type: string
 *               example: "123 Healthcare Avenue"
 *             city:
 *               type: string
 *               example: "Mumbai"
 *             state:
 *               type: string
 *               example: "Maharashtra"
 *             pincode:
 *               type: string
 *               example: "400001"
 *         location:
 *           type: object
 *           required:
 *             - coordinates
 *           properties:
 *             type:
 *               type: string
 *               enum: ['Point']
 *             coordinates:
 *               type: array
 *               items:
 *                 type: number
 *               example: [72.8777, 19.0760]
 *         description:
 *           type: string
 *           example: "A state-of-the-art multispecialty hospital"
 *         amenities:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Parking"
 *               icon:
 *                 type: string
 *                 example: "🅿️"
 *         images:
 *           type: array
 *           items:
 *             type: string
 *           example: ["https://example.com/hospital1.jpg"]
 *         ratings:
 *           type: object
 *           properties:
 *             averageRating:
 *               type: number
 *               minimum: 0
 *               maximum: 5
 *               example: 4.5
 *             totalReviews:
 *               type: number
 *               example: 128
 *         emergencyServices:
 *           type: boolean
 *           example: true
 *         contactNumber:
 *           type: string
 *           example: "+91-9876543210"
 *         email:
 *           type: string
 *           example: "info@cityhospital.com"
 *         registrationNumber:
 *           type: string
 *           example: "HOSP123456"
 *         opBookingPrice:
 *           type: number
 *           example: 500
 *         doctors:
 *           type: array
 *           items:
 *             type: object
 *             required:
 *               - name
 *               - profession
 *               - experience
 *               - specialization
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Dr. Sharma"
 *               profession:
 *                 type: string
 *                 example: "Cardiologist"
 *               experience:
 *                 type: number
 *                 minimum: 0
 *                 example: 15
 *               specialization:
 *                 type: string
 *                 example: "Heart Surgery"
 *         status:
 *           type: string
 *           enum: [pending, approved, rejected]
 *           example: "pending"
 *         isOpen:
 *           type: boolean
 *           example: true
 *         timings:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               day:
 *                 type: string
 *                 enum: [monday, tuesday, wednesday, thursday, friday, saturday, sunday]
 *                 example: "monday"
 *               openTime:
 *                 type: string
 *                 example: "09:00"
 *               closeTime:
 *                 type: string
 *                 example: "18:00"
 *               isOpen:
 *                 type: boolean
 *                 example: true
 *         maxOpBookingsPerDay:
 *           type: number
 *           example: 50
 *         categories:
 *           type: array
 *           items:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 enum: [Dentistry, Cardiology, Pulmonology, General, Neurology, Gastroenterology, Laboratory, Vaccination]
 *           example: [
 *             { "name": "Dentistry" },
 *             { "name": "Cardiology" }
 *           ]
 */

/**
 * @swagger
 * tags:
 *   name: Hospitals
 *   description: Hospital management endpoints
 *   - name: Hospital Dashboard
 *     description: Hospital dashboard management endpoints
 *   - name: Hospital Bookings
 *     description: Hospital booking management endpoints
 *   - name: Hospital Settings
 *     description: Hospital settings and configuration endpoints
 */

/**
 * @swagger
 * /api/hospitals/filtered:
 *   get:
 *     summary: Get filtered hospitals based on user role
 *     tags: [Hospitals]
 *     security:
 *       - BearerAuth: []
 *     description: |
 *       Returns hospitals based on user role:
 *       - Public/Regular users: Only approved hospitals
 *       - Hospital role: Their own hospitals (any status) + approved hospitals
 *       - Admin role: All hospitals
 *     responses:
 *       200:
 *         description: List of filtered hospitals
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Hospital'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/hospitals/filtered', getFilteredHospitals);

/**
 * @swagger
 * /api/hospitals:
 *   get:
 *     summary: Get all hospitals
 *     tags: [Hospitals]
 *     responses:
 *       200:
 *         description: List of hospitals
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Hospital'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/hospitals', getHospitals);

/**
 * @swagger
 * /api/hospitals/{id}:
 *   get:
 *     summary: Get hospital by ID
 *     tags: [Hospitals]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Hospital ID
 *     responses:
 *       200:
 *         description: Hospital details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Hospital'
 *       404:
 *         description: Hospital not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/hospitals/:id', getHospital);

/**
 * @swagger
 * /api/hospitals:
 *   post:
 *     summary: Create a new hospital
 *     tags: [Hospitals]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Hospital'
 *     responses:
 *       201:
 *         description: Hospital created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Hospital'
 *       400:
 *         description: Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               message: "Invalid hospital data"
 *               status: 400
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               message: "Authentication required"
 *               status: 401
 *       403:
 *         description: Forbidden - Insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               message: "Insufficient permissions"
 *               status: 403
 */
router.post('/hospitals', auth, checkRole(['admin']), createHospital);

/**
 * @swagger
 * /api/hospitals/{id}:
 *   put:
 *     summary: Update a hospital
 *     tags: [Hospitals]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Hospital'
 *     responses:
 *       200:
 *         description: Hospital updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Hospital'
 *       400:
 *         description: Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               message: "Invalid update data"
 *               status: 400
 *       404:
 *         description: Hospital not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               message: "Hospital not found"
 *               status: 404
 */
router.put('/hospitals/:id', auth, checkRole(['hospital', 'admin']), updateHospital || ((req, res) => res.status(500).json({ message: 'Handler not implemented' })));

/**
 * @swagger
 * /api/hospitals/{id}:
 *   delete:
 *     summary: Delete a hospital
 *     tags: [Hospitals]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Hospital ID
 *     responses:
 *       200:
 *         description: Hospital deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       404:
 *         description: Hospital not found
 *       500:
 *         description: Server error
 */
router.delete('/hospitals/:id', auth, checkRole(['hospital', 'admin']), deleteHospital);

/**
 * @swagger
 * /api/hospitals/{id}/booking-settings:
 *   put:
 *     summary: Update hospital booking settings
 *     tags: [Hospitals]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               maxOpBookingsPerDay:
 *                 type: number
 *               isOpen:
 *                 type: boolean
 *               timings:
 *                 type: array
 *                 items:
 *                   $ref: '#/components/schemas/Hospital/properties/timings/items'
 *     responses:
 *       200:
 *         description: Settings updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Hospital'
 *       400:
 *         description: Invalid settings
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/hospitals/:id/booking-settings', auth, checkRole(['hospital']), updateBookingSettings);

/**
 * @swagger
 * /api/hospitals/{id}/bookings:
 *   get:
 *     summary: Get hospital bookings
 *     tags: [Hospitals]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Hospital ID
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
router.get('/hospitals/:id/bookings', auth, checkRole(['hospital']), getHospitalBookings);

/**
 * @swagger
 * /api/hospitals/{id}/bookings/{bookingId}/status:
 *   put:
 *     summary: Update booking status
 *     tags: [Hospitals]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             status: "confirmed"
 *             rejectionReason: "Doctor unavailable"
 */
router.put('/hospitals/:id/bookings/:bookingId/status', auth, checkRole(['hospital']), updateBookingStatus);

/**
 * @swagger
 * /api/hospitals/{id}/dashboard:
 *   get:
 *     summary: Get hospital dashboard statistics
 *     tags: [Hospitals]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Hospital ID
 *     responses:
 *       200:
 *         description: Hospital dashboard statistics
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DashboardStats'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       404:
 *         description: Hospital not found
 */
router.get('/hospitals/:id/dashboard', auth, checkRole(['hospital']), getDashboardStats);

/**
 * @swagger
 * /api/admin/hospitals/{id}/status:
 *   put:
 *     summary: Update hospital status (Admin only)
 *     tags: [Hospitals]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           example:
 *             status: "approved"
 *             rejectionReason: ""
 */
router.put('/admin/hospitals/:id/status', auth, checkRole(['admin']), updateHospitalStatus);

// Hospital Dashboard Routes
/**
 * @swagger
 * /api/hospital/dashboard:
 *   get:
 *     summary: Get hospital dashboard statistics
 *     tags: [Hospital Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics retrieved successfully
 */
router.get('/dashboard', auth, checkRole(['hospital']), getDashboardStats);

// Hospital Booking Management Routes
/**
 * @swagger
 * /api/hospital/bookings:
 *   get:
 *     summary: Get all bookings for the hospital
 *     tags: [Hospital Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, completed, cancelled]
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 */
router.get('/bookings', auth, checkRole(['hospital']), getHospitalBookings);

/**
 * @swagger
 * /api/hospital/bookings/{id}/status:
 *   patch:
 *     summary: Update booking status
 *     tags: [Hospital Bookings]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [confirmed, completed, cancelled]
 *               rejectionReason:
 *                 type: string
 */
router.patch('/bookings/:id/status', auth, checkRole(['hospital']), updateBookingStatus);

// Hospital Settings Routes
/**
 * @swagger
 * /api/hospital/settings:
 *   get:
 *     summary: Get hospital settings
 *     tags: [Hospital Settings]
 */
router.get('/settings', auth, checkRole(['hospital']), getHospitalSettings);

/**
 * @swagger
 * /api/hospital/settings:
 *   put:
 *     summary: Update hospital settings
 *     tags: [Hospital Settings]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               maxOpBookingsPerDay:
 *                 type: number
 *               timings:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     day:
 *                       type: string
 *                     openTime:
 *                       type: string
 *                     closeTime:
 *                       type: string
 *               consultationFee:
 *                 type: number
 */
router.put('/settings', auth, checkRole(['hospital']), updateHospitalSettings);

// Add new dashboard routes with updated Swagger docs
/**
 * @swagger
 * /api/hospital/dashboard/stats:
 *   get:
 *     summary: Get hospital dashboard statistics
 *     tags: [Hospital Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalDoctors:
 *                   type: number
 *                 todayBookings:
 *                   type: number
 *                 pendingBookings:
 *                   type: number
 *                 totalBookings:
 *                   type: number
 *                 revenue:
 *                   type: object
 *                   properties:
 *                     today:
 *                       type: number
 *                     total:
 *                       type: number
 */
router.get('/dashboard/stats', auth, checkRole(['hospital']), getDashboardStats);

/**
 * @swagger
 * /api/hospital/bookings/manage:
 *   get:
 *     summary: Get all bookings for the hospital
 *     tags: [Hospital Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, confirmed, completed, cancelled]
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: List of bookings retrieved successfully
 */
router.get('/bookings/manage', auth, checkRole(['hospital']), getHospitalBookings);

/**
 * @swagger
 * /api/hospital/bookings/{bookingId}/status:
 *   patch:
 *     summary: Update booking status
 *     tags: [Hospital Bookings]
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [confirmed, completed, cancelled]
 *               rejectionReason:
 *                 type: string
 */
router.patch('/bookings/:bookingId/status', auth, checkRole(['hospital']), updateBookingStatus);

/**
 * @swagger
 * /api/hospital/settings:
 *   get:
 *     summary: Get hospital settings
 *     tags: [Hospital Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Hospital settings retrieved successfully
 *   put:
 *     summary: Update hospital settings
 *     tags: [Hospital Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               maxOpBookingsPerDay:
 *                 type: number
 *               timings:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     day:
 *                       type: string
 *                     openTime:
 *                       type: string
 *                     closeTime:
 *                       type: string
 *               consultationFee:
 *                 type: number
 */
router.get('/settings', auth, checkRole(['hospital']), getHospitalSettings);
router.put('/settings', auth, checkRole(['hospital']), updateHospitalSettings);

// Verify all functions exist by logging them
console.log('Available controller functions:', {
  createHospital: !!createHospital,
  updateHospital: !!updateHospital,
  getHospitals: !!getHospitals,
  getHospital: !!getHospital,
  deleteHospital: !!deleteHospital,
  updateHospitalStatus: !!updateHospitalStatus,
  getHospitalBookings: !!getHospitalBookings,
  updateBookingStatus: !!updateBookingStatus,
  getDashboardStats: !!getDashboardStats,
  getHospitalSettings: !!getHospitalSettings,
  updateHospitalSettings: !!updateHospitalSettings,
  updateBookingSettings: !!updateBookingSettings,
  getFilteredHospitals: !!getFilteredHospitals
});

// Keep existing routes with error checking
router.get('/hospitals/:id/bookings', auth, checkRole(['hospital']), 
  getHospitalBookings || ((req, res) => res.status(500).json({ message: 'Handler not implemented' }))
);

router.put('/hospitals/:id/bookings/:bookingId/status', auth, checkRole(['hospital']), 
  updateBookingStatus || ((req, res) => res.status(500).json({ message: 'Handler not implemented' }))
);

router.get('/hospitals/:id/dashboard', auth, checkRole(['hospital']), 
  getDashboardStats || ((req, res) => res.status(500).json({ message: 'Handler not implemented' }))
);

router.put('/admin/hospitals/:id/status', auth, checkRole(['admin']), 
  updateHospitalStatus || ((req, res) => res.status(500).json({ message: 'Handler not implemented' }))
);

// Dashboard routes
router.get('/dashboard/stats', auth, checkRole(['hospital']), 
  getDashboardStats || ((req, res) => res.status(500).json({ message: 'Handler not implemented' }))
);

// Booking management routes
router.get('/bookings/manage', auth, checkRole(['hospital']), 
  getHospitalBookings || ((req, res) => res.status(500).json({ message: 'Handler not implemented' }))
);

router.patch('/bookings/:bookingId/status', auth, checkRole(['hospital']), 
  updateBookingStatus || ((req, res) => res.status(500).json({ message: 'Handler not implemented' }))
);



// This was likely the problematic route
router.put('/settings', auth, checkRole(['hospital']), 
  updateHospitalSettings || ((req, res) => res.status(500).json({ message: 'Handler not implemented' }))
);

// Public Hospital Routes
router.get('/public/hospitals', getFilteredHospitals);

module.exports = router;
