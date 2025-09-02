import { RESERVED_USERNAMES } from "../env";

export type UsernameReason =
  | "INVALID_FORMAT"
  | "RESERVED"
  | "TAKEN"
  | "PROFANE";

export const USERNAME_REGEX = /^(?!xn--)[a-z](?:[a-z0-9-]{1,18}[a-z0-9])$/;

export function normalizeUsername(input: string): string {
  return (input || "").trim().toLowerCase();
}

export function isPunycode(u: string): boolean {
  return u.startsWith("xn--");
}

export function hasBadHyphen(u: string): boolean {
  return u.includes("--");
}

export function isReserved(u: string): boolean {
  return RESERVED_USERNAMES.has(u);
}

// Minimal profanity check placeholder (expand in production)
const SIMPLE_PROFANITY = new Set([
  "fuck",
  "shit",
  "bitch",
  "asshole",
]);

export function isProfane(u: string): boolean {
  // naive contains check; expand/replace with proper dictionary later
  for (const p of SIMPLE_PROFANITY) {
    if (u.includes(p)) return true;
  }
  return false;
}

export function validateUsername(input: string): {
  normalized: string;
  valid: boolean;
  reasons: UsernameReason[];
} {
  const normalized = normalizeUsername(input);
  const reasons: UsernameReason[] = [];

  if (!USERNAME_REGEX.test(normalized) || isPunycode(normalized) || hasBadHyphen(normalized)) {
    reasons.push("INVALID_FORMAT");
  }
  if (isReserved(normalized)) {
    reasons.push("RESERVED");
  }
  if (isProfane(normalized)) {
    reasons.push("PROFANE");
  }

  return { normalized, valid: reasons.length === 0, reasons };
}

