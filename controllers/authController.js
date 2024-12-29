const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config/db');

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

// Generate OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// User Registration (OTP Based)
const registerUser = async (req, res) => {
  try {
    const { name, phoneNumber, email } = req.body;
    
    // Check if user exists (check both phone and email)
    const existingUser = await User.findOne({ 
      $or: [
        { phoneNumber },
        { email }
      ]
    });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Generate and store OTP
    const verificationId = `ver_${Math.random().toString(36).substr(2, 9)}`;
    const otp = generateOTP();
    
    console.log('=== New User Registration ===');
    console.log('Verification ID:', verificationId);
    console.log('OTP:', otp);
    console.log('User Data:', { name, phoneNumber, email });
    
    global.verificationStore = global.verificationStore || {};
    global.verificationStore[verificationId] = {
      otp,
      userData: { name, phoneNumber, email, role: 'user' },
      isLogin: false,
      createdAt: Date.now()
    };

    res.json({
      message: "OTP sent successfully",
      verificationId,
      ...(process.env.NODE_ENV === 'development' && { otp })
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
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

// User Login (OTP Based)
const loginUser = async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    
    // Check if user exists
    const user = await User.findOne({ phoneNumber, role: 'user' });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate and store OTP
    const verificationId = `ver_${Math.random().toString(36).substr(2, 9)}`;
    const otp = generateOTP();
    
    console.log('=== User Login Attempt ===');
    console.log('Verification ID:', verificationId);
    console.log('OTP:', otp);
    console.log('Phone Number:', phoneNumber);
    
    global.verificationStore = global.verificationStore || {};
    global.verificationStore[verificationId] = {
      otp,
      phoneNumber,
      isLogin: true,
      createdAt: Date.now()
    };

    res.json({
      message: "OTP sent successfully",
      verificationId,
      ...(process.env.NODE_ENV === 'development' && { otp })
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
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

    const token = generateToken(hospital);
    res.json({
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

// Verify OTP
const verifyOTP = async (req, res) => {
  try {
    const { verificationId, otp } = req.body;
    
    console.log('=== OTP Verification Attempt ===');
    console.log('Verification ID:', verificationId);
    console.log('Submitted OTP:', otp);
    console.log('Stored Verification Data:', global.verificationStore[verificationId]);
    
    // Check if verification ID exists
    if (!global.verificationStore || !global.verificationStore[verificationId]) {
      return res.status(400).json({ message: 'Invalid verification ID' });
    }

    const verification = global.verificationStore[verificationId];

    // Check if OTP matches
    if (verification.otp !== otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    // Check if OTP is expired (5 minutes)
    if (Date.now() - verification.createdAt > 5 * 60 * 1000) {
      delete global.verificationStore[verificationId];
      return res.status(400).json({ message: 'OTP expired' });
    }

    let user;
    if (verification.isLogin) {
      // Login flow
      user = await User.findOne({ phoneNumber: verification.phoneNumber });
    } else {
      // Registration flow
      user = new User(verification.userData);
      await user.save();
    }

    // Generate token
    const token = generateToken(user);

    // Clean up verification store
    delete global.verificationStore[verificationId];

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        phoneNumber: user.phoneNumber,
        role: user.role
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
  loginAdmin,
  verifyOTP
};
