const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  hospital: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  appointmentDate: {
    type: Date,
    required: true
  },
  tokenNumber: {
    type: Number
  },
  status: {
    type: String,
    enum: ['upcoming', 'completed', 'canceled'],
    default: 'upcoming'
  },
  payment: {
    orderId: String,
    paymentId: String,
    amount: Number,
    method: {
      type: String,
      enum: ['online', 'cod'],
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending'
    },
    paidAt: Date,
    breakdown: {
      basePrice: Number,
      platformFee: Number,
      gst: Number,
      total: Number
    }
  },
  rejectionReason: String,
  symptoms: String,
  specialization: String,
  preferredDoctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor'
  },
  patientDetails: {
    name: {
      type: String,
      required: true
    },
    age: {
      type: Number,
      required: true
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
      required: true
    },
    mobile: {
      type: String,
      required: true
    },
    address: {
      type: String,
      required: true
    },
    healthIssue: {
      type: String
    }
  },
  doctorName: {
    type: String,
    required: true
  },
  specialty: {
    type: String,
    required: true
  },
  prescriptions: [{
    medicine: {
      type: String
    },
    dosage: {
      type: String
    },
    duration: {
      type: String
    }
  }],
  paymentDetails: {
    amount: {
      type: Number
    },
    paymentId: {
      type: String
    },
    paymentStatus: {
      type: String,
      enum: ['Pending', 'Paid', 'Failed', 'Refunded']
    },
    paymentMode: {
      type: String
    }
  }
}, {
  timestamps: true
});

// Index for querying bookings efficiently
bookingSchema.index({ hospital: 1, appointmentDate: 1 });
bookingSchema.index({ user: 1, status: 1 });

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;
