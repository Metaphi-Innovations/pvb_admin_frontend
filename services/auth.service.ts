import { axiosInstance, setAuthTokenCallbacks } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";
import { LoginRequest, LoginResponse, ApiResponse, UserData } from "@/types/api.types";
import { normalizeWebPermissions, type WebPermissionTree } from "@/lib/auth/permissions";

const isSecureContext =
  typeof window !== "undefined" && window.location.protocol === "https:";

const cookieFlags = () =>
  `path=/; SameSite=Strict${isSecureContext ? "; Secure" : ""}`;

const getCookie = (name: string): string | null => {
  if (typeof window === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    const raw = parts.pop()?.split(";").shift() || null;
    if (!raw) return null;
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }
  return null;
};

const setCookie = (name: string, value: string, days?: number) => {
  if (typeof window === "undefined") return;
  let expires = "";
  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
    expires = `; expires=${date.toUTCString()}`;
  }
  document.cookie = `${name}=${encodeURIComponent(value || "")}${expires}; ${cookieFlags()}`;
};

const eraseCookie = (name: string) => {
  if (typeof window === "undefined") return;
  document.cookie = `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Strict`;
  document.cookie = `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Strict; Secure`;
};

function readJsonCookie(name: string): unknown {
  const raw = getCookie(name);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export const AuthService = {
  getAccessToken(): string | null {
    return getCookie("access_token");
  },

  getRefreshToken(): string | null {
    return getCookie("refresh_token");
  },

  getUserData(): UserData | null {
    const data = readJsonCookie("user_data");
    if (!data || typeof data !== "object") return null;
    return data as UserData;
  },

  setTokens(access: string | null, refresh?: string | null): void {
    if (access) {
      setCookie("access_token", access, 7);
    } else {
      eraseCookie("access_token");
    }

    if (refresh !== undefined) {
      if (refresh) {
        setCookie("refresh_token", refresh, 7);
      } else {
        eraseCookie("refresh_token");
      }
    }
  },

  setUserData(userData: UserData | null): void {
    if (userData) {
      setCookie("user_data", JSON.stringify(userData), 7);
    } else {
      eraseCookie("user_data");
    }
  },

  clearAuth(): void {
    eraseCookie("access_token");
    eraseCookie("refresh_token");
    eraseCookie("user_data");
    eraseCookie("user_permissions"); // legacy cleanup if present
  },

  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await axiosInstance.post<LoginResponse>(
      API_ENDPOINTS.AUTH.LOGIN,
      credentials,
    );

    const data = response.data;

    if (data.success && data.data) {
      AuthService.setTokens(data.data.access, data.data.refresh);
      AuthService.setUserData({
        user_id: data.data.user_id,
        email: data.data.email,
        username: data.data.username,
        user_type: data.data.user_type,
      });
    }

    return data;
  },

  async logout(options?: { redirect?: boolean }): Promise<void> {
    const shouldRedirect = options?.redirect !== false;
    try {
      const refreshToken = getCookie("refresh_token");
      if (refreshToken) {
        await axiosInstance.post(API_ENDPOINTS.AUTH.LOGOUT, {
          refresh: refreshToken,
        });
      }
    } catch (error) {
      console.error("Logout request failed:", error);
    } finally {
      AuthService.clearAuth();
      if (shouldRedirect && typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
  },

  async refreshToken(refresh: string): Promise<ApiResponse> {
    const response = await axiosInstance.post<ApiResponse>(
      API_ENDPOINTS.AUTH.REFRESH_TOKEN,
      { refresh },
    );
    return response.data;
  },

  /** Get current user via validate-token (no dedicated /me endpoint). */
  async getCurrentUser(): Promise<UserData | null> {
    const response = await axiosInstance.get<ApiResponse<{ user: UserData }>>(
      API_ENDPOINTS.AUTH.VALIDATE_TOKEN,
    );
    const user = response.data?.data?.user;
    if (!user?.user_id) return null;
    AuthService.setUserData(user);
    return user;
  },

  async validateToken(): Promise<ApiResponse> {
    const response = await axiosInstance.get<ApiResponse>(
      API_ENDPOINTS.AUTH.VALIDATE_TOKEN,
    );
    return response.data;
  },

  /**
   * Always hits the API — no cookie/global cache.
   * Caller (PermissionsProvider / RouteGuard) owns the in-memory result.
   */
  async fetchUserPermissions(userId: string): Promise<WebPermissionTree> {
    const response = await axiosInstance.get<ApiResponse<{ web_permission?: unknown }>>(
      API_ENDPOINTS.USER_MANAGEMENT.USER.PERMISSIONS(userId),
      { skipPermissionToast: true },
    );
    return normalizeWebPermissions(response.data?.data?.web_permission);
  },

  async register(userData: unknown): Promise<ApiResponse> {
    const response = await axiosInstance.post<ApiResponse>(
      API_ENDPOINTS.AUTH.REGISTER,
      userData,
    );
    return response.data;
  },
};

setAuthTokenCallbacks(
  () => AuthService.getAccessToken(),
  () => AuthService.getRefreshToken(),
  (access, refresh) => AuthService.setTokens(access, refresh),
  () => AuthService.clearAuth(),
);
