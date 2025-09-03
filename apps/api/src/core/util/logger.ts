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

class Logger {
  private requestId: string | null = null;
  private context: LogContext = {};

  constructor() {
    // No Sentry initialization needed - using Cloudflare console
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

  // Log with structured format to Cloudflare console
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
    
    // Output to Cloudflare console with appropriate level
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

  // Performance metrics (using Cloudflare console)
  capturePerformanceMetric(name: string, value: number, unit: string = 'ms'): void {
    console.log(`Performance metric: ${name} = ${value}${unit}`);
  }

  // Flush logs (no-op for Cloudflare console)
  async flushLogs(): Promise<void> {
    // Cloudflare console handles flushing automatically
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
  capturePerformanceMetric,
  flushLogs
} = logger;
