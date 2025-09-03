import { Bool, OpenAPIRoute, Str } from "chanfana";
import { z } from "zod";

export class AuthGetCurrentUser extends OpenAPIRoute {
  schema = {
    tags: ["Authentication"],
    summary: "Get current authenticated user",
    description: "Retrieve information about the currently authenticated user",
    security: [{ bearerAuth: [] }],
    responses: {
      "200": {
        description: "User information retrieved successfully",
        content: {
          "application/json": {
            schema: z.object({
              series: z.object({
                success: Bool(),
                result: z.object({
                  user: z.object({
                    id: Str(),
                    email: Str(),
                    username: Str().optional(),
                    createdAt: Str(),
                    updatedAt: Str(),
                    lastLoginAt: Str().optional(),
                    isVerified: z.boolean(),
                  }),
                }),
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
    },
  };

  async handle(c: any) {
    // This OpenAPI handler calls the actual API endpoint logic
    // In development mode, this allows testing through the OpenAPI interface
    
    try {
      // Import and call the actual auth controller
      const { getAuthContainer } = await import("../../../../../src/features/auth/auth.container");
      const authContainer = getAuthContainer(c.env);
      const authController = authContainer.getAuthController();
      
      // Call the actual endpoint handler
      const result = await authController.getCurrentUser(c);
      
      return c.json({
        ...result,
        _openapi_proxy: true,
        _original_endpoint: "GET /v1/auth/me",
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
        _original_endpoint: "GET /v1/auth/me",
      }, 500);
    }
  }
}