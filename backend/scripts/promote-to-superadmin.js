#!/usr/bin/env node
/**
 * ADMIN SCRIPT: Promote user to Super Admin
 * 
 * This script promotes an existing user to superadmin role and invalidates
 * their existing sessions to force re-authentication.
 * 
 * Usage:
 *   MONGO_URI="your-production-mongo-uri" node scripts/promote-to-superadmin.js
 * 
 * Or with .env file:
 *   NODE_ENV=production node scripts/promote-to-superadmin.js
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';

// Load environment variables
dotenv.config();

const MONGO_URI = process.env.MONGO_URI;
const TARGET_EMAIL = 'admin@canteen.com';
const NEW_ROLE = 'superadmin';

if (!MONGO_URI) {
    console.error('❌ FATAL: MONGO_URI not set');
    console.error('   Set it via environment variable or .env file');
    process.exit(1);
}

async function promoteToSuperAdmin() {
    console.log('🔐 Starting Super Admin promotion...');
    console.log(`📧 Target email: ${TARGET_EMAIL}`);
    console.log(`🎯 New role: ${NEW_ROLE}`);
    console.log('');

    try {
        // Connect to MongoDB with timeout options
        console.log('⏳ Connecting to MongoDB (this may take up to 30 seconds)...');
        await mongoose.connect(MONGO_URI, {
            serverSelectionTimeoutMS: 30000,
            connectTimeoutMS: 30000,
            socketTimeoutMS: 30000
        });
        console.log('✅ Connected to MongoDB');

        // Get the users collection
        const Users = mongoose.connection.collection('users');

        // Find the user first
        const user = await Users.findOne({ email: TARGET_EMAIL });

        if (!user) {
            console.error(`❌ FATAL: User with email "${TARGET_EMAIL}" not found!`);
            console.error('   Double-check the email address or create the user first.');
            process.exit(1);
        }

        console.log('');
        console.log('📋 Current User State:');
        console.log(`   _id: ${user._id}`);
        console.log(`   name: ${user.name}`);
        console.log(`   email: ${user.email}`);
        console.log(`   role: ${user.role}`);
        console.log(`   isActive: ${user.isActive}`);
        console.log('');

        if (user.role === NEW_ROLE) {
            console.log('⚠️  User is already a superadmin!');
            console.log('   Setting forceLogoutBefore to invalidate existing sessions...');
        }

        // Update the user: set role to superadmin and force logout
        const forceLogoutBefore = new Date();
        const result = await Users.updateOne(
            { email: TARGET_EMAIL },
            {
                $set: {
                    role: NEW_ROLE,
                    forceLogoutBefore: forceLogoutBefore
                }
            }
        );

        if (result.modifiedCount === 0 && result.matchedCount === 1) {
            console.log('ℹ️  No changes needed (user may already have these values)');
        } else if (result.modifiedCount === 1) {
            console.log('✅ User document updated successfully!');
        }

        // Verify the update
        const updatedUser = await Users.findOne({ email: TARGET_EMAIL });
        console.log('');
        console.log('📋 Updated User State:');
        console.log(`   _id: ${updatedUser._id}`);
        console.log(`   name: ${updatedUser.name}`);
        console.log(`   email: ${updatedUser.email}`);
        console.log(`   role: ${updatedUser.role}`);
        console.log(`   isActive: ${updatedUser.isActive}`);
        console.log(`   forceLogoutBefore: ${updatedUser.forceLogoutBefore}`);
        console.log('');

        // Verify role is exactly "superadmin"
        if (updatedUser.role !== NEW_ROLE) {
            console.error(`❌ VERIFICATION FAILED: Role is "${updatedUser.role}" instead of "${NEW_ROLE}"`);
            process.exit(1);
        }

        // Also revoke any existing refresh tokens for this user
        const RefreshTokens = mongoose.connection.collection('refreshtokens');
        const revokeResult = await RefreshTokens.updateMany(
            { userId: user._id, isRevoked: false },
            {
                $set: {
                    isRevoked: true,
                    revokedAt: new Date(),
                    revokedReason: 'Super Admin role promotion'
                }
            }
        );
        console.log(`🔒 Revoked ${revokeResult.modifiedCount} refresh tokens for this user`);

        console.log('');
        console.log('========================================');
        console.log('✅ SUPER ADMIN PROMOTION SUCCESSFUL');
        console.log('========================================');
        console.log('');
        console.log('📋 Next Steps:');
        console.log('1. Log out from the application (if currently logged in)');
        console.log('2. Log back in with the same credentials');
        console.log('3. Visit /admin to see Super Admin controls');
        console.log('');
        console.log('🔍 Verification:');
        console.log('   After login, call GET /api/auth/me');
        console.log('   Expected response:');
        console.log('   {');
        console.log('     "user": {');
        console.log(`       "email": "${TARGET_EMAIL}",`);
        console.log(`       "role": "${NEW_ROLE}"`);
        console.log('     }');
        console.log('   }');
        console.log('');

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error.stack);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
}

promoteToSuperAdmin();
