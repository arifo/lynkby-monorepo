import { Bool, OpenAPIRoute, Str } from "chanfana";
import { z } from "zod";

const RequestMagicLinkSchema = z.object({
  email: Str({ 
    description: "User email address",
    example: "user@example.com"
  }),
  redirectPath: Str({ 
    description: "Optional redirect path after authentication",
    required: false,
    example: "/dashboard"
  }),
});

export class AuthRequestMagicLink extends OpenAPIRoute {
  schema = {
    tags: ["Authentication"],
    summary: "Request magic link for authentication",
    description: "Send a magic link to the user's email for passwordless authentication",
    request: {
      body: {
        content: {
          "application/json": {
            schema: RequestMagicLinkSchema,
          },
        },
      },
    },
    responses: {
      "200": {
        description: "Magic link sent successfully",
        content: {
          "application/json": {
            schema: z.object({
              series: z.object({
                success: Bool(),
                result: z.object({
                  message: Str(),
                  email: Str(),
                }),
              }),
            }),
          },
        },
      },
      "400": {
        description: "Invalid request data",
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
      "429": {
        description: "Rate limit exceeded",
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
    
      // Import and call the actual auth controller
      const { getAuthContainer } = await import("../../../../../src/features/auth/auth.container");
      const authContainer = getAuthContainer(c.env);
      const authController = authContainer.getAuthController();
      
      // Call the actual endpoint handler
      return authController.requestMagicLink(c);
  }
}