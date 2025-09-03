import type { AppEnv } from "../env";

/**
 * Base service class that provides dependency injection for environment variables
 * This eliminates the need to pass env parameters to service methods
 */
export abstract class BaseService {
  protected env?: AppEnv;

  constructor(env?: AppEnv) {
    this.env = env;
  }

  /**
   * Set the environment for this service instance
   * Useful for dependency injection in controllers
   */
  setEnvironment(env: AppEnv): void {
    this.env = env;
  }

  /**
   * Get the current environment
   */
  protected getEnv(): AppEnv | undefined {
    return this.env;
  }

  /**
   * Get a specific environment variable
   */
  protected getEnvVar<K extends keyof AppEnv>(key: K): AppEnv[K] | undefined {
    return this.env?.[key];
  }

  /**
   * Get a required environment variable (throws if not found)
   */
  protected getRequiredEnvVar<K extends keyof AppEnv>(key: K): AppEnv[K] {
    const value = this.env?.[key];
    if (value === undefined) {
      throw new Error(`Required environment variable ${String(key)} is not set`);
    }
    return value;
  }

  /**
   * Check if we're in a specific environment
   */
  protected isEnvironment(env: 'development' | 'staging' | 'production'): boolean {
    return this.getEnvVar('NODE_ENV') === env;
  }

  /**
   * Check if we're in development mode
   */
  protected isDevelopment(): boolean {
    return this.isEnvironment('development');
  }

  /**
   * Check if we're in production mode
   */
  protected isProduction(): boolean {
    return this.isEnvironment('production');
  }

  /**
   * Check if we're in staging mode
   */
  protected isStaging(): boolean {
    return this.isEnvironment('staging');
  }

  /**
   * Check if we're running locally (development or local environment)
   */
  protected isLocal(): boolean {
    const nodeEnv = this.getEnvVar('NODE_ENV');
    return nodeEnv === 'development' || !nodeEnv;
  }
}
