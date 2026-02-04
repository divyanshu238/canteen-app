/**
 * OTP Verification Page - DEPRECATED
 * 
 * This page is no longer used. Authentication is now handled via email + password.
 * This file exists only for backward compatibility and redirects to login.
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export const PhoneVerification = () => {
    const navigate = useNavigate();

    useEffect(() => {
        // Redirect to login - OTP is no longer used
        navigate('/login', { replace: true });
    }, [navigate]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
                <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-600">Redirecting to login...</p>
            </div>
        </div>
    );
};

// Export for compatibility
export const EmailVerification = PhoneVerification;
export const OTPVerification = PhoneVerification;
