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
    }
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
    },
    isReviewed: {
        type: Boolean,
        default: false
    },
    rating: {
        type: Number,
        min: 1,
        max: 5
    },
    review: {
        type: String,
        maxlength: 500
    },
    reviewCreatedAt: {
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
    }
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

export default {
    User,
    Canteen,
    MenuItem,
    Order,
    Review,
    RefreshToken
};
