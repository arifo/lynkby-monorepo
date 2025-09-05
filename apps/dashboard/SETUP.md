# Dashboard Authentication Setup Guide

This guide will help you set up the Lynkby dashboard with working authentication.

## 🚀 Prerequisites

1. **API Worker Running**: Ensure the API worker is running on port 8787
2. **Database Setup**: Database should be accessible via the API worker
3. **Environment Variables**: Configure necessary environment variables

## 🔧 Step-by-Step Setup

### 1. Start the API Worker

```bash
cd apps/api-worker
pnpm dev
```

The API worker should start on `http://localhost:8787`

### 2. Configure Dashboard Environment

Create `.env.local` in the dashboard directory:

```bash
cd apps/dashboard
cp .env.local.example .env.local
# Edit .env.local with your values
```

Required variables:
```bash
NEXT_PUBLIC_API_URL=http://localhost:8787
NEXT_PUBLIC_APP_NAME=Lynkby
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

### 3. Start the Dashboard

```bash
cd apps/dashboard
pnpm dev
```

The dashboard should start on `http://localhost:3001`

### 4. Test the Setup

```bash
# Test authentication endpoints
pnpm test-auth

# Or manually test:
curl http://localhost:8787/_health
curl http://localhost:3001
```

## 🔐 Authentication Flow Testing

### Manual Testing

1. **Open Dashboard**: Navigate to `http://localhost:3001`
2. **Click Login**: Go to `/login` page
3. **Enter Email**: Use a real email address
4. **Check Email**: Look for OTP code (if email service configured)
5. **Enter Code**: Verify authentication works
6. **Setup Username**: Complete first-time user flow
7. **Access Dashboard**: Verify protected routes work

### Expected Behavior

- ✅ Dashboard loads without authentication
- ✅ Login page accessible
- ✅ Magic link request sent (if email configured)
- ✅ Authentication redirects work
- ✅ Protected routes require authentication
- ✅ Username setup for new users
- ✅ Logout clears session

## 🚨 Common Issues

### API Worker Not Accessible

```bash
# Check if worker is running
curl http://localhost:8787/_health

# Check worker logs
cd apps/api-worker
pnpm dev
```

### Dashboard Port Conflict

```bash
# Check what's using port 3001
lsof -i :3001

# Kill conflicting process
kill -9 <PID>
```

### CORS Issues

Ensure the API worker CORS configuration includes:
```typescript
origin: [
  "http://localhost:3000",
  "http://localhost:3001" // Dashboard port
]
```

### Database Connection

Check database connectivity:
```bash
cd apps/api-worker
pnpm db:status
```

## 📧 Email Service Setup

For OTP emails to work, configure email service:

### Resend (Recommended)

1. Get API key from [resend.com](https://resend.com)
2. Add to API worker environment:
   ```bash
   RESEND_API_KEY=re_xxxxx
   EMAIL_FROM=noreply@yourdomain.com
   ```
3. Restart API worker

### Development Mode

Without email service, OTP codes will be logged to console:
```bash
# Check API worker console for OTP codes
cd apps/api-worker
pnpm dev
```

## 🔍 Debugging

### Check API Worker Logs

```bash
cd apps/api-worker
pnpm dev
# Look for authentication-related logs
```

### Check Dashboard Logs

```bash
cd apps/dashboard
pnpm dev
# Look for auth context logs
```

### Browser Developer Tools

1. Open browser dev tools
2. Check Network tab for API calls
3. Check Console for errors
4. Check Application tab for cookies

### Test Individual Endpoints

```bash
# Health check
curl http://localhost:8787/_health

# Auth info
curl http://localhost:8787/v1/auth

# Magic link request
curl -X POST http://localhost:8787/v1/auth/request-link \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

## ✅ Verification Checklist

- [ ] API worker running on port 8787
- [ ] Dashboard running on port 3001
- [ ] Database accessible via API worker
- [ ] Environment variables configured
- [ ] CORS properly configured
- [ ] Authentication endpoints responding
- [ ] Magic link flow working
- [ ] Protected routes requiring auth
- [ ] Username setup for new users
- [ ] Logout clearing sessions

## 🆘 Getting Help

If you encounter issues:

1. Check the logs for both API worker and dashboard
2. Verify all prerequisites are met
3. Test individual endpoints manually
4. Check browser developer tools
5. Review this setup guide
6. Check the main README for additional details

## 🔗 Related Documentation

- [API Worker Documentation](../api-worker/README.md)
- [Database Setup](../api-worker/docs/DATABASE.md)
- [Security Guidelines](../api-worker/docs/SECURITY.md)
- [Development Guide](../api-worker/docs/DEVELOPMENT.md)
