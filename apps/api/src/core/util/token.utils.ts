import jwt from "jsonwebtoken";
import crypto from "crypto";
import { JWT_CONFIG } from "../env";

// JWT payload interface
export interface JWTPayload {
  userId: string;
  email: string;
  username?: string;
  iat?: number;
  exp?: number;
}

// Magic link token payload interface
export interface MagicLinkPayload {
  email: string;
  tokenId: string;
  type: 'magic_link';
  iat?: number;
  exp?: number;
}

// JWT utility functions
export const tokenUtils = {
  // Generate access token
  generateAccessToken: (
    payload: Omit<JWTPayload, "iat" | "exp">, 
    secret: string, 
    expiresIn: string = JWT_CONFIG.DEFAULT_EXPIRES_IN
  ): string => {
    return jwt.sign(payload, secret, { 
      expiresIn: expiresIn as jwt.SignOptions["expiresIn"]
    });
  },
  
  // Generate refresh token
  generateRefreshToken: (
    payload: Omit<JWTPayload, "iat" | "exp">, 
    secret: string
  ): string => {
    return jwt.sign(payload, secret, { 
      expiresIn: JWT_CONFIG.REFRESH_EXPIRES_IN as jwt.SignOptions["expiresIn"]
    });
  },

  // Generate magic link token
  generateMagicLinkToken: (
    payload: Omit<MagicLinkPayload, "iat" | "exp">,
    secret: string,
    expiresIn: string = "15m" // 15 minutes
  ): string => {
    return jwt.sign(payload, secret, { 
      expiresIn: expiresIn as jwt.SignOptions["expiresIn"]
    });
  },

  // Generate session token
  generateSessionToken: (
    payload: Omit<JWTPayload, "iat" | "exp">,
    secret: string,
    expiresIn: string = "30d" // 30 days
  ): string => {
    return jwt.sign(payload, secret, { 
      expiresIn: expiresIn as jwt.SignOptions["expiresIn"]
    });
  },
  
  // Verify and decode token
  verifyToken: (token: string, secret: string): JWTPayload => {
    try {
      const decoded = jwt.verify(token, secret) as JWTPayload;
      return decoded;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : "Invalid token");
    }
  },

  // Verify magic link token
  verifyMagicLinkToken: (token: string, secret: string): MagicLinkPayload => {
    try {
      const decoded = jwt.verify(token, secret) as MagicLinkPayload;
      return decoded;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : "Invalid magic link token");
    }
  },

  // Decode token without verification (for inspection only)
  decodeToken: (token: string): JWTPayload | null => {
    try {
      const decoded = jwt.decode(token) as JWTPayload;
      return decoded;
    } catch {
      return null;
    }
  },

  // Check if token is expired
  isTokenExpired: (token: string, secret: string): boolean => {
    try {
      const decoded = jwt.verify(token, secret) as JWTPayload;
      if (!decoded.exp) return true;
      return Date.now() >= decoded.exp * 1000;
    } catch {
      return true;
    }
  },

  // Get token expiration time
  getTokenExpiration: (token: string, secret: string): Date | null => {
    try {
      const decoded = jwt.verify(token, secret) as JWTPayload;
      if (!decoded.exp) return null;
      return new Date(decoded.exp * 1000);
    } catch {
      return null;
    }
  },

  // Refresh token if it's close to expiring (within threshold)
  shouldRefreshToken: (
    token: string, 
    secret: string, 
    thresholdMinutes: number = 30
  ): boolean => {
    try {
      const decoded = jwt.verify(token, secret) as JWTPayload;
      if (!decoded.exp) return true;
      
      const expirationTime = decoded.exp * 1000;
      const thresholdTime = Date.now() + (thresholdMinutes * 60 * 1000);
      
      return expirationTime <= thresholdTime;
    } catch {
      return true;
    }
  },

  // Hash a token for secure storage
  hashToken: (token: string): string => {
    return crypto.createHash('sha256').update(token).digest('hex');
  },

  // Generate a secure random token
  generateSecureToken: (length: number = 32): string => {
    return crypto.randomBytes(length / 2).toString('hex');
  },
} as const;
