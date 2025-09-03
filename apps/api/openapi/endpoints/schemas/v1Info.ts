import { Bool, OpenAPIRoute, Str } from "chanfana";
import { z } from "zod";

export class V1Info extends OpenAPIRoute {
  schema = {
    tags: ["API Info"],
    summary: "V1 API Information",
    description: "Get information about the V1 API endpoints and services",
    responses: {
      "200": {
        description: "V1 API information",
        content: {
          "application/json": {
            schema: z.object({
              series: z.object({
                success: Bool(),
                result: z.object({
                  version: Str(),
                  status: Str(),
                  timestamp: Str(),
                  endpoints: z.object({
                    auth: Str(),
                  }),
                  documentation: Str(),
                }),
              }),
            }),
          },
        },
      },
    },
  };

  async handle(c: any) {
    // This OpenAPI handler calls the actual API endpoint logic
    // In development mode, this allows testing through the OpenAPI interface
    
    try {
      // Call the actual v1 info endpoint logic
      const result = {
        success: true,
        version: "v1",
        status: "active",
        timestamp: new Date().toISOString(),
        endpoints: {
          auth: "/v1/auth",
          // TODO: Add other endpoints as they are migrated
          // pages: "/v1/pages",
          // tiktok: "/v1/tiktok",
          // tips: "/v1/tips",
          // analytics: "/v1/analytics",
          // webhooks: "/v1/webhooks",
        },
        documentation: "https://docs.lynkby.com/api/v1",
      };
      
      return c.json({
        ...result,
        _openapi_proxy: true,
        _original_endpoint: "GET /v1",
        _timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      return c.json({
        error: {
          code: "HANDLER_ERROR",
          message: "Failed to execute actual API endpoint",
          details: error instanceof Error ? error.message : "Unknown error",
          timestamp: new Date().toISOString()
        },
        _openapi_proxy: true,
        _original_endpoint: "GET /v1",
      }, 500);
    }
  }
}
