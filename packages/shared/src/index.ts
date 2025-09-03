// Legacy exports (keeping for backward compatibility)
import { z } from "zod";

export const LinkSchema = z.object({
  label: z.string(),
  url: z.string().url(),
  order: z.number().optional()
});

export const ProfileSchema = z.object({
  username: z.string().regex(/^[a-z0-9_]+$/i),
  displayName: z.string(),
  bio: z.string().optional(),
  avatarUrl: z.string().url().optional(),
  links: z.array(LinkSchema)
});

export type Profile = z.infer<typeof ProfileSchema>;

export const mockProfiles: Record<string, Profile> = {
  testuser: {
    username: "testuser",
    displayName: "Test User",
    bio: "This is a placeholder Lynkby page. Ultra-fast, TikTok-friendly.",
    avatarUrl: "https://placehold.co/128x128/png",
    links: [
      { label: "My TikTok", url: "https://www.tiktok.com/@" },
      { label: "Shop", url: "https://example.com/shop" },
      { label: "YouTube", url: "https://youtube.com" }
    ]
  }
};

export function getProfile(username: string) {
  const key = username.toLowerCase();
  return mockProfiles[key] ?? null;
}

// New shared exports
// Schemas
export * from './schemas/auth';
export * from './schemas/setup';
export * from './schemas/common';

// Types
export * from './types/auth';
export * from './types/setup';
export * from './types/token';
export * from './types/common';

// Utils
export * from './utils/token';
export * from './utils/ip';
export * from './utils/email';
export * from './utils/validation';

// Constants
export * from './constants/username';
