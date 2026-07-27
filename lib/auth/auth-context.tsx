"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AuthService } from "@/services/auth.service";
import type { LoginRequest, UserData } from "@/types/api.types";

export interface AuthContextValue {
  user: UserData | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const clearSession = useCallback(() => {
    setUser(null);
    AuthService.clearAuth();
    queryClient.clear();
  }, [queryClient]);

  const applyUser = useCallback((nextUser: UserData) => {
    setUser(nextUser);
    AuthService.setUserData(nextUser);
  }, []);

  // Restore session once on mount
  useEffect(() => {
    let cancelled = false;

    const restore = async () => {
      setIsLoading(true);
      try {
        const token = AuthService.getAccessToken();
        const refresh = AuthService.getRefreshToken();
        const cachedUser = AuthService.getUserData();

        if (!token && !refresh) {
          if (!cancelled) clearSession();
          return;
        }

        if (token) {
          try {
            const current = await AuthService.getCurrentUser();
            if (cancelled) return;
            if (current) {
              applyUser(current);
              return;
            }
          } catch {
            // fall through to refresh
          }
        }

        if (refresh) {
          try {
            const refreshed = await AuthService.refreshToken(refresh);
            if (cancelled) return;
            if (refreshed.success && refreshed.data) {
              const data = refreshed.data as {
                access?: string;
                refresh?: string;
                user_id?: string;
                email?: string;
                username?: string;
              };
              if (data.access) {
                AuthService.setTokens(data.access, data.refresh ?? refresh);
              }
              const nextUser: UserData = {
                user_id: data.user_id || cachedUser?.user_id || "",
                email: data.email || cachedUser?.email || "",
                username: data.username || cachedUser?.username || "",
                user_type: cachedUser?.user_type,
              };
              if (nextUser.user_id) {
                applyUser(nextUser);
                return;
              }
            }
          } catch {
            // refresh failed
          }
        }

        if (!cancelled) clearSession();
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void restore();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- restore once on mount
  }, []);

  const login = useCallback(
    async (credentials: LoginRequest) => {
      const response = await AuthService.login(credentials);
      if (!response.success || !response.data) {
        throw {
          status: response.status || 400,
          success: false,
          message: response.message || response.error || "Login failed",
          error: response.error,
        };
      }

      applyUser({
        user_id: response.data.user_id,
        email: response.data.email,
        username: response.data.username,
        user_type: response.data.user_type,
      });
    },
    [applyUser],
  );

  const logout = useCallback(async () => {
    try {
      await AuthService.logout({ redirect: false });
    } finally {
      clearSession();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
  }, [clearSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user?.user_id),
      isLoading,
      login,
      logout,
    }),
    [user, isLoading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}

export function useAuthOptional(): AuthContextValue | null {
  return useContext(AuthContext);
}
