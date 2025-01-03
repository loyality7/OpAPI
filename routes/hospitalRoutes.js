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
  getFilteredHospitals,
  updateHospitalActiveStatus,
  updateHospitalBookingPrice,
  getHospitalProfile,
  getOwnHospitalProfile,
  updateHospitalProfile,
  getBookingDetails,
  manageBooking,
  updateBookingToken,
  getHospitalsForPatients,
  getHospitalPatients,
  getHospitalReports,
  getPaymentStats,
  updateSlotSettings
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
 * /api/hospitals/dashboard:
 *   get:
 *     summary: Get hospital dashboard statistics
 *     tags: [Hospital Dashboard]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics retrieved successfully
 */
router.get('/hospitals/dashboard', auth, checkRole(['hospital']), getDashboardStats);

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
 * /api/hospitals/updateprofile:
 *   put:
 *     summary: Update logged-in hospital's profile
 *     tags: [Hospitals]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               basicInfo:
 *                 type: object
 *               address:
 *                 type: object
 *               operationalDetails:
 *                 type: object
 *               medicalServices:
 *                 type: object
 *               facilities:
 *                 type: object
 *     responses:
 *       200:
 *         description: Hospital profile updated successfully
 *       400:
 *         description: Invalid input data
 *       404:
 *         description: Hospital not found
 */
router.put('/hospitals/updateprofile', auth, checkRole(['hospital']), updateHospitalProfile);

/**
 * @swagger
 * /api/hospitals/profile:
 *   get:
 *     summary: Get logged-in hospital's profile
 *     tags: [Hospitals]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Hospital profile retrieved successfully
 */
router.get('/hospitals/profile', auth, checkRole(['hospital']), getOwnHospitalProfile);

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
router.get('/hospitals/:id/profile', auth, checkRole(['admin']), getHospitalProfile);

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
router.post('/hospitals', auth, checkRole(['admin', 'hospital']), createHospital);

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
 * /api/hospitals/dashboard:
 *   get:
 *     summary: Get hospital dashboard statistics
 *     tags: [Hospital Dashboard]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics retrieved successfully
 */
router.get('/hospitals/dashboard', auth, checkRole(['hospital']), getDashboardStats);

// Hospital Settings Routes
/**
 * @swagger
 * /api/hospitals/settings:
 *   get:
 *     summary: Get hospital settings
 *     tags: [Hospital Settings]
 */
router.get('/settings', auth, checkRole(['hospital']), getHospitalSettings);

/**
 * @swagger
 * /api/hospitals/settings:
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
 * /api/hospitals/dashboard/stats:
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
 * /api/hospitals/bookings/manage:
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
 * /api/hospitals/bookings/{bookingId}/status:
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
 * /api/hospitals/settings:
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
  getFilteredHospitals: !!getFilteredHospitals,
  updateHospitalActiveStatus: !!updateHospitalActiveStatus,
  updateHospitalBookingPrice: !!updateHospitalBookingPrice,
  getHospitalProfile: !!getHospitalProfile,
  getOwnHospitalProfile: !!getOwnHospitalProfile,
  updateHospitalProfile: !!updateHospitalProfile,
  getBookingDetails: !!getBookingDetails,
  manageBooking: !!manageBooking,
  updateBookingToken: !!updateBookingToken,
  getHospitalsForPatients: !!getHospitalsForPatients,
  getHospitalPatients: !!getHospitalPatients,
  getHospitalReports: !!getHospitalReports,
  getPaymentStats: !!getPaymentStats,
  updateSlotSettings: !!updateSlotSettings
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

/**
 * @swagger
 * /api/hospitals/{id}/active-status:
 *   put:
 *     summary: Toggle hospital active status
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - isOpen
 *             properties:
 *               isOpen:
 *                 type: boolean
 *                 description: Set to true to open hospital, false to close
 *           example:
 *             isOpen: false
 *     responses:
 *       200:
 *         description: Hospital active status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Hospital'
 *       400:
 *         description: Invalid request body
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Hospital not found
 */
