// Dashboard-specific user type (subset of AuthUser for API responses)
export interface User {
  id: string;
  email: string;
  username?: string;
  isNewUser?: boolean;
  // Optional properties that may not be present in API responses
  createdAt?: Date;
  updatedAt?: Date;
  lastLoginAt?: Date;
  isVerified?: boolean;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface Session {
  expiresAt: string;
  maxAge: number;
}

// Cookie management for session-based auth
export function getCookie(name: string): string | null {
  if (typeof window === "undefined") return null;
  
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null;
  }
  return null;
}

export function setCookie(name: string, value: string, options: {
  expires?: Date;
  maxAge?: number;
  path?: string;
  domain?: string;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
} = {}): void {
  if (typeof window === "undefined") return;
  
  let cookie = `${name}=${value}`;
  
  if (options.expires) {
    cookie += `; expires=${options.expires.toUTCString()}`;
  }
  
  if (options.maxAge) {
    cookie += `; max-age=${options.maxAge}`;
  }
  
  if (options.path) {
    cookie += `; path=${options.path}`;
  }
  
  if (options.domain) {
    cookie += `; domain=${options.domain}`;
  }
  
  if (options.secure) {
    cookie += `; secure`;
  }
  
  if (options.sameSite) {
    cookie += `; samesite=${options.sameSite}`;
  }
  
  document.cookie = cookie;
}

export function removeCookie(name: string, options: {
  path?: string;
  domain?: string;
} = {}): void {
  if (typeof window === "undefined") return;
  
  setCookie(name, '', {
    ...options,
    expires: new Date(0),
    maxAge: 0,
  });
}

// Check if user has an active session
// Note: With HttpOnly cookies, we can't read the session token directly
// We use a local storage flag to track authentication state
export function hasActiveSession(): boolean {
  if (typeof window === "undefined") return false;
  
  try {
    // Check if we have a local flag indicating an active session
    const hasSession = localStorage.getItem('lynkby_has_session');
    return hasSession === 'true';
  } catch {
    return false;
  }
}

// Set session flag in localStorage
export function setSessionFlag(hasSession: boolean): void {
  if (typeof window === "undefined") return;
  
  try {
    if (hasSession) {
      localStorage.setItem('lynkby_has_session', 'true');
    } else {
      localStorage.removeItem('lynkby_has_session');
    }
  } catch {
    // Ignore localStorage errors
  }
}

// Clear all auth-related cookies and session flag
export function clearAuthCookies(): void {
  removeCookie('session_token', { path: '/' });
  removeCookie('session_token', { path: '/', domain: '.lynkby.com' });
  setSessionFlag(false);
}
