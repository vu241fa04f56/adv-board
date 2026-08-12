import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { jwtDecode } from 'jwt-decode';

interface GoogleJwtPayload {
  sub: string;
  email: string;
  email_verified?: boolean;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
  locale?: string;
  exp?: number;
  iat?: number;
}

export interface GoogleUser {
  id: string;
  email: string;
  name: string;
  picture: string;
  givenName?: string;
  credential: string;
  accessToken?: string;
  expiresAt?: number;
  isGuest?: boolean;
}

interface AuthContextValue {
  user: GoogleUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isOnline: boolean;
  driveToken: string | null;
  setDriveToken: (token: string | null) => void;
  loginWithCredential: (credential: string, accessToken?: string) => Promise<{ success: boolean; error?: string }>;
  loginWithUserInfo: (info: { sub: string; email: string; name?: string; picture?: string; given_name?: string }, accessToken?: string) => void;
  promptGoogleLoginAndDrive: (onSuccess?: (token: string) => void, onError?: (err: string) => void) => void;
  loginAsGuest: () => void;
  logout: () => void;
  getClientId: () => string;
  setCustomClientId: (clientId: string) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const STORAGE_KEY = 'onenote_studio_google_auth';

function credentialToUser(credential: string): GoogleUser | null {
  if (credential === 'guest_token') {
    return {
      id: 'usr_guest',
      email: 'guest@onenote.studio',
      name: 'Guest User',
      picture: '',
      givenName: 'Guest',
      credential: 'guest_token',
      isGuest: true,
    };
  }

  try {
    const decoded = jwtDecode<GoogleJwtPayload>(credential);
    return {
      id: decoded.sub,
      email: decoded.email,
      name: decoded.name || decoded.email.split('@')[0],
      picture: decoded.picture || '',
      givenName: decoded.given_name,
      credential,
    };
  } catch {
    return null;
  }
}

interface StoredAuth {
  credential: string;
  userProfile?: GoogleUser;
  driveToken?: string;
  savedAt: number;
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [driveToken, setDriveTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    let cancelled = false;

    const restoreSession = async () => {
      // First restore a server-side Google OAuth session created by /api/auth/google.
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include',
        });

        if (response.ok) {
          const data = await response.json();
          if (!cancelled && data.success && data.user) {
            const restored: GoogleUser = {
              id: data.user.id,
              email: data.user.email,
              name: data.user.name || data.user.email.split('@')[0],
              picture: data.user.picture || '',
              credential: 'google_oauth_session',
            };
            setUser(restored);
            setIsLoading(false);
            return;
          }
        }
      } catch {
        // Server may be unavailable; local guest mode can still work.
      }

