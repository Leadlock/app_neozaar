import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToasterService } from '../../../shared/providers/toaster/toaster.service';
import { environment } from '../../../../environments/environment';
import { UserRole } from '../../../core/modal/user.modal';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent implements OnInit {

  // UI state
  currentView: 'landing' | 'options' | 'newuser' | 'login' = 'landing';

  // Login form
  email = '';
  password = '';
  showPassword = false;
  isLoading = false;

  frontendUrl = environment.frontendUrl;

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private toaster: ToasterService
  ) {}

  ngOnInit(): void {
    const frontendBase = this.frontendUrl.replace(/\/+$/, '');
    const requested = this.route.snapshot.queryParamMap.get('returnUrl') || '/dashboard';
    const returnUrl = requested.startsWith('/') && !requested.startsWith('//') ? requested : '/dashboard';
    window.location.replace(`${frontendBase}/auth/portal-handoff?returnUrl=${encodeURIComponent(returnUrl)}`);
  }

  showOptions(): void {
    this.currentView = 'options';
  }

  showNewUser(): void {
    this.currentView = 'newuser';
  }

  showLogin(): void {
    this.currentView = 'login';
  }

  goBack(): void {
    if (this.currentView === 'newuser' || this.currentView === 'login') {
      this.currentView = 'options';
    } else {
      this.currentView = 'landing';
    }
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  onSocialLogin(provider: string): void {
    const apiBase = environment.apiUrl.replace(/\/+$/, '');
    window.location.href = `${apiBase}/oauth/${provider}/start?intent=login`;
  }

  onLogin(): void {
    if (!this.email || !this.password) {
      this.toaster.setToaster('error', 'Error', 'Please enter email and password');
      return;
    }

    this.isLoading = true;
    this.authService.login({ email: this.email, password: this.password }).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        const user = this.authService.user;
        const portalRoles = Object.values(UserRole) as string[];
        if (user && !portalRoles.includes(user.role_type)) {
          window.location.href = this.frontendUrl;
        } else {
          this.router.navigate(['/dashboard']);
        }
      },
      error: (err: any) => {
        this.isLoading = false;
        this.toaster.setToaster('error', 'Login Failed', err?.error?.message || 'Invalid credentials');
      }
    });
  }

  navigateTo(path: string): void {
    window.location.href = this.frontendUrl + path;
  }
}
