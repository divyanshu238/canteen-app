import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// =====================
// USER SCHEMA - EMAIL/PASSWORD AUTHENTICATION (NO FIREBASE)
// =====================
const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
        minlength: [2, 'Name must be at least 2 characters'],
        maxlength: [50, 'Name cannot exceed 50 characters']
    },
    // ============================================
    // EMAIL - PRIMARY IDENTIFIER
    // ============================================
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
        index: true
    },
    // ============================================
    // PASSWORD - HASHED WITH BCRYPT
    // ============================================
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters'],
        select: false // Never return password in queries by default
    },
    // ============================================
    // PHONE NUMBER - STORED FOR CONTACT, NOT AUTH
    // ============================================
    phoneNumber: {
        type: String,
        required: [false, 'Phone number is required'], // Changed to false to prevent update bugs
        trim: true,
        match: [/^\+[1-9]\d{6,14}$/, 'Phone number must be in E.164 format (e.g., +919876543210)'],
        index: true
    },
    role: {
        type: String,
        enum: {
            values: ['student', 'partner', 'admin'],
            message: 'Role must be student, partner, or admin'
        },
        default: 'student'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isApproved: {
        type: Boolean,
        default: true // Partners need approval, students are auto-approved
    },
    canteenId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Canteen'
    },
    // ============================================
    // SUPER ADMIN CONTROL FIELDS
    // ============================================
    suspendedAt: Date,
    suspendedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    suspendReason: String,
    lastLoginAt: Date,
    lastLoginIp: String,
    // Soft delete fields
    deletedAt: Date,
    deletedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    // Force logout - tokens issued before this time are invalid
    forceLogoutBefore: Date
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes for faster lookups
userSchema.index({ email: 1 });
userSchema.index({ phoneNumber: 1 });
userSchema.index({ role: 1, isActive: 1 });

// ============================================
// PRE-SAVE HOOK - HANDLE PASSWORD HASHING & FORMATTING
// ============================================
userSchema.pre('save', async function (next) {
    // 1. Hash Password if modified
    if (this.isModified('password')) {
        try {
            const salt = await bcrypt.genSalt(12);
            this.password = await bcrypt.hash(this.password, salt);
        } catch (error) {
            return next(error);
        }
    }

    // 2. Normalize Phone Number if it exists (Fix legacy data issues)
    if (this.phoneNumber) {
        // Remove all non-digits
        const digits = this.phoneNumber.replace(/\D/g, '');
        // If it looks like a valid Indian number (10 digits) without country code, add it
        if (digits.length === 10) {
            this.phoneNumber = `+91${digits}`;
        } else if (digits.length > 10 && !this.phoneNumber.startsWith('+')) {
            // Already includes country code but missing +
            this.phoneNumber = `+${digits}`;
        }
    }

    next();
});

// Transform output (remove sensitive fields)
userSchema.methods.toJSON = function () {
    const obj = this.toObject();
    delete obj.__v;
    delete obj.password; // Never expose password
    return obj;
};

export const User = mongoose.model('User', userSchema);

// =====================
// CANTEEN SCHEMA
// =====================
const canteenSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Canteen name is required'],
        trim: true,
        minlength: [2, 'Name must be at least 2 characters'],
        maxlength: [100, 'Name cannot exceed 100 characters']
    },
    description: {
        type: String,
        trim: true,
        maxlength: [500, 'Description cannot exceed 500 characters']
    },
    image: {
        type: String,
        required: [true, 'Canteen image is required']
    },
    rating: {
        type: Number,
        default: 4.0,
        min: [0, 'Rating cannot be less than 0'],
        max: [5, 'Rating cannot exceed 5']
    },
    totalRatings: {
        type: Number,
        default: 0
    },
    tags: {
        type: [String],
        default: []
    },
    isOpen: {
        type: Boolean,
        default: true
    },
    isApproved: {
        type: Boolean,
        default: false // Requires admin approval
    },
    preparationTime: {
        type: String,
        default: '20-30 min'
    },
    priceRange: {
        type: String,
        default: '₹100-200'
    },
    address: {
        type: String,
        trim: true
    },
    ratingBreakdown: {
        type: Map,
        of: Number,
        default: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    },
    reviewSummary: {
        type: String,
        default: ''
    },
    ownerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Owner ID is required']
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for Top Rated Badge
canteenSchema.virtual('isTopRated').get(function () {
    return this.rating >= 4.3 && this.totalRatings >= 10;
});

