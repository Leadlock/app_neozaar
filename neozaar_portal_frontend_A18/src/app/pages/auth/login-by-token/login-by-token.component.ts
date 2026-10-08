import { Component } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { ActivatedRoute, Router } from '@angular/router';
import { ToasterService } from '../../../shared/providers/toaster/toaster.service';


@Component({
  selector: 'app-login-by-token',
  standalone: true,
  imports: [],
  templateUrl: './login-by-token.component.html',
  styleUrl: './login-by-token.component.css'
})
export class LoginByTokenComponent {

  token: string = '';
  isReqSend: boolean = true;
  isFaled: boolean = false;
  message: string = '';
  constructor(private authService: AuthService, private activeRoute: ActivatedRoute,private router: Router, private toaster: ToasterService) {

  }
  ngOnInit(): void {
    this.activeRoute.queryParams.subscribe(params => {
      this.token = params['token'];
      if (this.token == null || this.token == '') {
        //TODO:: We have to change this url with react app deployment url
        // window.location.href = 'http://72.61.251.15';
        window.location.href = 'https://neozaar.com/';
        this.toaster.setToaster('error', 'Error', 'Token not found');
      } else {
        this.isReqSend = true;
        this.authService.loginByToken(this.token).subscribe({
          next: (res: any) => {
            this.isReqSend = false;
            if (res.status == 'success') {
              this.toaster.setToaster('success', 'Success', 'Login successfull');
              // Session is persisted at this point. Redirect exactly once,
              // from here, so we don't race the service/interceptor.
              const target = this.authService.landingRouteFor(res.data?.role_type);
              if (target) {
                const requested = params['returnUrl'];
                const returnUrl = typeof requested === 'string' && requested.startsWith('/') && !requested.startsWith('//')
                  ? requested
                  : target;
                this.router.navigateByUrl(returnUrl);
              } else {
                // Not a portal role — return to the marketplace frontend.
                window.location.href = this.authService.frontendUrl;
              }
            } else {
              this.isFaled = true;
              this.message = res.message;
              this.toaster.setToaster('error', 'Error', res.message || 'Something went wrong');
            }
          },
          error: (err: any) => {
            // Handoff token was rejected (e.g. expired → 400, or 401).
            // Stop the spinner and surface a retry instead of leaving the
            // user on an infinite loading state.
            this.isReqSend = false;
            this.isFaled = true;
            this.message = err?.error?.message || 'Your session has expired. Please log in again.';
          },
        });
      }
    })
  }

  goToLogin(): void {
    this.router.navigate(['/auth/login']);
  }

}
