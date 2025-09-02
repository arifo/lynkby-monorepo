import { databaseService } from "./index";

// Page data types
export interface CreatePageData {
  userId: string;
  displayName: string;
  bio?: string;
  avatarUrl?: string;
}

export interface UpdatePageData {
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
}

export interface Page {
  id: string;
  userId: string;
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PageWithLinks extends Page {
  links: Link[];
}

export interface Link {
  id: string;
  pageId: string;
  label: string;
  url: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

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
}

// Page repository implementation
export class PageRepository implements IPageRepository {
  
  async create(data: CreatePageData): Promise<Page> {
    return databaseService.executeWithRetry(
      async () => {
        const sql = `
          INSERT INTO "pages" (id, "userId", "displayName", bio, "avatarUrl", "createdAt", "updatedAt")
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *
        `;
        
        const id = `page_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const now = new Date();
        const params = [id, data.userId, data.displayName, data.bio, data.avatarUrl, now, now];
        
        const result = await databaseService.query(sql, params);
        return result[0] as Page;
      },
      "create page"
    );
  }

  async findById(id: string): Promise<Page | null> {
    return databaseService.executeWithRetry(
      async () => {
        const sql = `SELECT * FROM "pages" WHERE id = $1`;
        const result = await databaseService.query(sql, [id]);
        return result.length > 0 ? result[0] as Page : null;
      },
      "find page by id"
    );
  }

  async findByUserId(userId: string): Promise<Page | null> {
    return databaseService.executeWithRetry(
      async () => {
        const sql = `SELECT * FROM "pages" WHERE "userId" = $1`;
        const result = await databaseService.query(sql, [userId]);
        return result.length > 0 ? result[0] as Page : null;
      },
      "find page by user id"
    );
  }

  async findByUsername(username: string): Promise<Page | null> {
    return databaseService.executeWithRetry(
      async () => {
        const sql = `
          SELECT p.* FROM "pages" p
          JOIN "users" u ON p."userId" = u.id
          WHERE u.username = $1
        `;
        const result = await databaseService.query(sql, [username]);
        return result.length > 0 ? result[0] as Page : null;
      },
      "find page by username"
    );
  }

  async update(id: string, data: UpdatePageData): Promise<Page> {
    return databaseService.executeWithRetry(
      async () => {
        const updates: string[] = [];
        const params: any[] = [];
        let paramIndex = 1;

        if (data.displayName !== undefined) {
          updates.push(`"displayName" = $${paramIndex++}`);
          params.push(data.displayName);
        }

        if (data.bio !== undefined) {
          updates.push(`bio = $${paramIndex++}`);
          params.push(data.bio);
        }

        if (data.avatarUrl !== undefined) {
          updates.push(`"avatarUrl" = $${paramIndex++}`);
          params.push(data.avatarUrl);
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

        const result = await databaseService.query(sql, params);
        return result[0] as Page;
      },
      "update page"
    );
  }

  async delete(id: string): Promise<void> {
    return databaseService.executeWithRetry(
      async () => {
        const sql = `DELETE FROM "pages" WHERE id = $1`;
        await databaseService.execute(sql, [id]);
      },
      "delete page"
    );
  }

  async findAll(): Promise<Page[]> {
    return databaseService.executeWithRetry(
      async () => {
        const sql = `SELECT * FROM "pages" ORDER BY "createdAt" DESC`;
        const result = await databaseService.query(sql);
        return result as Page[];
      },
      "find all pages"
    );
  }

  async count(): Promise<number> {
    return databaseService.executeWithRetry(
      async () => {
        const sql = `SELECT COUNT(*) as count FROM "pages"`;
        const result = await databaseService.query(sql);
        return parseInt(result[0].count);
      },
      "count pages"
    );
  }

  async findWithLinks(id: string): Promise<PageWithLinks | null> {
    return databaseService.executeWithRetry(
      async () => {
        // First get the page
        const pageSql = `SELECT * FROM "pages" WHERE id = $1`;
        const pageResult = await databaseService.query(pageSql, [id]);
        
        if (pageResult.length === 0) {
          return null;
        }

        const page = pageResult[0] as Page;

        // Then get the links
        const linksSql = `SELECT * FROM "links" WHERE "pageId" = $1 ORDER BY "order" ASC`;
        const linksResult = await databaseService.query(linksSql, [id]);
        const links = linksResult as Link[];

        return {
          ...page,
          links
        };
      },
      "find page with links"
    );
  }
}

// Export singleton instance
export const pageRepository = new PageRepository();
