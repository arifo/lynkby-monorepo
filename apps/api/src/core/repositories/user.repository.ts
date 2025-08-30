import { databaseService } from "./index";

// User data types
export interface CreateUserData {
  email: string;
  username: string;
}

export interface UpdateUserData {
  email?: string;
  username?: string;
}

export interface User {
  id: string;
  email: string;
  username: string;
  createdAt: Date;
  updatedAt: Date;
}

// User repository interface
export interface IUserRepository {
  create(data: CreateUserData): Promise<User>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByUsername(username: string): Promise<User | null>;
  update(id: string, data: UpdateUserData): Promise<User>;
  delete(id: string): Promise<void>;
  findAll(): Promise<User[]>;
  count(): Promise<number>;
}

// User repository implementation
export class UserRepository implements IUserRepository {
  
  async create(data: CreateUserData): Promise<User> {
    return databaseService.executeWithRetry(
      async () => {
        const sql = `
          INSERT INTO "User" (id, email, username, "createdAt", "updatedAt")
          VALUES ($1, $2, $3, $4, $5)
          RETURNING *
        `;
        
        const id = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const now = new Date();
        const params = [id, data.email, data.username, now, now];
        
        const result = await databaseService.query(sql, params);
        return result[0] as User;
      },
      "create user"
    );
  }

  async findById(id: string): Promise<User | null> {
    return databaseService.executeWithRetry(
      async () => {
        const sql = `SELECT * FROM "User" WHERE id = $1`;
        const result = await databaseService.query(sql, [id]);
        return result.length > 0 ? result[0] as User : null;
      },
      "find user by id"
    );
  }

  async findByEmail(email: string): Promise<User | null> {
    return databaseService.executeWithRetry(
      async () => {
        const sql = `SELECT * FROM "User" WHERE email = $1`;
        const result = await databaseService.query(sql, [email]);
        return result.length > 0 ? result[0] as User : null;
      },
      "find user by email"
    );
  }

  async findByUsername(username: string): Promise<User | null> {
    return databaseService.executeWithRetry(
      async () => {
        const sql = `SELECT * FROM "User" WHERE username = $1`;
        const result = await databaseService.query(sql, [username]);
        return result.length > 0 ? result[0] as User : null;
      },
      "find user by username"
    );
  }

  async update(id: string, data: UpdateUserData): Promise<User> {
    return databaseService.executeWithRetry(
      async () => {
        const updates: string[] = [];
        const params: any[] = [];
        let paramIndex = 1;

        if (data.email !== undefined) {
          updates.push(`email = $${paramIndex++}`);
          params.push(data.email);
        }

        if (data.username !== undefined) {
          updates.push(`username = $${paramIndex++}`);
          params.push(data.username);
        }

        // Note: Password field not in current schema, skip for now
        // if (data.password !== undefined) {
        //   updates.push(`password = $${paramIndex++}`);
        //   params.push(data.password);
        // }

        updates.push(`"updatedAt" = $${paramIndex++}`);
        params.push(new Date());

        params.push(id); // for WHERE clause

        const sql = `
          UPDATE "User" 
          SET ${updates.join(', ')}
          WHERE id = $${paramIndex}
          RETURNING *
        `;

        const result = await databaseService.query(sql, params);
        return result[0] as User;
      },
      "update user"
    );
  }

  async delete(id: string): Promise<void> {
    return databaseService.executeWithRetry(
      async () => {
        const sql = `DELETE FROM "User" WHERE id = $1`;
        await databaseService.execute(sql, [id]);
      },
      "delete user"
    );
  }

  async findAll(): Promise<User[]> {
    return databaseService.executeWithRetry(
      async () => {
        const sql = `SELECT * FROM "User" ORDER BY "createdAt" DESC`;
        const result = await databaseService.query(sql);
        return result as User[];
      },
      "find all users"
    );
  }

  async count(): Promise<number> {
    return databaseService.executeWithRetry(
      async () => {
        const sql = `SELECT COUNT(*) as count FROM "User"`;
        const result = await databaseService.query(sql);
        return parseInt(result[0].count);
      },
      "count users"
    );
  }
}

// Export singleton instance
export const userRepository = new UserRepository();
