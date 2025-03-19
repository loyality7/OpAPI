const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  hospital: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hospital',
    required: true
  },
  isEmergency: {
    type: Boolean,
    default: false
  },
  appointmentDate: {
    type: Date,
    required: true,
    validate: {
      validator: function(value) {
        // Ensure date is not in the past
        return value >= new Date().setHours(0, 0, 0, 0);
      },
      message: 'Appointment date cannot be in the past'
    }
  },
  timeSlot: {
    type: String,
    required: true,
    validate: {
      validator: function(value) {
        // Validate time format (e.g., "09:30 AM", "02:30 PM")
        return /^(0?[1-9]|1[0-2]):[0-5][0-9] (AM|PM)$/.test(value);
      },
      message: 'Time slot must be in format "HH:MM AM/PM" (e.g., "09:30 AM")'
    }
  },
  tokenNumber: {
    type: String
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'rejected', 'cancelled', 'completed'],
    default: 'pending'
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
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending'
    },
    paidAt: Date,
    breakdown: {
      platformFee: {
        type: Number,
        required: true
      },
      emergencyFee: {
        type: Number,
        default: 0
      },
      gst: {
        type: Number,
        required: true
      },
      total: {
        type: Number,
        required: true
      }
    },
    refundDetails: {
      refundId: String,
      amount: Number,
      status: String,
      processedAt: Date
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
    required: false
  },
  specialty: {
    type: String,
    required: false
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
  },
  doctorAssigned: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: false
  }
}, {
  timestamps: true
});

// Index for querying bookings efficiently
bookingSchema.index({ hospital: 1, appointmentDate: 1 });
bookingSchema.index({ user: 1, status: 1 });

// Add this before creating the model
bookingSchema.pre('save', async function(next) {
  try {
    if (!this.tokenNumber) {
      // Get the hospital details
      await this.populate('hospital', 'name');
      
      if (!this.hospital) {
        throw new Error('Hospital not found');
      }

      // Get hospital prefix (first 3 letters uppercase)
      const hospitalPrefix = this.hospital.name.substring(0, 3).toUpperCase();
      
      // Find bookings for the same hospital and date
      const startOfDay = new Date(this.appointmentDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(this.appointmentDate);
      endOfDay.setHours(23, 59, 59, 999);

      const sameDayBookings = await this.constructor.find({
        hospital: this.hospital._id,
        appointmentDate: {
          $gte: startOfDay,
          $lt: endOfDay
        }
      }).sort('createdAt');

      // Calculate sequential number
      const sequentialNumber = sameDayBookings.length + 1;
      
      // Set token number
      this.tokenNumber = `${hospitalPrefix}${sequentialNumber.toString().padStart(3, '0')}`;
    }
    next();
  } catch (error) {
    next(error);
  }
});

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;
