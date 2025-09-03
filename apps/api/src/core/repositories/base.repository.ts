import { dbFactory } from "../db";
import type { AppEnv } from "../env";

/**
 * Base repository class that provides dependency injection for environment variables
 * This eliminates the need to pass env parameters to every method
 */
export abstract class BaseRepository {
  protected env?: AppEnv;

  constructor(env?: AppEnv) {
    this.env = env;
  }

  /**
   * Set the environment for this repository instance
   * Useful for dependency injection in controllers/services
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
   * Get a database client using the injected environment
   */
  protected getClient() {
    return dbFactory.getClient(this.env);
  }

  /**
   * Get a database pool using the injected environment
   */
  protected getPool() {
    return dbFactory.getPool(this.env);
  }

  /**
   * Close a database client
   */
  protected async closeClient(client: any): Promise<void> {
    return dbFactory.closeClient(client);
  }

  /**
   * Close a database pool
   */
  protected async closePool(pool: any): Promise<void> {
    return dbFactory.closePool(pool);
  }
}
