import { z } from "zod";

/**
 * Validate username according to business rules
 */
export function validateUsername(username: string): { isValid: boolean; reason?: string } {
  // Check length
  if (username.length < 3) {
    return { isValid: false, reason: 'Username must be at least 3 characters long' };
  }
  
  if (username.length > 30) {
    return { isValid: false, reason: 'Username must be no more than 30 characters long' };
  }

  // Check characters
  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    return { isValid: false, reason: 'Username can only contain letters, numbers, underscores, and hyphens' };
  }

  // Check reserved words
  const reservedWords = [
    'admin', 'api', 'app', 'www', 'mail', 'ftp', 'blog', 'help', 'support', 'status', 'docs',
    'login', 'logout', 'signup', 'auth', 'dashboard', 'profile', 'settings', 'lynkby'
  ];
  
  if (reservedWords.includes(username.toLowerCase())) {
    return { isValid: false, reason: 'This username is reserved and cannot be used' };
  }

  return { isValid: true };
}

/**
 * Validate URL format
 */
export function validateUrl(url: string): { isValid: boolean; reason?: string } {
  try {
    new URL(url);
    return { isValid: true };
  } catch {
    return { isValid: false, reason: 'Invalid URL format' };
  }
}

/**
 * Sanitize string input
 */
export function sanitizeString(input: string, maxLength: number = 1000): string {
  return input
    .trim()
    .slice(0, maxLength)
    .replace(/[<>]/g, ''); // Remove potential HTML tags
}

/**
 * Generate a slug from a string
 */
export function generateSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Check if a string is a valid UUID
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Generate a random string
 */
export function generateRandomString(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
