import type { IAuthContainer, IAuthService, IAuthController, AuthModuleConfig } from "./auth.interfaces";
import type { AppEnv } from "../../core/env";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";

/**
 * Dependency injection container for the auth module
 * Manages the lifecycle and dependencies of auth-related services
 */
export class AuthContainer implements IAuthContainer {
  private authService: IAuthService;
  private authController: IAuthController;
  private config: AuthModuleConfig;

  constructor(config: AuthModuleConfig) {
    this.config = config;
    this.initializeServices();
  }

  /**
   * Initialize all services with their dependencies
   */
  private initializeServices(): void {
    // Initialize services
    this.authService = new AuthService();
    
    // Initialize controller with injected dependencies
    this.authController = new AuthController(
      this.authService,
      this.config
    );
  }

  /**
   * Get the auth service instance
   */
  getAuthService(): IAuthService {
    return this.authService;
  }



  /**
   * Get the auth controller instance
   */
  getAuthController(): IAuthController {
    return this.authController;
  }

  /**
   * Set environment for all services
   */
  setEnvironment(env: AppEnv): void {
    this.authService.setEnvironment(env);
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<AuthModuleConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): AuthModuleConfig {
    return { ...this.config };
  }
}

/**
 * Factory function to create auth container with environment-specific config
 */
export function createAuthContainer(env: AppEnv): AuthContainer {
  const config: AuthModuleConfig = {
    jwtSecret: env.JWT_SECRET,
    appBase: env.APP_BASE,
    nodeEnv: env.NODE_ENV,
    kvCache: env.KV_CACHE,
  };

  return new AuthContainer(config);
}

/**
 * Get auth container for the given environment
 * Creates a fresh instance for each request (Cloudflare Workers best practice)
 */
export function getAuthContainer(env: AppEnv): AuthContainer {
  return createAuthContainer(env);
}
