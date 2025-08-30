import { Client } from '@neondatabase/serverless';
import { logger } from "./util/logger";

// Database configuration constants
const DB_CONFIG = {
  MAX_CONNECTIONS: 10,
  CONNECTION_TIMEOUT: 5000,
  QUERY_TIMEOUT: 10000,
} as const;

// Database client factory interface
export interface IDatabaseClientFactory {
  getClient(env?: { DATABASE_URL?: string }): Client;
  getClientForHealthCheck(env?: { DATABASE_URL?: string }): Client;
  closeClient(client: Client): Promise<void>;
}

// Database client factory implementation
export class DatabaseClientFactory implements IDatabaseClientFactory {
  private static instance: DatabaseClientFactory;
  
  private constructor() {}
  
  // Singleton pattern
  static getInstance(): DatabaseClientFactory {
    if (!DatabaseClientFactory.instance) {
      DatabaseClientFactory.instance = new DatabaseClientFactory();
    }
    return DatabaseClientFactory.instance;
  }
  
  // Get a database client for general use
  getClient(env?: { DATABASE_URL?: string }): Client {
    const databaseUrl = this.getDatabaseUrl(env);
    return new Client(databaseUrl);
  }
  
  // Get a database client specifically for health checks
  getClientForHealthCheck(env?: { DATABASE_URL?: string }): Client {
    const databaseUrl = this.getDatabaseUrl(env);
    return new Client(databaseUrl);
  }
  
  // Close a database client
  async closeClient(client: Client): Promise<void> {
    try {
      await client.end();
    } catch (error) {
      logger.error("Error closing database client", { error });
    }
  }
  
  // Private method to get database URL
  private getDatabaseUrl(env?: { DATABASE_URL?: string }): string {
    const databaseUrl = env?.DATABASE_URL || process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      throw new Error("DATABASE_URL not configured. Please check your environment variables.");
    }
    
    return databaseUrl;
  }
}

// Global factory instance
const dbFactory = DatabaseClientFactory.getInstance();

// Convenience functions for backward compatibility
export function getNeonClient(env?: { DATABASE_URL?: string }): Client {
  return dbFactory.getClient(env);
}

export function createNeonClient(env?: { DATABASE_URL?: string }): Client {
  return dbFactory.getClient(env);
}

export async function disconnectNeon(): Promise<void> {
  // This function is kept for backward compatibility but doesn't do much
  // since we're creating new clients per operation
  logger.info("disconnectNeon called - no action needed with new architecture");
}

// Health check for database - accepts env parameter for Cloudflare Workers
export async function checkDatabaseHealth(env?: { DATABASE_URL?: string }): Promise<{
  status: "healthy" | "unhealthy";
  message: string;
  responseTime: number;
}> {
  const startTime = Date.now();
  
  try {
    console.log("🏥 Starting database health check");
    console.log("Environment keys:", env ? Object.keys(env) : "none");
    
    // Get a fresh client for health check
    const client = dbFactory.getClientForHealthCheck(env);
    
    try {
      console.log("🔗 Connecting to database...");
      await client.connect();
      console.log("✅ Database connected successfully");
      
      const { rows } = await client.query('SELECT 1 as health_check');
      const responseTime = Date.now() - startTime;
      
      console.log("✅ Health check query successful");
      
      return {
        status: "healthy",
        message: "Database connection successful",
        responseTime,
      };
    } finally {
      console.log("🔌 Closing database client...");
      await dbFactory.closeClient(client);
    }
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    console.error("❌ Database health check failed:", error);
    
    logger.error("Database health check failed", {
      error: error instanceof Error ? error : new Error(String(error)),
      responseTime,
    });
    
    return {
      status: "unhealthy",
      message: error instanceof Error ? error.message : "Unknown database error",
      responseTime,
    };
  }
}

// Setup graceful shutdown handlers
export function setupGracefulShutdown(): void {
  // Handle SIGINT (Ctrl+C) and SIGTERM
  process.on('SIGINT', async () => {
    logger.info('Received SIGINT, shutting down gracefully...');
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM, shutting down gracefully...');
    process.exit(0);
  });

  // Handle process exit
  process.on('exit', (code) => {
    logger.info(`Process exiting with code: ${code}`);
  });

  // Handle beforeExit
  process.on('beforeExit', async (code) => {
    logger.info(`Process beforeExit with code: ${code}`);
  });
}

// Export types and factory for use in other modules
export type { Client } from '@neondatabase/serverless';
export { dbFactory };
