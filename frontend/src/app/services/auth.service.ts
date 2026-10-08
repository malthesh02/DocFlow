import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, of, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { User, LoginResponse, RegisterResponse, RefreshResponse } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private readonly API_URL = `${environment.apiUrl}/auth`;
  private readonly ACCESS_TOKEN_KEY = 'docflow_access_token';
  private readonly REFRESH_TOKEN_KEY = 'docflow_refresh_token';
  private readonly USER_KEY = 'docflow_user';

  private currentUserSignal = signal<User | null>(this.getInitialUser());

  readonly currentUser = this.currentUserSignal.asReadonly();
  readonly isAuthenticated = computed(() => !!this.currentUserSignal() && !!this.getAccessToken());

  constructor() {
    this.verifySession();
  }

  private getInitialUser(): User | null {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(this.USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  private verifySession(): void {
    if (this.getAccessToken()) {
      this.getCurrentUser().subscribe({
        error: () => {
          // If initial access token fails, attempt a refresh
          if (this.getRefreshToken()) {
            this.refreshToken().subscribe({
              next: () => this.getCurrentUser().subscribe(),
              error: () => this.clearSession()
            });
          } else {
            this.clearSession();
          }
        }
      });
    }
  }

  getAccessToken(): string | null {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(this.ACCESS_TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  setTokens(access: string, refresh?: string): void {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(this.ACCESS_TOKEN_KEY, access);
    if (refresh) {
      localStorage.setItem(this.REFRESH_TOKEN_KEY, refresh);
    }
  }

  setUser(user: User): void {
    this.currentUserSignal.set(user);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    }
  }

  clearSession(): void {
    this.currentUserSignal.set(null);
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(this.ACCESS_TOKEN_KEY);
      localStorage.removeItem(this.REFRESH_TOKEN_KEY);
      localStorage.removeItem(this.USER_KEY);
    }
  }

  /**
   * Register a new user account with Django REST API
   */
  register(payload: { username: string; email: string; password: string; confirm_password?: string; password_confirm?: string }): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(`${this.API_URL}/register/`, payload);
  }

  /**
   * Authenticate user with Django REST API and store tokens
   */
  login(payload: { username: string; password: string }): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.API_URL}/login/`, payload).pipe(
      tap(res => {
        this.setTokens(res.access, res.refresh);
        if (res.user) {
          this.setUser(res.user);
        } else {
          // If login response does not include user object, fetch it
          this.getCurrentUser().subscribe();
        }
      })
    );
  }

  /**
   * Request a new access token using the stored refresh token
   */
  refreshToken(): Observable<RefreshResponse> {
    const refresh = this.getRefreshToken();
    if (!refresh) {
      this.clearSession();
      return throwError(() => new Error('No refresh token available'));
    }

    return this.http.post<RefreshResponse>(`${this.API_URL}/refresh/`, { refresh }).pipe(
      tap(res => {
        this.setTokens(res.access, res.refresh);
      }),
      catchError(err => {
        this.clearSession();
        return throwError(() => err);
      })
    );
  }

  /**
   * Retrieve currently authenticated user profile from Django
   */
  getCurrentUser(): Observable<User> {
    return this.http.get<User>(`${this.API_URL}/me/`).pipe(
      tap(user => this.setUser(user))
    );
  }

  /**
   * Log out the current user, clear state, and redirect to /login
   */
  logout(): void {
    this.clearSession();
    this.router.navigate(['/login']);
  }
}
