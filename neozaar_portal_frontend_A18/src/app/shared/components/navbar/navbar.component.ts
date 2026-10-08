import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { AuthService } from '../../../core/services/auth.service';
import { HttpClient, HttpClientModule, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { interval, Subscription } from 'rxjs';
import { switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [SidebarComponent, CommonModule, HttpClientModule, RouterModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit, OnDestroy {
  profileUrl = '/assets/profile image.jpeg';
  user: any = null;
  userId!: string;
  notifications: any[] = [];
  unreadCount = 0;
  private pollSub!: Subscription;
  private readIds: Set<string> = new Set();
  private readonly READ_KEY = 'neozaar_read_notifications';

  constructor(
    private authService: AuthService,
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser || !currentUser.id) {
      this.router.navigate(['/auth/login']);
      return;
    }
    this.user = currentUser;
    this.userId = currentUser.id;

    // Load read notification IDs from localStorage
    this.loadReadIds();

    if (['ADMIN', 'SUPER_ADMIN', 'ISV', 'M_SELLER', 'SELLER', 'CLIENT', 'USER'].includes(this.user?.role_type)) {
      this.loadNotifications();
      this.pollSub = interval(30000).pipe(
        switchMap(() => this.fetchNotifications())
      ).subscribe(data => this.setNotifications(data));
    }
  }

  fetchNotifications() {
    const token = this.authService.getToken();
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    return this.http.get<any>(`${environment.apiUrl}dashboard/notifications`, { headers });
  }

  loadNotifications() {
    this.fetchNotifications().subscribe(data => this.setNotifications(data));
  }

  setNotifications(data: any) {
    if (data?.status === 'success') {
      this.notifications = data.data.notifications.map((n: any) => ({
        ...n,
        _uniqueId: `${n.type}_${n.id}_${n.created_at}`,
        is_read: this.readIds.has(`${n.type}_${n.id}_${n.created_at}`)
      }));
      this.unreadCount = this.notifications.filter((n: any) => !n.is_read).length;
    }
  }

  getIcon(type: string): string {
    const icons: any = { product: 'ri-box-3-line', service: 'ri-service-line', solution: 'ri-lightbulb-line', user: 'ri-user-add-line', lead: 'ri-contacts-line' };
    return icons[type] || 'ri-notification-3-line';
  }

  markAsRead(notification: any): void {
    const uid = notification._uniqueId;
    if (!this.readIds.has(uid)) {
      this.readIds.add(uid);
      this.saveReadIds();
      notification.is_read = true;
      this.unreadCount = this.notifications.filter((n: any) => !n.is_read).length;
    }
  }

  markAllAsRead(): void {
    this.notifications.forEach((n: any) => {
      this.readIds.add(n._uniqueId);
      n.is_read = true;
    });
    this.saveReadIds();
    this.unreadCount = 0;
  }

  private loadReadIds(): void {
    try {
      const stored = localStorage.getItem(this.READ_KEY);
      if (stored) {
        const arr = JSON.parse(stored);
        this.readIds = new Set(arr);
      }
    } catch (e) {
      this.readIds = new Set();
    }
  }

  private saveReadIds(): void {
    // Keep only the last 200 read IDs to prevent localStorage bloat
    const arr = Array.from(this.readIds).slice(-200);
    localStorage.setItem(this.READ_KEY, JSON.stringify(arr));
  }

  goToProfile(): void {
    this.router.navigate(['/profile/view', this.userId]);
  }

  goToHome(): void {
    // Return to the main marketplace site (React frontend).
    window.location.href = environment.frontendUrl;
  }

  logout(): void {
    this.authService.logout();
  }

  ngOnDestroy(): void {
    this.pollSub?.unsubscribe();
  }
}
