# Authentication Implementation

This document describes the authentication system implemented in the Lynkby Dashboard app.

## Overview

The dashboard uses passwordless authentication with magic links, implemented as a client-side React application that communicates with the Lynkby API Worker.

## Architecture

### Frontend (Dashboard App)
- **Framework**: Next.js 14 with TypeScript
- **State Management**: React Context API for authentication state
- **Styling**: Tailwind CSS for responsive design
- **Routing**: Next.js file-based routing

### Backend (API Worker)
- **Framework**: Hono.js with TypeScript
- **Authentication**: JWT-based magic link system
- **Database**: PostgreSQL with Prisma ORM
- **Security**: Token hashing, rate limiting, event logging

## Authentication Flow

### 1. Login Request
```
User enters email → Dashboard sends POST to /v1/auth/request-link → API generates JWT magic link → Email sent
```

### 2. Magic Link Consumption
```
User clicks email link → Redirects to /auth/callback?token=... → Dashboard verifies token → Creates session → Redirects to dashboard
```

### 3. Session Management
```
Dashboard stores session token in localStorage → API validates token on each request → Sliding expiration (30 days)
```

## Key Components

### AuthContext (`src/contexts/AuthContext.tsx`)
- Manages authentication state across the app
- Provides login, logout, and session validation methods
- Handles token storage and API communication

### Login Page (`pages/login.tsx`)
- Email input form with validation
- Post-submit confirmation screen
- Error handling and user feedback

### Auth Callback (`pages/auth/callback.tsx`)
- Handles magic link verification
- Token exchange and session creation
- Error states with retry options

### Dashboard (`pages/dashboard.tsx`)
- Protected route requiring authentication
- User profile display and management
- Logout functionality in header

## Security Features

### Token Security
- JWT tokens with 15-minute expiration for magic links
- Session tokens with 30-day sliding expiration
- Tokens hashed before database storage
- HttpOnly cookies for session management

### Rate Limiting
- 5 magic link requests per hour per email
- 20 requests per hour per IP address
- Cooldown periods with user feedback

### Data Protection
- No plaintext tokens stored in database
- IP address and user agent tracking
- Comprehensive event logging
- Disposable email domain blocking

## Environment Configuration

### Required Environment Variables
```bash
# API Base URL for authentication
NEXT_PUBLIC_API_BASE="http://localhost:8787"

# Database connection
DATABASE_URL="postgresql://..."

# JWT Secret (configured in API Worker)
JWT_SECRET="your-secret-here"
```

## API Endpoints

### Authentication
- `POST /v1/auth/request-link` - Request magic link
- `GET /v1/auth/verify` - Verify magic link and create session
- `GET /v1/auth/validate` - Validate existing session
- `POST /v1/auth/logout` - Logout and revoke session

### Profile Management
- `GET /api/page/get` - Get user profile
- `POST /api/page/upsert` - Create/update profile
- `GET /api/username/check` - Check username availability

## Development Setup

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Configure Environment
```bash
cp .env.local.example .env.local
# Edit with your local configuration
```

### 3. Start Development Server
```bash
pnpm dev
# App runs on http://localhost:3001
```

### 4. API Worker
Ensure the API worker is running on `http://localhost:8787` with:
- Database connection configured
- JWT secret set
- Authentication routes enabled

## Testing Authentication

### 1. Login Flow
1. Navigate to `/login`
2. Enter email address
3. Submit form
4. Check confirmation screen
5. Verify email received

### 2. Magic Link Verification
1. Click magic link in email
2. Should redirect to `/auth/callback`
3. Verify token processing
4. Redirect to dashboard

### 3. Session Management
1. Check localStorage for session token
2. Verify API calls include Authorization header
3. Test logout functionality
4. Verify session cleanup

## Error Handling

### Common Error States
- **Invalid Email**: Form validation and user feedback
- **Rate Limited**: Cooldown timer and retry options
- **Expired Token**: Clear error message with resend option
- **Network Errors**: Retry mechanisms and fallback UI

### User Experience
- Loading states for all async operations
- Clear error messages with actionable steps
- Graceful fallbacks for edge cases
- Consistent error handling patterns

## Future Enhancements

### Planned Features
- Two-factor authentication support
- Social login integration
- Advanced session management
- Audit logging and analytics
- Multi-device session control

### Security Improvements
- Device fingerprinting
- Geographic restrictions
- Advanced threat detection
- Compliance reporting

## Troubleshooting

### Common Issues
1. **Magic link not received**: Check spam folder, verify email format
2. **Token verification fails**: Ensure API worker is running and configured
3. **Session not persisting**: Check localStorage and cookie settings
4. **CORS errors**: Verify API worker CORS configuration

### Debug Steps
1. Check browser console for errors
2. Verify environment variables
3. Test API endpoints directly
4. Check database connectivity
5. Review authentication logs

## Support

For authentication-related issues:
1. Check this documentation
2. Review API worker logs
3. Verify environment configuration
4. Test with known working setup
5. Contact development team
