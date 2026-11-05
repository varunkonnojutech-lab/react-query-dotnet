import { useState } from 'react';
import { useLogin, useLogout, useMe } from '../hooks/useAuth';
import { apiClient } from '../lib/apiClient';
import { getTokens } from '../lib/auth';

export function AuthPanel() {
  const [email, setEmail] = useState('demo@example.com');
  const [password, setPassword] = useState('password1234');
  const [refreshedAt, setRefreshedAt] = useState<string | null>(null);

  const login = useLogin();
  const logout = useLogout();
  const me = useMe();

  const tokens = getTokens();
  const loggedIn = tokens !== null;

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    login.mutate({ email, password });
  }

  /** Force the access token to expire, then hit /me — the silent refresh in apiClient must save the call. */
  async function handleExpireAndRefetch() {
    apiClient.expireAccessTokenNow();
    setRefreshedAt(null);
    const started = Date.now();
    await me.refetch();
    setRefreshedAt(`Refetched in ${Date.now() - started}ms with a fresh token — no login prompt.`);
  }

  return (
    <section>
      <h2>Auth — dependent query + silent refresh</h2>
      <p>
        Login posts to <code>/api/auth/login</code> (the same shape as the sibling{' '}
        <code>jwt-auth-deepdive</code> repo). The profile below is a dependent query: it only
        runs once a token exists (<code>enabled: hasToken</code>). Access tokens live 2
        minutes; when one expires mid-session, <code>apiClient</code> refreshes it silently
        and replays the failed request.
      </p>

      {!loggedIn && (
        <form onSubmit={handleLogin} className="auth-form">
          <label>
            Email
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
          </label>
          <label>
            Password
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
          </label>
          <button type="submit" disabled={login.isPending}>
            {login.isPending ? 'Logging in…' : 'Log in'}
          </button>
          <span className="muted">Demo account is pre-filled.</span>
        </form>
      )}
      {login.isError && <p className="error">Login failed: {login.error.message}</p>}

      {loggedIn && (
        <div className="toolbar">
          <button onClick={handleExpireAndRefetch} disabled={me.isFetching}>
            Expire my token, then refetch /me
          </button>
          <button className="danger" onClick={() => logout.mutate()} disabled={logout.isPending}>
            Log out
          </button>
        </div>
      )}

      {me.isPending && loggedIn && <p>Loading profile…</p>}
      {me.isError && <p className="error">Profile failed: {me.error.message}</p>}
      {me.data && (
        <div className="profile">
          <p>
            <strong>{me.data.name}</strong> · {me.data.email} · role: {me.data.role}
          </p>
          <p className="muted">
            Access token expires at{' '}
            {tokens ? new Date(tokens.accessTokenExpiresAt).toLocaleTimeString() : '—'}
          </p>
          {refreshedAt && <p className="success">{refreshedAt}</p>}
        </div>
      )}
      {!loggedIn && <p className="muted">Log in to load your profile — the query stays disabled until then.</p>}
    </section>
  );
}
