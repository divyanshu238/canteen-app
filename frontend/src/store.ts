import { configureStore, createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

// -- SHARED TYPES --
export interface User {
    id: string;
    name: string;
    email: string;
    role: 'student' | 'partner' | 'admin';
    phone?: string;
    canteenId?: string;
    isApproved?: boolean;
}

export interface MenuItem {
    _id: string;
    name: string;
    price: number;
    isVeg: boolean;
    canteenId: string;
    image?: string;
    description?: string;
    inStock?: boolean;
    category?: string;
}

export interface CartItem extends MenuItem {
    qty: number;
}

// -- AUTH SLICE --
interface AuthState {
    user: User | null;
    token: string | null;
    refreshToken: string | null;
    isAuthenticated: boolean;
}

const getStoredAuth = (): AuthState => {
    try {
        const user = JSON.parse(localStorage.getItem('user') || 'null');
        const token = localStorage.getItem('token');
        const refreshToken = localStorage.getItem('refreshToken');
        return {
            user,
            token,
            refreshToken,
            isAuthenticated: !!token && !!user
        };
    } catch {
        return {
            user: null,
            token: null,
            refreshToken: null,
            isAuthenticated: false
        };
    }
};

const initialAuth: AuthState = getStoredAuth();

const authSlice = createSlice({
    name: 'auth',
    initialState: initialAuth,
    reducers: {
        login: (state, action: PayloadAction<{ user: User; accessToken: string; refreshToken: string }>) => {
            state.user = action.payload.user;
            state.token = action.payload.accessToken;
            state.refreshToken = action.payload.refreshToken;
            state.isAuthenticated = true;

            localStorage.setItem('user', JSON.stringify(action.payload.user));
            localStorage.setItem('token', action.payload.accessToken);
            localStorage.setItem('refreshToken', action.payload.refreshToken);
        },
        updateUser: (state, action: PayloadAction<Partial<User>>) => {
            if (state.user) {
                state.user = { ...state.user, ...action.payload };
                localStorage.setItem('user', JSON.stringify(state.user));
            }
        },
        updateTokens: (state, action: PayloadAction<{ accessToken: string; refreshToken: string }>) => {
            state.token = action.payload.accessToken;
            state.refreshToken = action.payload.refreshToken;
            localStorage.setItem('token', action.payload.accessToken);
            localStorage.setItem('refreshToken', action.payload.refreshToken);
        },
        logout: (state) => {
            state.user = null;
            state.token = null;
            state.refreshToken = null;
            state.isAuthenticated = false;

            localStorage.removeItem('user');
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
        }
    }
});

// -- CART SLICE --
interface CartState {
    items: CartItem[];
    canteenId: string | null;
    canteenName: string | null;
}

// Load cart from localStorage
const getStoredCart = (): CartState => {
    try {
        const cart = JSON.parse(localStorage.getItem('cart') || 'null');
        return cart || { items: [], canteenId: null, canteenName: null };
    } catch {
        return { items: [], canteenId: null, canteenName: null };
    }
};

const initialCart: CartState = getStoredCart();

const saveCart = (state: CartState) => {
    localStorage.setItem('cart', JSON.stringify(state));
};

const cartSlice = createSlice({
    name: 'cart',
    initialState: initialCart,
    reducers: {
        addToCart: (state, action: PayloadAction<MenuItem & { canteenName?: string }>) => {
            const item = action.payload;

            // Reset if different canteen
            if (state.canteenId && state.canteenId !== item.canteenId) {
                state.items = [];
            }
            state.canteenId = item.canteenId;
            if (action.payload.canteenName) {
                state.canteenName = action.payload.canteenName;
            }

            const existing = state.items.find(i => i._id === item._id);
            if (existing) {
                existing.qty = Math.min(existing.qty + 1, 10); // Max 10 per item
            } else {
                state.items.push({ ...item, qty: 1 });
            }

            saveCart(state);
        },
        removeFromCart: (state, action: PayloadAction<string>) => {
            const id = action.payload;
            const existing = state.items.find(i => i._id === id);
            if (existing) {
                if (existing.qty > 1) {
                    existing.qty -= 1;
                } else {
                    state.items = state.items.filter(i => i._id !== id);
                }
            }
            if (state.items.length === 0) {
                state.canteenId = null;
                state.canteenName = null;
            }
            saveCart(state);
        },
        updateQuantity: (state, action: PayloadAction<{ id: string; qty: number }>) => {
            const { id, qty } = action.payload;
            const item = state.items.find(i => i._id === id);
            if (item) {
                if (qty <= 0) {
                    state.items = state.items.filter(i => i._id !== id);
                } else {
                    item.qty = Math.min(qty, 10);
                }
            }
            if (state.items.length === 0) {
                state.canteenId = null;
                state.canteenName = null;
            }
            saveCart(state);
        },
        clearCart: (state) => {
            state.items = [];
            state.canteenId = null;
            state.canteenName = null;
            localStorage.removeItem('cart');
        }
    }
});

// -- UI SLICE --
interface UIState {
    isLoading: boolean;
    notification: {
        show: boolean;
        message: string;
        type: 'success' | 'error' | 'info';
    } | null;
}

const initialUI: UIState = {
    isLoading: false,
    notification: null
};

const uiSlice = createSlice({
    name: 'ui',
    initialState: initialUI,
    reducers: {
        setLoading: (state, action: PayloadAction<boolean>) => {
            state.isLoading = action.payload;
        },
        showNotification: (state, action: PayloadAction<{ message: string; type: 'success' | 'error' | 'info' }>) => {
            state.notification = {
                show: true,
                message: action.payload.message,
                type: action.payload.type
            };
        },
        hideNotification: (state) => {
            state.notification = null;
        }
    }
});

// Export actions
export const { login, logout, updateUser, updateTokens } = authSlice.actions;
export const { addToCart, removeFromCart, updateQuantity, clearCart } = cartSlice.actions;
export const { setLoading, showNotification, hideNotification } = uiSlice.actions;

// Configure store
export const store = configureStore({
    reducer: {
        auth: authSlice.reducer,
        cart: cartSlice.reducer,
        ui: uiSlice.reducer
    }
});

// Export hooks/types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
