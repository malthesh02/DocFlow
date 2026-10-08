export interface User {
  id?: number;
  username: string;
  email?: string;
  first_name?: string;
  last_name?: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  user: User;
}

export interface RegisterResponse {
  message: string;
  user: User;
  tokens: AuthTokens;
}

export interface RefreshResponse {
  access: string;
  refresh?: string;
}
