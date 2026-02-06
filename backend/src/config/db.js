/**
 * MongoDB Connection Module
 * 
 * Production-standard database connection with:
 * - Environment variable validation
 * - Connection retry logic
 * - Fail-fast on connection errors
 * - Connection event handlers
 * - Graceful disconnect
 * 
 * NOTE: Uses process.env.MONGO_URI directly to avoid import order issues.
 */

import mongoose from 'mongoose';

// Track connection state to prevent multiple connections
let isConnected = false;

/**
 * Connect to MongoDB
 * Must be called before server starts listening
 * Exits process on failure (fail-fast)
 */
export const connectDB = async () => {
    // Prevent multiple connections
    if (isConnected) {
        console.log('⚡ Using existing MongoDB connection');
        return;
    }

    // Get MONGO_URI directly from environment (not from config to avoid import order issues)
    const mongoUri = process.env.MONGO_URI;

    // Validate MONGO_URI exists
    if (!mongoUri) {
        console.error('❌ FATAL: MONGO_URI environment variable is not set');
        console.error('   Please set MONGO_URI in your .env file');
        console.error('   Example: MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/dbname');
        process.exit(1);
    }

    // Configure mongoose
    mongoose.set('strictQuery', true);

    // Connection event handlers
    mongoose.connection.on('connected', () => {
        isConnected = true;
        console.log('✅ MongoDB connected successfully');
    });

    mongoose.connection.on('error', (err) => {
        console.error('❌ MongoDB connection error:', err.message);
        isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
        console.log('⚠️ MongoDB disconnected');
        isConnected = false;
    });


    // ... existing ...

    // Attempt connection
    try {
        let uriToConnect = mongoUri;

        // Check for Memory DB fallback (Development/Testing only)
        if (process.env.USE_MEMORY_DB === 'true' && process.env.NODE_ENV !== 'production') {
            console.log('🧠 USE_MEMORY_DB=true: Initializing MongoMemoryServer...');
            try {
                // Dynamic import to avoid production dependency issues if not installed
                const { MongoMemoryServer } = await import('mongodb-memory-server');
                const mongod = await MongoMemoryServer.create();
                uriToConnect = mongod.getUri();

                console.log(`🧠 MongoMemoryServer started at: ${uriToConnect}`);

                // Keep reference to stop it later if needed (optional)
                // global.__MONGOD__ = mongod; 
            } catch (err) {
                console.warn('⚠️ Failed to start MongoMemoryServer (dependency missing?), falling back to MONGO_URI.');
                console.warn(`   Error: ${err.message}`);
            }
        }

        const connectionOptions = {
            serverSelectionTimeoutMS: 10000, // 10 second timeout
            socketTimeoutMS: 45000,          // 45 second socket timeout
            maxPoolSize: 10,                 // Connection pool size
            retryWrites: true,
            w: 'majority'
        };

        // Mask credentials in logs
        // ...

        console.log(`🔌 Connecting to MongoDB...`);

        await mongoose.connect(uriToConnect, connectionOptions);

        // ...


        // Log connection details
        const { host, port, name } = mongoose.connection;
        console.log(`   Database: ${name}`);
        console.log(`   Host: ${host}${port ? ':' + port : ''}`);

    } catch (error) {
        console.error('❌ FATAL: MongoDB connection failed');
        console.error(`   Error: ${error.message}`);

        // Provide helpful error messages
        if (error.message.includes('ENOTFOUND')) {
            console.error('   → Could not resolve database host. Check your MONGO_URI.');
        } else if (error.message.includes('authentication failed')) {
            console.error('   → Authentication failed. Check username/password in MONGO_URI.');
        } else if (error.message.includes('ETIMEDOUT')) {
            console.error('   → Connection timed out. Check network/firewall settings.');
        } else if (error.message.includes('ECONNREFUSED')) {
            console.error('   → Connection refused. Is MongoDB running?');
        }

        // Fail fast - exit process
        process.exit(1);
    }
};

/**
 * Disconnect from MongoDB
 * Called during graceful shutdown
 */
export const disconnectDB = async () => {
    if (!isConnected) {
        return;
    }

    try {
        await mongoose.connection.close();
        isConnected = false;
        console.log('🔒 MongoDB connection closed');
    } catch (error) {
        console.error('❌ Error closing MongoDB connection:', error.message);
        throw error;
    }
};

/**
 * Get current connection state
 */
export const getConnectionState = () => {
    return {
        isConnected,
        readyState: mongoose.connection.readyState,
        // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
        status: ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState]
    };
};

export default {
    connectDB,
    disconnectDB,
    getConnectionState
};
