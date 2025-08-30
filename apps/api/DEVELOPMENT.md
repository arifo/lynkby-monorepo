# Development Guide

## 🚀 **Quick Start (Recommended)**

### **1. One-Command Setup**
```bash
# Run the interactive setup script
pnpm setup
```

This will:
- ✅ Create `.env.local` and `.dev.vars` from templates
- ✅ Prompt you for all environment variables
- ✅ Create `wrangler.toml` configuration
- ✅ Generate quick-start scripts
- ✅ Set up everything securely

### **2. Start Development**
```bash
# Quick start (recommended)
pnpm start

# Or manual start
pnpm dev
```

## 🔧 **Manual Setup (Alternative)**

### **1. Copy Templates**
```bash
# Environment variables
cp env.template .env.local
cp env.template .dev.vars

# Wrangler configuration
cp wrangler.template.toml wrangler.toml
```

### **2. Edit Configuration**
```bash
# Edit environment variables
nano .env.local

# Edit wrangler configuration
nano wrangler.toml
```

### **3. Start Development**
```bash
pnpm dev
```

## 📝 **Environment Variables**

### **Required Variables**
```bash
# Core
NODE_ENV=development
APP_API_BASE=http://localhost:3001
REVALIDATE_SECRET=your-secret-here

# Authentication
JWT_SECRET=your-jwt-secret-must-be-at-least-32-characters
JWT_EXPIRES_IN=7d

# Database
DATABASE_URL=postgresql://username:password@host:port/database
DIRECT_URL=postgresql://username:password@host:port/database
```

### **Optional Variables**
```bash
# Sentry (for error tracking)
SENTRY_DSN=https://your-dsn@sentry.io/project-id

# Stripe (for payments)
STRIPE_SECRET_KEY=sk_test_your_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# TikTok (for social integration)
TIKTOK_CLIENT_KEY=your_client_key
TIKTOK_CLIENT_SECRET=your_client_secret
```

## 🛠️ **Development Scripts**

### **Available Commands**
```bash
# Setup and validation
pnpm setup          # Interactive environment setup
pnpm validate       # Validate environment configuration
pnpm start          # Quick start development server

# Development
pnpm dev            # Start development server
pnpm build          # Build for production
pnpm migrate        # Run database migrations
pnpm seed           # Seed database with sample data

# Deployment
pnpm deploy         # Deploy to default environment
pnpm deploy:dev     # Deploy to development
pnpm deploy:prod    # Deploy to production
```

### **Quick Commands**
```bash
# Check environment status
pnpm validate

# Start development
pnpm start

# Edit environment variables
nano .env.local
```

## 🔍 **Environment Validation**

### **What Gets Checked**
- ✅ Required files exist (`.env.local`, `.dev.vars`, `wrangler.toml`)
- ✅ Git security (sensitive files are ignored)
- ✅ Environment variable status
- ✅ Configuration completeness

### **Run Validation**
```bash
pnpm validate
```

## 📁 **File Structure**

```
apps/api/
├── .env.local              # Your local environment (NEVER commit)
├── .dev.vars               # Wrangler development variables (NEVER commit)
├── wrangler.toml           # Wrangler configuration (NEVER commit)
├── env.template            # Environment template (safe to commit)
├── wrangler.template.toml  # Wrangler template (safe to commit)
├── dev-start.sh            # Quick start script
└── scripts/
    ├── dev-setup.sh        # Interactive setup script
    └── validate-env.sh     # Environment validation
```

## 🚨 **Security Reminders**

### **Never Commit These Files:**
- ❌ `.env.local`
- ❌ `.dev.vars`
- ❌ `wrangler.toml`

### **Safe to Commit:**
- ✅ `env.template`
- ✅ `wrangler.template.toml`
- ✅ `DEVELOPMENT.md`

## 🔄 **Updating Environment Variables**

### **Method 1: Edit Files**
```bash
# Edit environment variables
nano .env.local

# Edit wrangler variables
nano .dev.vars
```

### **Method 2: Re-run Setup**
```bash
# Interactive setup (will preserve existing values)
pnpm setup
```

### **Method 3: Use Wrangler Secrets (Production)**
```bash
# Set production secrets
wrangler secret put JWT_SECRET
wrangler secret put DATABASE_URL
wrangler secret put SENTRY_DSN
```

## 🧪 **Testing Your Setup**

### **Health Check**
```bash
curl http://localhost:8787/_health
```

### **Sentry Integration Test**
```bash
curl http://localhost:8787/debug-sentry
```

### **Environment Status**
```bash
pnpm validate
```

## 🆘 **Troubleshooting**

### **Common Issues**

1. **Port Already in Use**
   ```bash
   # Kill existing wrangler processes
   pkill -f "wrangler dev"
   
   # Or use different port
   pnpm dev -- --port 8788
   ```

2. **Environment Variables Not Loading**
   ```bash
   # Check if files exist
   ls -la .env.local .dev.vars wrangler.toml
   
   # Validate configuration
   pnpm validate
   ```

3. **Permission Denied**
   ```bash
   # Make scripts executable
   chmod +x scripts/*.sh
   chmod +x dev-start.sh
   ```

### **Get Help**
```bash
# Check environment status
pnpm validate

# View logs
tail -f ~/.wrangler/logs/wrangler-*.log

# Check wrangler version
wrangler --version
```

## 📚 **Additional Resources**

- [Security Guidelines](./SECURITY.md)
- [API Documentation](./README.md)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Wrangler CLI Docs](https://developers.cloudflare.com/workers/wrangler/)

---

**Happy coding! 🎉**
