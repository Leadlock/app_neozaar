import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { CRM_ROLES, UserRole } from '../modal/user.modal';

export const crmGuard: CanActivateFn = (route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isAuthenticated()) return router.createUrlTree(['/auth/login']);

  if (!auth.user || !CRM_ROLES.includes(auth.user.role_type)) {
    return router.createUrlTree(['/unauthorized']);
  }

  // A_MANAGER belongs in the Affiliate section, not the CRM shell.
  // Only redirect if they are trying to access /crm (not /affiliate which also uses this guard).
  if (auth.user.role_type === UserRole.A_MANAGER && state.url.startsWith('/crm')) {
    return router.createUrlTree(['/affiliate/dashboard']);
  }

  return true;
};