router.put('/hospitals/:id/active-status', auth, checkRole(['hospital']), updateHospitalActiveStatus);

/**
 * @swagger
 * /api/hospitals/{id}/booking-price:
 *   put:
 *     summary: Update hospital booking price
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - opBookingPrice
 *             properties:
 *               opBookingPrice:
 *                 type: number
 *                 minimum: 0
 *                 description: New booking price
 *           example:
 *             opBookingPrice: 500
 *     responses:
 *       200:
 *         description: Booking price updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Hospital'
 *       400:
 *         description: Invalid request body
 *       404:
 *         description: Hospital not found
 */
router.put('/hospitals/:id/booking-price', auth, checkRole(['hospital']), updateHospitalBookingPrice);

/**
 * @swagger
 * /api/hospitals/{id}/profile:
 *   get:
 *     summary: Get complete hospital profile (Admin only)
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
 *         description: Hospital profile retrieved successfully
 *       403:
 *         description: Forbidden - Admin access required
 *       404:
 *         description: Hospital not found
 */
router.get('/hospitals/:id/profile', auth, checkRole(['admin']), getHospitalProfile);

/**
 * @swagger
 * /api/hospitals/profile:
 *   get:
 *     summary: Get logged-in hospital's complete profile
 *     tags: [Hospitals]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Hospital profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 basicInfo:
 *                   type: object
 *                 address:
 *                   type: object
 *                 operationalDetails:
 *                   type: object
 *                 medicalServices:
 *                   type: object
 *                 facilities:
 *                   type: object
 *                 stats:
 *                   type: object
 *       404:
 *         description: Hospital not found
 */
router.get('/hospitals/profile', auth, checkRole(['hospital']), getOwnHospitalProfile);

/**
 * @swagger
 * /api/hospitals/updateprofile:
 *   put:
 *     summary: Update logged-in hospital's profile
 *     tags: [Hospitals]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               basicInfo:
 *                 type: object
 *               address:
 *                 type: object
 *               operationalDetails:
 *                 type: object
 *               medicalServices:
 *                 type: object
 *               facilities:
 *                 type: object
 *     responses:
 *       200:
 *         description: Hospital profile updated successfully
 *       400:
 *         description: Invalid input data
 *       404:
 *         description: Hospital not found
 */
router.put('/hospitals/updateprofile', auth, checkRole(['hospital']), updateHospitalProfile);

// Keep only this single route for getting hospital bookings
/**
 * @swagger
 * /api/hospitals/my/bookings:
 *   get:
 *     summary: Get all bookings for the logged-in hospital
 *     tags: [Hospital Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [all, pending, confirmed, completed, cancelled]
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: List of bookings retrieved successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Hospital access required
 *       500:
 *         description: Server error
 */
router.get('/hospitals/my/bookings', auth, checkRole(['hospital']), getHospitalBookings);

/**
 * @swagger
 * /api/hospitals/my/bookings/{bookingId}:
 *   get:
 *     summary: Get specific booking details
 *     tags: [Hospital Bookings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bookingId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the booking
 *     responses:
 *       200:
 *         description: Booking details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 tokenNo:
 *                   type: string
 *                 patientDetails:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     age:
 *                       type: number
 *                     gender:
 *                       type: string
 *                 appointmentDate:
 *                   type: string
 *                   format: date
 *                 timeSlot:
 *                   type: string
 *                 status:
 *                   type: string
 *                   enum: [pending, confirmed, completed, cancelled]
 *                 payment:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                     amount:
 *                       type: number
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Hospital access required
 *       404:
 *         description: Booking not found
 *       500:
 *         description: Server error
 */
router.get('/hospitals/my/bookings/:bookingId', auth, checkRole(['hospital']), getBookingDetails);

