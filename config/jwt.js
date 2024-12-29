require('dotenv').config();

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is not defined in environment variables');
  process.exit(1);
}

module.exports = {
  secret: process.env.JWT_SECRET,
  expiresIn: '24h'
}; 