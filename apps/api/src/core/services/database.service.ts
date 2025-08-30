import { Client } from '@neondatabase/serverless';
import { getNeonClient, checkDatabaseHealth } from "../db";
import { logger } from "../util/logger";
import { createError } from "../errors";
import { DB_CONFIG } from "../env";

// Database service interface
export interface IDatabaseService {
  healthCheck(): Promise<{ status: string; message: string; responseTime: number }>;
  executeWithRetry<T>(operation: () => Promise<T>, operationName: string): Promise<T>;
  query<T = any>(sql: string, params?: any[]): Promise<T[]>;
  execute(sql: string, params?: any[]): Promise<void>;
}

// Database service implementation
export class DatabaseService implements IDatabaseService {
  private isHealthy: boolean = true;

  constructor() {
    // Don't store client instance - create new one for each operation
  }

  // Health check with caching
  async healthCheck(): Promise<{ status: string; message: string; responseTime: number }> {
    try {
      const health = await checkDatabaseHealth();
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
        // Create a new client for each operation as recommended by Neon
        const client = new Client(process.env.DATABASE_URL!);
        await client.connect();
        try {
          const { rows } = await client.query(sql, params);
          return rows as T[];
        } finally {
          await client.end();
        }
      },
      `query: ${sql.substring(0, 50)}...`
    );
  }

  // Execute a command (INSERT, UPDATE, DELETE)
  async execute(sql: string, params: any[] = []): Promise<void> {
    return this.executeWithRetry(
      async () => {
        // Create a new client for each operation as recommended by Neon
        const client = new Client(process.env.DATABASE_URL!);
        await client.connect();
        try {
          await client.query(sql, params);
        } finally {
          await client.end();
        }
      },
      `execute: ${sql.substring(0, 50)}...`
    );
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
    return this.isHealthy;
  }
}

// Export singleton instance
export const databaseService = new DatabaseService();
