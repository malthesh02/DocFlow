import { inject } from '@angular/core';
import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../services/auth.service';
import { BehaviorSubject, catchError, filter, switchMap, take, throwError } from 'rxjs';

let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  const authService = inject(AuthService);

  // Bypass token injection for unauthenticated endpoints
  const isAuthEndpoint = req.url.includes('/auth/login/') ||
                         req.url.includes('/auth/register/') ||
                         req.url.includes('/auth/refresh/');

  let authReq = req;
  const token = authService.getAccessToken();

  if (token && !isAuthEndpoint) {
    authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // If 401 Unauthorized occurs on a protected endpoint, attempt token refresh
      if (error.status === 401 && !isAuthEndpoint) {
        if (!isRefreshing && authService.getRefreshToken()) {
          isRefreshing = true;
          refreshTokenSubject.next(null);

          return authService.refreshToken().pipe(
            switchMap(res => {
              isRefreshing = false;
              refreshTokenSubject.next(res.access);
              // Retry original request with freshly acquired access token
              const retryReq = req.clone({
                setHeaders: {
                  Authorization: `Bearer ${res.access}`
                }
              });
              return next(retryReq);
            }),
            catchError(refreshErr => {
              isRefreshing = false;
              refreshTokenSubject.next(null);
              authService.logout();
              return throwError(() => refreshErr);
            })
          );
        } else if (isRefreshing) {
          // If refresh is already underway, wait for it to complete and retry with new token
          return refreshTokenSubject.pipe(
            filter(newToken => newToken !== null),
            take(1),
            switchMap(newToken => {
              const retryReq = req.clone({
                setHeaders: {
                  Authorization: `Bearer ${newToken}`
                }
              });
              return next(retryReq);
            })
          );
        } else {
          authService.logout();
        }
      }

      return throwError(() => error);
    })
  );
};
