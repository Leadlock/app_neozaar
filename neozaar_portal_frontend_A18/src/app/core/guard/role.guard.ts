import { CanActivateFn, Router } from '@angular/router';
import { UserRole } from '../modal/user.modal';
import { AuthService } from '../services/auth.service';
import { inject } from '@angular/core';

export const roleGuard = (roles: UserRole[]): CanActivateFn =>
  (route, state) => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (!auth.isAuthenticated()) {
      // Send unauthenticated users to the real login page. Routing to
      // login-token with an empty token only triggers a failing
      // get_token-user (400) and bounces back here anyway.
      return router.createUrlTree(['/auth/login'], { queryParams: { returnUrl: state.url } });
    }

    return auth.hasAnyRole(roles)
      ? true
      : router.createUrlTree(['/unauthorized']);
  };

