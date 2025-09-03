import { Bool, OpenAPIRoute, Str } from "chanfana";
import { z } from "zod";
import { type AppContext } from "../../../src/types";
import { checkDatabaseHealth } from "../../../src/core/db";

export class HealthCheck extends OpenAPIRoute {
  schema = {
    tags: ["System"],
    summary: "Health check endpoint",
    description: "Check the health status of the API and its dependencies",
    responses: {
      "200": {
        description: "System health status",
        content: {
          "application/json": {
            schema: z.object({
              series: z.object({
                success: Bool(),
                result: z.object({
                  status: Str(),
                  timestamp: Str(),
                  version: Str(),
                  services: z.object({
                    database: z.object({
                      status: Str(),
                      message: Str(),
                      responseTime: z.number(),
                    }),
                  }),
                }),
              }),
            }),
          },
        },
      },
      "503": {
        description: "Service unavailable",
        content: {
          "application/json": {
            schema: z.object({
              series: z.object({
                success: Bool(),
                result: z.object({
                  status: Str(),
                  timestamp: Str(),
                  version: Str(),
                  services: z.object({
                    database: z.object({
                      status: Str(),
                      message: Str(),
                      responseTime: z.number(),
                    }),
                  }),
                }),
              }),
            }),
          },
        },
      },
    },
  };

  async handle(c: AppContext) {
    const startTime = Date.now();
    
    try {
      // Check database health
      const dbHealth = await checkDatabaseHealth(c.env);
      
      const responseTime = Date.now() - startTime;
      const overallStatus = dbHealth.status === "healthy" ? "healthy" : "unhealthy";
      
      return {
        success: true,
        status: overallStatus,
        timestamp: new Date().toISOString(),
        version: "1.0.0",
        services: {
          database: {
            status: dbHealth.status,
            message: dbHealth.message,
            responseTime: dbHealth.responseTime,
          },
        },
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        success: false,
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        version: "1.0.0",
        services: {
          database: {
            status: "unhealthy",
            message: error instanceof Error ? error.message : "Unknown error",
            responseTime,
          },
        },
      };
    }
  }
}
