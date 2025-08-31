# Lynkby Dashboard

A modern, responsive dashboard for managing Lynkby links, analytics, and bio pages.

## 🚀 Quick Start

### 1. Environment Setup

Create a `.env.local` file in the dashboard directory:

```bash
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8787

# App Configuration
NEXT_PUBLIC_APP_NAME=Lynkby
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Start Development Server

```bash
pnpm dev
```

The dashboard will be available at `http://localhost:3001`

## 🔐 Authentication Flow

The dashboard uses a magic link authentication system powered by the Lynkby API worker:

### Flow Overview

1. **Login Request**: User enters email on `/login` page
2. **Magic Link**: API sends magic link email via Resend
3. **Email Verification**: User clicks link in email
4. **Session Creation**: API creates secure session with HttpOnly cookie
5. **Username Setup**: First-time users set username on `/setup-username` page
6. **Dashboard Access**: Authenticated users access protected dashboard

### Key Features

- **Passwordless**: No passwords to remember or manage
- **Secure**: HttpOnly cookies prevent XSS attacks
- **Automatic**: Sessions auto-refresh and extend
- **Protected Routes**: Automatic redirects for unauthenticated users

## 📁 Project Structure

```
src/
├── app/                    # Next.js app router
│   ├── dashboard/         # Protected dashboard page
│   ├── login/            # Authentication page
│   ├── setup-username/   # Username setup for new users
│   └── layout.tsx        # Root layout with auth provider
├── components/            # Reusable UI components
│   ├── ui/               # Base UI components (shadcn)
│   └── auth/             # Authentication components
├── lib/                   # Utility libraries
│   ├── api.ts            # API client configuration
│   ├── auth.ts           # Authentication utilities
│   ├── auth-context.tsx  # React auth context
│   └── store.ts          # Zustand auth store
```

## 🔧 API Integration

The dashboard connects to the Lynkby API worker running on port 8787:

### Authentication Endpoints

- `POST /v1/auth/request-link` - Request magic link
- `GET /v1/auth/verify?token=...` - Verify magic link
- `GET /v1/auth/me` - Get current user
- `POST /v1/auth/setup-username` - Set username for new users
- `POST /v1/auth/logout` - Logout and clear session

### Features

- **Cookie-based Auth**: Automatic session management
- **Error Handling**: Graceful fallbacks and user feedback
- **Rate Limiting**: Built-in protection against abuse
- **Real-time Updates**: Automatic auth state synchronization

## 🛡️ Security Features

- **HttpOnly Cookies**: Prevents XSS token theft
- **CSRF Protection**: Built-in CSRF safeguards
- **Secure Headers**: Automatic security headers
- **Input Validation**: Zod schema validation
- **Rate Limiting**: Protection against brute force attacks

## 🎨 UI Components

Built with modern design principles:

- **Tailwind CSS**: Utility-first styling
- **shadcn/ui**: High-quality component library
- **Responsive Design**: Mobile-first approach
- **Dark Mode Ready**: Built-in theme support
- **Accessibility**: WCAG compliant components

## 🚀 Development

### Available Scripts

```bash
pnpm dev          # Start development server
pnpm build        # Build for production
pnpm start        # Start production server
pnpm lint         # Run ESLint
pnpm type-check   # Run TypeScript checks
```

### Development Workflow

1. **API Worker**: Ensure API worker is running on port 8787
2. **Environment**: Set up `.env.local` with correct API URL
3. **Database**: Ensure database is accessible via API worker
4. **Email**: Configure Resend API key for magic link emails

## 🔄 State Management

Uses Zustand for lightweight state management:

- **Auth State**: User authentication and session data
- **Persistence**: Automatic state persistence across sessions
- **Real-time**: Automatic synchronization with API
- **Type Safety**: Full TypeScript support

## 📱 Responsive Design

- **Mobile First**: Optimized for mobile devices
- **Breakpoints**: Responsive grid layouts
- **Touch Friendly**: Optimized touch interactions
- **Progressive Enhancement**: Works without JavaScript

## 🧪 Testing

```bash
pnpm test         # Run unit tests
pnpm test:watch   # Run tests in watch mode
pnpm test:coverage # Generate coverage report
```

## 🚀 Deployment

### Vercel (Recommended)

1. Connect GitHub repository
2. Set environment variables
3. Deploy automatically on push

### Manual Deployment

```bash
pnpm build
pnpm start
```

## 🔗 Related Projects

- **API Worker**: Backend authentication and API endpoints
- **Web App**: Public marketing site
- **Worker**: Wildcard routing for user pages

## 📚 Documentation

- [API Documentation](../api-worker/docs/)
- [Authentication Guide](../api-worker/docs/SECURITY.md)
- [Database Schema](../api-worker/docs/DATABASE.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is proprietary and confidential.
