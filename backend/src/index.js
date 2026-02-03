/**
 * Canteen Backend - Production Ready
 * 
 * FIREBASE PHONE OTP AUTHENTICATION
 * 
 * CRITICAL: dotenv.config() MUST be called before any other imports
 * that access process.env variables.
 * 
 * RENDER COMPATIBILITY:
 * - HTTP server MUST start immediately (before DB/Firebase init)
 * - Health check MUST be available within seconds of process start
 * - Services initialize in the background after server is listening
 */

// =====================
// LOAD ENVIRONMENT VARIABLES FIRST
// =====================
import dotenv from 'dotenv';
dotenv.config();

// Validate critical environment variables immediately
if (!process.env.MONGO_URI) {
    console.error('❌ FATAL: MONGO_URI environment variable is not set');
    console.error('   Please set MONGO_URI in your .env file');
    console.error('   Example: MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/dbname');
    process.exit(1);
}

// =====================
// NOW IMPORT OTHER MODULES
// =====================
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';

import config from './config/index.js';
import { connectDB, disconnectDB } from './config/db.js';
import { setupRoutes } from './routes/index.js';
import { notFound, errorHandler } from './middleware/error.js';
import { seedDatabase } from './seed.js';
import { initializeFirebase, isFirebaseReady } from './config/firebase.js';

// =====================
// SERVICE STATE TRACKING
// =====================
let isServicesReady = false;
let servicesError = null;

// Initialize Express app
const app = express();
const httpServer = createServer(app);

// =====================
// PROXY TRUST CONFIGURATION (CRITICAL FOR RENDER/HEROKU)
// =====================
// Render/Heroku/Railway use reverse proxies. Without this setting,
// express-rate-limit sees ALL requests as coming from ONE IP (the proxy),
// causing the rate limit to be exhausted by combined traffic.
// Setting to 1 = trust the first proxy hop (Render's load balancer).
app.set('trust proxy', 1);

// =====================
// SECURITY MIDDLEWARE
// =====================

// Helmet - Security headers
app.use(helmet({
    contentSecurityPolicy: config.isProduction ? undefined : false,
    crossOriginEmbedderPolicy: false
}));

// =====================
// HEALTH CHECK ENDPOINT - MUST BE BEFORE RATE LIMITER
// This endpoint is polled frequently by Render for health monitoring.
// It MUST bypass rate limiting to prevent false-positive downtime alerts.
// It MUST respond immediately, even before DB/Firebase are ready.
// =====================
app.get('/api/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'API is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        servicesReady: isServicesReady,
        firebase: isFirebaseReady() ? 'ready' : 'pending'
    });
});

// Root endpoint for basic connectivity check
app.get('/', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Canteen API Server',
        version: '1.0.0',
        health: '/api/health'
    });
});

