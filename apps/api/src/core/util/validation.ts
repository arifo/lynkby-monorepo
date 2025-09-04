// Business validation rules according to PAGES.MD specification

export const USERNAME_RULES = {
  MIN_LENGTH: 3,
  MAX_LENGTH: 24,
  ALLOWED_CHARS: /^[a-z0-9_]+$/,
  RESERVED_WORDS: new Set([
    "www", "app", "api", "admin", "support", "blog", "cdn", "static", 
    "docs", "pricing", "status", "dashboard", "help", "mail", "dev", "stage"
  ])
} as const;

export const LINK_RULES = {
  MAX_LINKS: 50,
  MAX_TITLE_LENGTH: 80,
  MAX_URL_LENGTH: 2048,
  ALLOWED_URL_SCHEMES: ['https:', 'mailto:', 'tel:'] as const
} as const;

export const THEME_PRESETS = {
  CLASSIC: "classic",
  CONTRAST: "contrast", 
  WARM: "warm"
} as const;

export const VALID_THEMES = new Set(['classic', 'contrast', 'warm'] as const);

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export function validateUsername(username: string): ValidationResult {
  if (!username || username.trim().length === 0) {
    return { isValid: false, error: "Username is required" };
  }

  const normalized = username.toLowerCase().trim();

  if (normalized.length < USERNAME_RULES.MIN_LENGTH) {
    return { isValid: false, error: `Username must be at least ${USERNAME_RULES.MIN_LENGTH} characters` };
  }

  if (normalized.length > USERNAME_RULES.MAX_LENGTH) {
    return { isValid: false, error: `Username must be no more than ${USERNAME_RULES.MAX_LENGTH} characters` };
  }

  if (!USERNAME_RULES.ALLOWED_CHARS.test(normalized)) {
    return { isValid: false, error: "Username can only contain lowercase letters, numbers, and underscores" };
  }

  if (USERNAME_RULES.RESERVED_WORDS.has(normalized)) {
    return { isValid: false, error: "This username is reserved and cannot be used" };
  }

  return { isValid: true };
}

export function validateUrl(url: string): ValidationResult {
  if (!url || url.trim().length === 0) {
    return { isValid: false, error: "URL is required" };
  }

  if (url.length > LINK_RULES.MAX_URL_LENGTH) {
    return { isValid: false, error: `URL must be no more than ${LINK_RULES.MAX_URL_LENGTH} characters` };
  }

  try {
    const parsedUrl = new URL(url);
    
    if (!LINK_RULES.ALLOWED_URL_SCHEMES.includes(parsedUrl.protocol as any)) {
      return { 
        isValid: false, 
        error: `URL must start with ${LINK_RULES.ALLOWED_URL_SCHEMES.join(', ')}` 
      };
    }

    return { isValid: true };
  } catch {
    return { isValid: false, error: "Invalid URL format" };
  }
}

export function validateLinkTitle(title: string): ValidationResult {
  if (!title || title.trim().length === 0) {
    return { isValid: false, error: "Link title is required" };
  }

  if (title.length > LINK_RULES.MAX_TITLE_LENGTH) {
    return { isValid: false, error: `Link title must be no more than ${LINK_RULES.MAX_TITLE_LENGTH} characters` };
  }

  return { isValid: true };
}

export function validateTheme(theme: string): ValidationResult {
  if (!theme || !VALID_THEMES.has(theme as any)) {
    return { 
      isValid: false, 
      error: `Theme must be one of: ${Array.from(VALID_THEMES).join(', ')}` 
    };
  }

  return { isValid: true };
}

export function validateLinksCount(count: number): ValidationResult {
  if (count > LINK_RULES.MAX_LINKS) {
    return { 
      isValid: false, 
      error: `Maximum ${LINK_RULES.MAX_LINKS} links allowed` 
    };
  }

  return { isValid: true };
}

export function validateDisplayName(displayName: string): ValidationResult {
  if (!displayName || displayName.trim().length === 0) {
    return { isValid: false, error: "Display name is required" };
  }

  if (displayName.length > 255) {
    return { isValid: false, error: "Display name must be no more than 255 characters" };
  }

  return { isValid: true };
}

export function validateBio(bio: string): ValidationResult {
  if (bio && bio.length > 280) {
    return { isValid: false, error: "Bio must be no more than 280 characters" };
  }

  return { isValid: true };
}
