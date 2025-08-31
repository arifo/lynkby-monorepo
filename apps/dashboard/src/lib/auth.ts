import jwt from "jsonwebtoken";

export interface User {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  createdAt: Date;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

interface JwtPayload {
  sub: string;
  email?: string;
  name?: string;
  avatar?: string;
  iat: number;
  exp: number;
}

export function decodeToken(token: string): User | null {
  try {
    const decoded = jwt.decode(token) as JwtPayload | null;
    if (!decoded || !decoded.sub) return null;
    
    return {
      id: decoded.sub,
      email: decoded.email || "",
      name: decoded.name || "",
      avatar: decoded.avatar || "",
      createdAt: new Date(decoded.iat * 1000),
    };
  } catch (error: unknown) {
    console.error("Error decoding token:", error);
    return null;
  }
}

export function isTokenExpired(token: string): boolean {
  try {
    const decoded = jwt.decode(token) as JwtPayload | null;
    if (!decoded || !decoded.exp) return true;
    
    const currentTime = Math.floor(Date.now() / 1000);
    return decoded.exp < currentTime;
  } catch (error: unknown) {
    return true;
  }
}

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("lynkby_token");
}

export function setStoredToken(token: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("lynkby_token", token);
}

export function removeStoredToken(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("lynkby_token");
}
