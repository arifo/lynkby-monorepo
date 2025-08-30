import { Hono } from "hono";
import { databaseService } from "../core/repositories";
import { UserRepository, PageRepository } from "../core/repositories";
import { logger } from "../core/util/logger";
import { createError } from "../core/errors";

const healthRouter = new Hono();

// Health check endpoint
healthRouter.get("/_health", async (c) => {
  try {
    const startTime = Date.now();
    
    // Basic health check
    const health = await databaseService.healthCheck();
    const responseTime = Date.now() - startTime;
    
    return c.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      database: health.status,
      version: process.env.npm_package_version || "unknown",
    });
  } catch (error) {
    logger.error("Health check failed", { error });
    
    return c.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      },
      503
    );
  }
});

// Detailed health check endpoint
healthRouter.get("/_health/detailed", async (c) => {
  try {
    const startTime = Date.now();
    
    // Check database health
    const dbHealth = await databaseService.healthCheck();
    
    // Get sample data to verify database functionality
    const userRepository = new UserRepository();
    const pageRepository = new PageRepository();
    
    let sampleUsers: any[] = [];
    let samplePages: any[] = [];
    let dbFunctionality = "unknown";
    
    try {
      // Use a single query to get both users and pages count for faster response
      const usersCountSql = `SELECT COUNT(*) as count FROM "User"`;
      const pagesCountSql = `SELECT COUNT(*) as count FROM "Page"`;
      
      // Execute both queries in parallel for better performance
      const [usersResult, pagesResult] = await Promise.all([
        databaseService.query(usersCountSql),
        databaseService.query(pagesCountSql)
      ]);
      
      const usersCount = parseInt(usersResult[0].count);
      const pagesCount = parseInt(pagesResult[0].count);
      
      // Only fetch sample data if we have data
      if (usersCount > 0) {
        const sampleUsersSql = `SELECT id, username, email, "createdAt" FROM "User" ORDER BY "createdAt" DESC LIMIT 3`;
        sampleUsers = await databaseService.query(sampleUsersSql);
      }
      
      if (pagesCount > 0) {
        const samplePagesSql = `SELECT id, "displayName", "userId", "createdAt" FROM "Page" ORDER BY "createdAt" DESC LIMIT 3`;
        samplePages = await databaseService.query(samplePagesSql);
      }
      
      dbFunctionality = "operational";
    } catch (dataError) {
      logger.warn("Could not fetch sample data for health check", { error: dataError });
      dbFunctionality = "limited";
    }
    
    const responseTime = Date.now() - startTime;
    
    return c.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      database: {
        status: dbHealth.status,
        message: dbHealth.message,
        responseTime: dbHealth.responseTime,
        functionality: dbFunctionality,
      },
      sampleData: {
        users: sampleUsers,
        pages: samplePages,
      },
      version: process.env.npm_package_version || "unknown",
      environment: process.env.NODE_ENV || "unknown",
    });
  } catch (error) {
    logger.error("Detailed health check failed", { error });
    
    return c.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      },
      503
    );
  }
});

// Readiness check endpoint
healthRouter.get("/_ready", async (c) => {
  try {
    const startTime = Date.now();
    
    // Check if database is ready
    const dbHealth = await databaseService.healthCheck();
    const responseTime = Date.now() - startTime;
    
    if (dbHealth.status === "healthy") {
      return c.json({
        status: "ready",
        timestamp: new Date().toISOString(),
        responseTime: `${responseTime}ms`,
        database: "ready",
      });
    } else {
      return c.json(
        {
          status: "not_ready",
          timestamp: new Date().toISOString(),
          database: "not_ready",
          reason: dbHealth.message,
        },
        503
      );
    }
  } catch (error) {
    logger.error("Readiness check failed", { error });
    
    return c.json(
      {
        status: "not_ready",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      },
      503
    );
  }
});

export default healthRouter;