/**
 * @swagger
 * /api/hospitals/bookings/{bookingId}/manage:
 *   put:
 *     summary: Manage booking status (confirm, reject, or complete)
 *     tags: [Hospital Bookings]
 *     security:
 *       - BearerAuth: []
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
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [confirmed, rejected, completed]
 *                 description: New status for the booking
 *               rejectionReason:
 *                 type: string
 *                 description: Required if status is rejected
 *           example:
 *             status: "confirmed"
 *     responses:
 *       200:
 *         description: Booking status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 tokenNo:
 *                   type: string
 *                 patientDetails:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     age:
 *                       type: number
 *                     gender:
 *                       type: string
 *                     mobile:
 *                       type: string
 *                 appointmentDate:
 *                   type: string
 *                   format: date-time
 *                 timeSlot:
 *                   type: string
 *                 status:
 *                   type: string
 *                 rejectionReason:
 *                   type: string
 *                 payment:
 *                   type: object
 *                 user:
 *                   type: object
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Invalid request (invalid status or missing rejection reason)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Invalid status or missing rejection reason"
 *       404:
 *         description: Booking or hospital not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Booking not found"
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Internal server error"
 */
router.put('/hospitals/bookings/:bookingId/manage', auth, checkRole(['hospital']), manageBooking);

/**
 * @swagger
 * /api/hospitals/bookings/{bookingId}/token:
 *   put:
 *     summary: Update booking token number
 *     tags: [Hospital Bookings]
 *     security:
 *       - BearerAuth: []
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
 *               - tokenNumber
 *             properties:
 *               tokenNumber:
 *                 type: string
 *                 description: New token number
 *                 example: "ABC001"
 *     responses:
 *       200:
 *         description: Token number updated successfully
 *       400:
 *         description: Invalid token number
 *       404:
 *         description: Booking not found
 */
router.put('/hospitals/bookings/:bookingId/token', auth, checkRole(['hospital']), updateBookingToken);

/**
 * @swagger
 * /api/hospitals/patient/list:
 *   get:
 *     summary: Get hospitals list for patients
 *     tags: [Hospitals]
 *     parameters:
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by hospital category
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *         description: Filter by location (format: longitude,latitude)
 *       - in: query
 *         name: maxDistance
 *         schema:
 *           type: number
 *         description: Maximum distance in kilometers from location
 *       - in: query
 *         name: rating
 *         schema:
 *           type: number
 *         description: Minimum rating filter
 *       - in: query
 *         name: emergencyServices
 *         schema:
 *           type: boolean
 *         description: Filter hospitals with emergency services
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search hospitals by name
 *     responses:
 *       200:
 *         description: List of hospitals for patients
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   name:
 *                     type: string
 *                   address:
 *                     type: object
 *                   contact:
 *                     type: object
 *                   description:
 *                     type: string
 *                   location:
 *                     type: object
 *                   categories:
 *                     type: array
 *                   ratings:
 *                     type: object
 *                   bookingInfo:
 *                     type: object
 *                   timings:
 *                     type: array
 *       500:
 *         description: Server error
 */
router.get('/hospitals/patient/list', getHospitalsForPatients);

/**
 * @swagger
 * /api/hospitals/my/patients:
 *   get:
 *     summary: Get hospital's associated patients
 *     tags: [Hospital Patients]
 *     security:
 *       - BearerAuth: []
 *     description: Retrieves all patients associated with the hospital through bookings
 *     responses:
 *       200:
 *         description: Successfully retrieved patients list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 summary:
 *                   type: object
 *                   properties:
 *                     totalPatients:
 *                       type: number
 *                     todayPatients:
 *                       type: number
 *                     upcomingAppointments:
 *                       type: number
 *                     completedAppointments:
 *                       type: number
 *                 patients:
 *                   type: object
 *                   properties:
 *                     today:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/PatientBooking'
 *                     upcoming:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/PatientBooking'
 *                     past:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/PatientBooking'
 *       403:
 *         description: Unauthorized access
 *       404:
 *         description: Hospital not found
 *       500:
 *         description: Server error
 */
router.get('/my/patients', auth, checkRole(['hospital']), getHospitalPatients);

