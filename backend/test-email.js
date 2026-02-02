/**
 * Email Delivery Test Script
 * 
 * Run this to verify Gmail SMTP is working correctly.
 * 
 * Usage: node test-email.js
 * 
 * Environment variables required:
 * - EMAIL_USER: Your Gmail address
 * - EMAIL_PASS: Your Gmail App Password (16 chars, no spaces)
 * - TEST_EMAIL: (Optional) Email to send test to (defaults to EMAIL_USER)
 */

import dotenv from 'dotenv';
dotenv.config();

import nodemailer from 'nodemailer';

console.log('='.repeat(60));
console.log('📧 EMAIL DELIVERY TEST');
console.log('='.repeat(60));

const emailUser = process.env.EMAIL_USER;
const emailPass = process.env.EMAIL_PASS;
const testEmail = process.env.TEST_EMAIL || emailUser;

console.log('\n📋 Configuration Check:');
console.log(`   EMAIL_USER: ${emailUser ? emailUser.slice(0, 3) + '***@' + emailUser.split('@')[1] : '❌ NOT SET'}`);
console.log(`   EMAIL_PASS: ${emailPass ? `[SET - ${emailPass.length} chars]` : '❌ NOT SET'}`);
console.log(`   TEST_EMAIL: ${testEmail ? testEmail.slice(0, 3) + '***@' + testEmail.split('@')[1] : '❌ NOT SET'}`);

if (!emailUser || !emailPass) {
    console.error('\n❌ FATAL: EMAIL_USER and EMAIL_PASS must be set');
    console.error('   Set these in your .env file or Render environment variables');
    process.exit(1);
}

// Validate App Password format
const cleanedPass = emailPass.replace(/\s/g, '');
if (cleanedPass.length !== 16) {
    console.warn(`\n⚠️ WARNING: EMAIL_PASS has ${cleanedPass.length} characters (expected 16)`);
    console.warn('   Gmail App Passwords are exactly 16 characters');
    console.warn('   Make sure you are using an App Password, not your Gmail password');
}

if (emailPass !== cleanedPass) {
    console.warn(`\n⚠️ WARNING: EMAIL_PASS contains spaces`);
    console.warn('   Gmail App Passwords should NOT have spaces');
}

console.log('\n🔧 Creating SMTP Transporter (Render-compatible config)...');

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,              // STARTTLS port (works on Render, port 465 is blocked)
    secure: false,          // false for port 587 - upgrades via STARTTLS
    requireTLS: true,       // Require TLS upgrade
    auth: {
        user: emailUser,
        pass: emailPass
    },
    tls: {
        rejectUnauthorized: false,  // Allow for cloud environments
        minVersion: 'TLSv1.2'
    },
    connectionTimeout: 30000,   // 30 seconds
    greetingTimeout: 30000,
    socketTimeout: 30000,
    debug: true,
    logger: true
});

console.log('\n🔍 Verifying SMTP Connection...');

try {
    await transporter.verify();
    console.log('✅ SMTP connection verified successfully!');
} catch (error) {
    console.error('\n❌ SMTP VERIFICATION FAILED:');
    console.error(`   Error: ${error.message}`);
    console.error(`   Code: ${error.code || 'N/A'}`);
    console.error(`   Response: ${error.response || 'N/A'}`);
    console.error('\n🔧 Troubleshooting:');
    console.error('   1. Make sure 2-Step Verification is enabled on your Google account');
    console.error('   2. Generate an App Password at: https://myaccount.google.com/apppasswords');
    console.error('   3. Use the 16-character App Password (without spaces)');
    console.error('   4. Make sure EMAIL_USER is your full Gmail address');
    process.exit(1);
}

console.log('\n📤 Sending Test Email...');

const testOtp = Math.floor(100000 + Math.random() * 900000).toString();

try {
    const result = await transporter.sendMail({
        from: `Canteen Connect Test <${emailUser}>`,
        to: testEmail,
        subject: `Test Email - OTP: ${testOtp}`,
        text: `This is a test email from Canteen Connect.\n\nTest OTP: ${testOtp}\n\nIf you received this, email delivery is working!`,
        html: `
            <div style="font-family: sans-serif; padding: 20px;">
                <h1 style="color: #f97316;">Canteen Connect - Email Test</h1>
                <p>This is a test email.</p>
                <div style="background: #fff7ed; border: 2px solid #f97316; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
                    <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #ea580c;">${testOtp}</span>
                </div>
                <p style="color: #666;">If you received this, email delivery is working correctly!</p>
                <p style="color: #999; font-size: 12px;">Sent at: ${new Date().toISOString()}</p>
            </div>
        `
    });

    console.log('\n' + '='.repeat(60));
    console.log('✅ EMAIL SENT SUCCESSFULLY!');
    console.log('='.repeat(60));
    console.log(`   MessageId: ${result.messageId}`);
    console.log(`   Accepted: ${result.accepted.join(', ')}`);
    console.log(`   Response: ${result.response}`);

    if (result.rejected && result.rejected.length > 0) {
        console.warn(`   ⚠️ Rejected: ${result.rejected.join(', ')}`);
    }

    console.log('\n📬 Check your inbox (and spam folder) for the test email!');
    console.log(`   Subject: "Test Email - OTP: ${testOtp}"`);

} catch (error) {
    console.error('\n❌ EMAIL SEND FAILED:');
    console.error(`   Error: ${error.message}`);
    console.error(`   Code: ${error.code || 'N/A'}`);
    console.error(`   Command: ${error.command || 'N/A'}`);
    console.error(`   Response: ${error.response || 'N/A'}`);
    process.exit(1);
}

console.log('\n' + '='.repeat(60));
console.log('🎉 EMAIL DELIVERY TEST COMPLETE');
console.log('='.repeat(60));
