import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { inject } from '@angular/core';
import { UserRole } from '../modal/user.modal';

export const rootRedirectGuard: CanActivateFn = () => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) {
    return router.createUrlTree(['/auth/login']);
  }

  const role = auth.getCurrentUser()?.role_type as UserRole;

  // Affiliate managers use the Angular dashboard; only agents land in Affiliate.
  if (role === UserRole.AGENT) {
    return router.createUrlTree(['/affiliate/dashboard']);
  }

  if (role === UserRole.SELLER || role === UserRole.ISV_SELLER) {
    return router.createUrlTree(['/crm/dashboard']);
  }

  return router.createUrlTree(['/dashboard']);
};
