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

// Generate OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// User Registration (OTP Based)
const registerUser = async (req, res) => {
  try {
    const { name, phoneNumber, email } = req.body;
    
    // Validate required fields
    if (!name || !phoneNumber || !email) {
      return res.status(400).json({ 
        success: false,
        message: 'Please provide all required fields',
        requiredFields: ['name', 'phoneNumber', 'email']
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

    // Generate and store OTP
    const verificationId = `ver_${Math.random().toString(36).substr(2, 9)}`;
    const otp = generateOTP();
    
    console.log('=== New User Registration ===');
    console.log('Verification ID:', verificationId);
    console.log('OTP:', otp);
    console.log('User Data:', { 
      name, 
      phoneNumber: cleanPhoneNumber, 
      email 
    });
    
    global.verificationStore = global.verificationStore || {};
    global.verificationStore[verificationId] = {
      otp,
      userData: { 
        name, 
        phoneNumber: cleanPhoneNumber, 
        email, 
        role: 'user' 
      },
      isLogin: false,
      createdAt: Date.now()
    };

    res.json({
      success: true,
      message: "OTP sent successfully",
      verificationId,
      ...(process.env.NODE_ENV === 'development' && { otp })
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

// User Login (Token/OTP Based)
const loginUser = async (req, res) => {
  try {
    const { phoneNumber, token } = req.body;
    
    // Validate input
    if (!phoneNumber && !token) {
      return res.status(400).json({
        success: false,
        message: 'Please provide either phone number or token',
        requiredFields: ['phoneNumber or token']
      });
    }

    // First try token-based login
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findOne({ 
          _id: decoded.id, 
          phoneNumber: decoded.phoneNumber,
          role: 'user' 
        });
        
        if (user) {
          return res.json({
            success: true,
            message: 'Login successful',
            token,
            user: {
              id: user._id,
              name: user.name,
              phoneNumber: user.phoneNumber,
              email: user.email,
              role: user.role
            }
          });
        }
      } catch (err) {
        // Token invalid or expired
        return res.status(401).json({
          success: false,
          message: 'Invalid or expired token',
          error: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
      }
    }

    // Validate phone number format (for OTP-based login)
    if (phoneNumber) {
      // Clean phone number
      let cleanPhoneNumber = phoneNumber.replace(/\D/g, '');
      if (cleanPhoneNumber.startsWith('91')) {
        cleanPhoneNumber = cleanPhoneNumber.substring(2);
      }

      // Validate phone number format
      const phoneRegex = /^[6-9]\d{9}$/;
      if (!phoneRegex.test(cleanPhoneNumber)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid phone number format. Please enter a valid 10-digit Indian mobile number',
          details: 'Phone number should be 10 digits starting with 6-9'
        });
      }

      // Use cleaned phone number for database query
      const user = await User.findOne({ phoneNumber: cleanPhoneNumber, role: 'user' });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'No account found with this phone number. Please register first',
          field: 'phoneNumber'
        });
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

      return res.json({
        success: true,
        message: "OTP sent successfully",
        verificationId,
        ...(process.env.NODE_ENV === 'development' && { otp })
      });
    }

    // If we reach here, neither token nor phone number was valid
    return res.status(400).json({
      success: false,
      message: 'Invalid login attempt'
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

// Verify OTP
const verifyOTP = async (req, res) => {
  try {
    const { verificationId, otp } = req.body;
    
    console.log('=== OTP Verification Attempt ===');
    console.log('Verification ID:', verificationId);
    console.log('Submitted OTP:', otp);
    console.log('Stored Verification Data:', global.verificationStore?.[verificationId]);
    
    // Check if verification ID exists
    if (!global.verificationStore || !global.verificationStore[verificationId]) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification ID'
      });
    }

    const verification = global.verificationStore[verificationId];

    // Check if OTP matches
    if (verification.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP'
      });
    }

    // Check if OTP is expired (5 minutes)
    if (Date.now() - verification.createdAt > 5 * 60 * 1000) {
      delete global.verificationStore[verificationId];
      return res.status(400).json({
        success: false,
        message: 'OTP expired'
      });
    }

    let user;
    if (verification.isLogin) {
      // Login flow
      user = await User.findOne({ 
        phoneNumber: verification.phoneNumber,
        role: 'user'
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
    } else {
      // Registration flow
      const { name, phoneNumber, email } = verification.userData;
      
      // Create new user
      user = new User({
        name,
        phoneNumber,
        email,
        role: 'user'
      });
      
      await user.save();
    }

    // Generate token
    const token = generateToken({
      id: user._id,
      role: user.role,
      email: user.email,
      phoneNumber: user.phoneNumber
    });

    // Clean up verification store
    delete global.verificationStore[verificationId];

    // Return success response
    res.json({
      success: true,
      message: verification.isLogin ? 'Login successful' : 'Registration successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        phoneNumber: user.phoneNumber,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error('OTP Verification Error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred during verification',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
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
