export interface UserData {
  user_id: string;
  email: string;
  username: string;
  user_type?: string;
  permissions?: any[];
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
    permissions?: any[];
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
