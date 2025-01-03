const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const session = require('express-session');
const swaggerUI = require('swagger-ui-express');
const swaggerJsDoc = require('swagger-jsdoc');
const connectDB = require('./config/db');
require('dotenv').config();
require('./services/schedulerService');

const app = express();

// CORS Configuration
const corsOptions = {
  origin: [
    'http://opapi.cyberbabu.tech',
    'https://opapi.cyberbabu.tech',
    'http://localhost:3000',
    'http://localhost:5000'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-token'],
  credentials: true,
  optionsSuccessStatus: 200
};

// Apply CORS before other middleware
app.use(cors(corsOptions));

// Connect to Database
connectDB();

// Session Middleware (add this before routes)
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    domain: process.env.NODE_ENV === 'production' ? '.cyberbabu.tech' : undefined
  }
}));

// Enhanced Security Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" }
}));
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
app.use('/api', require('./routes/notificationRoutes'));
app.use('/api/user', require('./routes/userRoutes'));

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
        url: 'https://opapi.cyberbabu.tech',
        description: 'Production server'
      },
      {
        url: 'http://localhost:5000',
        description: 'Local Development'
      }
    ],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        },
      },
    },
    security: [{
      BearerAuth: []
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
