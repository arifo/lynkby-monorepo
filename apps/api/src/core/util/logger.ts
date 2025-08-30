import * as Sentry from "@sentry/cloudflare";

export interface LogContext {
  requestId?: string;
  userId?: string;
  username?: string;
  ip?: string;
  userAgent?: string;
  method?: string;
  path?: string;
  duration?: number;
}

export interface LogLevel {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  context?: LogContext;
  data?: Record<string, unknown>;
  error?: Error;
}

// Sentry configuration constants
const SENTRY_CONFIG = {
  ENABLED: true,
  ENVIRONMENT: typeof process !== 'undefined' ? process.env.NODE_ENV || 'development' : 'development',
  TRACES_SAMPLE_RATE: 0.1,
  PROFILES_SAMPLE_RATE: 0.1,
} as const;

class Logger {
  private requestId: string | null = null;
  private context: LogContext = {};

  constructor() {
    this.initializeSentry();
  }

  // Initialize Sentry if enabled
  private initializeSentry(): void {
    if (SENTRY_CONFIG.ENABLED && typeof Sentry !== 'undefined') {
      try {
        // Note: Sentry.init is typically called at the application level
        // This is just a placeholder for configuration
        console.log('Sentry integration enabled');
      } catch (error) {
        console.warn('Failed to initialize Sentry:', error);
      }
    }
  }

  // Set request context for this request
  setContext(context: Partial<LogContext>): void {
    this.context = { ...this.context, ...context };
  }

  // Generate a unique request ID
  generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Set request ID for this request
  setRequestId(requestId: string): void {
    this.requestId = requestId;
    this.context.requestId = requestId;
  }

  // Log with structured format
  private log(level: LogLevel['level'], message: string, data?: Record<string, unknown>, error?: Error): void {
    const timestamp = new Date().toISOString();
    const logEntry: LogLevel = {
      level,
      message,
      context: this.context,
      data,
      error,
    };

    // Format for console output
    const consoleMessage = this.formatConsoleMessage(timestamp, logEntry);
    
    // Output to console with appropriate level
    switch (level) {
      case 'debug':
        console.debug(consoleMessage);
        break;
      case 'info':
        console.info(consoleMessage);
        break;
      case 'warn':
        console.warn(consoleMessage);
        break;
      case 'error':
        console.error(consoleMessage);
        break;
    }

    // Send to Sentry for external logging
    this.sendToSentry(logEntry);
  }

  // Send log entry to Sentry
  private sendToSentry(logEntry: LogLevel): void {
    if (!SENTRY_CONFIG.ENABLED || typeof Sentry === 'undefined') {
      return;
    }

    try {
      const { level, message, context, data, error } = logEntry;

      // Set user context if available
      if (context?.userId) {
        Sentry.setUser({
          id: context.userId,
          username: context.username,
        });
      }

      // Set additional context
      if (context) {
        Sentry.setContext('request', {
          requestId: context.requestId,
          method: context.method,
          path: context.path,
          ip: context.ip,
          userAgent: context.userAgent,
          duration: context.duration,
        });
      }

      // Set extra data
      if (data && Object.keys(data).length > 0) {
        Sentry.setContext('data', data);
      }

      // Handle different log levels
      switch (level) {
        case 'error':
          if (error) {
            Sentry.captureException(error);
          } else {
            Sentry.captureMessage(message, 'error');
          }
          break;
        case 'warn':
          Sentry.captureMessage(message, 'warning');
          break;
        case 'info':
          Sentry.captureMessage(message, 'info');
          break;
        case 'debug':
          // Debug messages are typically not sent to Sentry
          break;
      }
    } catch (sentryError) {
      console.warn('Failed to send log to Sentry:', sentryError);
    }
  }

