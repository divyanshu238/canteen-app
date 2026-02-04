/**
 * Canteen Backend - Render-Safe Production Server
 * 
 * CRITICAL RENDER REQUIREMENTS:
 * 1. httpServer.listen() MUST be called FIRST, before anything else
 * 2. Socket.IO MUST be initialized AFTER listen() callback
 * 3. Health routes MUST have ZERO dependencies
 * 4. All async operations MUST happen AFTER server is live
 * 5. Bind to 0.0.0.0 (not localhost)
 */

// ==============================================================
// PHASE 1: SYNCHRONOUS SETUP ONLY (no imports with side effects)
// ==============================================================

import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import { createServer } from 'http';

// Create Express app and HTTP server - NOTHING ELSE YET
const app = express();
const httpServer = createServer(app);

// ==============================================================
// PHASE 2: MINIMAL HEALTH CHECK (must respond before anything loads)
// ==============================================================

// These routes have ZERO dependencies - they work immediately
app.get('/', (req, res) => {
    res.status(200).send('OK');
});

app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        timestamp: Date.now(),
        uptime: process.uptime()
    });
});

// ==============================================================
// PHASE 3: START HTTP SERVER IMMEDIATELY
// This MUST happen before Socket.IO, MongoDB, Firebase, etc.
// ==============================================================

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, '0.0.0.0', () => {
    // This callback fires when server is ACTUALLY listening
    console.log(`[RENDER] HTTP server listening on 0.0.0.0:${PORT}`);

    // Now it's safe to initialize everything else
    bootstrapApplication();
});

httpServer.on('error', (err) => {
    console.error('[FATAL] Server failed to start:', err.message);
    process.exit(1);
});

// ==============================================================
// PHASE 4: BOOTSTRAP (runs ONLY after server is listening)
// ==============================================================

async function bootstrapApplication() {
    console.log('[BOOT] Starting application bootstrap...');

    try {
        // --- Import modules dynamically (prevents blocking) ---
        const helmet = (await import('helmet')).default;
        const cors = (await import('cors')).default;
        const rateLimit = (await import('express-rate-limit')).default;
        const { Server: SocketIOServer } = await import('socket.io');

        // --- Security middleware ---
        app.use(helmet({
            contentSecurityPolicy: false,
            crossOriginEmbedderPolicy: false
        }));

        // --- Trust proxy (Render uses reverse proxy) ---
        app.set('trust proxy', 1);

        // --- Rate limiting (skip health routes) ---
        const limiter = rateLimit({
            windowMs: 15 * 60 * 1000,
            max: 100,
            skip: (req) => ['/', '/health', '/api/health'].includes(req.path)
        });
        app.use('/api/', limiter);

        // --- CORS ---
        // --- CORS ---
        const corsOrigin = process.env.FRONTEND_URL || 'https://canteen-app-nine.vercel.app';
        app.use(cors({
            origin: (origin, callback) => {
                // Allow requests with no origin (like mobile apps or curl requests)
                if (!origin) return callback(null, true);

                // Allow allowed origins
                const allowedOrigins = [
                    'http://localhost:5173',
                    'http://localhost:5174',
                    'http://localhost:5000',
                    corsOrigin,
                    'https://canteen-app-tr5h.vercel.app' // Explicitly from screenshot
                ];

                if (allowedOrigins.indexOf(origin) !== -1 || origin.endsWith('.vercel.app')) {
                    callback(null, true);
                } else {
                    console.log('❌ CORS Blocked:', origin);
                    callback(new Error('Not allowed by CORS'));
                }
            },
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization']
        }));

        // --- Body parsers ---
        app.use(express.json({ limit: '10mb' }));
        app.use(express.urlencoded({ extended: true, limit: '10mb' }));

        // --- Socket.IO (AFTER server is listening) ---
        const io = new SocketIOServer(httpServer, {
            cors: {
                origin: process.env.NODE_ENV === 'production' ? corsOrigin : '*',
                methods: ['GET', 'POST'],
                credentials: true
            },
            pingTimeout: 60000,
            pingInterval: 25000,
            transports: ['websocket', 'polling'] // Explicit transports
        });

        // Attach io to app for route handlers
        app.set('io', io);
        app.use((req, res, next) => {
            req.io = io;
            next();
        });

        io.on('connection', (socket) => {
            console.log(`[WS] Client connected: ${socket.id}`);
            socket.on('join_canteen', (id) => id && socket.join(`canteen_${id}`));
            socket.on('join_order', (id) => id && socket.join(`order_${id}`));
            socket.on('disconnect', () => console.log(`[WS] Client disconnected: ${socket.id}`));
        });

        // Store io for shutdown
        app.set('socketio', io);

        console.log('[BOOT] Socket.IO initialized');

        // --- MongoDB ---
        if (!process.env.MONGO_URI) {
            throw new Error('MONGO_URI is required');
        }

        const { connectDB } = await import('./config/db.js');
        await connectDB();
        console.log('[BOOT] MongoDB connected');

        // --- Firebase REMOVED ---
        // Classic auth is now used.
        console.log('[BOOT] Auth system: Email/Password (Classic)');

        // --- Seed database (dev only) ---
        if (process.env.NODE_ENV !== 'production') {
            try {
                const { seedDatabase } = await import('./seed.js');
                await seedDatabase();
            } catch (e) {
                console.log('[BOOT] Seed skipped:', e.message);
            }
        }

        // --- API Routes ---
        const { setupRoutes } = await import('./routes/index.js');
        setupRoutes(app);
        console.log('[BOOT] API routes loaded');

        // --- Error handlers (must be last) ---
        const { notFound, errorHandler } = await import('./middleware/error.js');
        app.use(notFound);
        app.use(errorHandler);

        // --- Mark server as fully operational ---
        app.set('ready', true);

        console.log('=============================================');
        console.log('  ✅ SERVER FULLY OPERATIONAL');
        console.log(`  Port: ${PORT}`);
        console.log(`  Env:  ${process.env.NODE_ENV || 'development'}`);
        console.log('=============================================');

    } catch (error) {
        console.error('[FATAL] Bootstrap failed:', error.message);
        console.error(error.stack);

        if (process.env.NODE_ENV === 'production') {
            process.exit(1);
        }
    }
}

// ==============================================================
// PHASE 5: GRACEFUL SHUTDOWN
// ==============================================================

async function shutdown(signal) {
    console.log(`[SHUTDOWN] ${signal} received`);

    const io = app.get('socketio');
    if (io) io.close();

    httpServer.close(() => {
        console.log('[SHUTDOWN] HTTP server closed');
    });

    // Close MongoDB if available
    try {
        const mongoose = await import('mongoose');
        await mongoose.default.connection.close();
        console.log('[SHUTDOWN] MongoDB closed');
    } catch (e) {
        // Ignore if mongoose not loaded
    }

    process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('uncaughtException', (err) => {
    console.error('[UNCAUGHT]', err);
    shutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason) => {
    console.error('[UNHANDLED]', reason);
});

export { app, httpServer };
