import { getNeonClient, getDatabasePool } from "../db";
import { logger } from "../util/logger";
import { BaseService } from "./base.service";

export interface DatabaseService {
  query<T = any>(sql: string, params?: any[]): Promise<T[]>;
  execute(sql: string, params?: any[]): Promise<void>;
  transaction<T>(callback: (db: DatabaseService) => Promise<T>): Promise<T>;
}

class DatabaseServiceImpl extends BaseService implements DatabaseService {
  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    const client = getNeonClient(this.getEnv());
    
    try {
      logger.debug("Executing database query", { sql: sql.substring(0, 100) + "...", paramCount: params.length });
      
      // Connect the client
      await client.connect();
      
      const result = await client.query(sql, params);
      return result.rows as T[];
    } catch (error) {
      logger.error("Database query failed", { sql, params, error });
      throw error;
    } finally {
      // Always close the client after use
      try {
        await client.end();
      } catch (closeError) {
        logger.error("Error closing database client", { error: closeError });
      }
    }
  }

  async execute(sql: string, params: any[] = []): Promise<void> {
    const client = getNeonClient(this.getEnv());
    
    try {
      logger.debug("Executing database command", { sql: sql.substring(0, 100) + "...", paramCount: params.length });
      
      // Connect the client
      await client.connect();
      
      await client.query(sql, params);
    } catch (error) {
      logger.error("Database command failed", { sql, params, error });
      throw error;
    } finally {
      // Always close the client after use
      try {
        await client.end();
      } catch (closeError) {
        logger.error("Error closing database client", { error: closeError });
      }
    }
  }

  async transaction<T>(callback: (db: DatabaseService) => Promise<T>): Promise<T> {
    const client = getNeonClient(this.getEnv());
    
    try {
      // Connect the client
      await client.connect();
      
      await client.query('BEGIN');
      logger.debug("Database transaction started");
      
      const result = await callback(this);
      
      await client.query('COMMIT');
      logger.debug("Database transaction committed");
      
      return result;
    } catch (error) {
      try {
        await client.query('ROLLBACK');
        logger.debug("Database transaction rolled back");
      } catch (rollbackError) {
        logger.error("Error rolling back transaction", { error: rollbackError });
      }
      logger.error("Database transaction failed", { error });
      throw error;
    } finally {
      // Always close the client after use
      try {
        await client.end();
      } catch (closeError) {
        logger.error("Error closing database client", { error: closeError });
      }
    }
  }
}

// Export singleton instance
export const databaseService = new DatabaseServiceImpl();
