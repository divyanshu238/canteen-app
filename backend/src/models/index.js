import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// =====================
// USER SCHEMA
// =====================
const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
        minlength: [2, 'Name must be at least 2 characters'],
        maxlength: [50, 'Name cannot exceed 50 characters']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters'],
        select: false // Don't include by default in queries
    },
    // ============================================
    // EMAIL VERIFICATION - NO PHONE FIELDS
    // ============================================
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    emailVerifiedAt: {
        type: Date
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
    refreshToken: {
        type: String,
        select: false
    },
    canteenId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Canteen'
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Index for faster lookups
userSchema.index({ email: 1 });
userSchema.index({ role: 1, isActive: 1 });

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Transform output (remove sensitive fields)
userSchema.methods.toJSON = function () {
    const obj = this.toObject();
    delete obj.password;
    delete obj.refreshToken;
    delete obj.__v;
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

// Indexes
canteenSchema.index({ ownerId: 1 });
canteenSchema.index({ isOpen: 1, isApproved: 1 });
canteenSchema.index({ name: 'text', tags: 'text' });

// Virtual for menu items
canteenSchema.virtual('menuItems', {
    ref: 'MenuItem',
    localField: '_id',
    foreignField: 'canteenId'
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
    category: {
        type: String,
        default: 'Mains',
        trim: true
    },
    preparationTime: {
        type: Number, // in minutes
        default: 15
    }
}, {
    timestamps: true
});

// Compound index for efficient queries
menuItemSchema.index({ canteenId: 1, inStock: 1 });
menuItemSchema.index({ canteenId: 1, category: 1 });

export const MenuItem = mongoose.model('MenuItem', menuItemSchema);

// =====================
// ORDER SCHEMA
// =====================
const orderItemSchema = new mongoose.Schema({
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
    qty: {
        type: Number,
        required: true,
        min: [1, 'Quantity must be at least 1']
    }
}, { _id: false });

// Helper function to generate unique order ID
const generateOrderId = () => {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `ORD-${timestamp}-${random}`;
};

const orderSchema = new mongoose.Schema({
    orderId: {
        type: String,
        unique: true,
        required: true,
        default: generateOrderId  // Auto-generate before validation
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User ID is required']
    },
    canteenId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Canteen',
        required: [true, 'Canteen ID is required']
    },
    items: {
        type: [orderItemSchema],
        required: [true, 'Order must have at least one item'],
        validate: {
            validator: function (items) {
                return items && items.length > 0;
            },
            message: 'Order must have at least one item'
        }
    },
    itemTotal: {
        type: Number,
        required: true
    },
    deliveryFee: {
        type: Number,
        default: 20
    },
    tax: {
        type: Number,
        required: true
    },
    totalAmount: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: {
            values: ['pending', 'placed', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled'],
            message: 'Invalid order status'
        },
        default: 'pending'
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'failed', 'refunded'],
        default: 'pending'
    },
    paymentMethod: {
        type: String,
        enum: ['razorpay', 'cod', 'wallet'],
        default: 'razorpay'
    },
    razorpayOrderId: {
        type: String,
        index: true
    },
    razorpayPaymentId: {
        type: String
    },
    razorpaySignature: {
        type: String
    },
    specialInstructions: {
        type: String,
        maxlength: [500, 'Special instructions cannot exceed 500 characters']
    },
    cancelReason: {
        type: String
    },
    estimatedDeliveryTime: {
        type: Date
    }
}, {
    timestamps: true
});

// Indexes for efficient queries
orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ canteenId: 1, status: 1, createdAt: -1 });
orderSchema.index({ razorpayOrderId: 1 });
orderSchema.index({ orderId: 1 });
orderSchema.index({ status: 1, paymentStatus: 1 });

export const Order = mongoose.model('Order', orderSchema);

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
// OTP SCHEMA - EMAIL ONLY
// =====================
const otpSchema = new mongoose.Schema({
    // EMAIL is the ONLY identifier - NO phone field
    email: {
        type: String,
        required: [true, 'Email is required'],
        lowercase: true,
        trim: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email'],
        index: true
    },
    otpHash: {
        type: String,
        required: [true, 'OTP hash is required'],
        select: false // Don't include in queries by default
    },
    purpose: {
        type: String,
        enum: ['registration', 'login', 'password_reset'],
        default: 'registration'
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true
    },
    attempts: {
        type: Number,
        default: 0,
        max: [5, 'Maximum verification attempts exceeded']
    },
    maxAttempts: {
        type: Number,
        default: 5
    },
    isUsed: {
        type: Boolean,
        default: false
    },
    expiresAt: {
        type: Date,
        required: true,
        default: () => new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
    },
    lastResendAt: {
        type: Date,
        default: Date.now
    },
    resendCount: {
        type: Number,
        default: 0,
        max: [5, 'Maximum resend attempts exceeded']
    }
}, {
    timestamps: true
});

// Compound indexes for efficient queries - EMAIL based
otpSchema.index({ email: 1, purpose: 1, isUsed: 1 });
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // Auto-cleanup expired OTPs

// Static method to generate OTP
otpSchema.statics.generateOTP = function (length = 6) {
    let otp = '';
    for (let i = 0; i < length; i++) {
        otp += Math.floor(Math.random() * 10);
    }
    return otp;
};

// Static method to hash OTP (using bcrypt for security)
otpSchema.statics.hashOTP = async function (otp) {
    return await bcrypt.hash(otp, 10);
};

// Method to verify OTP
otpSchema.methods.verifyOTP = async function (candidateOTP) {
    // Check if already used
    if (this.isUsed) {
        return { valid: false, error: 'OTP has already been used' };
    }

    // Check if expired
    if (new Date() > this.expiresAt) {
        return { valid: false, error: 'OTP has expired' };
    }

    // Check attempt limit
    if (this.attempts >= this.maxAttempts) {
        return { valid: false, error: 'Maximum verification attempts exceeded. Request a new OTP.' };
    }

    // Increment attempts
    this.attempts += 1;
    await this.save();

    // Get the document with otpHash
    const otpDoc = await this.constructor.findById(this._id).select('+otpHash');

    // Verify OTP
    const isMatch = await bcrypt.compare(candidateOTP, otpDoc.otpHash);

    if (!isMatch) {
        return {
            valid: false,
            error: `Invalid OTP. ${this.maxAttempts - this.attempts} attempts remaining.`,
            attemptsRemaining: this.maxAttempts - this.attempts
        };
    }

    // Mark as used
    this.isUsed = true;
    await this.save();

    return { valid: true };
};

// Method to check if can resend
otpSchema.methods.canResend = function (cooldownSeconds = 60) {
    const cooldownMs = cooldownSeconds * 1000;
    const timeSinceLastResend = Date.now() - this.lastResendAt.getTime();

    if (timeSinceLastResend < cooldownMs) {
        const waitSeconds = Math.ceil((cooldownMs - timeSinceLastResend) / 1000);
        return { canResend: false, waitSeconds };
    }

    if (this.resendCount >= 5) {
        return { canResend: false, error: 'Maximum resend attempts exceeded. Please try again later.' };
    }

    return { canResend: true };
};

export const OTP = mongoose.model('OTP', otpSchema);

export default {
    User,
    Canteen,
    MenuItem,
    Order,
    RefreshToken,
    OTP
};