      // Preserve the existing offline/local session behavior as a fallback.
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const stored: StoredAuth = JSON.parse(raw);
          if (stored.userProfile) {
            if (stored.driveToken) {
              stored.userProfile.accessToken = stored.driveToken;
              setDriveTokenState(stored.driveToken);
            }
            if (!cancelled) setUser(stored.userProfile);
          } else if (stored.credential === 'guest_token') {
            const restored = credentialToUser(stored.credential);
            if (restored && !cancelled) setUser(restored);
          }
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    restoreSession();
    return () => {
      cancelled = true;
    };
  }, []);

  const setDriveToken = useCallback((token: string | null) => {
    setDriveTokenState(token);
    setUser((prev) => (prev ? { ...prev, accessToken: token || undefined } : null));
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const stored: StoredAuth = JSON.parse(raw);
        stored.driveToken = token || undefined;
        if (stored.userProfile) {
          stored.userProfile.accessToken = token || undefined;
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
      }
    } catch {
      // ignore
    }
  }, []);

  const loginWithCredential = useCallback(
    async (credential: string, accessToken?: string): Promise<{ success: boolean; error?: string }> => {
      if (credential === 'guest_token') {
        loginAsGuest();
        return { success: true };
      }

      // Legacy API kept for compatibility with any existing callers.
      // Google sign-in now uses the secure redirect flow: /api/auth/google.
      const parsed = credentialToUser(credential);
      if (!parsed) return { success: false, error: 'Invalid Google credential' };

      if (accessToken) {
        parsed.accessToken = accessToken;
        setDriveTokenState(accessToken);
      }
      setUser(parsed);
      return { success: true };
    },
    []
  );

  const DEFAULT_CLIENT_ID = '447122554579-0vils920hrphrbt1femo496kibt53tp4.apps.googleusercontent.com';

  const getClientId = useCallback(() => {
    return (
      localStorage.getItem('onenote_custom_client_id') ||
      (import.meta.env.VITE_GOOGLE_CLIENT_ID as string) ||
      DEFAULT_CLIENT_ID
    );
  }, [DEFAULT_CLIENT_ID]);

  const setCustomClientId = useCallback((clientId: string) => {
    if (clientId.trim()) {
      localStorage.setItem('onenote_custom_client_id', clientId.trim());
    } else {
      localStorage.removeItem('onenote_custom_client_id');
    }
    window.dispatchEvent(new Event('storage'));
  }, []);

  const loginWithUserInfo = useCallback(
    (
      info: { sub: string; email: string; name?: string; picture?: string; given_name?: string },
      accessToken?: string
    ) => {
      const userProfile: GoogleUser = {
        id: info.sub,
        email: info.email,
        name: info.name || info.email.split('@')[0],
        picture: info.picture || '',
        givenName: info.given_name,
        credential: 'google_oauth_token',
        accessToken: accessToken || undefined,
      };

      if (accessToken) {
        setDriveTokenState(accessToken);
      }

      const toStore: StoredAuth = {
        credential: 'google_oauth_token',
        userProfile,
        driveToken: accessToken,
        savedAt: Date.now(),
      };

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
      } catch {
        // ignore
      }

      setUser(userProfile);
    },
    []
  );

  const promptGoogleLoginAndDrive = useCallback(
    (onSuccess?: (token: string) => void, onError?: (err: string) => void) => {
      const cid = getClientId();
      if (!cid) {
        onError?.('Google Client ID is missing. Please configure a Google Client ID first.');
        return;
      }

      if (!(window as any).google?.accounts?.oauth2) {
        onError?.('Google OAuth library is still loading. Please check your network and try again.');
        return;
      }

      try {
        const client = (window as any).google.accounts.oauth2.initTokenClient({
          client_id: cid,
          scope: 'openid email profile https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.readonly',
          callback: async (res: any) => {
            if (res.access_token) {
              setDriveToken(res.access_token);

              try {
                const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                  headers: { Authorization: `Bearer ${res.access_token}` },
                });
                if (userInfoRes.ok) {
                  const info = await userInfoRes.json();
                  loginWithUserInfo(info, res.access_token);
                }
              } catch (e) {
                console.warn('[Auth] Error fetching userinfo:', e);
              }

              if (onSuccess) onSuccess(res.access_token);
            } else if (res.error) {
              console.warn('[Auth] Google OAuth error:', res.error);
              if (res.error !== 'popup_closed_by_user') {
                onError?.(`Google Auth Error: ${res.error_description || res.error}`);
              }
            }
          },
        });
        client.requestAccessToken({ prompt: 'select_account' });
      } catch (err: any) {
        console.error('[Auth] Error initializing token client:', err);
        onError?.(`OAuth Error: ${err.message || 'Failed to initialize Google login popup'}`);
      }
    },
    [getClientId, setDriveToken, loginWithUserInfo]
  );

  const loginAsGuest = useCallback(() => {
    const guestUser: GoogleUser = {
      id: 'usr_guest',
      email: 'guest@onenote.studio',
      name: 'Guest User',
      picture: '',
      givenName: 'Guest',
      credential: 'guest_token',
      isGuest: true,
    };
    const toStore: StoredAuth = {
      credential: 'guest_token',
      userProfile: guestUser,
      savedAt: Date.now(),
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
    } catch {
      // ignore
    }
    setUser(guestUser);
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // Continue clearing local state even if the server is unavailable.
    }

    setUser(null);
    setDriveTokenState(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const value: AuthContextValue = {
    user,
    isLoading,
    isAuthenticated: !!user,
    isOnline,
    driveToken,
    setDriveToken,
    loginWithCredential,
    loginWithUserInfo,
    promptGoogleLoginAndDrive,
    loginAsGuest,
    logout,
    getClientId,
    setCustomClientId,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
