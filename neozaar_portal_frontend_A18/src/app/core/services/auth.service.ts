import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { User, UserRole, CRM_ROLES } from '../modal/user.modal';
import { Observable, tap, throwError } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ToasterService } from '../../shared/providers/toaster/toaster.service';
import { catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly TOKEN_KEY = 'token';
  private readonly USER_KEY = 'user';
  private readonly REFRESH_TOKEN_KEY = 'refresh_token';
  private readonly LOGOUT_EVENT_KEY = 'LOGOUT_EVENT';

  private http = inject(HttpClient);
  private router = inject(Router);
  private toasterService = inject(ToasterService);

  apiUrl = environment.apiUrl
frontendUrl = environment.frontendUrl

  constructor() {
    // Listen for logout events from other tabs
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (event: StorageEvent) => {
        if (event.key === this.LOGOUT_EVENT_KEY) {
          this.clearLocalAuthData();
          this.router.navigate(['/auth/login']);
        }
      });
    }
  }

  getCurrentUser() {
    const user = localStorage.getItem(this.USER_KEY);
    return user ? JSON.parse(user) : null;
  }

  login(credentials: { email: string; password: string }): Observable<void> {
    return this.http.post('/api/auth/login', credentials)
      .pipe(
        tap((res: any) => {
          if (res.status === 'success') {
            this.persistSession(res.data.token, res.data.user);
            // Store refresh token if provided
            if (res.data.refresh_token) {
              localStorage.setItem(this.REFRESH_TOKEN_KEY, res.data.refresh_token);
            }
          } else {
            this.toasterService.setToaster('error', 'Error', res.message || 'Something went wrong');
          }
        })
      );
  }

  /** already have token → fetch fresh user */
  loginByToken(token: string): Observable<any> {
    return this.http.get(`${this.apiUrl}get_token-user`, {
      headers: { Authorization: `Bearer ${token}` }
    }).pipe(
      tap((res: any) => {
        if (res.status == 'success') {
          // Only persist the session here. Navigation is owned by the
          // component's subscriber so it runs exactly once, after the session
          // is confirmed persisted. Navigating from inside this tap raced the
          // component handler and the 401 interceptor, which could clear the
          // just-saved session and bounce the user to /auth/login.
          this.persistSession(token, res.data);
        }
      }),
      catchError((error: any) => {
        // Handoff token was rejected (expired/invalid). Clear local data; the
        // component surfaces the retry UI. No navigation from the service.
        this.clearLocalAuthData();
        return throwError(() => error);
      })
    )
  }

  /**
   * Resolve the landing route for a freshly authenticated user. Kept in the
   * service so the token handoff (and any other login path) share one source
   * of truth. Returns null when the role isn't a portal role, in which case
   * the caller should send the user back to the marketplace frontend.
   */
  landingRouteFor(roleType: string): string | null {
    const portalRoles = Object.values(UserRole) as string[];
    if (!portalRoles.includes(roleType)) {
      return null;
    }
    if (roleType === UserRole.AGENT) {
      return '/affiliate/dashboard';
    }
    if (roleType === UserRole.SELLER || roleType === UserRole.ISV_SELLER) {
      return '/crm/dashboard';
    }
    return '/dashboard';
  }

  logout(): void {
    const token = this.getToken();
    
    if (token) {
      this.http.post(`${this.apiUrl}logout`, {}, { 
        withCredentials: true,
        headers: { Authorization: `Bearer ${token}` }
      }).subscribe({
        next: (res: any) => {
          console.log('Logout successful:', res);
          this.performLogoutCleanup();
        },
        error: (err: any) => {
          console.error('Logout API failed:', err);
          this.performLogoutCleanup();
        }
      });
    } else {
      // No token, just cleanup locally
      this.performLogoutCleanup();
    }
  }

  private performLogoutCleanup(): void {
    // Clear local storage
    this.clearLocalAuthData();
    
    // Notify other tabs
    localStorage.setItem(this.LOGOUT_EVENT_KEY, Date.now().toString());
    
    // Short delay to ensure cleanup is complete
    setTimeout(() => {
      // Redirect to login - using window.location for complete page reload
      window.location.href = `${this.frontendUrl}auth/login`;
      // window.location.href = 'https://www.neozaar.com/auth/login';
    }, 100);
  }

  private clearLocalAuthData(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    
    // Clear any other app-specific storage
    const itemsToClear = [
      'selectedProduct',
      'cartItems',
      'recentSearches',
      'userPreferences'
    ];
    
    itemsToClear.forEach(item => localStorage.removeItem(item));
    
    // Also clear sessionStorage
    sessionStorage.clear();
  }

  /* ─────────────── helpers ─────────────── */

  /** Check if user is authenticated with token validity */
  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;

    // Optional: Check if token is expired (for JWT tokens)
    try {
      const tokenParts = token.split('.');
      if (tokenParts.length === 3) {
        const payload = JSON.parse(atob(tokenParts[1]));
        const isExpired = Date.now() >= payload.exp * 1000;
        if (isExpired) {
          // Token expired, clear it
          this.clearLocalAuthData();
          return false;
        }
      }
    } catch (e) {
      // Not a JWT token or invalid format
      console.warn('Token parsing error:', e);
      // Keep the token as valid since we can't parse it
    }
    
    return true;
  }

  /** Current user object */
  get user(): User | null {
    const raw = localStorage.getItem(this.USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  }

  set user(value: User | null) {
    if (value) {
      localStorage.setItem(this.USER_KEY, JSON.stringify(value));
    } else {
      localStorage.removeItem(this.USER_KEY);
    }
  }

  hasAnyRole(allowed: UserRole[]): boolean {
    return !!this.user && allowed.includes(this.user.role_type);
  }

  get userId(): string | number | null {
    return this.user ? this.user.id : null;
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  setToken(value: string | null): void {
    if (value) {
      localStorage.setItem(this.TOKEN_KEY, value);
    } else {
      localStorage.removeItem(this.TOKEN_KEY);
    }
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  setRefreshToken(value: string | null): void {
    if (value) {
      localStorage.setItem(this.REFRESH_TOKEN_KEY, value);
    } else {
      localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    }
  }

  private persistSession(token: string, user: User): void {
    this.setToken(token);
    this.user = user;
  }

  // Optional: Token refresh method
  refreshAuthToken(): Observable<any> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      return throwError(() => new Error('No refresh token available'));
    }
    
    return this.http.post(`${this.apiUrl}auth/refresh`, { 
      refresh_token: refreshToken 
    }).pipe(
      tap((response: any) => {
        if (response.status === 'success' && response.data.token) {
          this.setToken(response.data.token);
          // Update refresh token if new one provided
          if (response.data.refresh_token) {
            this.setRefreshToken(response.data.refresh_token);
          }
        }
      })
    );
  }

  // Check authentication on app startup
  checkAuthOnStartup(): void {
    if (!this.isAuthenticated()) {
      // Check if we're already on login page
      if (!this.router.url.includes('/auth/login')) {
        this.router.navigate(['/auth/login']);
      }
    } else {
      // Token exists, verify it's still valid by making a simple API call
      this.http.get(`${this.apiUrl}auth/validate`, {
        headers: { Authorization: `Bearer ${this.getToken()}` }
      }).subscribe({
        error: (error: any) => {
          if (error.status === 401) {
            this.clearLocalAuthData();
            this.router.navigate(['/auth/login']);
          }
        }
      });
    }
  }
}
