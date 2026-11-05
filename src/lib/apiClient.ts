import { clearTokens, expireAccessTokenNow, getTokens, isAccessTokenExpired, saveTokens } from './auth';
import { fakeServer } from './fakeServer';

/**
 * One fetch wrapper for the whole app.
 *
 * - Base URL comes from `VITE_API_URL`. Unset → requests go to the in-memory
 *   demo server (src/lib/fakeServer.ts), so the app runs with no backend.
 * - Attaches the access token, and on a 401 with a refresh token it silently
 *   refreshes (rotation, mirroring jwt-auth-deepdive) and retries once.
 * - Throws an Error with the server's message so useQuery/useMutation get a
 *   usable `error.message` instead of a bare Response.
 */

const BASE_URL = import.meta.env.VITE_API_URL as string | undefined;

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  /** Skip the silent-refresh retry (used by the refresh call itself). */
  noRetry?: boolean;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const tokens = getTokens();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (tokens?.accessToken) headers['Authorization'] = `Bearer ${tokens.accessToken}`;

  let response: { status: number; body: unknown };
  if (BASE_URL) {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: options.method ?? 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    });
    const body = res.status === 204 ? null : await res.json().catch(() => null);
    response = { status: res.status, body };
  } else {
    const url = new URL(path, 'http://demo.local');
    response = await fakeServer.handle(
      options.method ?? 'GET',
      url.pathname,
      url.searchParams,
      headers,
      options.body,
    );
  }

  if (response.status === 401 && tokens?.refreshToken && !options.noRetry) {
    // Silent refresh: swap the token pair and replay the original request once.
    const refreshed = await refreshTokens(tokens.refreshToken);
    if (refreshed) return request<T>(path, options);
    clearTokens();
    throw new ApiError(401, 'Session expired. Please log in again.');
  }

  if (response.status >= 400) {
    const message =
      (response.body as { error?: string } | null)?.error ??
      `Request failed with status ${response.status}`;
    throw new ApiError(response.status, message);
  }
  return response.body as T;
}

async function refreshTokens(refreshToken: string) {
  try {
    const tokens = await request<{ accessToken: string; refreshToken: string; accessTokenExpiresAt: string }>(
      '/api/auth/refresh',
      { method: 'POST', body: { refreshToken }, noRetry: true },
    );
    saveTokens(tokens);
    return true;
  } catch {
    return false;
  }
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) => request<T>(path, { method: 'POST', body }),
  patch: <T>(path: string, body: unknown) => request<T>(path, { method: 'PATCH', body }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),

  /** Demo helper: expire the access token so the next call must refresh. */
  expireAccessTokenNow,
  isAccessTokenExpired,
};
