// Common types used across the application

// Environment types
export type Environment = 'development' | 'staging' | 'production';

// Database entity base interface
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

// User entity interface
export interface User extends BaseEntity {
  email: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
  lastLoginAt?: Date;
  plan?: string;
}

// User creation data
export interface CreateUserData {
  email: string;
  username?: string;
}

// User update data
export interface UpdateUserData {
  email?: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
  lastLoginAt?: Date;
}

// Page entity interface
export interface Page extends BaseEntity {
  userId: string;
  layout?: string;
  theme?: string;
  published?: boolean;
  viewsAllTime?: number;
}

// Page creation data
export interface CreatePageData {
  userId: string;
}

// Page update data
export interface UpdatePageData {
  layout?: string;
  theme?: string;
  published?: boolean;
}

// Link entity interface
export interface Link extends BaseEntity {
  pageId: string;
  title: string;
  url: string;
  position: number;
  active?: boolean;
}

// Page with links interface
export interface PageWithLinks extends Page {
  links: Link[];
}

// Setup state entity interface
export interface SetupState extends BaseEntity {
  userId: string;
  firstSaveCompleted: boolean;
  checklist: {
    displayNameAvatar: { done: boolean; ts: string | null };
    addLinks3Plus: { done: boolean; ts: string | null };
    chooseTheme: { done: boolean; ts: string | null };
    addBio: { done: boolean; ts: string | null };
    copyLinkToTikTok: { done: boolean; ts: string | null };
  };
}

// API response wrapper
export interface ApiResponse<T = any> {
  ok: boolean;
  data?: T;
  error?: string;
  code?: string;
  details?: Record<string, any>;
}

// Paginated response
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
