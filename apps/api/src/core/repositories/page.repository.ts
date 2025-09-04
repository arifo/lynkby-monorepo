import { BaseRepository } from "./base.repository";
import type { AppEnv } from "../env";
import type { 
  Page, 
  CreatePageData, 
  UpdatePageData, 
  Link, 
  PageWithLinks 
} from '@lynkby/shared';

// Page repository interface
export interface IPageRepository {
  create(data: CreatePageData): Promise<Page>;
  findById(id: string): Promise<Page | null>;
  findByUserId(userId: string): Promise<Page | null>;
  findByUsername(username: string): Promise<Page | null>;
  update(id: string, data: UpdatePageData): Promise<Page>;
  delete(id: string): Promise<void>;
  findAll(): Promise<Page[]>;
  count(): Promise<number>;
  findWithLinks(id: string): Promise<PageWithLinks | null>;
  insertLinks(pageId: string, links: Array<{ title: string; url: string; position?: number; active?: boolean }>): Promise<number>;
  replaceLinks(pageId: string, links: Array<{ title: string; url: string; position?: number; active?: boolean }>): Promise<number>;
}

// Page repository implementation
export class PageRepository extends BaseRepository implements IPageRepository {
  
  async create(data: CreatePageData): Promise<Page> {
    const client = this.getClient();
    
    try {
      await client.connect();
      
      const sql = `
        INSERT INTO "pages" (id, "userId", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `;
      
      const id = `page_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date();
      const params = [id, data.userId, now, now];
      
      const { rows } = await client.query(sql, params);
      return rows[0] as Page;
    } finally {
      await this.closeClient(client);
    }
  }

  async findById(id: string): Promise<Page | null> {
    const client = this.getClient();
    
    try {
      await client.connect();
      
      const sql = `SELECT * FROM "pages" WHERE id = $1`;
      const { rows } = await client.query(sql, [id]);
      return rows.length > 0 ? rows[0] as Page : null;
    } finally {
      await this.closeClient(client);
    }
  }

  async findByUserId(userId: string): Promise<Page | null> {
    const client = this.getClient();
    
    try {
      await client.connect();
      
      const sql = `SELECT * FROM "pages" WHERE "userId" = $1`;
      const { rows } = await client.query(sql, [userId]);
      return rows.length > 0 ? rows[0] as Page : null;
    } finally {
      await this.closeClient(client);
    }
  }

  async findByUsername(username: string): Promise<Page | null> {
    const client = this.getClient();
    
    try {
      await client.connect();
      
      // Join with users table to find page by username
      const sql = `
        SELECT p.* FROM "pages" p
        INNER JOIN "users" u ON p."userId" = u.id
        WHERE u.username = $1
      `;
      const { rows } = await client.query(sql, [username]);
      return rows.length > 0 ? rows[0] as Page : null;
    } finally {
      await this.closeClient(client);
    }
  }

  async update(id: string, data: UpdatePageData): Promise<Page> {
    const client = this.getClient();
    
    try {
      await client.connect();
      
      const updates: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      if (data.layout !== undefined) {
        updates.push(`layout = $${paramIndex++}`);
        params.push(data.layout);
      }

      if (data.theme !== undefined) {
        updates.push(`theme = $${paramIndex++}`);
        params.push(data.theme);
      }

      if (data.published !== undefined) {
        updates.push(`published = $${paramIndex++}`);
        params.push(data.published);
      }

      updates.push(`"updatedAt" = $${paramIndex++}`);
      params.push(new Date());

      params.push(id); // for WHERE clause

      const sql = `
        UPDATE "pages" 
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const { rows } = await client.query(sql, params);
      return rows[0] as Page;
    } finally {
      await this.closeClient(client);
    }
  }

  async delete(id: string): Promise<void> {
    const client = this.getClient();
    
    try {
      await client.connect();
      
      const sql = `DELETE FROM "pages" WHERE id = $1`;
      await client.query(sql, [id]);
    } finally {
      await this.closeClient(client);
    }
  }

  async findAll(): Promise<Page[]> {
    const client = this.getClient();
    
    try {
      await client.connect();
      
      const sql = `SELECT * FROM "pages" ORDER BY "createdAt" DESC`;
      const { rows } = await client.query(sql);
      return rows as Page[];
    } finally {
      await this.closeClient(client);
    }
  }

  async count(): Promise<number> {
    const client = this.getClient();
    
    try {
      await client.connect();
      
      const sql = `SELECT COUNT(*) as count FROM "pages"`;
      const { rows } = await client.query(sql);
      return parseInt(rows[0].count);
    } finally {
      await this.closeClient(client);
    }
  }

  async findWithLinks(id: string): Promise<PageWithLinks | null> {
    const client = this.getClient();
    
    try {
      await client.connect();
      
      // First get the page
      const pageSql = `SELECT * FROM "pages" WHERE id = $1`;
      const { rows: pageRows } = await client.query(pageSql, [id]);
      
      if (pageRows.length === 0) {
        return null;
      }
      
      const page = pageRows[0] as Page;
      
      // Then get the links for this page
      const linksSql = `SELECT * FROM "links" WHERE "pageId" = $1 ORDER BY position ASC`;
      const { rows: linkRows } = await client.query(linksSql, [id]);
      
      const links = linkRows as Link[];
      
      return {
        ...page,
        links,
      };
    } finally {
      await this.closeClient(client);
    }
  }

  async insertLinks(pageId: string, links: Array<{ title: string; url: string; position?: number; active?: boolean }>): Promise<number> {
    if (!links.length) return 0;
    const client = this.getClient();
    try {
      await client.connect();
      let inserted = 0;
      for (let i = 0; i < links.length; i++) {
        const l = links[i];
        const sql = `
          INSERT INTO "links" (id, "pageId", title, url, position, active, "createdAt", "updatedAt")
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `;
        const id = `link_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        const now = new Date();
        const position = l.position ?? i;
        const active = l.active ?? true;
        await client.query(sql, [id, pageId, l.title, l.url, position, active, now, now]);
        inserted++;
      }
      return inserted;
    } finally {
      await this.closeClient(client);
    }
  }

  async replaceLinks(pageId: string, links: Array<{ title: string; url: string; position?: number; active?: boolean }>): Promise<number> {
    const client = this.getClient();
    try {
      await client.connect();
      await client.query('BEGIN');

      await client.query(`DELETE FROM "links" WHERE "pageId" = $1`, [pageId]);

      let inserted = 0;
      for (let i = 0; i < links.length; i++) {
        const l = links[i];
        const sql = `
          INSERT INTO "links" (id, "pageId", title, url, position, active, "createdAt", "updatedAt")
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        `;
        const id = `link_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        const now = new Date();
        const position = l.position ?? i;
        const active = l.active ?? true;
        await client.query(sql, [id, pageId, l.title, l.url, position, active, now, now]);
        inserted++;
      }

      await client.query('COMMIT');
      return inserted;
    } catch (e) {
      try { await client.query('ROLLBACK'); } catch {}
      throw e;
    } finally {
      await this.closeClient(client);
    }
  }
}

// Export singleton instance
export const pageRepository = new PageRepository();