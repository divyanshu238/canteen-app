# 🚀 Canteen Connect - Production Deployment Checklist

## ✅ Pre-Deployment Checklist

### Backend Security
- [x] Helmet security headers enabled
- [x] Rate limiting configured (100 requests/15 min)
- [x] CORS restricted in production
- [x] JWT authentication enforced
- [x] Role-based authorization implemented
- [x] Password hashing with bcrypt (12 rounds)
- [x] Environment variables for all secrets
- [x] Fail-fast on missing required env vars
- [x] Dev-confirm route disabled in production
- [x] No secrets logged

### Payment Security
- [x] Server-side order creation
- [x] Server-side price calculation
- [x] Razorpay signature verification
- [x] Webhook signature verification
- [x] Ownership validation before payment
- [x] Duplicate payment prevention

### Database
- [x] MongoDB Atlas connection
- [x] Proper indexing on collections
- [x] Connection pooling configured
- [x] Graceful disconnect on shutdown

### Error Handling
- [x] Global error handler
- [x] Custom AppError class
- [x] Production-safe error responses
- [x] Uncaught exception handling
- [x] Unhandled rejection handling

---

## 📋 Deployment Steps

### 1. MongoDB Atlas Setup
```
1. Create cluster at https://cloud.mongodb.com
2. Create database user
3. Whitelist IPs (or 0.0.0.0/0 for Render)
4. Get connection string
```

### 2. Razorpay Setup
```
1. Complete KYC at https://dashboard.razorpay.com
2. Enable Live mode
3. Generate API keys (Settings > API Keys)
4. Configure webhook: /api/orders/webhook
   - Events: payment.captured, payment.failed, order.paid
```

### 3. Generate Secure Secrets
```bash
# Generate 64-character random strings
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"
node -e "console.log('JWT_REFRESH_SECRET=' + require('crypto').randomBytes(64).toString('hex'))"
```

### 4. Backend Environment Variables (Render/Railway/AWS)
```env
NODE_ENV=production
PORT=5000
MONGO_URI=mongodb+srv://...
JWT_SECRET=<generated-64-char-string>
JWT_REFRESH_SECRET=<generated-64-char-string>
RAZORPAY_KEY_ID=rzp_live_...
RAZORPAY_KEY_SECRET=<your-secret>
RAZORPAY_WEBHOOK_SECRET=<your-webhook-secret>
FRONTEND_URL=https://your-frontend.vercel.app
CORS_ORIGINS=https://your-frontend.vercel.app
```

### 5. Frontend Environment Variables (Vercel)
```env
VITE_API_URL=https://your-backend.onrender.com
VITE_RAZORPAY_KEY_ID=rzp_live_...
```

### 6. Post-Deployment
```bash
# Create admin account
curl -X POST https://your-backend/api/admin/setup \
  -H "Content-Type: application/json" \
  -d '{"name":"Admin","email":"admin@example.com","password":"SecurePassword123"}'
```

---

## 🔒 Production Security Verification

| Item | Command | Expected |
|------|---------|----------|
| Health check | `curl /api/health` | 200 OK |
| Auth required | `curl /api/orders` | 401 Unauthorized |
| Admin protected | `curl /api/admin/users` | 401 Unauthorized |
| Dev route blocked | `curl -X POST /api/orders/dev-confirm` | 404 Not Found |
| CORS | Check browser console | No CORS errors |

---

## 📊 Monitoring Endpoints

- Health: `GET /api/health`
- Admin Analytics: `GET /api/admin/analytics` (requires admin token)

---

## ⚠️ Important Notes

1. **Never expose secrets** - All secrets should be environment variables
2. **Use HTTPS only** - Backend and frontend must use HTTPS in production
3. **Monitor rate limits** - Adjust based on traffic patterns
4. **Regular backups** - Configure MongoDB Atlas automatic backups
5. **Log monitoring** - Set up log aggregation for debugging

---

## 🆘 Troubleshooting

### Backend won't start
- Check MONGO_URI is correct
- Verify all required env vars are set
- Check Render/Railway logs

### Payments failing
- Verify using LIVE keys (not test)
- Check webhook URL is accessible
- Verify webhook secret matches

### CORS errors
- Update CORS_ORIGINS with exact frontend URL
- No trailing slashes in URLs

### Socket.IO not connecting
- Verify backend URL correct
- Check for WebSocket support in hosting
