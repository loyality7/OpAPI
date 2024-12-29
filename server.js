const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const session = require('express-session');
const swaggerUI = require('swagger-ui-express');
const swaggerJsDoc = require('swagger-jsdoc');
const connectDB = require('./config/db');
require('dotenv').config();
console.log('RAZORPAY_KEY_ID:', process.env.RAZORPAY_KEY_ID);

const app = express();

// Connect to Database
connectDB();

// Session Middleware (add this before routes)
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Enhanced Security Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add development dependencies check
if (process.env.NODE_ENV === 'development') {
  const livereload = require('livereload');
  const connectLiveReload = require('connect-livereload');
  
  // Create and configure the live reload server
  const liveReloadServer = livereload.createServer();
  liveReloadServer.watch([
    __dirname + '/routes',
    __dirname + '/models',
    __dirname + '/controllers'
  ]);
  
  // Inject the live reload script into the response
  app.use(connectLiveReload());
  
  // Trigger refresh when server restarts
  liveReloadServer.server.once("connection", () => {
    setTimeout(() => {
      liveReloadServer.refresh("/");
    }, 100);
  });
}

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api', require('./routes/hospitalRoutes'));
app.use('/api', require('./routes/bookingRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));

// Swagger Documentation
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Hospital OP Booking API',
      version: '1.0.0',
      description: 'API documentation for Hospital OP Booking System',
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 5000}`,
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{
      bearerAuth: [],
    }],
  },
  apis: ['./routes/*.js'],
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use('/api-docs', swaggerUI.serve, swaggerUI.setup(swaggerDocs));

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 Handler
app.use((req, res) => {
  console.log('404 for URL:', req.originalUrl);
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
