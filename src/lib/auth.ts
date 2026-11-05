/**
 * Tiny token store. Access + refresh tokens live in localStorage (the demo
 * keeps it simple); a production app should prefer httpOnly cookies — see
 * docs/patterns.md "Where do tokens live?".
 *
 * Shape mirrors the sibling jwt-auth-deepdive repo:
 *   { accessToken, refreshToken, accessTokenExpiresAt }
 */

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string; // ISO timestamp
}

const ACCESS_KEY = 'rq-dotnet.accessToken';
const REFRESH_KEY = 'rq-dotnet.refreshToken';
const EXPIRY_KEY = 'rq-dotnet.accessTokenExpiresAt';

export function getTokens(): AuthTokens | null {
  const accessToken = localStorage.getItem(ACCESS_KEY);
  const refreshToken = localStorage.getItem(REFRESH_KEY);
  const accessTokenExpiresAt = localStorage.getItem(EXPIRY_KEY);
  if (!accessToken || !refreshToken || !accessTokenExpiresAt) return null;
  return { accessToken, refreshToken, accessTokenExpiresAt };
}

export function saveTokens(tokens: AuthTokens): void {
  localStorage.setItem(ACCESS_KEY, tokens.accessToken);
  localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
  localStorage.setItem(EXPIRY_KEY, tokens.accessTokenExpiresAt);
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(EXPIRY_KEY);
}

export function isAccessTokenExpired(tokens: AuthTokens): boolean {
  return new Date(tokens.accessTokenExpiresAt).getTime() <= Date.now();
}

/** Test/demo helper: force the stored access token to look expired. */
export function expireAccessTokenNow(): void {
  const tokens = getTokens();
  if (tokens) {
    localStorage.setItem(
      EXPIRY_KEY,
      new Date(Date.now() - 1000).toISOString(),
    );
  }
}
