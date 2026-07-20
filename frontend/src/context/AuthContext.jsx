import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const AuthContext = createContext(null);
const AUTH_STORAGE_KEY = 'cto_auth_state';

export function AuthProvider({ children }) {
  const [authState, setAuthState] = useState(() => {
    if (typeof window === 'undefined') {
      return { token: null, user: null };
    }

    try {
      const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
      return raw ? JSON.parse(raw) : { token: null, user: null };
    } catch {
      return { token: null, user: null };
    }
  });

  const login = useCallback((payload) => {
    const nextState = {
      token: payload.token,
      user: payload.user,
    };

    setAuthState(nextState);

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextState));
    }
  }, []);

  const logout = useCallback(() => {
    setAuthState({ token: null, user: null });

    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }, []);

  const value = useMemo(() => ({
    ...authState,
    isAuthenticated: Boolean(authState.token),
    login,
    logout,
  }), [authState, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
