import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { API_ENDPOINTS } from "./endpoints";
import { showToast } from "@/lib/toast";

declare module "axios" {
  export interface AxiosRequestConfig {
    /** When true, response interceptor will not toast 403 messages. */
    skipPermissionToast?: boolean;
  }
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
const DEV_ACCESS_TOKEN = process.env.NEXT_PUBLIC_DEV_ACCESS_TOKEN;

function resolveAccessToken(): string | null {
  const token = getAccessTokenFn();
  if (token) return token;
  if (process.env.NODE_ENV === "development" && DEV_ACCESS_TOKEN) {
    return DEV_ACCESS_TOKEN;
  }
  return null;
}

function isUsingDevAccessToken(): boolean {
  return !getAccessTokenFn() && process.env.NODE_ENV === "development" && !!DEV_ACCESS_TOKEN;
}

export const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000, // 15s timeout
});

let getAccessTokenFn: () => string | null = () => null;
let getRefreshTokenFn: () => string | null = () => null;
let onTokenRefreshedFn: (access: string, refresh?: string) => void = () => {};
let clearAuthFn: () => void = () => {};

export const setAuthTokenCallbacks = (
  getAccess: () => string | null,
  getRefresh: () => string | null,
  onRefreshed: (access: string, refresh?: string) => void,
  clearAuth: () => void
) => {
  getAccessTokenFn = getAccess;
  getRefreshTokenFn = getRefresh;
  onTokenRefreshedFn = onRefreshed;
  clearAuthFn = clearAuth;
};

// Request Interceptor
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = resolveAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

// Response Interceptor with Automatic Token Refresh & Global Error Handling
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    if (!originalRequest) {
      return Promise.reject(error);
    }

    // Check if error is 401 and request hasn't been retried yet
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (originalRequest.url === API_ENDPOINTS.AUTH.REFRESH_TOKEN) {
        // If the refresh token request itself failed, clear credentials and redirect
        clearAuthFn();
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return axiosInstance(originalRequest);
          })
          .catch((err) => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = getRefreshTokenFn();

      if (!refreshToken) {
        isRefreshing = false;
        if (!isUsingDevAccessToken()) {
          clearAuthFn();
          if (typeof window !== "undefined") {
            window.location.href = "/login";
          }
        }
        return Promise.reject(error);
      }

      try {
        // Call backend to refresh the token
        const response = await axios.post(`${API_BASE_URL}${API_ENDPOINTS.AUTH.REFRESH_TOKEN}`, {
          refresh: refreshToken,
        });

        if (response.data?.success && response.data?.data) {
          const { access, refresh: newRefresh } = response.data.data;
          
          onTokenRefreshedFn(access, newRefresh);

          axiosInstance.defaults.headers.common.Authorization = `Bearer ${access}`;
          originalRequest.headers.Authorization = `Bearer ${access}`;

          processQueue(null, access);
          isRefreshing = false;

          return axiosInstance(originalRequest);
        } else {
          throw new Error("Token refresh response structure is invalid.");
        }
      } catch (refreshError) {
        processQueue(refreshError, null);
        isRefreshing = false;
        clearAuthFn();
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
        return Promise.reject(refreshError);
      }
    }

    // Global Error Handling: Map backend response errors or network errors
    const backendData = error.response?.data as
      | {
          message?: string;
          error?: string;
          validation_errors?: Array<{ path?: string; message?: string }>;
        }
      | undefined;
    const backendMessage =
      backendData?.message || backendData?.error || error.message || "An unexpected error occurred.";

    const status = error.response?.status || 500;

    // Show exact backend message on permission failures (do not replace with generic text)
    if (
      status === 403 &&
      typeof window !== "undefined" &&
      !originalRequest?.skipPermissionToast
    ) {
      showToast(backendMessage, "error");
    }

    const errorResponse = {
      status,
      success: false,
      message: backendMessage,
      error: backendData?.error || error.message || "Internal Server Error",
      validation_errors: backendData?.validation_errors,
    };

    return Promise.reject(errorResponse);
  }
);
