import { Hono } from "hono";
import { databaseService } from "../core/repositories";
import { UserRepository, PageRepository } from "../core/repositories";
import { logger } from "../core/util/logger";
import { createError } from "../core/errors";
import { captureError, captureMessage, addBreadcrumb } from "../core/sentry";
import { checkDatabaseHealth } from "../core/db";

const healthRouter = new Hono();

// Health check endpoint
healthRouter.get("/_health", async (c) => {
  try {
    const startTime = Date.now();
    
    // Basic health check - pass env for Cloudflare Workers compatibility
    const health = await checkDatabaseHealth(c.env as any);
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

// Debug Sentry integration endpoint
healthRouter.get("/debug-sentry", async (c) => {
  try {
    const testType = c.req.query("type") || "all";
    
    // Add breadcrumb for tracking
    addBreadcrumb("Debug Sentry Test", "test", { testType, timestamp: new Date().toISOString() });
    
    const results = [];
    
    // Test 1: Capture info message
    if (testType === "all" || testType === "info") {
      captureMessage("Debug test: Info message", "info", {
        testType: "info",
        endpoint: "/debug-sentry",
        timestamp: new Date().toISOString(),
      });
      results.push("Info message sent to Sentry");
    }
    
    // Test 2: Capture warning message
    if (testType === "all" || testType === "warning") {
      captureMessage("Debug test: Warning message", "warning", {
        testType: "warning",
        endpoint: "/debug-sentry",
        timestamp: new Date().toISOString(),
      });
      results.push("Warning message sent to Sentry");
    }
    
    // Test 3: Capture error
    if (testType === "all" || testType === "error") {
      const testError = new Error("Debug test: This is a test error for Sentry integration");
      testError.name = "DebugTestError";
      
      captureError(testError, {
        testType: "error",
        endpoint: "/debug-sentry",
        timestamp: new Date().toISOString(),
        additionalContext: "This error was intentionally generated for testing Sentry integration",
      });
      results.push("Error captured and sent to Sentry");
    }
    
    // Test 4: Capture exception with context
    if (testType === "all" || testType === "exception") {
      try {
        // Intentionally throw an error
        throw new Error("Debug test: Intentional exception for Sentry testing");
      } catch (error) {
        captureError(error instanceof Error ? error : new Error(String(error)), {
          testType: "exception",
          endpoint: "/debug-sentry",
          timestamp: new Date().toISOString(),
          context: "Exception handling test",
        });
        results.push("Exception captured and sent to Sentry");
      }
    }
    
    // Test 5: Performance tracking (if available)
    if (testType === "all" || testType === "performance") {
      const startTime = Date.now();
      
      // Simulate some work
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const duration = Date.now() - startTime;
      
      addBreadcrumb("Performance Test", "performance", {
        duration: `${duration}ms`,
        testType: "performance",
        timestamp: new Date().toISOString(),
      });
      
      results.push(`Performance test completed in ${duration}ms`);
    }
    
    logger.info("Sentry debug test completed", { testType, results });
    
    return c.json({
      success: true,
      message: "Sentry debug test completed",
      testType,
      results,
      timestamp: new Date().toISOString(),
      note: "Check your Sentry dashboard to see if these events were captured",
    });
    
  } catch (error) {
    logger.error("Sentry debug test failed", { error });
    
    // Capture this error too
    captureError(error instanceof Error ? error : new Error(String(error)), {
      testType: "debug_test_failure",
      endpoint: "/debug-sentry",
      timestamp: new Date().toISOString(),
    });
    
    return c.json(
      {
        success: false,
        message: "Sentry debug test failed",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
});

// Detailed health check endpoint
healthRouter.get("/_health/detailed", async (c) => {
  try {
    const startTime = Date.now();
    
    // Check database health - pass env for Cloudflare Workers compatibility
    const dbHealth = await checkDatabaseHealth(c.env as any);
    
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
    
    // Check if database is ready - pass env for Cloudflare Workers compatibility
    const dbHealth = await checkDatabaseHealth(c.env as any);
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
