/**
 * Request validation middleware using simple validation
 */

import { AppError } from './error.js';

// Validate request body
export const validate = (schema) => {
    return (req, res, next) => {
        const errors = [];

        for (const [field, rules] of Object.entries(schema)) {
            const value = req.body[field];

            if (rules.required && (value === undefined || value === null || value === '')) {
                errors.push(`${field} is required`);
                continue;
            }

            if (value !== undefined && value !== null && value !== '') {
                if (rules.type === 'email') {
                    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
                    if (!emailRegex.test(value)) {
                        errors.push(`${field} must be a valid email`);
                    }
                }

                if (rules.type === 'string' && typeof value !== 'string') {
                    errors.push(`${field} must be a string`);
                }

                if (rules.type === 'number' && typeof value !== 'number') {
                    errors.push(`${field} must be a number`);
                }

                if (rules.minLength && typeof value === 'string' && value.length < rules.minLength) {
                    errors.push(`${field} must be at least ${rules.minLength} characters`);
                }

                if (rules.maxLength && typeof value === 'string' && value.length > rules.maxLength) {
                    errors.push(`${field} must not exceed ${rules.maxLength} characters`);
                }

                if (rules.min && typeof value === 'number' && value < rules.min) {
                    errors.push(`${field} must be at least ${rules.min}`);
                }

                if (rules.max && typeof value === 'number' && value > rules.max) {
                    errors.push(`${field} must not exceed ${rules.max}`);
                }

                if (rules.enum && !rules.enum.includes(value)) {
                    errors.push(`${field} must be one of: ${rules.enum.join(', ')}`);
                }
            }
        }

        if (errors.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: errors
            });
        }

        next();
    };
};

// Common validation schemas
export const schemas = {
    register: {
        name: { required: true, type: 'string', minLength: 2, maxLength: 50 },
        email: { required: true, type: 'email' },
        password: { required: true, type: 'string', minLength: 6 },
        role: { type: 'string', enum: ['student', 'partner'] }
    },
    login: {
        email: { required: true, type: 'email' },
        password: { required: true, type: 'string' }
    },
    createMenuItem: {
        name: { required: true, type: 'string', minLength: 2, maxLength: 100 },
        price: { required: true, type: 'number', min: 0 }
    },
    createOrder: {
        canteenId: { required: true, type: 'string' }
    }
};

export default { validate, schemas };
