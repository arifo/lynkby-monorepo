// Minimal session helpers placeholder
export function signJWT(payload: object, secret: string): string {
  // Implement with jose/jsonwebtoken in real code
  return btoa(JSON.stringify(payload)) + '.' + btoa(secret);
}

export function verifyJWT(token: string, secret: string): boolean {
  return token.endsWith('.' + btoa(secret));
}

