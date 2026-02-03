/**
 * Canteen Backend - Production Ready
 * 
 * RENDER COMPATIBILITY (CRITICAL):
 * 1. HTTP server MUST bind to 0.0.0.0 (not localhost)
 * 2. HTTP server MUST start BEFORE any async operations
 * 3. Health check MUST respond immediately (no dependencies)
 * 4. PORT must be process.env.PORT
 */

// =====================
// STEP 1: LOAD ENVIRONMENT VARIABLES (synchronous, no network)
// =====================
import dotenv from 'dotenv';
dotenv.config();

// =====================
// STEP 2: IMPORT ONLY SYNCHRONOUS MODULES FOR IMMEDIATE SERVER START
// =====================
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server } from 'socket.io';

// =====================
// STEP 3: CREATE EXPRESS APP AND HTTP SERVER IMMEDIATELY
// =====================
const app = express();
const httpServer = createServer(app);

// Service state (will be updated after async init)
let isServicesReady = false;
let servicesError = null;
let firebaseReady = false;

// =====================
// STEP 4: CONFIGURE EXPRESS (synchronous only)
// =====================
app.set('trust proxy', 1);

// Helmet - Security headers
app.use(helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
    crossOriginEmbedderPolicy: false
}));

// =====================
// STEP 5: HEALTH CHECK - MUST BE FIRST ROUTE, NO DEPENDENCIES
// =====================
app.get('/', (req, res) => {
    res.status(200).send('OK');
});

app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        timestamp: Date.now()
    });
});

app.get('/api/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'API is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        servicesReady: isServicesReady,
        firebase: firebaseReady ? 'ready' : 'pending'
    });
});

// =====================
// STEP 6: RATE LIMITING (skip health routes)
// =====================
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    message: { success: false, error: 'Too many requests. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => req.path === '/' || req.path === '/health' || req.path === '/api/health'
});
app.use('/api/', limiter);

// CORS
app.use(cors({
    origin: process.env.NODE_ENV === 'production'
        ? (process.env.FRONTEND_URL || 'https://canteen-app-nine.vercel.app')
        : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// =====================
// STEP 7: SOCKET.IO SETUP
// =====================
const io = new Server(httpServer, {
    cors: {
        origin: process.env.NODE_ENV === 'production'
            ? (process.env.FRONTEND_URL || 'https://canteen-app-nine.vercel.app')
            : '*',
        methods: ['GET', 'POST'],
        credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
});

app.use((req, res, next) => {
    req.io = io;
    next();
});

io.on('connection', (socket) => {
    console.log(`📱 Client connected: ${socket.id}`);
    socket.on('join_canteen', (canteenId) => {
        if (canteenId) socket.join(`canteen_${canteenId}`);
    });
    socket.on('join_order', (orderId) => {
        if (orderId) socket.join(`order_${orderId}`);
    });
    socket.on('disconnect', () => {
        console.log(`📴 Client disconnected: ${socket.id}`);
    });
});

// =====================
// STEP 8: SERVICE READINESS MIDDLEWARE
// =====================
app.use('/api/', (req, res, next) => {
    if (req.path === '/health') return next();

    if (servicesError) {
        return res.status(503).json({
            success: false,
            error: 'Service temporarily unavailable'
        });
    }

    if (!isServicesReady) {
        return res.status(503).json({
            success: false,
            error: 'Service initializing, please wait'
        });
    }

    next();
});

// =====================
// STEP 9: START SERVER IMMEDIATELY - CRITICAL FOR RENDER
// =====================
const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0'; // CRITICAL: Render requires binding to 0.0.0.0

httpServer.listen(PORT, HOST, () => {
    console.log(`✅ HTTP Server listening on ${HOST}:${PORT}`);
    console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   Health check: http://${HOST}:${PORT}/api/health`);

    // =====================
    // STEP 10: INITIALIZE SERVICES AFTER SERVER IS LISTENING
    // =====================
    initializeServices();
});

httpServer.on('error', (err) => {
    console.error('❌ Server error:', err.message);
    process.exit(1);
});

// =====================
// ASYNC SERVICE INITIALIZATION (runs after server is listening)
// =====================
async function initializeServices() {
    console.log('🔄 Initializing services...');

    try {
        // Validate MONGO_URI
        if (!process.env.MONGO_URI) {
            throw new Error('MONGO_URI environment variable is not set');
        }

        // Dynamic imports to avoid blocking startup
        const { connectDB, disconnectDB } = await import('./config/db.js');
        const { setupRoutes } = await import('./routes/index.js');
        const { notFound, errorHandler } = await import('./middleware/error.js');
        const { initializeFirebase, isFirebaseReady } = await import('./config/firebase.js');
        const config = (await import('./config/index.js')).default;

        // Connect to MongoDB
        await connectDB();
        console.log('✅ MongoDB connected');

        // Seed in development
        if (process.env.NODE_ENV !== 'production') {
            try {
                const { seedDatabase } = await import('./seed.js');
                await seedDatabase();
            } catch (e) {
                console.warn('⚠️ Seed skipped:', e.message);
            }
        }

        // Initialize Firebase
        firebaseReady = initializeFirebase();
        if (!firebaseReady && process.env.NODE_ENV === 'production') {
            throw new Error('Firebase initialization required in production');
        }
        console.log(`✅ Firebase: ${firebaseReady ? 'ready' : 'skipped (dev mode)'}`);

        // Setup routes (after services are ready)
        setupRoutes(app);

        // Error handlers (must be last)
        app.use(notFound);
        app.use(errorHandler);

        // Mark as ready
        isServicesReady = true;

        console.log(`
╔════════════════════════════════════════════════════╗
║           ✅ SERVER FULLY OPERATIONAL              ║
╠════════════════════════════════════════════════════╣
║  Port:        ${String(PORT).padEnd(37)}║
║  Environment: ${(process.env.NODE_ENV || 'development').padEnd(37)}║
║  Firebase:    ${(firebaseReady ? 'Ready ✓' : 'Disabled').padEnd(37)}║
║  MongoDB:     ${'Connected ✓'.padEnd(37)}║
╚════════════════════════════════════════════════════╝
        `);

        // Store disconnectDB for graceful shutdown
        globalThis.__disconnectDB = disconnectDB;

    } catch (error) {
        console.error('❌ Service initialization failed:', error.message);
        servicesError = error.message;

        if (process.env.NODE_ENV === 'production') {
            console.error('FATAL: Exiting...');
            process.exit(1);
        }
    }
}

// =====================
// GRACEFUL SHUTDOWN
// =====================
async function gracefulShutdown(signal) {
    console.log(`\n⏳ ${signal} received. Shutting down...`);

    httpServer.close(() => console.log('🔒 HTTP server closed'));
    io.close(() => console.log('🔒 Socket.IO closed'));

    if (globalThis.__disconnectDB) {
        await globalThis.__disconnectDB();
    }

    console.log('👋 Goodbye!');
    process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err);
    gracefulShutdown('UNCAUGHT_EXCEPTION');
});
process.on('unhandledRejection', (reason) => {
    console.error('❌ Unhandled Rejection:', reason);
});

export { app, io };
