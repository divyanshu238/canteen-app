---
description: How to deploy the canteen app to production
---

# Deploying Canteen Connect to Production

## Prerequisites
- MongoDB Atlas account (free tier works)
- Razorpay account with live mode enabled
- Vercel account (for frontend)
- Render/Railway/AWS account (for backend)

## Step 1: Set up MongoDB Atlas

1. Go to https://www.mongodb.com/atlas
2. Create a free cluster
3. Create a database user with read/write permissions
4. Whitelist IP addresses (or allow all IPs for Render/Railway)
5. Get the connection string (mongodb+srv://...)

## Step 2: Set up Razorpay

1. Go to https://dashboard.razorpay.com
2. Complete KYC for live mode
3. Go to Settings > API Keys
4. Generate Live keys (not test keys)
5. Note down:
   - Key ID (starts with rzp_live_)
   - Key Secret
6. Go to Settings > Webhooks
7. Add webhook URL: `https://your-backend-url/api/orders/webhook`
8. Select events: payment.captured, payment.failed, order.paid
9. Note down the Webhook Secret

## Step 3: Deploy Backend

### Using Render

1. Go to https://dashboard.render.com
2. Click "New +" > "Web Service"
3. Connect your GitHub repository
4. Configure:
   - Name: canteen-api
   - Region: closest to users
   - Branch: main
   - Root Directory: backend
   - Runtime: Node
   - Build Command: `npm install`
   - Start Command: `npm start`

5. Add Environment Variables:
   ```
   NODE_ENV=production
   PORT=5000
   MONGO_URI=<your-atlas-connection-string>
   JWT_SECRET=<generate-64-char-random-string>
   JWT_REFRESH_SECRET=<generate-64-char-random-string>
   RAZORPAY_KEY_ID=<your-live-key-id>
   RAZORPAY_KEY_SECRET=<your-key-secret>
   RAZORPAY_WEBHOOK_SECRET=<your-webhook-secret>
   FRONTEND_URL=https://your-frontend.vercel.app
   CORS_ORIGINS=https://your-frontend.vercel.app
   ```

6. Click "Create Web Service"
7. Wait for deployment to complete
8. Note down the service URL (e.g., https://canteen-api.onrender.com)

// turbo
### Generate Secure Keys
```powershell
# Generate JWT secrets (run in any terminal)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## Step 4: Deploy Frontend

### Using Vercel

1. Go to https://vercel.com
2. Click "Add New" > "Project"
3. Import your GitHub repository
4. Configure:
   - Framework Preset: Vite
   - Root Directory: frontend
   - Build Command: `npm run build`
   - Output Directory: `dist`

5. Add Environment Variables:
   ```
   VITE_API_URL=https://your-backend-url.onrender.com
   VITE_RAZORPAY_KEY_ID=<your-live-razorpay-key-id>
   ```

6. Click "Deploy"
7. Wait for deployment
8. Note down the deployment URL

## Step 5: Update Backend CORS

After frontend is deployed:
1. Go back to Render dashboard
2. Update environment variable:
   ```
   FRONTEND_URL=https://your-actual-frontend-url.vercel.app
   CORS_ORIGINS=https://your-actual-frontend-url.vercel.app
   ```
3. Redeploy

## Step 6: Create Admin Account

After backend is deployed:

```bash
# Using curl
curl -X POST https://your-backend-url/api/admin/setup \
  -H "Content-Type: application/json" \
  -d '{"name":"Admin","email":"admin@yourdomain.com","password":"your-secure-password"}'
```

## Step 7: Verify Deployment

1. Visit your frontend URL
2. Register as a new student
3. Login as admin and approve any pending canteens
4. Create a test order
5. Verify payment flow works

## Troubleshooting

### Backend not starting
- Check logs in Render dashboard
- Verify MongoDB connection string is correct
- Ensure all environment variables are set

### Frontend API calls failing
- Check CORS is configured correctly
- Verify VITE_API_URL doesn't have trailing slash
- Check browser console for errors

### Payments not working
- Ensure using LIVE keys (not test)
- Verify webhook URL is accessible
- Check webhook signatures in logs

### WebSocket not connecting
- Render/Railway support WebSockets by default
- Verify socket URL matches API URL
