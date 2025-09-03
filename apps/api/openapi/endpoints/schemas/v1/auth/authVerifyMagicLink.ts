import { Bool, OpenAPIRoute, Str } from "chanfana";
import { z } from "zod";

const VerifyMagicLinkSchema = z.object({
  token: Str({ 
    description: "Magic link token from email",
    example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }),
});

export class AuthVerifyMagicLink extends OpenAPIRoute {
  schema = {
    tags: ["Authentication"],
    summary: "Consume magic link token",
    description: "Verify and consume a magic link token to authenticate the user",
    request: {
      body: {
        content: {
          "application/json": {
            schema: VerifyMagicLinkSchema,
          },
        },
      },
    },
    responses: {
      "200": {
        description: "Authentication successful",
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
                    isNewUser: z.boolean(),
                  }),
                  session: z.object({
                    token: Str(),
                    expiresAt: Str(),
                  }),
                }),
              }),
            }),
          },
        },
      },
      "400": {
        description: "Invalid or expired token",
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
    
      // Import and call the actual auth controller
      const { getAuthContainer } = await import("../../../../../src/features/auth/auth.container");
      const authContainer = getAuthContainer(c.env);
      const authController = authContainer.getAuthController();
      
      // Call the actual endpoint handler
      return authController.consumeMagicLink(c);
  }
}