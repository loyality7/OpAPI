const mongoose = require('mongoose');

const timingSchema = new mongoose.Schema({
  day: {
    type: String,
    enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
    required: true
  },
  openTime: String,
  closeTime: String,
  isOpen: {
    type: Boolean,
    default: true
  }
});

const doctorSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  profession: {
    type: String,
    required: true,
    trim: true
  },
  experience: {
    type: Number, // in years
    required: true,
    min: 0
  },
  specialization: {
    type: String,
    required: true,
    trim: true
  }
});

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    enum: ['Dentistry', 'Cardiology', 'Pulmonology', 'General', 'Neurology', 'Gastroenterology', 'Laboratory', 'Vaccination']
  }
});

const hospitalSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  address: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    pincode: { type: String, required: true }
  },
  contactNumber: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  registrationNumber: {
    type: String,
    required: true,
    unique: true
  },
  opBookingPrice: {
    type: Number,
    required: true,
    min: 0
  },
  doctors: [doctorSchema],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  isOpen: {
    type: Boolean,
    default: true
  },
  timings: [timingSchema],
  maxOpBookingsPerDay: {
    type: Number,
    required: true,
    min: 1
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvalDate: Date,
  rejectionReason: String,
  categories: {
    type: [categorySchema],
    validate: {
      validator: function(categories) {
        return categories.length > 0; // Ensure at least one category is selected
      },
      message: 'At least one category must be selected'
    }
  },
  images: {
    type: [String], // Array of image URLs
    default: []
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  amenities: {
    type: [{
      name: String,
      icon: String
    }],
    default: []
  },
  location: {
    type: {
      type: String,
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  },
  ratings: {
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    totalReviews: {
      type: Number,
      default: 0
    }
  },
  emergencyServices: {
    type: Boolean,
    default: false
  },
  slotSettings: {
    patientsPerSlot: {
      type: Number,
      default: 1,
      min: 1
    },
    slotDuration: {
      type: Number,
      enum: [15, 30, 45, 60],
      default: 30
    }
  },
}, {
  timestamps: true
});

// Add geospatial index for location-based queries
hospitalSchema.index({ location: '2dsphere' });

// Virtual for doctor count - Fix the error
hospitalSchema.virtual('doctorCount').get(function() {
  return this.doctors ? this.doctors.length : 0;  // Add null check
});

// Ensure virtuals are included when converting to JSON
hospitalSchema.set('toJSON', { 
  virtuals: true,
  transform: function(doc, ret) {
    // Ensure doctors array exists
    if (!ret.doctors) {
      ret.doctors = [];
    }
    return ret;
  }
});

hospitalSchema.methods.calculateFees = function() {
  const basePrice = this.opBookingPrice || 0;  // Add default value
  const platformFee = 9; // Flat 9 rupees platform fee
  const gst = Math.round(platformFee * 0.18); // 18% GST only on platform fee
  const totalAmount = basePrice + platformFee + gst;

  return {
    basePrice,
    platformFee,
    gst,
    totalAmount
  };
};

const Hospital = mongoose.model('Hospital', hospitalSchema);

module.exports = Hospital;
