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
  lastLoginAt?: Date;
}

// Page entity interface
export interface Page extends BaseEntity {
  userId: string;
  displayName: string;
  bio?: string;
  avatarUrl?: string;
}

// Link entity interface
export interface Link extends BaseEntity {
  pageId: string;
  label: string;
  url: string;
  order: number;
}

// Page with links interface
export interface PageWithLinks extends Page {
  links: Link[];
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
