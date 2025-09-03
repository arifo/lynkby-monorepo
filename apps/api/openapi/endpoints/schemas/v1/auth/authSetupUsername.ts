import { Bool, OpenAPIRoute, Str } from "chanfana";
import { z } from "zod";

const SetupUsernameSchema = z.object({
  username: Str({ 
    description: "Desired username",
    example: "johndoe"
  }),
});

export class AuthSetupUsername extends OpenAPIRoute {
  schema = {
    tags: ["Authentication"],
    summary: "Setup username for authenticated user",
    description: "Set or update the username for the currently authenticated user",
    security: [{ bearerAuth: [] }],
    request: {
      body: {
        content: {
          "application/json": {
            schema: SetupUsernameSchema,
          },
        },
      },
    },
    responses: {
      "200": {
        description: "Username updated successfully",
        content: {
          "application/json": {
            schema: z.object({
              series: z.object({
                success: Bool(),
                result: z.object({
                  user: z.object({
                    id: Str(),
                    email: Str(),
                    username: Str(),
                  }),
                }),
              }),
            }),
          },
        },
      },
      "400": {
        description: "Invalid username or validation error",
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
      "401": {
        description: "Unauthorized - invalid or missing token",
        content: {
          "application/json": {
            schema: z.object({
              error: z.object({
                code: Str(),
                message: Str(),
                timestamp: Str(),
              }),
            }),
          },
        },
      },
      "409": {
        description: "Username already taken",
        content: {
          "application/json": {
            schema: z.object({
              error: z.object({
                code: Str(),
                message: Str(),
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
      const result = await setupController.claimUsername(c);
      
      return c.json({
        ...result,
        _openapi_proxy: true,
        _original_endpoint: "POST /v1/setup/claim-username",
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
        _original_endpoint: "POST /v1/setup/claim-username",
      }, 500);
    }
  }
}