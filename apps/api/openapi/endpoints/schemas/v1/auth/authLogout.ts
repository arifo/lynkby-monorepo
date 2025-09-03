import { Bool, OpenAPIRoute, Str } from "chanfana";
import { z } from "zod";

export class AuthLogout extends OpenAPIRoute {
  schema = {
    tags: ["Authentication"],
    summary: "Logout current user",
    description: "Invalidate the current user session and logout",
    security: [{ bearerAuth: [] }],
    responses: {
      "200": {
        description: "Logout successful",
        content: {
          "application/json": {
            schema: z.object({
              series: z.object({
                success: Bool(),
                result: z.object({
                  message: Str(),
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
      const result = await authController.logout(c);
      
      return c.json({
        ...result,
        _openapi_proxy: true,
        _original_endpoint: "POST /v1/auth/logout",
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
        _original_endpoint: "POST /v1/auth/logout",
      }, 500);
    }
  }
}