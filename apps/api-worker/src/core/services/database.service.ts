import { Client } from '@neondatabase/serverless';
import { dbFactory } from "../db";
import { logger } from "../util/logger";
import { createError } from "../errors";
import { DB_CONFIG } from "../env";

// Database service interface
export interface IDatabaseService {
  healthCheck(): Promise<{ status: string; message: string; responseTime: number }>;
  executeWithRetry<T>(operation: () => Promise<T>, operationName: string): Promise<T>;
  query<T = any>(sql: string, params?: any[]): Promise<T[]>;
  execute(sql: string, params?: any[]): Promise<void>;
  shutdown(): Promise<void>;
}

// Database service implementation
export class DatabaseService implements IDatabaseService {
  private isHealthy: boolean = true;
  private isShuttingDown: boolean = false;

  constructor() {
    this.setupGracefulShutdown();
  }

  // Setup graceful shutdown handlers
  private setupGracefulShutdown(): void {
    // Handle SIGINT (Ctrl+C) and SIGTERM
    process.on('SIGINT', async () => {
      logger.info('Received SIGINT, shutting down gracefully...');
      await this.shutdown();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      logger.info('Received SIGTERM, shutting down gracefully...');
      await this.shutdown();
      process.exit(0);
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', async (error) => {
      logger.error('Uncaught exception, shutting down gracefully...', { error });
      await this.shutdown();
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', async (reason, promise) => {
      logger.error('Unhandled promise rejection, shutting down gracefully...', { reason, promise });
      await this.shutdown();
      process.exit(1);
    });
  }

  // Health check with caching
  async healthCheck(): Promise<{ status: string; message: string; responseTime: number }> {
    if (this.isShuttingDown) {
      return {
        status: "unhealthy",
        message: "Service is shutting down",
        responseTime: 0,
      };
    }

    try {
      // Use the centralized health check function
      const { dbFactory } = await import("../db");
      const health = await import("../db").then(m => m.checkDatabaseHealth());
      this.isHealthy = health.status === "healthy";
      return health;
    } catch (error) {
      this.isHealthy = false;
      logger.error("Database health check failed", {
        error: error instanceof Error ? error : new Error(String(error)),
      });
      throw error;
    }
  }

  // Execute database operation with retry logic
  async executeWithRetry<T>(
    operation: () => Promise<T>, 
    operationName: string
  ): Promise<T> {
    if (this.isShuttingDown) {
      throw new Error("Service is shutting down");
    }

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= DB_CONFIG.MAX_RETRIES; attempt++) {
      try {
        // Check health before operation if not healthy
        if (!this.isHealthy && attempt === 1) {
          await this.healthCheck();
        }

        const result = await operation();
        
        // Mark as healthy on success
        this.isHealthy = true;
        
        logger.debug(`Database operation successful: ${operationName}`, {
          operation: operationName,
          attempt,
        });
        
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        // Log the error
        logger.warn(`Database operation failed: ${operationName}`, {
          operation: operationName,
          attempt,
          error: lastError.message,
        });

        // Don't retry on certain errors
        if (this.shouldNotRetry(lastError)) {
          throw lastError;
        }

        // If this is the last attempt, throw the error
        if (attempt === DB_CONFIG.MAX_RETRIES) {
          logger.error(`Database operation failed after ${attempt} attempts: ${operationName}`, {
            operation: operationName,
            attempts: attempt,
            error: lastError.message,
          });
          throw error;
        }

        // Wait before retrying
        await this.delay(DB_CONFIG.RETRY_DELAY * attempt);
      }
    }

    throw lastError || new Error(`Database operation failed: ${operationName}`);
  }

  // Execute a query and return results
  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    return this.executeWithRetry(
      async () => {
        // Use the centralized factory to get a client
        const client = dbFactory.getClient();
        await client.connect();
        try {
          const { rows } = await client.query(sql, params);
          return rows as T[];
        } finally {
          await dbFactory.closeClient(client);
        }
      },
      `query: ${sql.substring(0, 50)}...`
    );
  }

  // Execute a command (INSERT, UPDATE, DELETE)
  async execute(sql: string, params: any[] = []): Promise<void> {
    return this.executeWithRetry(
      async () => {
        // Use the centralized factory to get a client
        const client = dbFactory.getClient();
        await client.connect();
        try {
          await client.query(sql, params);
        } finally {
          await dbFactory.closeClient(client);
        }
      },
      `execute: ${sql.substring(0, 50)}...`
    );
  }

  // Graceful shutdown
  async shutdown(): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }

    this.isShuttingDown = true;
    logger.info('Database service shutting down...');

    try {
      // Wait a bit for any ongoing operations to complete
      await this.delay(100);
      logger.info('Database service shutdown complete');
    } catch (error) {
      logger.error('Error during database service shutdown', { error });
    }
  }

  // Check if error should not be retried
  private shouldNotRetry(error: Error): boolean {
    // Don't retry syntax errors or authentication errors
    if (error.message.includes("syntax error") || 
        error.message.includes("authentication") || 
        error.message.includes("authorization")) {
      return true;
    }

    return false;
  }

  // Delay utility for retries
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Check if database is healthy
  getHealthStatus(): boolean {
    return this.isHealthy && !this.isShuttingDown;
  }

  // Check if service is shutting down
  isShutdownInProgress(): boolean {
    return this.isShuttingDown;
  }
}

// Export singleton instance
export const databaseService = new DatabaseService();
