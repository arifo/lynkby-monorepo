# Security Guidelines for Lynkby API

## 🚨 **CRITICAL: Never Commit Secrets to Version Control**

This document outlines the security measures and best practices for handling sensitive data in the Lynkby API project.

## 🔐 **Sensitive Environment Variables**

The following variables contain sensitive information and **MUST NEVER** be committed to Git:

### **Database Credentials**
- `DATABASE_URL` - PostgreSQL connection string with credentials
- `DIRECT_URL` - Direct database connection for migrations

### **Authentication Secrets**
- `JWT_SECRET` - Secret key for JWT token signing
- `REVALIDATE_SECRET` - Secret for Next.js revalidation

### **External Service Keys**
- `SENTRY_DSN` - Sentry error tracking configuration
- `STRIPE_SECRET_KEY` - Stripe payment processing secret
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook verification secret
- `TIKTOK_CLIENT_KEY` - TikTok API client key
- `TIKTOK_CLIENT_SECRET` - TikTok API client secret

## 📁 **Secure File Management**

### **Files to NEVER Commit:**
```
.env
.env.local
.env.production
.env.staging
.dev.vars
wrangler.toml
```

### **Files Safe to Commit:**
```
env.template
wrangler.template.toml
.env.example (with placeholder values)
```

## 🛡️ **Security Best Practices**

### 1. **Environment Variable Management**
```bash
# ✅ DO: Use .env.local for development
cp env.template .env.local
# Edit .env.local with your actual values

# ❌ DON'T: Never commit .env.local
git add .env.local  # This will expose your secrets!
```

### 2. **Wrangler Configuration**
```bash
# ✅ DO: Use wrangler.template.toml as a base
cp wrangler.template.toml wrangler.toml
# Edit wrangler.toml with your actual values

# ❌ DON'T: Never commit wrangler.toml
git add wrangler.toml  # This will expose your secrets!
```

### 3. **Development vs Production**
```bash
# Development: Use .env.local and .dev.vars
# Production: Use Cloudflare Dashboard or wrangler secret put
wrangler secret put JWT_SECRET
wrangler secret put DATABASE_URL
```

## 🔒 **Secret Rotation**

### **When to Rotate Secrets:**
- **Immediately** if any secret is exposed in Git history
- **Regularly** (every 90 days) for production secrets
- **After** team member departure
- **After** security incident

### **How to Rotate:**
1. Generate new secret values
2. Update environment files
3. Update Cloudflare secrets
4. Restart services
5. Invalidate old tokens/keys

## 🚨 **Emergency Procedures**

### **If Secrets Are Exposed:**

1. **IMMEDIATELY** rotate all exposed secrets
2. **Remove** exposed files from Git history:
   ```bash
   git filter-branch --force --index-filter \
     'git rm --cached --ignore-unmatch apps/api/.env.local' \
     --prune-empty --tag-name-filter cat -- --all
   ```
3. **Force push** to remove from remote:
   ```bash
   git push origin --force --all
   ```
4. **Notify** team and stakeholders
5. **Audit** all systems for unauthorized access
6. **Document** the incident and lessons learned

## 📋 **Security Checklist**

### **Before Committing:**
- [ ] No `.env*` files in staging area
- [ ] No `wrangler.toml` in staging area
- [ ] No `.dev.vars` in staging area
- [ ] No hardcoded secrets in code
- [ ] No secrets in documentation

### **Before Deploying:**
- [ ] All secrets are properly set in Cloudflare
- [ ] Environment variables are validated
- [ ] No secrets in build artifacts
- [ ] Security scanning completed

### **Regular Maintenance:**
- [ ] Review Git history for exposed secrets
- [ ] Rotate production secrets
- [ ] Update security documentation
- [ ] Review access permissions

## 🛠️ **Security Tools**

### **Pre-commit Hooks**
```bash
# Install pre-commit hooks
npm install --save-dev husky lint-staged

# Configure to check for secrets
npx husky add .husky/pre-commit "npx lint-staged"
```

### **Secret Scanning**
```bash
# Use GitGuardian or similar tools
# Scan for common secret patterns
# Monitor for accidental commits
```

## 📚 **Additional Resources**

- [Cloudflare Workers Security](https://developers.cloudflare.com/workers/platform/security/)
- [OWASP Security Guidelines](https://owasp.org/www-project-top-ten/)
- [GitHub Security Best Practices](https://docs.github.com/en/github/authenticating-to-github/keeping-your-account-and-data-secure)

## 🆘 **Security Contacts**

If you discover a security vulnerability:

1. **DO NOT** create a public issue
2. **Email** security@lynkby.com (if available)
3. **Contact** the project maintainer directly
4. **Follow** responsible disclosure guidelines

---

**Remember: Security is everyone's responsibility. When in doubt, ask before committing!**
