const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 2
  },
  email: {
    type: String,
    required: function() {
      return ['hospital', 'admin'].includes(this.role);
    },
    unique: true,
    sparse: true,
    lowercase: true
  },
  password: {
    type: String,
    required: function() {
      return ['hospital', 'admin'].includes(this.role);
    }
  },
  phoneNumber: {
    type: String,
    validate: {
      validator: function(v) {
        if (this.role === 'user') {
          return v && v.length > 0; // Must have phoneNumber if user
        }
        return true; // Optional for other roles
      },
      message: 'Phone number is required for users'
    }
  },
  role: {
    type: String,
    enum: ['user', 'hospital', 'admin'],
    required: true
  },
  otp: String,
  otpExpires: Date,
  profilePicture: {
    type: String,
    default: null
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  authProvider: {
    type: String,
    enum: ['local', 'google'],
    default: 'local'
  }
}, {
  timestamps: true
});

// Create index for phoneNumber only for users
userSchema.index({ 
  phoneNumber: 1 
}, { 
  unique: true,
  partialFilterExpression: { 
    role: 'user',
    phoneNumber: { $exists: true }
  }
});

// Add static method to create default admin
userSchema.statics.createDefaultAdmin = async function() {
  try {
    // Check if admin already exists
    const adminExists = await this.findOne({ role: 'admin' });
    if (adminExists) {
      console.log('Default admin already exists');
      return;
    }

    // Create default admin
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('Admin@123456', salt);

    const defaultAdmin = new this({
      name: 'Super Admin',
      email: 'admin@example.com',
      password: hashedPassword,
      role: 'admin',
      isEmailVerified: true
    });

    await defaultAdmin.save();
    console.log('Default admin created successfully');
  } catch (error) {
    console.error('Error creating default admin:', error);
  }
};

// Ensure virtuals are included when converting to JSON
userSchema.set('toJSON', { virtuals: true });

const User = mongoose.model('User', userSchema);

// Function to initialize indexes
const initializeIndexes = async () => {
  try {
    // Drop existing indexes except _id
    const indexes = await User.collection.indexes();
    for (let index of indexes) {
      if (index.name !== '_id_') {
        await User.collection.dropIndex(index.name).catch(() => {});
      }
    }
    
    // Create new indexes
    await User.init();
    
    // Create default admin
    await User.createDefaultAdmin();
  } catch (error) {
    console.error('Error initializing indexes:', error);
  }
};

// Initialize indexes and create default admin
initializeIndexes();

module.exports = User;
