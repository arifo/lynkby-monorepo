import { BaseRepository } from "./base.repository";
import type { AppEnv } from "../env";
import type { 
  User, 
  CreateUserData, 
  UpdateUserData 
} from '@lynkby/shared';

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
  // Auth-specific methods
  createUserForAuth(email: string): Promise<User>;
  updateLastLogin(userId: string): Promise<void>;
}

// User repository implementation
export class UserRepository extends BaseRepository implements IUserRepository {
  
  async create(data: CreateUserData): Promise<User> {
    const client = this.getClient();
    
    try {
      await client.connect();
      
      const sql = `
        INSERT INTO "users" (id, email, username, "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;
      
      const id = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date();
      const params = [id, data.email, data.username || null, now, now];
      
      const { rows } = await client.query(sql, params);
      return rows[0] as User;
    } finally {
      await this.closeClient(client);
    }
  }

  async findById(id: string): Promise<User | null> {
    const client = this.getClient();
    
    try {
      await client.connect();
      
      const sql = `SELECT * FROM "users" WHERE id = $1`;
      const { rows } = await client.query(sql, [id]);
      return rows.length > 0 ? rows[0] as User : null;
    } finally {
      await this.closeClient(client);
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    const client = this.getClient();
    
    try {
      await client.connect();
      
      const sql = `SELECT * FROM "users" WHERE email = $1`;
      const { rows } = await client.query(sql, [email]);
      return rows.length > 0 ? rows[0] as User : null;
    } finally {
      await this.closeClient(client);
    }
  }

  async findByUsername(username: string): Promise<User | null> {
    const client = this.getClient();
    
    try {
      await client.connect();
      
      const sql = `SELECT * FROM "users" WHERE username = $1`;
      const { rows } = await client.query(sql, [username]);
      return rows.length > 0 ? rows[0] as User : null;
    } finally {
      await this.closeClient(client);
    }
  }

  async update(id: string, data: UpdateUserData): Promise<User> {
    const client = this.getClient();
    
    try {
      await client.connect();
      
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

      if (data.displayName !== undefined) {
        updates.push(`"displayName" = $${paramIndex++}`);
        params.push(data.displayName);
      }

      if (data.avatarUrl !== undefined) {
        updates.push(`"avatarUrl" = $${paramIndex++}`);
        params.push(data.avatarUrl);
      }

      if (data.bio !== undefined) {
        updates.push(`bio = $${paramIndex++}`);
        params.push(data.bio);
      }

      if (data.lastLoginAt !== undefined) {
        updates.push(`"lastLoginAt" = $${paramIndex++}`);
        params.push(data.lastLoginAt);
      }

      updates.push(`"updatedAt" = $${paramIndex++}`);
      params.push(new Date());

      params.push(id); // for WHERE clause

      const sql = `
        UPDATE "users" 
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const { rows } = await client.query(sql, params);
      return rows[0] as User;
    } finally {
      await this.closeClient(client);
    }
  }

  async delete(id: string): Promise<void> {
    const client = this.getClient();
    
    try {
      await client.connect();
      
      const sql = `DELETE FROM "users" WHERE id = $1`;
      await client.query(sql, [id]);
    } finally {
      await this.closeClient(client);
    }
  }

  async findAll(): Promise<User[]> {
    const client = this.getClient();
    
    try {
      await client.connect();
      
      const sql = `SELECT * FROM "users" ORDER BY "createdAt" DESC`;
      const { rows } = await client.query(sql);
      return rows as User[];
    } finally {
      await this.closeClient(client);
    }
  }

  async count(): Promise<number> {
    const client = this.getClient();
    
    try {
      await client.connect();
      
      const sql = `SELECT COUNT(*) as count FROM "users"`;
      const { rows } = await client.query(sql);
      return parseInt(rows[0].count);
    } finally {
      await this.closeClient(client);
    }
  }

  // Auth-specific methods
  async createUserForAuth(email: string): Promise<User> {
    return this.create({ email: email.toLowerCase() });
  }

  async updateLastLogin(userId: string): Promise<void> {
    await this.update(userId, { lastLoginAt: new Date() });
  }
}

// Export singleton instance
export const userRepository = new UserRepository();