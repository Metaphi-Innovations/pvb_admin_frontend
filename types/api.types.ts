export interface UserData {
  user_id: string;
  email: string;
  username: string;
  user_type?: string;
  role_type?: string;
  /** Login may return flat web_permission object or nested list depending on endpoint. */
  permissions?: unknown;
}

export interface LoginRequest {
  email?: string;
  mobile_number?: string;
  password: string;
  remember_me?: boolean;
}

export interface LoginResponse {
  status: number;
  success: boolean;
  message: string;
  data?: {
    refresh: string;
    access: string;
    user_id: string;
    email: string;
    username: string;
    permissions?: unknown;
    user_type?: string;
  };
  error?: string;
}

export interface ApiResponse<T = any> {
  status: number;
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

export interface ApiErrorResponse {
  status: number;
  success: boolean;
  message: string;
  error?: string;
}
