const cron = require('node-cron');
const Booking = require('../models/Booking');
const NotificationService = require('./notificationService');

// Run every day at midnight
cron.schedule('0 0 * * *', async () => {
  try {
    // Send appointment reminders for tomorrow
    await sendAppointmentReminders();
    
    // Check for expired pending bookings
    await handleExpiredBookings();
    
    // Check for pending payments
    await checkPendingPayments();
  } catch (error) {
    console.error('Scheduler error:', error);
  }
});

async function sendAppointmentReminders() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const nextDay = new Date(tomorrow);
  nextDay.setDate(nextDay.getDate() + 1);

  const bookings = await Booking.find({
    appointmentDate: {
      $gte: tomorrow,
      $lt: nextDay
    },
    status: 'confirmed'
  }).populate('hospital');

  for (const booking of bookings) {
    await NotificationService.createBookingNotifications(booking, 'APPOINTMENT_REMINDER');
  }
}

async function handleExpiredBookings() {
  const now = new Date();
  const expiredBookings = await Booking.find({
    status: 'pending',
    createdAt: { $lt: new Date(now - 30 * 60000) } // 30 minutes old
  }).populate('hospital');

  for (const booking of expiredBookings) {
    booking.status = 'cancelled';
    await booking.save();
    await NotificationService.createBookingNotifications(booking, 'BOOKING_CANCELLED');
  }
}

async function checkPendingPayments() {
  const now = new Date();
  const pendingPayments = await Booking.find({
    'payment.status': 'pending',
    createdAt: { $lt: new Date(now - 24 * 60 * 60000) } // 24 hours old
  }).populate('hospital');

  for (const booking of pendingPayments) {
    await NotificationService.createBookingNotifications(booking, 'PAYMENT_REMINDER');
  }
} 