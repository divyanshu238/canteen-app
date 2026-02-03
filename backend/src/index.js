/**
 * Canteen Backend - Production Ready
 * 
 * FIREBASE PHONE OTP AUTHENTICATION
 * 
 * CRITICAL: dotenv.config() MUST be called before any other imports
 * that access process.env variables.
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
// =====================
app.get('/api/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'API is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        firebase: isFirebaseReady() ? 'ready' : 'not initialized'
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
    skip: (req) => req.path === '/api/health' || req.path === '/health'
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
// INITIALIZATION
// =====================

const initServices = async () => {
    // Connect to MongoDB using dedicated module
    await connectDB();

    // Seed database in development
    if (!config.isProduction) {
        await seedDatabase();
    }

    // =====================
    // INITIALIZE FIREBASE (FAIL-FAST)
    // =====================
    // In production, server MUST NOT start if Firebase is not configured.
    // Firebase handles all phone OTP verification.
    const firebaseReady = initializeFirebase();

    if (!firebaseReady && config.isProduction) {
        console.error('❌ FATAL: Firebase initialization failed');
        console.error('   Server cannot start without valid Firebase configuration');
        process.exit(1);
    }

    if (firebaseReady) {
        console.log('✅ Authentication: Firebase Phone OTP ready');
    } else {
        console.warn('⚠️  Authentication: Firebase not configured (development mode)');
    }
};

// =====================
// ROUTES SETUP
// =====================

// API Routes
setupRoutes(app);

// 404 Handler
app.use(notFound);

// Global Error Handler
app.use(errorHandler);

// =====================
// SERVER START
// =====================

// Track if server is already starting (prevent duplicate starts)
let isStarting = false;

const startServer = async () => {
    // Prevent multiple startups
    if (isStarting) {
        console.warn('⚠️ Server startup already in progress');
        return;
    }
    isStarting = true;

    try {
        // Initialize services (DB + Firebase)
        await initServices();

        // Get port from config
        const port = config.port;

        // Create server and handle port conflicts
        const server = httpServer.listen(port);

        server.on('listening', () => {
            const actualPort = server.address().port;
            console.log(`
╔═══════════════════════════════════════════════════╗
║           🚀 CANTEEN API SERVER                   ║
╠═══════════════════════════════════════════════════╣
║  Environment: ${config.nodeEnv.padEnd(36)}║
║  Port:        ${String(actualPort).padEnd(36)}║
║  Frontend:    ${config.frontendUrl.padEnd(36)}║
║  Auth:        ${'Firebase Phone OTP'.padEnd(36)}║
║  Razorpay:    ${(config.razorpayKeyId ? 'Configured ✓' : 'Not configured').padEnd(36)}║
╚═══════════════════════════════════════════════════╝
            `);
        });

        // Error handling for port in use
        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                console.error(`❌ Port ${port} is already in use`);
                console.error('   Kill other processes using this port:');
                console.error(`   Windows: taskkill /f /im node.exe`);
                console.error(`   Linux/Mac: lsof -i :${port} | xargs kill -9`);
                process.exit(1);
            } else {
                console.error('❌ Server error:', err.message);
                process.exit(1);
            }
        });

        // Graceful shutdown handler
        const gracefulShutdown = async (signal) => {
            console.log(`\n⏳ ${signal} received. Shutting down gracefully...`);

            // Close HTTP server
            server.close(() => {
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

    } catch (error) {
        console.error('❌ Failed to start server:', error.message);
        process.exit(1);
    }
};

// Start the server
startServer();

export { app, io };
