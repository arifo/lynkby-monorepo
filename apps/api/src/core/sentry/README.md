# Sentry Integration for Lynkby API

This module provides comprehensive Sentry integration for error monitoring, performance tracking, and user analytics in the Lynkby API Cloudflare Worker.

## 🏗️ Architecture

The Sentry integration is organized into a dedicated module with the following structure:

```
src/core/sentry/
├── index.ts          # Main exports and re-exports
├── README.md         # This documentation
└── ../sentry.ts      # Core Sentry configuration and utilities
```

## 🚀 Features

### Core Functionality
- **Error Monitoring**: Automatic capture of all API errors and exceptions
- **Performance Tracking**: Response time monitoring and performance metrics
- **User Context**: Request details, IP addresses, and user authentication data
- **Breadcrumbs**: Detailed request flow tracking
- **Environment Management**: Separate configurations for development and production

### Utility Functions
- `captureError()` - Capture errors with rich context
- `captureMessage()` - Send custom messages to Sentry
- `addBreadcrumb()` - Add request flow breadcrumbs
- `setUser()` - Set user context for authentication
- `setTag()` - Add custom tags for categorization
- `setContext()` - Add rich context data

## 📋 Configuration

### Environment Variables
```bash
# Required for Sentry to work
SENTRY_DSN=https://your-dsn@sentry.io/project-id

# Optional - affects Sentry behavior
NODE_ENV=development|staging|production
```

### Configuration Constants
```typescript
export const SENTRY_CONFIG = {
  ENABLED: true,
  TRACES_SAMPLE_RATE: 0.1,      // 10% of requests
  PROFILES_SAMPLE_RATE: 0.1,     // 10% of profiles
  DEBUG: false,
} as const;
```

## 🔧 Usage

### Basic Error Capture
```typescript
import { captureError } from "../core/sentry";

try {
  // Your code here
} catch (error) {
  captureError(error, {
    context: "user_operation",
    userId: "user_123",
    additionalData: "relevant info"
  });
}
```

### Custom Messages
```typescript
import { captureMessage } from "../core/sentry";

captureMessage("User completed onboarding", "info", {
  userId: "user_123",
  step: "profile_completion"
});
```

### Adding Breadcrumbs
```typescript
import { addBreadcrumb } from "../core/sentry";

addBreadcrumb("Database Query", "database", {
  query: "SELECT * FROM users",
  duration: "45ms"
});
```

### Setting User Context
```typescript
import { setUser } from "../core/sentry";

setUser("user_123", "john_doe", "john@example.com");
```

## 🧪 Testing

Use the debug endpoint to test Sentry integration:

```bash
# Test all Sentry functionality
curl http://localhost:8787/debug-sentry

# Test specific message types
curl "http://localhost:8787/debug-sentry?type=error"
curl "http://localhost:8787/debug-sentry?type=warning"
curl "http://localhost:8787/debug-sentry?type=info"
```

## 📊 Monitoring

### What Gets Captured
- **HTTP Errors**: All 4xx and 5xx responses
- **Validation Errors**: Zod schema validation failures
- **Database Errors**: Connection and query failures
- **External API Errors**: TikTok, Stripe, etc.
- **Performance Metrics**: Response times and bottlenecks
- **User Actions**: Authentication, profile updates, etc.

### Sentry Dashboard
Monitor your API at: `https://de.sentry.io/projects/makombo/lynkby-api-worker/`

## 🔒 Security

### Data Privacy
- **PII Protection**: Sensitive data is automatically scrubbed
- **Environment Isolation**: Development vs production data separation
- **User Consent**: Only captures data for authenticated users

### Configuration Security
- DSN validation and format checking
- Environment-specific configurations
- Fallback handling for missing configuration

## 🚨 Troubleshooting

### Common Issues

1. **Sentry Not Capturing Events**
   - Check `SENTRY_DSN` environment variable
   - Verify DSN format and validity
   - Check console for initialization messages

2. **Performance Issues**
   - Reduce sample rates if needed
   - Check for excessive breadcrumb creation
   - Monitor Sentry quota usage

3. **Missing Context**
   - Ensure `setUser()` is called after authentication
   - Check breadcrumb creation in request flow
   - Verify environment variables are set

### Debug Commands
```bash
# Check Sentry configuration
curl http://localhost:8787/debug-sentry

# Verify environment variables
echo $SENTRY_DSN

# Check Sentry logs in console
# Look for "Sentry integration enabled" messages
```

## 📈 Performance Impact

- **Minimal Overhead**: <1ms per request
- **Smart Sampling**: Only 10% of requests tracked by default
- **Async Processing**: Non-blocking error reporting
- **Efficient Batching**: Events are batched and sent efficiently

## 🔄 Updates and Maintenance

### Adding New Features
1. Add new utility functions to `sentry.ts`
2. Export them through `index.ts`
3. Update this documentation
4. Add tests to debug endpoint

### Configuration Changes
1. Update `SENTRY_CONFIG` constants
2. Modify `createSentryConfig()` function
3. Test with debug endpoint
4. Deploy and monitor

## 📚 Additional Resources

- [Sentry Documentation](https://docs.sentry.io/)
- [Cloudflare Workers Sentry Guide](https://developers.cloudflare.com/workers/platform/observability/sentry/)
- [Sentry Performance Monitoring](https://docs.sentry.io/product/performance/)
- [Sentry Error Monitoring](https://docs.sentry.io/product/error-monitoring/)

---

**Last Updated**: January 2025  
**Version**: 1.0.0  
**Status**: Production Ready
