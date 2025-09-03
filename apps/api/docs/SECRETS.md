# Secrets Management for @lynkby/api

This document explains how to manage secrets and environment variables for the Lynkby API application.

## Overview

The API uses Cloudflare Workers' secret management system to securely store sensitive data like API keys, database credentials, and JWT secrets. Non-sensitive configuration is stored in environment variables.

## Environment Structure

- **Production**: `wrangler.prod.jsonc` - Live production environment
- **Staging**: `wrangler.staging.jsonc` - Pre-production testing environment  
- **Development**: `wrangler.dev.jsonc` - Cloud-based development environment
- **Local**: `wrangler.local.jsonc` - Local development environment

## Required Secrets

### Core Authentication
- `JWT_SECRET` - JWT signing secret (minimum 32 characters)
- `REVALIDATE_SECRET` - Secret for cache revalidation

### Database
- `DATABASE_URL` - Primary database connection URL
- `DIRECT_URL` - Direct database URL for Prisma Accelerate

### External Services
- `SENTRY_DSN` - Sentry error tracking DSN
- `STRIPE_SECRET_KEY` - Stripe API secret key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook signing secret
- `TIKTOK_CLIENT_KEY` - TikTok API client key
- `TIKTOK_CLIENT_SECRET` - TikTok API client secret
- `RESEND_API_KEY` - Resend email service API key

## Setting Secrets

### Using Wrangler CLI

```bash
# Set a secret for production
wrangler secret put JWT_SECRET --env production

# Set a secret for staging
wrangler secret put JWT_SECRET --env staging

# Set a secret for development
wrangler secret put JWT_SECRET --env development

# Set a secret for local development
wrangler secret put JWT_SECRET --env local
```

### Bulk Secret Setting

```bash
# Set all required secrets for production
wrangler secret put JWT_SECRET --env production
wrangler secret put REVALIDATE_SECRET --env production
wrangler secret put SENTRY_DSN --env production
wrangler secret put DATABASE_URL --env production
wrangler secret put DIRECT_URL --env production
wrangler secret put STRIPE_SECRET_KEY --env production
wrangler secret put STRIPE_WEBHOOK_SECRET --env production
wrangler secret put TIKTOK_CLIENT_KEY --env production
wrangler secret put TIKTOK_CLIENT_SECRET --env production
wrangler secret put RESEND_API_KEY --env production
```

## Environment Variables (Non-sensitive)

These are stored in the `vars` section of each wrangler configuration:

- `NODE_ENV` - Environment name (development, staging, production)
- `APP_BASE` - Base URL for the application
- `JWT_EXPIRES_IN` - JWT token expiration time
- `EMAIL_FROM` - Default sender email address
- `SUPPORT_EMAIL` - Support contact email
- `APP_NAME` - Application display name

## Development Setup

### Local Development

1. **Start local database** (if using local PostgreSQL):
   ```bash
   # Using Docker
   docker run --name lynkby-postgres -e POSTGRES_PASSWORD=123456 -e POSTGRES_DB=lynkby_dev -p 5432:5432 -d postgres:15
   ```

2. **Set local secrets**:
   ```bash
   # Set development secrets
   wrangler secret put JWT_SECRET --env local
   # Enter: your-local-jwt-secret-must-be-at-least-32-characters-long
   
   wrangler secret put DATABASE_URL --env local
   # Enter: postgresql://postgres:123456@localhost:5432/lynkby_dev?sslmode=require
   
   # Set other required secrets...
   ```

3. **Start development server**:
   ```bash
   pnpm dev
   ```

### Cloud Development

1. **Set development secrets**:
   ```bash
   wrangler secret put JWT_SECRET --env development
   # Enter your development JWT secret
   
   # Set other required secrets...
   ```

2. **Deploy to development**:
   ```bash
   pnpm deploy:dev
   ```

## Deployment Commands

```bash
# Deploy to local development
pnpm dev

# Deploy to development environment
pnpm deploy:dev

# Deploy to staging environment
pnpm deploy:staging

# Deploy to production environment
pnpm deploy:prod
```

## Security Best Practices

1. **Never commit secrets** to version control
2. **Use different secrets** for each environment
3. **Rotate secrets regularly** in production
4. **Use strong JWT secrets** (minimum 32 characters)
5. **Monitor secret usage** through Cloudflare dashboard
6. **Use least privilege** - only grant necessary permissions

## Troubleshooting

### Common Issues

1. **Missing secrets error**:
   ```
   Error: JWT_SECRET is required
   ```
   Solution: Set the missing secret using `wrangler secret put`

2. **Invalid JWT secret**:
   ```
   Error: JWT secret must be at least 32 characters
   ```
   Solution: Use a longer, more secure JWT secret

3. **Database connection failed**:
   ```
   Error: Database connection failed
   ```
   Solution: Verify DATABASE_URL secret is correct and database is accessible

### Checking Current Secrets

```bash
# List all secrets for an environment
wrangler secret list --env production

# Check if a specific secret exists
wrangler secret list --env production | grep JWT_SECRET
```

## Environment-Specific Notes

### Production
- Use live API keys and production database
- Enable all monitoring and observability
- Use strong, unique secrets
- Regular security audits

### Staging
- Use test API keys and staging database
- Mirror production configuration
- Test secret rotation procedures

### Development
- Use test API keys and development database
- Enable debugging and detailed logging
- Safe for experimentation

### Local
- Use local database when possible
- Minimal external service dependencies
- Fast development iteration

## Migration from Old Configuration

If migrating from the old configuration with secrets in `vars`:

1. **Extract secrets** from the old `vars` section
2. **Set them as secrets** using `wrangler secret put`
3. **Remove sensitive data** from `vars` section
4. **Test deployment** to ensure everything works
5. **Update CI/CD** to use new secret management

## Support

For issues with secret management:
1. Check Cloudflare Workers documentation
2. Verify wrangler CLI version
3. Check environment-specific configuration
4. Contact the development team
