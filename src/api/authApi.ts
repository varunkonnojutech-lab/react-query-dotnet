import { apiClient } from '../lib/apiClient';
import type { AuthTokens } from '../lib/auth';

export interface Me {
  id: string;
  email: string;
  name: string;
  role: string;
}

export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post<AuthTokens>('/api/auth/login', { email, password }),

  logout: (refreshToken: string) =>
    apiClient.post<void>('/api/auth/logout', { refreshToken }),

  me: () => apiClient.get<Me>('/api/auth/me'),
};
