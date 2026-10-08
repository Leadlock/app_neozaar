import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { UserRole } from '../../core/modal/user.modal';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-unauthorized',
  standalone: true,
  template: `
    <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:60vh;gap:16px;text-align:center;">
      <div style="font-size:48px;">🔒</div>
      <h2 style="margin:0;font-size:24px;font-weight:600;">Access Denied</h2>
      <p style="margin:0;color:#6b7280;" [innerHTML]="message"></p>
      <button
        (click)="onAction()"
        style="margin-top:8px;padding:10px 24px;background:#6d28d9;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:14px;font-weight:500;">
        {{ actionLabel }}
      </button>
    </div>
  `,
})
export class UnauthorizedComponent implements OnInit {
  message = "You don't have permission to view this page.";
  actionLabel = 'Go to Dashboard';
  private isCustomer = false;
  private marketplaceUrl = environment.frontendUrl;

  constructor(private router: Router, private authService: AuthService) {}

  ngOnInit(): void {
    const user = this.authService.user;
    const portalRoles = Object.values(UserRole) as string[];
    if (user && !portalRoles.includes(user.role_type)) {
      this.isCustomer = true;
      this.message = 'This portal is for partners and staff only.<br>Please visit the Neozaar marketplace.';
      this.actionLabel = 'Go to Marketplace';
    }
  }

  onAction(): void {
    if (this.isCustomer) {
      window.location.href = this.marketplaceUrl;
    } else {
      this.router.navigate(['/dashboard']);
    }
  }
}