export const Canteen = mongoose.model('Canteen', canteenSchema);

// =====================
// MENU ITEM SCHEMA
// =====================
const menuItemSchema = new mongoose.Schema({
    canteenId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Canteen',
        required: [true, 'Canteen ID is required'],
        index: true
    },
    name: {
        type: String,
        required: [true, 'Item name is required'],
        trim: true,
        minlength: [2, 'Name must be at least 2 characters'],
        maxlength: [100, 'Name cannot exceed 100 characters']
    },
    description: {
        type: String,
        trim: true,
        maxlength: [300, 'Description cannot exceed 300 characters']
    },
    price: {
        type: Number,
        required: [true, 'Price is required'],
        min: [0, 'Price cannot be negative']
    },
    category: {
        type: String,
        required: [true, 'Category is required'],
        trim: true,
        index: true
    },
    image: {
        type: String,
        default: ''
    },
    isVeg: {
        type: Boolean,
        default: true
    },
    inStock: {
        type: Boolean,
        default: true
    },
    preparationTime: {
        type: String,
        default: '15-20 min'
    },
    rating: {
        type: Number,
        default: 4.0,
        min: 0,
        max: 5
    },
    totalOrders: {
        type: Number,
        default: 0
    },
    // ============================================
    // SUPER ADMIN TRACKING FIELDS
    // ============================================
    priceHistory: [{
        price: Number,
        changedAt: { type: Date, default: Date.now },
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    }],
    lastModifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

menuItemSchema.index({ canteenId: 1, category: 1 });
menuItemSchema.index({ name: 'text', description: 'text' });

export const MenuItem = mongoose.model('MenuItem', menuItemSchema);

// =====================
// ORDER SCHEMA
// =====================
const orderSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User ID is required'],
        index: true
    },
    canteenId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Canteen',
        required: [true, 'Canteen ID is required'],
        index: true
    },
    items: [{
        itemId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'MenuItem',
            required: true
        },
        name: {
            type: String,
            required: true
        },
        price: {
            type: Number,
            required: true
        },
        quantity: {
            type: Number,
            required: true,
            min: 1
        }
    }],
    totalAmount: {
        type: Number,
        required: [true, 'Total amount is required'],
        min: 0
    },
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'],
        default: 'pending',
        index: true
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'failed', 'refunded'],
        default: 'pending'
    },
    paymentMethod: {
        type: String,
        enum: ['cash', 'upi', 'card', 'wallet'],
        default: 'cash'
    },
    specialInstructions: {
        type: String,
        maxlength: 500
    },
    estimatedTime: {
        type: String,
        default: '20-30 min'
    },
    completedAt: {
        type: Date
    },
    cancelledAt: {
        type: Date
    },
    cancelReason: {
        type: String
    },
    isReviewed: {
        type: Boolean,
        default: false
    },
    // ============================================
    // SUPER ADMIN OVERRIDE TRACKING
    // ============================================
    adminOverrides: [{
        field: String,
        oldValue: mongoose.Schema.Types.Mixed,
        newValue: mongoose.Schema.Types.Mixed,
        overriddenBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        overriddenAt: { type: Date, default: Date.now },
        reason: String
    }],
    refundDetails: {
        refundedAt: Date,
        refundedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        razorpayRefundId: String,
        amount: Number,
        reason: String
    },
}, {
    timestamps: true
});

orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ canteenId: 1, status: 1 });
orderSchema.index({ createdAt: -1 });

export const Order = mongoose.model('Order', orderSchema);

// =====================
// REVIEW SCHEMA
// =====================
const reviewSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    canteenId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Canteen',
        required: true
    },
    orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: true,
        unique: true
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5
    },
    comment: {
        type: String,
        maxlength: 500,
        trim: true
    },
    isFlagged: {
        type: Boolean,
        default: false
    },
    flagReason: {
        type: String
    },
    // ============================================
    // SUPER ADMIN CONTROL FIELDS
    // ============================================
    isLocked: { type: Boolean, default: false },
    lockedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    lockedAt: Date,
    adminEdits: [{
        editedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        editedAt: { type: Date, default: Date.now },
        previousRating: Number,
        previousComment: String,
        reason: String
    }]
}, {
    timestamps: true
});

reviewSchema.index({ orderId: 1 }, { unique: true });
reviewSchema.index({ canteenId: 1, rating: -1 });
reviewSchema.index({ userId: 1 });

