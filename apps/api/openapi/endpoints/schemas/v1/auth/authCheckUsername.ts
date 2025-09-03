import { Bool, OpenAPIRoute, Str } from "chanfana";
import { z } from "zod";

export class AuthCheckUsername extends OpenAPIRoute {
  schema = {
    tags: ["Authentication"],
    summary: "Check username availability",
    description: "Check if a username is available for registration",
    request: {
      query: z.object({
        username: Str({
          description: "Username to check",
          example: "johndoe"
        }),
      }),
    },
    responses: {
      "200": {
        description: "Username availability checked",
        content: {
          "application/json": {
            schema: z.object({
              series: z.object({
                success: Bool(),
                result: z.object({
                  available: z.boolean(),
                  username: Str(),
                  message: Str(),
                }),
              }),
            }),
          },
        },
      },
      "400": {
        description: "Invalid username format",
        content: {
          "application/json": {
            schema: z.object({
              error: z.object({
                code: Str(),
                message: Str(),
                details: z.any().optional(),
                timestamp: Str(),
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
      // Import and call the actual setup controller
      const { getSetupController } = await import("../../../../../src/features/setup/setup.container");
      const setupController = getSetupController(c.env);
      
      // Call the actual endpoint handler
      const result = await setupController.checkUsername(c);
      
      return c.json({
        ...result,
        _openapi_proxy: true,
        _original_endpoint: "GET /v1/setup/check-username",
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
        _original_endpoint: "GET /v1/setup/check-username",
      }, 500);
    }
  }
}