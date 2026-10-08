import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { inject } from '@angular/core';
import { UserRole } from '../modal/user.modal';

export const redirectGuard: CanActivateFn = (route) => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  // A marketplace login must validate its incoming token, even when the portal
  // still has a session for a previous or deleted account.
  if (route.routeConfig?.path === 'login-token' && route.queryParamMap.get('token')) {
    return true;
  }

return auth.isAuthenticated()
  ? router.createUrlTree(['/dashboard'])
  : true;
};
