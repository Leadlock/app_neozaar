import { APP_INITIALIZER, ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { httpInterceptorInterceptor } from './core/interceptor/http-interceptor.interceptor';
import { routes } from './app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideStoreDevtools } from '@ngrx/store-devtools';
import { AuthService } from './core/services/auth.service';
import { provideStore } from '@ngrx/store';
import { provideEffects } from '@ngrx/effects';
import { toastReducer } from './shared/store/reducer/toaster.reducer';
import { ToastEffects } from './shared/store/effects/toaster.effect';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { productReducer } from './shared/store/reducer/product.reducer';

// Factory function that works with your AuthService
export function initializeApp(authService: AuthService) {
  return (): Promise<any> => {
    return new Promise((resolve) => {
      // Check if loadUser method exists, call it if it does
      if (authService && typeof (authService as any).loadUser === 'function') {
        (authService as any).loadUser().then(resolve);
      } else {
        // Alternative: Check authentication status
        const token = localStorage.getItem('token');
        if (token) {
          // You might want to validate the token here
          console.log('Token found, app initialized');
        }
        resolve(true);
      }
    });
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    {
      provide: APP_INITIALIZER,
      useFactory: initializeApp,
      deps: [AuthService],
      multi: true
    },
    
    provideZoneChangeDetection({ eventCoalescing: true }),
    
    provideRouter(
      routes,
      withInMemoryScrolling({
        scrollPositionRestoration: 'top',
        anchorScrolling: 'enabled'
      })
    ),
    
    provideHttpClient(
      withInterceptors([httpInterceptorInterceptor])
    ),
    
    provideStore({
      product: productReducer,
      toasts: toastReducer,
    }),
    provideEffects(ToastEffects),
    provideStoreDevtools({
      maxAge: 25,
      logOnly: false,
      autoPause: true,
      features: {
        pause: false,
        lock: true,
        persist: true,
      }
    }), 
    provideAnimationsAsync(),
  ]
};
