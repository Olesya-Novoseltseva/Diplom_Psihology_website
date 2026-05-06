import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ApiClient } from "../api/ApiClient.js";
import { AuthApiService, type PublicUserDto } from "../api/AuthApiService.js";

type AuthState = {
  user: PublicUserDto | null;
  token: string | null;
  loading: boolean;
};

type AuthContextValue = AuthState & {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const apiClient = new ApiClient("");
const authApi = new AuthApiService(apiClient);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUserDto | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("wellness_token"));
  const [loading, setLoading] = useState<boolean>(true);

  const logout = useCallback(() => {
    apiClient.clearToken();
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    apiClient.setTokenAccessor(() => localStorage.getItem("wellness_token"));
  }, []);

  useEffect(() => {
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const { user: me } = await authApi.me();
        if (!cancelled) {
          setUser(me);
        }
      } catch {
        if (!cancelled) {
          logout();
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, logout]);

  const login = useCallback(async (email: string, password: string) => {
    const result = await authApi.login(email, password);
    apiClient.saveToken(result.token);
    setToken(result.token);
    setUser(result.user);
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    const result = await authApi.register(email, password);
    apiClient.saveToken(result.token);
    setToken(result.token);
    setUser(result.user);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      loading,
      login,
      register,
      logout,
    }),
    [user, token, loading, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth должен вызываться внутри AuthProvider");
  }
  return ctx;
}
