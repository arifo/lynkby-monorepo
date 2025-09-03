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
