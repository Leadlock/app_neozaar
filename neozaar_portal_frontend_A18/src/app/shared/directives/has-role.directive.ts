import { Directive, effect, inject, Input, TemplateRef, ViewContainerRef } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';
import { UserRole } from '../../core/modal/user.modal';

@Directive({
  selector: '[appHasRole]',
  standalone: true
})
export class HasRoleDirective {

  constructor(
    private authService: AuthService,
    private templateRef: TemplateRef<any>,
    private viewContainer: ViewContainerRef
  ) { }

  @Input() set appHasRole(roles: UserRole | UserRole[]) {
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    const user = this.authService.user;

    // Clear any previous view first
    this.viewContainer.clear();

    if (user && allowedRoles.includes(user.role_type)) {
      this.viewContainer.createEmbeddedView(this.templateRef);
    }
  }

}
