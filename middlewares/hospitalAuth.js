// middlewares/hospitalAuth.js

const Hospital = require('../models/Hospital');

const checkHospitalOwnership = async (req, res, next) => {
  try {
    const hospital = await Hospital.findById(req.params.id);
    
    if (!hospital) {
      return res.status(404).json({ message: 'Hospital not found' });
    }

    // Allow access if user is admin or owns the hospital
    if (req.user.role === 'admin' || 
        (req.user.role === 'hospital' && hospital.createdBy.toString() === req.user.id)) {
      req.hospital = hospital;
      return next();
    }

    res.status(403).json({ message: 'Unauthorized access' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { checkHospitalOwnership };