// Repository-related types and interfaces
import type { 
  User, 
  CreateUserData, 
  UpdateUserData, 
  Page, 
  CreatePageData, 
  UpdatePageData, 
  Link, 
  PageWithLinks
} from './common';
import type { 
  MagicLinkToken,
  UserSession
} from './auth';

// Auth repository interfaces
export interface CreateMagicLinkTokenData {
  id: string;
  email: string;
  tokenHash: string;
  createdAt: Date;
  expiresAt: Date;
  ipCreatedFrom?: string;
  uaCreatedFrom?: string;
  redirectPath?: string;
}

export interface CreateUserSessionData {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
  lastUsedAt: Date;
  ipAddress?: string;
  userAgent?: string;
}

export interface UpdateSessionData {
  lastUsedAt?: Date;
  expiresAt?: Date;
  revokedAt?: Date;
}

// Page repository interfaces
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

// User repository interfaces
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

// Auth repository interfaces
export interface IAuthRepository {
  // Magic link token operations
  saveMagicLinkToken(data: CreateMagicLinkTokenData): Promise<void>;
  findMagicLinkTokenByHash(tokenHash: string): Promise<MagicLinkToken | null>;
  markTokenAsUsed(tokenId: string): Promise<void>;
  deleteExpiredMagicLinkTokens(): Promise<void>;
  
  // User session operations
  saveUserSession(data: CreateUserSessionData): Promise<void>;
  findSessionByHash(tokenHash: string): Promise<UserSession | null>;
  updateSessionUsage(sessionId: string, lastUsedAt: Date, expiresAt: Date): Promise<void>;
  revokeSession(sessionId: string): Promise<void>;
  deleteSession(sessionId: string): Promise<void>;
  deleteExpiredSessions(): Promise<void>;
  revokeAllUserSessions(userId: string): Promise<void>;
}

// Re-export common types for convenience
export type { 
  User, 
  CreateUserData, 
  UpdateUserData, 
  Page, 
  CreatePageData, 
  UpdatePageData, 
  Link, 
  PageWithLinks
} from './common';
export type { 
  MagicLinkToken,
  UserSession
} from './auth';
