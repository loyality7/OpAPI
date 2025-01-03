const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'recipientModel'
  },
  recipientModel: {
    type: String,
    required: true,
    enum: ['User', 'Hospital']
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: [
      'BOOKING_CREATED',
      'BOOKING_CONFIRMED',
      'BOOKING_CANCELLED',
      'BOOKING_COMPLETED',
      'BOOKING_REJECTED',
      'PAYMENT_RECEIVED',
      'PAYMENT_FAILED',
      'PAYMENT_REFUNDED',
      'HOSPITAL_APPROVED',
      'HOSPITAL_REJECTED',
      'HOSPITAL_UPDATED',
      'APPOINTMENT_REMINDER',
      'BOOKING_MODIFIED',
      'TOKEN_UPDATED',
      'DOCTOR_ASSIGNED',
      'PRESCRIPTION_ADDED'
    ]
  },
  relatedTo: {
    model: {
      type: String,
      enum: ['Booking', 'Hospital', 'Payment']
    },
    id: {
      type: mongoose.Schema.Types.ObjectId
    }
  },
  isRead: {
    type: Boolean,
    default: false
  },
  isDeleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for efficient queries
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification; 