  // Format message for console output
  private formatConsoleMessage(timestamp: string, logEntry: LogLevel): string {
    const { level, message, context, data, error } = logEntry;
    
    let formatted = `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    
    if (context?.requestId) {
      formatted += ` [${context.requestId}]`;
    }
    
    if (context?.userId) {
      formatted += ` [user:${context.userId}]`;
    }
    
    if (context?.username) {
      formatted += ` [@${context.username}]`;
    }
    
    if (context?.method && context?.path) {
      formatted += ` [${context.method} ${context.path}]`;
    }
    
    if (context?.duration) {
      formatted += ` [${context.duration}ms]`;
    }
    
    if (data && Object.keys(data).length > 0) {
      formatted += ` | ${JSON.stringify(data)}`;
    }
    
    if (error) {
      formatted += ` | Error: ${error.message}`;
      if (error.stack) {
        formatted += `\nStack: ${error.stack}`;
      }
    }
    
    return formatted;
  }

  // Public logging methods
  debug(message: string, data?: Record<string, unknown>): void {
    this.log('debug', message, data);
  }

  info(message: string, data?: Record<string, unknown>): void {
    this.log('info', message, data);
  }

  warn(message: string, data?: Record<string, unknown>): void {
    this.log('warn', message, data);
  }

  error(message: string, data?: Record<string, unknown>, error?: Error): void {
    this.log('error', message, data, error);
  }

  // Log HTTP request
  logRequest(method: string, path: string, ip?: string, userAgent?: string): void {
    this.setContext({ method, path, ip, userAgent });
    this.info(`HTTP ${method} ${path}`, { ip, userAgent });
  }

  // Log HTTP response
  logResponse(statusCode: number, duration: number): void {
    this.setContext({ duration });
    const level = statusCode >= 400 ? 'warn' : 'info';
    this.log(level, `HTTP Response ${statusCode}`, { statusCode, duration });
  }

  // Log authentication events
  logAuth(event: string, userId?: string, username?: string): void {
    this.setContext({ userId, username });
    this.info(`Auth: ${event}`, { userId, username });
  }

  // Log API operations
  logAPI(operation: string, resource: string, data?: Record<string, unknown>): void {
    this.info(`API: ${operation} ${resource}`, data);
  }

  // Log cache operations
  logCache(operation: 'hit' | 'miss' | 'set' | 'delete', key: string, duration?: number): void {
    this.debug(`Cache ${operation}: ${key}`, { operation, key, duration });
  }

  // Log external service calls
  logExternalService(service: string, operation: string, duration?: number, success?: boolean): void {
    const level = success === false ? 'warn' : 'info';
    this.log(level, `External Service: ${service} ${operation}`, { service, operation, duration, success });
  }

  // Sentry-specific methods
  setSentryUser(userId: string, username?: string, email?: string): void {
    if (SENTRY_CONFIG.ENABLED && typeof Sentry !== 'undefined') {
      try {
        Sentry.setUser({
          id: userId,
          username,
          email,
        });
      } catch (error) {
        console.warn('Failed to set Sentry user:', error);
      }
    }
  }

  setSentryTag(key: string, value: string): void {
    if (SENTRY_CONFIG.ENABLED && typeof Sentry !== 'undefined') {
      try {
        Sentry.setTag(key, value);
      } catch (error) {
        console.warn('Failed to set Sentry tag:', error);
      }
    }
  }

  setSentryContext(name: string, context: Record<string, unknown>): void {
    if (SENTRY_CONFIG.ENABLED && typeof Sentry !== 'undefined') {
      try {
        Sentry.setContext(name, context);
      } catch (error) {
        console.warn('Failed to set Sentry context:', error);
      }
    }
  }

  // Capture performance metrics
  capturePerformanceMetric(name: string, value: number, unit: string = 'ms'): void {
    if (SENTRY_CONFIG.ENABLED && typeof Sentry !== 'undefined') {
      try {
        // Note: Sentry metrics API may vary by version
        // This is a placeholder for performance tracking
        console.log(`Performance metric: ${name} = ${value}${unit}`);
      } catch (error) {
        console.warn('Failed to capture performance metric:', error);
      }
    }
  }

  // Flush Sentry events (useful for serverless environments)
  async flushSentry(): Promise<void> {
    if (SENTRY_CONFIG.ENABLED && typeof Sentry !== 'undefined') {
      try {
        await Sentry.flush(2000); // Wait up to 2 seconds
      } catch (error) {
        console.warn('Failed to flush Sentry:', error);
      }
    }
  }
}

// Create singleton logger instance
export const logger = new Logger();

// Export individual methods for convenience
export const { 
  debug, 
  info, 
  warn, 
  error, 
  logRequest, 
  logResponse, 
  logAuth, 
  logAPI, 
  logCache, 
  logExternalService,
  setSentryUser,
  setSentryTag,
  setSentryContext,
  capturePerformanceMetric,
  flushSentry
} = logger;
