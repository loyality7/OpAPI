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
}, {
  timestamps: true
});

// Add geospatial index for location-based queries
hospitalSchema.index({ location: '2dsphere' });

// Virtual for doctor count
hospitalSchema.virtual('doctorCount').get(function() {
  return this.doctors.length;
});

// Ensure virtuals are included when converting to JSON
hospitalSchema.set('toJSON', { virtuals: true });

hospitalSchema.methods.calculateFees = function() {
  const basePrice = this.opBookingPrice;
  const platformFee = Math.round(basePrice * 0.10); // 10% platform fee
  const subtotal = basePrice + platformFee;
  const gst = Math.round(subtotal * 0.18); // 18% GST
  const totalAmount = subtotal + gst;

  return {
    basePrice,
    platformFee,
    subtotal,
    gst,
    totalAmount
  };
};

const Hospital = mongoose.model('Hospital', hospitalSchema);

module.exports = Hospital;
