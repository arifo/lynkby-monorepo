import { dbFactory } from "./index";

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
    // Use the centralized factory to get a client
    const client = dbFactory.getClient();
    
    try {
      await client.connect();
      
      const sql = `
        INSERT INTO "User" (id, email, username, "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;
      
      const id = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date();
      const params = [id, data.email, data.username, now, now];
      
      const { rows } = await client.query(sql, params);
      return rows[0] as User;
    } finally {
      await dbFactory.closeClient(client);
    }
  }

  async findById(id: string): Promise<User | null> {
    const client = dbFactory.getClient();
    
    try {
      await client.connect();
      
      const sql = `SELECT * FROM "User" WHERE id = $1`;
      const { rows } = await client.query(sql, [id]);
      return rows.length > 0 ? rows[0] as User : null;
    } finally {
      await dbFactory.closeClient(client);
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    const client = dbFactory.getClient();
    
    try {
      await client.connect();
      
      const sql = `SELECT * FROM "User" WHERE email = $1`;
      const { rows } = await client.query(sql, [email]);
      return rows.length > 0 ? rows[0] as User : null;
    } finally {
      await dbFactory.closeClient(client);
    }
  }

  async findByUsername(username: string): Promise<User | null> {
    const client = dbFactory.getClient();
    
    try {
      await client.connect();
      
      const sql = `SELECT * FROM "User" WHERE username = $1`;
      const { rows } = await client.query(sql, [username]);
      return rows.length > 0 ? rows[0] as User : null;
    } finally {
      await dbFactory.closeClient(client);
    }
  }

  async update(id: string, data: UpdateUserData): Promise<User> {
    const client = dbFactory.getClient();
    
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

      updates.push(`"updatedAt" = $${paramIndex++}`);
      params.push(new Date());

      params.push(id); // for WHERE clause

      const sql = `
        UPDATE "User" 
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const { rows } = await client.query(sql, params);
      return rows[0] as User;
    } finally {
      await dbFactory.closeClient(client);
    }
  }

  async delete(id: string): Promise<void> {
    const client = dbFactory.getClient();
    
    try {
      await client.connect();
      
      const sql = `DELETE FROM "User" WHERE id = $1`;
      await client.query(sql, [id]);
    } finally {
      await dbFactory.closeClient(client);
    }
  }

  async findAll(): Promise<User[]> {
    const client = dbFactory.getClient();
    
    try {
      await client.connect();
      
      const sql = `SELECT * FROM "User" ORDER BY "createdAt" DESC`;
      const { rows } = await client.query(sql);
      return rows as User[];
    } finally {
      await dbFactory.closeClient(client);
    }
  }

  async count(): Promise<number> {
    const client = dbFactory.getClient();
    
    try {
      await client.connect();
      
      const sql = `SELECT COUNT(*) as count FROM "User"`;
      const { rows } = await client.query(sql);
      return parseInt(rows[0].count);
    } finally {
      await dbFactory.closeClient(client);
    }
  }
}

// Export singleton instance
export const userRepository = new UserRepository();
