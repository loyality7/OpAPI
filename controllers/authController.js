const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config/db');
const Hospital = require('../models/Hospital');

// Generate JWT Token
const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user._id, 
      role: user.role, 
      email: user.email,
      phoneNumber: user.phoneNumber 
    },
    process.env.JWT_SECRET,
    { expiresIn: '365d' }
  );
};

// User Registration (Email/Password Based with Phone)
const registerUser = async (req, res) => {
  try {
    const { name, phoneNumber, email, password } = req.body;
    
    // Validate required fields
    if (!name || !email || !password || !phoneNumber) {
      return res.status(400).json({ 
        success: false,
        message: 'Please provide all required fields',
        requiredFields: ['name', 'email', 'password', 'phoneNumber']
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    // Clean and validate phone number
    let cleanPhoneNumber = phoneNumber.replace(/\D/g, ''); // Remove non-digits
    if (cleanPhoneNumber.startsWith('91')) {
      cleanPhoneNumber = cleanPhoneNumber.substring(2); // Remove 91 prefix
    }

    // Validate phone number format (10 digits starting with 6-9)
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(cleanPhoneNumber)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid phone number format. Please enter a valid 10-digit Indian mobile number',
        details: 'Phone number should be 10 digits starting with 6-9'
      });
    }

    // Check if user exists (check both phone and email)
    const existingUser = await User.findOne({ 
      $or: [
        { phoneNumber: cleanPhoneNumber },
        { email }
      ]
    });

    if (existingUser) {
      const field = existingUser.phoneNumber === cleanPhoneNumber ? 'phone number' : 'email';
      return res.status(400).json({
        success: false,
        message: `User with this ${field} already exists`,
        field: field
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    const user = new User({
      name,
      email,
      phoneNumber: cleanPhoneNumber,
      password: hashedPassword,
      role: 'user'
    });

    await user.save();

    const token = generateToken(user);
    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).json({ 
      success: false,
      message: 'An error occurred during registration',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Hospital Registration (Email/Password Based)
const registerHospital = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    // Check if hospital exists
    const existingHospital = await User.findOne({ email, role: 'hospital' });
    if (existingHospital) {
      return res.status(400).json({ message: 'Hospital already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create hospital
    const hospital = new User({
      name,
      email,
      password: hashedPassword,
      role: 'hospital'
    });

    await hospital.save();

    const token = generateToken(hospital);
    res.status(201).json({
      token,
      user: {
        id: hospital._id,
        name: hospital.name,
        email: hospital.email,
        role: hospital.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Admin Registration (Email/Password Based)
const registerAdmin = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please provide all required fields' });
    }

    // Check if admin exists
    const existingAdmin = await User.findOne({ email, role: 'admin' });
    if (existingAdmin) {
      return res.status(400).json({ message: 'Admin already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create admin
    const admin = new User({
      name,
      email,
      password: hashedPassword,
      role: 'admin'
    });

    await admin.save();

    const token = generateToken(admin);
    res.status(201).json({
      token,
      user: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// User Login (Email/Password Based)
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
        requiredFields: ['email', 'password']
      });
    }

    // Check if user exists
    const user = await User.findOne({ email, role: 'user' });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if password exists in user document
    if (!user.password) {
      return res.status(401).json({
        success: false,
        message: 'Account not set up for password login. Please reset your password.'
      });
    }

    // Verify password
    try {
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }
    } catch (bcryptError) {
      console.error('Password comparison error:', bcryptError);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const token = generateToken(user);
    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ 
      success: false,
      message: 'An error occurred during login',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Hospital Login (Email/Password Based)
const loginHospital = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    // Check if hospital exists
    const hospital = await User.findOne({ email, role: 'hospital' });
    if (!hospital) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, hospital.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if hospital has created their hospital details
    const hospitalDetails = await Hospital.findOne({ createdBy: hospital._id });
    const hasHospitalDetails = !!hospitalDetails;
    
    // Add debug logs
    console.log('Hospital Details:', hospitalDetails);
    console.log('Has Hospital Details:', hasHospitalDetails);
    
    // Get approval status from hospital details
    const isApproved = hospitalDetails ? hospitalDetails.status === 'approved' : false;
    console.log('Is Approved:', isApproved);

    const token = generateToken(hospital);
    res.json({
      token,
      user: {
        id: hospital._id,
        name: hospital.name,
        email: hospital.email,
        role: hospital.role
      },
      hasHospitalDetails,
      isApproved
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ message: error.message });
  }
};

// Admin Login (Email/Password Based)
const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    // Check if admin exists
    const admin = await User.findOne({ email, role: 'admin' });
    if (!admin) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(admin);
    res.json({
      token,
      user: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  registerUser,
  registerHospital,
  registerAdmin,
  loginUser,
  loginHospital,
  loginAdmin
};
