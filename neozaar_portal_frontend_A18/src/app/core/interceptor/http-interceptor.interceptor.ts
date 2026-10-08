import {
  HttpInterceptorFn,
  HttpRequest,
  HttpHandlerFn,
  HttpErrorResponse,
  HttpResponse
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, tap, throwError, Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { CancelApiService } from './cancel-api.service';
import { ToasterService } from '../../shared/providers/toaster/toaster.service';

export const httpInterceptorInterceptor: HttpInterceptorFn = (
  req: HttpRequest<any>,
  next: HttpHandlerFn
): Observable<any> => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const cancelService = inject(CancelApiService);
  const toasterService = inject(ToasterService);

  // Clone the request to add auth token and headers
  const token = auth.getToken(); // Changed from auth.token to auth.getToken()

  let modifiedReq = req;

  // Add authorization header if token exists
  if (token && !req.headers.has('Authorization')) {
    modifiedReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  // Add content type header for non-FormData requests
  if (!(req.body instanceof FormData)) {
    modifiedReq = modifiedReq.clone({
      setHeaders: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    });
  }

  // Add cache control for GET requests
  if (modifiedReq.method === 'GET') {
    modifiedReq = modifiedReq.clone({
      setHeaders: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  }

  return next(modifiedReq).pipe(
    tap((event: any) => {
      if (event instanceof HttpResponse) {
        // Check for specific responses that indicate token issues
        if (event.body?.status === 'error' && 
            (event.body?.message?.toLowerCase().includes('token') ||
             event.body?.message?.toLowerCase().includes('session') ||
             event.body?.message?.toLowerCase().includes('authentication'))) {
          handleAuthError(event.body.message);
        }
      }
    }),
    catchError((error: HttpErrorResponse) => {
      const message = error?.error?.message || error.message || null;
      
      // Handle different HTTP status codes
      switch (error.status) {
        case 401: // Unauthorized - Token expired/invalid
          // The token-handoff call owns its own error UI (retry screen on the
          // login-token page). Don't trigger a global logout/redirect for it —
          // that would yank the user off the retry screen.
          if (!req.url.includes('get_token-user')) {
            handleUnauthorizedError(message);
          }
          break;
          
        case 403: // Forbidden - No permission
          toasterService.setToaster('error', 'Access Denied', 
            message || 'You do not have permission to access this resource.');
          break;
          
        case 404: // Not Found
          toasterService.setToaster('error', 'Not Found', 
            message || 'The requested resource was not found.');
          break;
          
        case 400: // Bad Request
          toasterService.setToaster('error', 'Bad Request', 
            message || 'Invalid request. Please check your input.');
            // auth.logout();
          break;
          
        case 422: 
          toasterService.setToaster('error', 'Validation Error', 
            message || 'Please check the form for errors.');
          break;
          
        case 500: 
          toasterService.setToaster('error', 'Server Error', 
            message || 'An error occurred on the server. Please try again later.');
          break;
          
        case 0: // Network Error
          toasterService.setToaster('error', 'Network Error', 
            'Unable to connect to the server. Please check your internet connection.');
          break;
          
        default:
          // Only show error if it's not a 401 that we already handled in loginByToken
          if (error.status !== 401 || !req.url.includes('get_token-user')) {
            toasterService.setToaster('error', 'Error', 
              message || 'An unexpected error occurred.');
          }
          break;
      }
      
      return throwError(() => error);
    })
  );

  // Helper function to handle unauthorized errors
  function handleUnauthorizedError(message?: string): void {
    // Cancel all pending requests
    if (cancelService) {
      cancelService.cancelRequests();
    }
    
    // Determine the error type
    let errorTitle = 'Authentication Required';
    let errorMessage = 'You need to be logged in to access this resource.';
    
    if (message?.toLowerCase().includes('expired')) {
      errorTitle = 'Session Expired';
      errorMessage = 'Your session has expired. Please login again.';
    } else if (message?.toLowerCase().includes('invalid')) {
      errorTitle = 'Invalid Token';
      errorMessage = 'Your authentication token is invalid. Please login again.';
    } else if (message?.toLowerCase().includes('unauthorized')) {
      errorTitle = 'Unauthorized';
      errorMessage = message;
    }
    
    // Show error message
    toasterService.setToaster('error', errorTitle, errorMessage);
    
    // Clear authentication data
    auth.logout();
    
    // Don't navigate here - let the AuthService logout handle the redirect
  }

  // Helper function to handle auth errors from response body
  function handleAuthError(message?: string): void {
    handleUnauthorizedError(message);
  }
};