// Rate limiting - Applied to all /api/ routes EXCEPT /api/health
// The skip() function provides an explicit bypass as a safety guarantee.
const limiter = rateLimit({
    windowMs: config.rateLimitWindowMs,
    max: config.rateLimitMax,
    message: {
        success: false,
        error: 'Too many requests. Please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    // CRITICAL: Explicitly skip rate limiting for health checks
    // This is a belt-and-suspenders approach alongside route ordering
    skip: (req) => req.path === '/api/health' || req.path === '/health' || req.path === '/'
});

app.use('/api/', limiter);

// CORS configuration
app.use(cors({
    origin: config.isProduction
        ? config.corsOrigins
        : true, // Allow all origins in development
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// =====================
// SOCKET.IO SETUP
// =====================

const io = new Server(httpServer, {
    cors: {
        origin: config.isProduction ? config.corsOrigins : '*',
        methods: ['GET', 'POST'],
        credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
});

// Make io available in request handlers
app.use((req, res, next) => {
    req.io = io;
    next();
});

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log(`📱 Client connected: ${socket.id}`);

    // Join canteen room (for partners)
    socket.on('join_canteen', (canteenId) => {
        if (canteenId) {
            socket.join(`canteen_${canteenId}`);
            console.log(`   → Joined canteen room: ${canteenId}`);
        }
    });

    // Join order room (for customers tracking orders)
    socket.on('join_order', (orderId) => {
        if (orderId) {
            socket.join(`order_${orderId}`);
            console.log(`   → Joined order room: ${orderId}`);
        }
    });

    socket.on('disconnect', () => {
        console.log(`📴 Client disconnected: ${socket.id}`);
    });
});

// =====================
// ROUTES SETUP (registered immediately, but require services)
// =====================

// Middleware to check services readiness for protected routes
app.use('/api/', (req, res, next) => {
    // Health check always passes
    if (req.path === '/health' || req.path === '/') {
        return next();
    }

    // If services failed to initialize
    if (servicesError) {
        return res.status(503).json({
            success: false,
            error: 'Service temporarily unavailable',
            message: 'Server is starting up, please try again shortly'
        });
    }

    // If services not ready yet, return 503
    if (!isServicesReady) {
        return res.status(503).json({
            success: false,
            error: 'Service initializing',
            message: 'Server is starting up, please try again shortly'
        });
    }

    next();
});

// API Routes
setupRoutes(app);

// 404 Handler
app.use(notFound);

// Global Error Handler
app.use(errorHandler);

// =====================
// BACKGROUND SERVICES INITIALIZATION
// =====================

const initServices = async () => {
    console.log('🔄 Initializing services in background...');

    try {
        // Connect to MongoDB using dedicated module
        await connectDB();

        // Seed database in development
        if (!config.isProduction) {
            await seedDatabase();
        }

        // =====================
        // INITIALIZE FIREBASE (FAIL-FAST in production)
        // =====================
        // In production, server MUST NOT continue if Firebase is not configured.
        // Firebase handles all phone OTP verification.
        const firebaseReady = initializeFirebase();

        if (!firebaseReady && config.isProduction) {
            throw new Error('Firebase initialization failed - cannot continue in production');
        }

        if (firebaseReady) {
            console.log('✅ Authentication: Firebase Phone OTP ready');
        } else {
            console.warn('⚠️  Authentication: Firebase not configured (development mode)');
        }

        // Mark services as ready
        isServicesReady = true;
        console.log('✅ All services initialized successfully');

    } catch (error) {
        console.error('❌ Service initialization failed:', error.message);
        servicesError = error.message;

        // In production, exit if critical services fail
        if (config.isProduction) {
            console.error('   FATAL: Exiting due to service initialization failure');
            process.exit(1);
        }
    }
};

// =====================
// SERVER START - IMMEDIATE (Render-safe)
// =====================

const PORT = process.env.PORT || config.port || 5000;

// Start HTTP server IMMEDIATELY (before services init)
// This is CRITICAL for Render - server must respond to health checks quickly
httpServer.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════╗
║           🚀 CANTEEN API SERVER                   ║
╠═══════════════════════════════════════════════════╣
║  Environment: ${config.nodeEnv.padEnd(36)}║
║  Port:        ${String(PORT).padEnd(36)}║
║  Status:      ${'HTTP Ready (services loading...)'.padEnd(36)}║
╚═══════════════════════════════════════════════════╝
    `);

    // Initialize services AFTER server is listening
    // This ensures Render health checks pass immediately
    initServices()
        .then(() => {
            console.log(`
╔═══════════════════════════════════════════════════╗
║           ✅ SERVER FULLY OPERATIONAL             ║
╠═══════════════════════════════════════════════════╣
║  Environment: ${config.nodeEnv.padEnd(36)}║
║  Port:        ${String(PORT).padEnd(36)}║
║  Frontend:    ${config.frontendUrl.padEnd(36)}║
║  Auth:        ${'Firebase Phone OTP'.padEnd(36)}║
║  Razorpay:    ${(config.razorpayKeyId ? 'Configured ✓' : 'Not configured').padEnd(36)}║
║  Services:    ${'All Ready ✓'.padEnd(36)}║
╚═══════════════════════════════════════════════════╝
            `);
        })
        .catch((err) => {
            console.error('❌ Services failed to initialize:', err.message);
        });
});

// Error handling for port in use
httpServer.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is already in use`);
        console.error('   Kill other processes using this port:');
        console.error(`   Windows: taskkill /f /im node.exe`);
        console.error(`   Linux/Mac: lsof -i :${PORT} | xargs kill -9`);
        process.exit(1);
    } else {
        console.error('❌ Server error:', err.message);
        process.exit(1);
    }
});

// =====================
// GRACEFUL SHUTDOWN
// =====================

const gracefulShutdown = async (signal) => {
    console.log(`\n⏳ ${signal} received. Shutting down gracefully...`);

    // Close HTTP server
    httpServer.close(() => {
        console.log('🔒 HTTP server closed');
    });

    // Close Socket.IO
    io.close(() => {
        console.log('🔒 Socket.IO server closed');
    });

    // Close MongoDB connection
    await disconnectDB();

    console.log('👋 Goodbye!');
    process.exit(0);
};

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err.message);
    gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

export { app, io };