export const Review = mongoose.model('Review', reviewSchema);

// =====================
// REFRESH TOKEN SCHEMA
// =====================
const refreshTokenSchema = new mongoose.Schema({
    token: {
        type: String,
        required: true,
        unique: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    expiresAt: {
        type: Date,
        required: true
    },
    isRevoked: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

refreshTokenSchema.index({ userId: 1 });
refreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);

// =====================
// AUDIT LOG SCHEMA (IMMUTABLE)
// =====================
const auditLogSchema = new mongoose.Schema({
    // WHO performed the action
    adminId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    adminEmail: String,
    adminName: String,

    // WHAT action was performed
    action: {
        type: String,
        required: true,
        enum: [
            // User actions
            'USER_CREATE', 'USER_UPDATE', 'USER_DELETE', 'USER_SUSPEND',
            'USER_REACTIVATE', 'USER_FORCE_LOGOUT', 'USER_PASSWORD_RESET',
            // Canteen actions
            'CANTEEN_CREATE', 'CANTEEN_UPDATE', 'CANTEEN_DELETE',
            'CANTEEN_APPROVE', 'CANTEEN_REJECT', 'CANTEEN_SUSPEND', 'CANTEEN_TOGGLE_ORDERING',
            // Menu actions
            'MENU_ITEM_CREATE', 'MENU_ITEM_UPDATE', 'MENU_ITEM_DELETE',
            'MENU_ITEM_STOCK_TOGGLE', 'MENU_BULK_UPDATE', 'MENU_PRICE_CHANGE',
            // Order actions
            'ORDER_STATUS_OVERRIDE', 'ORDER_CANCEL', 'ORDER_REFUND',
            'ORDER_REASSIGN', 'ORDER_PAYMENT_OVERRIDE',
            // Review actions
            'REVIEW_EDIT', 'REVIEW_DELETE', 'REVIEW_FLAG_TOGGLE',
            'REVIEW_LOCK', 'RATING_OVERRIDE',
            // System actions
            'FEATURE_FLAG_TOGGLE', 'MAINTENANCE_MODE_TOGGLE',
            'SYSTEM_SETTING_CHANGE', 'ADMIN_ROLE_CHANGE'
        ],
        index: true
    },

    // WHAT entity was affected
    entityType: {
        type: String,
        required: true,
        enum: ['User', 'Canteen', 'MenuItem', 'Order', 'Review', 'System'],
        index: true
    },
    entityId: {
        type: mongoose.Schema.Types.ObjectId,
        index: true
    },

    // STATE before and after (for rollback capability)
    beforeState: mongoose.Schema.Types.Mixed,
    afterState: mongoose.Schema.Types.Mixed,

    // WHY (optional reason)
    reason: String,

    // METADATA
    ipAddress: String,
    userAgent: String,

    // TIMESTAMP (immutable)
    timestamp: {
        type: Date,
        default: Date.now,
        immutable: true,
        index: true
    }
}, {
    timestamps: false,
    collection: 'audit_logs'
});

// Compound indexes for efficient querying
auditLogSchema.index({ adminId: 1, timestamp: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });

// Prevent modification once created (append-only)
auditLogSchema.pre('findOneAndUpdate', function () {
    throw new Error('Audit logs are immutable');
});
auditLogSchema.pre('updateOne', function () {
    throw new Error('Audit logs are immutable');
});
auditLogSchema.pre('updateMany', function () {
    throw new Error('Audit logs are immutable');
});

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);

// =====================
// SYSTEM SETTINGS SCHEMA
// =====================
const systemSettingsSchema = new mongoose.Schema({
    key: {
        type: String,
        required: true,
        unique: true,
        enum: [
            'MAINTENANCE_MODE',
            'NEW_USER_REGISTRATION',
            'NEW_PARTNER_REGISTRATION',
            'ORDERING_ENABLED',
            'PAYMENT_ENABLED',
            'REVIEW_SUBMISSION_ENABLED',
            'MAX_ORDER_AMOUNT',
            'MIN_ORDER_AMOUNT',
            'PLATFORM_FEE_PERCENTAGE'
        ]
    },
    value: mongoose.Schema.Types.Mixed,
    description: String,
    lastModifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    lastModifiedAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

export const SystemSettings = mongoose.model('SystemSettings', systemSettingsSchema);

export default {
    User,
    Canteen,
    MenuItem,
    Order,
    Review,
    RefreshToken,
    AuditLog,
    SystemSettings
};
