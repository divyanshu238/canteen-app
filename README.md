# Canteen Connect - Production Ready Food Ordering Application

A full-stack food ordering application similar to Swiggy/Zomato, built for campus canteens.

## 🚀 Features

### For Students
- Browse campus canteens and menus
- Add items to cart with persistent storage
- Secure payment via Razorpay
- Real-time order tracking
- Order history

### For Partners (Canteen Owners)
- Dashboard with live orders
- Menu management (add/edit/delete items)
- Toggle item availability
- Open/close canteen status
- Revenue and order statistics

### For Admins
- User management (activate/deactivate)
- Canteen approval workflow
- Order management with override capability
- Platform analytics and insights

## 🛠️ Tech Stack

### Frontend
- React 18 + Vite + TypeScript
- Redux Toolkit (State Management)
- React Router v6 (Navigation)
- Tailwind CSS (Styling)
- Socket.IO Client (Real-time updates)
- Framer Motion (Animations)

### Backend
- Node.js + Express
- MongoDB + Mongoose
- JWT Authentication (with refresh tokens)
- Socket.IO (Real-time updates)
- Razorpay SDK (Payments)
- Helmet + Rate Limiting (Security)

## 📁 Project Structure

```
canteen/
├── backend/
│   ├── src/
│   │   ├── config/          # Environment configuration
│   │   ├── controllers/     # Route handlers
│   │   ├── middleware/      # Auth, validation, error handling
│   │   ├── models/          # MongoDB schemas
│   │   ├── routes/          # API routes
│   │   ├── index.js         # Server entry point
│   │   └── seed.js          # Database seeding
│   ├── .env                 # Environment variables
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/      # Reusable components
│   │   ├── pages/           # Page components
│   │   ├── api.ts           # API client
│   │   ├── config.ts        # Frontend config
│   │   ├── socket.tsx       # Socket.IO provider
│   │   ├── store.ts         # Redux store
│   │   └── main.tsx         # App entry point
│   ├── .env                 # Environment variables
│   └── package.json
│
└── README.md
```

## 🔧 Local Development Setup

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- Razorpay account (for payments)

### Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env with your configuration
# - MONGO_URI
# - JWT_SECRET
# - RAZORPAY keys (optional for dev)

# Start development server
npm run dev
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Edit .env.local with your configuration
# - VITE_API_URL
# - VITE_RAZORPAY_KEY_ID (optional for dev)

# Start development server
npm run dev
```

### Demo Accounts (Development)

After starting the backend, these accounts are auto-created:

| Role    | Email              | Password    |
|---------|-------------------|-------------|
| Admin   | admin@canteen.com | admin123    |
| Partner | raju@canteen.com  | partner123  |
| Partner | pizza@canteen.com | partner123  |
| Student | student@test.com  | student123  |

## 🔐 Environment Variables

### Backend (.env)

```env
# Required
NODE_ENV=production
MONGO_URI=mongodb+srv://...
JWT_SECRET=your-super-secret-key-min-32-chars
JWT_REFRESH_SECRET=another-super-secret-key

# Razorpay (Required for real payments)
RAZORPAY_KEY_ID=rzp_live_xxxxx
RAZORPAY_KEY_SECRET=xxxxx
RAZORPAY_WEBHOOK_SECRET=xxxxx

# Optional
PORT=5000
FRONTEND_URL=https://your-frontend-domain.com
CORS_ORIGINS=https://your-frontend-domain.com
```

### Frontend (.env)

```env
VITE_API_URL=https://your-backend-api.com
VITE_RAZORPAY_KEY_ID=rzp_live_xxxxx
```

## 🚀 Deployment

### Backend Deployment (Render/Railway/AWS)

1. **Create MongoDB Atlas database**
   - Go to [MongoDB Atlas](https://www.mongodb.com/atlas)
   - Create a free cluster
   - Get connection string

2. **Deploy to Render:**
   ```bash
   # Build command
   npm install

   # Start command
   npm start
   ```

3. **Environment Variables to set:**
   - `NODE_ENV=production`
   - `MONGO_URI=<your-atlas-uri>`
   - `JWT_SECRET=<generate-random-string>`
   - `JWT_REFRESH_SECRET=<generate-random-string>`
   - `RAZORPAY_KEY_ID=<from-razorpay>`
   - `RAZORPAY_KEY_SECRET=<from-razorpay>`
   - `RAZORPAY_WEBHOOK_SECRET=<from-razorpay>`
   - `FRONTEND_URL=<your-frontend-url>`

### Frontend Deployment (Vercel/Netlify)

1. **Vercel:**
   ```bash
   # Install Vercel CLI
   npm i -g vercel

   # Deploy
   cd frontend
   vercel
   ```

2. **Build settings:**
   - Build Command: `npm run build`
   - Output Directory: `dist`

3. **Environment Variables:**
   - `VITE_API_URL=<your-backend-url>`
   - `VITE_RAZORPAY_KEY_ID=<your-razorpay-key>`

### Razorpay Webhook Setup

1. Go to [Razorpay Dashboard](https://dashboard.razorpay.com) → Settings → Webhooks
2. Add webhook URL: `https://your-backend.com/api/orders/webhook`
3. Select events:
   - `payment.captured`
   - `payment.failed`
   - `order.paid`
4. Copy webhook secret and add to backend env

## 🔒 Security Features

- **Password Hashing**: bcrypt with 12 rounds
- **JWT Authentication**: Access + Refresh token pattern
- **Rate Limiting**: 100 requests per 15 minutes
- **Helmet**: Security headers
- **CORS**: Configured for production
- **Input Validation**: Server-side validation
- **Payment Verification**: Server-side signature verification
- **Role-based Access**: Student/Partner/Admin roles

## 📝 API Endpoints

### Authentication
- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Canteens
- `GET /api/canteens` - List all canteens
- `GET /api/canteens/:id` - Get canteen
- `GET /api/canteens/:id/menu` - Get canteen menu

### Orders
- `POST /api/orders` - Create order
- `POST /api/orders/verify-payment` - Verify payment
- `GET /api/orders` - Get user's orders
- `GET /api/orders/:id` - Get order
- `POST /api/orders/:id/cancel` - Cancel order

### Partner
- `GET /api/partner/canteen` - Get my canteen
- `PUT /api/partner/canteen` - Update canteen
- `GET /api/partner/menu` - Get menu items
- `POST /api/partner/menu` - Add menu item
- `PUT /api/partner/orders/:id/status` - Update order status

### Admin
- `GET /api/admin/analytics` - Platform analytics
- `GET /api/admin/users` - List users
- `PUT /api/admin/users/:id` - Update user
- `PUT /api/admin/canteens/:id` - Approve canteen

## 🧪 Testing Payments

### Test Mode (Development)
When Razorpay keys are not configured, the app runs in development mode:
- Orders can be confirmed without real payment
- "DEV MODE" confirmation dialog appears

### Test Mode with Razorpay
1. Use Razorpay test keys (prefix: `rzp_test_`)
2. Test card: `4111 1111 1111 1111`
3. Any future expiry date
4. Any CVV

## 📞 Support

For issues or questions, please open an issue in the repository.

---

Built with ❤️ for campus food ordering
