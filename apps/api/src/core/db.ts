import { Client } from '@neondatabase/serverless';
import { logger } from "./util/logger";

// Database configuration constants
const DB_CONFIG = {
  MAX_CONNECTIONS: 10,
  CONNECTION_TIMEOUT: 5000,
  QUERY_TIMEOUT: 10000,
} as const;

// Global Neon client instance for connection pooling
let neonClient: Client | null = null;

// Initialize Neon client for Cloudflare Workers
export function createNeonClient(): Client {
  if (neonClient) {
    return neonClient;
  }

  try {
    // Create Neon serverless client
    // This is the recommended approach for Cloudflare Workers according to Neon docs
    neonClient = new Client(process.env.DATABASE_URL!);
    
    logger.info("Neon serverless client created successfully");
    return neonClient;
  } catch (error) {
    logger.error("Failed to create Neon client", { error });
    throw error;
  }
}

// Get the Neon client instance
export function getNeonClient(): Client {
  if (!neonClient) {
    return createNeonClient();
  }
  return neonClient;
}

// Graceful shutdown
export async function disconnectNeon(): Promise<void> {
  if (neonClient) {
    try {
      await neonClient.end();
      neonClient = null;
      logger.info("Neon client disconnected successfully");
    } catch (error) {
      logger.error("Error disconnecting Neon client", { error });
    }
  }
}

// Health check for database
export async function checkDatabaseHealth(): Promise<{
  status: "healthy" | "unhealthy";
  message: string;
  responseTime: number;
}> {
  const startTime = Date.now();
  
  try {
    // Create a new client for health check (don't reuse)
    const client = new Client(process.env.DATABASE_URL!);
    await client.connect();
    
    try {
      const { rows } = await client.query('SELECT 1 as health_check');
      const responseTime = Date.now() - startTime;
      
      return {
        status: "healthy",
        message: "Database connection successful",
        responseTime,
      };
    } finally {
      await client.end();
    }
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
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
    logger.info('Received SIGINT, shutting down database gracefully...');
    await disconnectNeon();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM, shutting down database gracefully...');
    await disconnectNeon();
    process.exit(0);
  });

  // Handle process exit
  process.on('exit', (code) => {
    logger.info(`Process exiting with code: ${code}`);
  });

  // Handle beforeExit
  process.on('beforeExit', async (code) => {
    logger.info(`Process beforeExit with code: ${code}`);
    await disconnectNeon();
  });
}

// Export types for use in other modules
export type { Client } from '@neondatabase/serverless';