/**
 * @swagger
 * /api/hospitals/my/reports:
 *   get:
 *     summary: Get hospital reports and analytics
 *     tags: [Hospital Reports]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: range
 *         schema:
 *           type: string
 *           enum: [day, week, month, year]
 *         description: Time range for the report
 *     responses:
 *       200:
 *         description: Report data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 appointments:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       date:
 *                         type: string
 *                       count:
 *                         type: number
 *                       revenue:
 *                         type: number
 *                       completed:
 *                         type: number
 *                       cancelled:
 *                         type: number
 *                 payments:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       method:
 *                         type: string
 *                       amount:
 *                         type: number
 *                 patients:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       date:
 *                         type: string
 *                       new:
 *                         type: number
 *                       returning:
 *                         type: number
 *                 summary:
 *                   type: object
 *                   properties:
 *                     totalRevenue:
 *                       type: number
 *                     totalAppointments:
 *                       type: number
 *                     totalPatients:
 *                       type: number
 *                     avgRevenuePerPatient:
 *                       type: number
 *       404:
 *         description: Hospital not found
 *       500:
 *         description: Server error
 */
router.get('/hospitals/my/reports', auth, checkRole(['hospital']), getHospitalReports);

/**
 * @swagger
 * /api/hospitals/my/patients:
 *   get:
 *     summary: Get hospital's patient list and statistics
 *     tags: [Hospital Patients]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved patients list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 summary:
 *                   type: object
 *                   properties:
 *                     totalPatients:
 *                       type: number
 *                     todayPatients:
 *                       type: number
 *                     upcomingAppointments:
 *                       type: number
 *                     completedAppointments:
 *                       type: number
 *                 patients:
 *                   type: object
 *                   properties:
 *                     today:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/PatientBooking'
 *                     upcoming:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/PatientBooking'
 *                     past:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/PatientBooking'
 *       403:
 *         description: Unauthorized access
 *       404:
 *         description: Hospital not found
 *       500:
 *         description: Server error
 */
router.get('/hospitals/my/patients', auth, checkRole(['hospital']), getHospitalPatients);

/**
 * @swagger
 * /api/hospitals/payments/stats:
 *   get:
 *     summary: Get hospital payment statistics
 *     tags: [Hospital Payments]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Payment statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 metrics:
 *                   type: object
 *                   properties:
 *                     totalCollected:
 *                       type: number
 *                     pendingAmount:
 *                       type: number
 *                     todayCollection:
 *                       type: number
 *                     successRate:
 *                       type: number
 *                 recentPayments:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       patientName:
 *                         type: string
 *                       amount:
 *                         type: number
 *                       date:
 *                         type: string
 *                       method:
 *                         type: string
 *                       status:
 *                         type: string
 *                       appointmentType:
 *                         type: string
 */
router.get('/hospitals/payments/stats', auth, checkRole(['hospital']), getPaymentStats);

/**
 * @swagger
 * /api/hospitals/my/slot-settings:
 *   put:
 *     summary: Update patients per slot setting
 *     tags: [Hospital Settings]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - patientsPerSlot
 *             properties:
 *               patientsPerSlot:
 *                 type: number
 *                 minimum: 1
 *                 description: Number of patients that can be booked in each time slot
 *           example:
 *             patientsPerSlot: 3
 *     responses:
 *       200:
 *         description: Slot settings updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 message:
 *                   type: string
 *                   example: "Slot settings updated successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     patientsPerSlot:
 *                       type: number
 *                       example: 3
 *                     hospitalName:
 *                       type: string
 *                     timings:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           day:
 *                             type: string
 *                           openTime:
 *                             type: string
 *                           closeTime:
 *                             type: string
 *                           isOpen:
 *                             type: boolean
 *                           maxPatientsPerSlot:
 *                             type: number
 */
router.put('/hospitals/my/slot-settings', auth, checkRole(['hospital']), updateSlotSettings);

module.exports = router;
