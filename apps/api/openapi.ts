import { fromHono } from "chanfana";
import { Hono } from "hono";
import type { AppEnv } from "./src/core/env";

import { HealthCheck }   from "./openapi/endpoints/schemas/healthCheck";
import { V1Info } from "./openapi/endpoints/schemas/v1Info";
  // Auth endpoints (v1)
  import { AuthGetCurrentUser } from "./openapi/endpoints/schemas/v1/auth/authGetCurrentUser";
  import { AuthLogout } from "./openapi/endpoints/schemas/v1/auth/authLogout";
  
  // Setup endpoints (v1)
  import { AuthSetupUsername } from "./openapi/endpoints/schemas/v1/auth/authSetupUsername";
  import { AuthCheckUsername } from "./openapi/endpoints/schemas/v1/auth/authCheckUsername";
/**
 * Simple OpenAPI setup function
 */
export function setupOpenAPI(app: Hono<{ Bindings: AppEnv }>) {
  const openapi = fromHono(app, {
    docs_url: "/",
    openapi_url: "/openapi.json",
  });

  // Register endpoint schemas for documentation/testing
  // System
  openapi.get("/health", HealthCheck);

  // V1 API info
  openapi.get("/v1", V1Info);



  // Auth endpoints
  openapi.get("/v1/auth/me", AuthGetCurrentUser);
  openapi.post("/v1/auth/logout", AuthLogout);
  
  // Setup endpoints (username-related functionality moved here)
  openapi.get("/v1/setup/check-username", AuthCheckUsername);
  openapi.post("/v1/setup/claim-username", AuthSetupUsername);

  return openapi;
}
