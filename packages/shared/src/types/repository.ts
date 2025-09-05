// Repository-related types and interfaces
import type { 
  User, 
  CreateUserData, 
  UpdateUserData, 
  Page, 
  CreatePageData, 
  UpdatePageData, 
  Link, 
  PageWithLinks,
  SetupState
} from './common';
import type { 
  UserSession,
  OtpToken
} from './auth';

// Auth repository interfaces
export interface CreateOtpTokenData {
  id: string;
  email: string;
  codeHash: string;
  createdAt: Date;
  expiresAt: Date;
  attempts: number;
  ipCreatedFrom?: string;
  uaCreatedFrom?: string;
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

// Setup state creation data
export interface CreateSetupStateData {
  userId: string;
  firstSaveCompleted?: boolean;
  checklist?: {
    displayNameAvatar: { done: boolean; ts: string | null };
    addLinks3Plus: { done: boolean; ts: string | null };
    chooseTheme: { done: boolean; ts: string | null };
    addBio: { done: boolean; ts: string | null };
    copyLinkToTikTok: { done: boolean; ts: string | null };
  };
}

// Setup state update data
export interface UpdateSetupStateData {
  firstSaveCompleted?: boolean;
  checklist?: {
    displayNameAvatar: { done: boolean; ts: string | null };
    addLinks3Plus: { done: boolean; ts: string | null };
    chooseTheme: { done: boolean; ts: string | null };
    addBio: { done: boolean; ts: string | null };
    copyLinkToTikTok: { done: boolean; ts: string | null };
  };
}

// Setup state repository interface
export interface ISetupStateRepository {
  create(data: CreateSetupStateData): Promise<SetupState>;
  findByUserId(userId: string): Promise<SetupState | null>;
  update(userId: string, data: UpdateSetupStateData): Promise<SetupState>;
  delete(userId: string): Promise<void>;
}

// Auth repository interfaces
export interface IAuthRepository {
  // OTP token operations
  saveOtpToken(data: CreateOtpTokenData): Promise<void>;
  findMostRecentOtpToken(email: string): Promise<OtpToken | null>;
  incrementOtpAttempts(tokenId: string): Promise<void>;
  markOtpAsConsumed(tokenId: string): Promise<void>;
  deleteExpiredOtpTokens(): Promise<void>;
  
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
  PageWithLinks,
  SetupState
} from './common';
export type { 
  UserSession
} from './auth';
