import { axiosInstance, setAuthTokenCallbacks } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";
import { LoginRequest, LoginResponse, ApiResponse } from "@/types/api.types";


// Helper functions to manage cookies client-side
const getCookie = (name: string): string | null => {
  if (typeof window === "undefined") return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift() || null;
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
  document.cookie = `${name}=${value || ""}${expires}; path=/; SameSite=Strict; Secure`;
};

const eraseCookie = (name: string) => {
  if (typeof window === "undefined") return;
  document.cookie = `${name}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT; SameSite=Strict; Secure`;
};

export const AuthService = {
  /**
   * Gets the stored access token from cookies
   */
  getAccessToken(): string | null {
    return getCookie("access_token");
  },

  /**
   * Gets the stored refresh token from cookies
   */
  getRefreshToken(): string | null {
    return getCookie("refresh_token");
  },

  /**
   * Gets the stored user data from cookies
   */
  getUserData(): any {
    const raw = getCookie("user_data");
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  /**
   * Sets or updates tokens in cookies
   */
  setTokens(access: string | null, refresh?: string | null): void {
    if (access) {
      setCookie("access_token", access, 7); // expires in 7 days
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

  /**
   * Sets user data in cookies
   */
  setUserData(userData: any): void {
    if (userData) {
      setCookie("user_data", JSON.stringify(userData), 7);
    } else {
      eraseCookie("user_data");
    }
  },

  /**
   * Clear all auth info from cookies
   */
  clearAuth(): void {
    eraseCookie("access_token");
    eraseCookie("refresh_token");
    eraseCookie("user_data");
  },

  /**
   * Logs in a user with email/mobile and password
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await axiosInstance.post<LoginResponse>(
      API_ENDPOINTS.AUTH.LOGIN,
      credentials
    );

    const data = response.data;

    // Store tokens on successful authentication
    if (data.success && data.data) {
      setCookie("access_token", data.data.access, 7);
      setCookie("refresh_token", data.data.refresh, 7);
      setCookie("user_data", JSON.stringify({
        user_id: data.data.user_id,
        email: data.data.email,
        username: data.data.username,
        user_type: data.data.user_type,
        permissions: data.data.permissions || [],
      }), 7);
    }

    return data;
  },

  /**
   * Logs out the current user and invalidates the session
   */
  async logout(): Promise<void> {
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
      // Always clear tokens locally on logout
      AuthService.clearAuth();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
  },

  /**
   * Refreshes the access token using the refresh token
   */
  async refreshToken(refresh: string): Promise<ApiResponse> {
    const response = await axiosInstance.post<ApiResponse>(
      API_ENDPOINTS.AUTH.REFRESH_TOKEN,
      { refresh }
    );
    return response.data;
  },

  /**
   * Validates the active access token
   */
  async validateToken(): Promise<ApiResponse> {
    const response = await axiosInstance.get<ApiResponse>(
      API_ENDPOINTS.AUTH.VALIDATE_TOKEN
    );
    return response.data;
  },

  /**
   * Registers a new user
   */
  async register(userData: any): Promise<ApiResponse> {
    const response = await axiosInstance.post<ApiResponse>(
      API_ENDPOINTS.AUTH.REGISTER,
      userData
    );
    return response.data;
  },
};

// Register cookie handlers directly in Axios instance to avoid circular imports
setAuthTokenCallbacks(
  () => AuthService.getAccessToken(),
  () => AuthService.getRefreshToken(),
  (access, refresh) => AuthService.setTokens(access, refresh),
  () => AuthService.clearAuth()
);
