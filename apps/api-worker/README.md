# Lynkby API

A high-performance, serverless API built with Cloudflare Workers, Hono.js, and Prisma.

## 🚨 **Security Notice**

**NEVER commit sensitive environment variables to version control!** 

This project contains sensitive configuration files that must be kept secure. See [SECURITY.md](./SECURITY.md) for detailed security guidelines.

## 🏗️ **Architecture**

- **Runtime**: Cloudflare Workers
- **Framework**: Hono.js
- **Database**: PostgreSQL with Prisma Accelerate
- **Authentication**: JWT with secure token handling
- **Monitoring**: Sentry integration for error tracking
- **Storage**: Cloudflare KV and R2

## 🚀 **Quick Start**

### 1. **Environment Setup**

```bash
# Copy the secure template
cp env.template .env.local

# Edit with your actual values
nano .env.local
```

### 2. **Wrangler Configuration**

```bash
# Copy the secure template
cp wrangler.template.toml wrangler.toml

# Edit with your actual values
nano wrangler.toml
```

### 3. **Install Dependencies**

```bash
pnpm install
```

### 4. **Database Setup**

```bash
# Run migrations
pnpm migrate

# Seed database (optional)
pnpm seed
```

### 5. **Development**

```bash
# Start development server
pnpm dev

# Build for production
pnpm build

# Deploy to Cloudflare
pnpm deploy
```

## 🔐 **Required Environment Variables**

### **Core Configuration**
```bash
NODE_ENV=development
APP_BASE=http://localhost:3001
REVALIDATE_SECRET=your-secret-here
```

### **Authentication**
```bash
JWT_SECRET=your-jwt-secret-must-be-at-least-32-characters
JWT_EXPIRES_IN=7d
```

### **Database**
```bash
DATABASE_URL=postgresql://username:password@host:port/database
DIRECT_URL=postgresql://username:password@host:port/database
```

### **External Services**
```bash
SENTRY_DSN=https://your-dsn@sentry.io/project-id
STRIPE_SECRET_KEY=sk_test_your_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
TIKTOK_CLIENT_KEY=your_client_key
TIKTOK_CLIENT_SECRET=your_client_secret
```

## 📁 **Project Structure**

```
src/
├── core/                 # Core utilities and configuration
│   ├── env.ts           # Environment validation
│   ├── sentry/          # Sentry integration
│   ├── db.ts            # Database connection
│   ├── errors.ts        # Error handling
│   └── middleware/      # Request middleware
├── routes/              # API route handlers
├── workers/             # Cloudflare Worker entry points
└── schemas/             # Zod validation schemas
```

## 🧪 **Testing**

### **Health Check**
```bash
curl http://localhost:8787/_health
```

### **Sentry Integration Test**
```bash
curl http://localhost:8787/debug-sentry
```

### **API Endpoints**
```bash
# Health check
GET /_health

# Detailed health check
GET /_health/detailed

# Readiness check
GET /_ready

# Debug Sentry (development only)
GET /debug-sentry
```

## 🔒 **Security Features**

- **Environment Validation**: Zod schemas validate all environment variables
- **Secret Masking**: Sensitive data is masked in logs
- **Secure Headers**: Automatic security headers via middleware
- **Rate Limiting**: Built-in rate limiting protection
- **Input Validation**: Comprehensive input validation with Zod

## 📊 **Monitoring**

### **Sentry Integration**
- Automatic error capture
- Performance monitoring
- Request context tracking
- User identification

### **Health Checks**
- Database connectivity
- External service status
- Response time monitoring
- Error rate tracking

## 🚀 **Deployment**

### **Development**
```bash
pnpm dev
```

### **Production**
```bash
# Build the project
pnpm build

# Deploy to Cloudflare
pnpm deploy
```

### **Environment Management**
```bash
# Set production secrets
wrangler secret put JWT_SECRET
wrangler secret put DATABASE_URL
wrangler secret put SENTRY_DSN
```

## 📚 **Documentation**

- [Security Guidelines](./SECURITY.md)
- [Database Setup](./DATABASE.md)
- [API Reference](./docs/API.md)
- [Deployment Guide](./docs/DEPLOYMENT.md)

## 🤝 **Contributing**

1. **Fork** the repository
2. **Create** a feature branch
3. **Follow** security guidelines
4. **Test** thoroughly
5. **Submit** a pull request

## 📄 **License**

This project is proprietary and confidential.

---

**Remember: Security first! Always check [SECURITY.md](./SECURITY.md) before making changes.**
