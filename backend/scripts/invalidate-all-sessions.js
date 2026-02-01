#!/usr/bin/env node
/**
 * SECURITY SCRIPT: Invalidate ALL active sessions
 * 
 * Run this after deploying OTP enforcement to force all users to re-authenticate.
 * This ensures no unverified users have valid tokens.
 * 
 * Usage:
 *   NODE_ENV=production node scripts/invalidate-all-sessions.js
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';

// Load environment variables
dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
    console.error('❌ FATAL: MONGO_URI not set');
    process.exit(1);
}

async function invalidateAllSessions() {
    console.log('🔐 Starting session invalidation...');

    try {
        // Connect to MongoDB
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected to MongoDB');

        // Get the RefreshToken collection
        const RefreshToken = mongoose.connection.collection('refreshtokens');

        // Count current valid tokens
        const validTokens = await RefreshToken.countDocuments({ isRevoked: false });
        console.log(`📊 Found ${validTokens} valid refresh tokens`);

        // Revoke ALL tokens
        const result = await RefreshToken.updateMany(
            { isRevoked: false },
            { $set: { isRevoked: true, revokedAt: new Date(), revokedReason: 'OTP enforcement deployment' } }
        );

        console.log(`🔒 Revoked ${result.modifiedCount} refresh tokens`);

        // Verify
        const remainingValid = await RefreshToken.countDocuments({ isRevoked: false });
        console.log(`✅ Verification: ${remainingValid} valid tokens remaining (should be 0)`);

        if (remainingValid > 0) {
            console.error('❌ WARNING: Some tokens were not revoked!');
            process.exit(1);
        }

        console.log('');
        console.log('========================================');
        console.log('✅ ALL SESSIONS INVALIDATED SUCCESSFULLY');
        console.log('========================================');
        console.log('');
        console.log('Next steps:');
        console.log('1. All users will be logged out on next request');
        console.log('2. Users must re-authenticate');
        console.log('3. Unverified users will be blocked at login');
        console.log('');

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
}

invalidateAllSessions();
