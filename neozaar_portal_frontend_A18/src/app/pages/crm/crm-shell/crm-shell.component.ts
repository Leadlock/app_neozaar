import { Component, inject, ViewEncapsulation, OnInit, OnDestroy, HostListener } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../core/services/auth.service';
import { UserRole } from '../../../core/modal/user.modal';
import { environment } from '../../../../environments/environment';

interface CrmNotification {
  id: number;
  text: string;
  time: string;
  read: boolean;
}

@Component({
  selector: 'app-crm-shell',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './crm-shell.component.html',
  styleUrls: ['./crm-shell.component.css'],
  encapsulation: ViewEncapsulation.None
})
export class CrmShellComponent implements OnInit, OnDestroy {
  private auth = inject(AuthService);
  private http = inject(HttpClient);
  private apiBase = `${environment.apiUrl}internal/crm`;

  showProfile = false;
  showNotifications = false;
  notifications: CrmNotification[] = [];
  notifLoading = false;

  get unreadCount() { return this.notifications.filter(n => !n.read).length; }

  get userInitials(): string {
    const name = this.auth.user?.name || '';
    return name.slice(0, 2).toUpperCase() || 'U';
  }

  get userName(): string { return this.auth.user?.name || '—'; }

  get userRole(): string {
    const map: Record<string, string> = {
      'SUPER_ADMIN': 'Super Admin', 'ADMIN': 'Admin', 'ROLE_MANAGER': 'Manager',
      'M_SELLER': 'Master Seller', 'ISV_SELLER': 'ISV Seller', 'SELLER': 'Seller',
      'AGENT': 'Affiliate', 'A_MANAGER': 'Affiliate Manager',
      'ISV': 'Software Vendor', 'SUPPORT_PARTNER': 'Service Partner',
    };
    return map[this.auth.user?.role_type as string] || this.auth.user?.role_type || '—';
  }

  get isSuperAdmin() { return this.auth.user?.role_type === UserRole.SUPERADMIN; }
  get isAdmin() { return [UserRole.SUPERADMIN, UserRole.ADMIN].includes(this.auth.user?.role_type as UserRole); }
  get isManager() { return [UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.MANAGER].includes(this.auth.user?.role_type as UserRole); }
  get isMSeller() { return this.auth.user?.role_type === UserRole.M_SELLER; }
  get isSeller() { return this.auth.user?.role_type === UserRole.SELLER; }
  get isAManager() { return this.auth.user?.role_type === UserRole.A_MANAGER; }

  // ── Affiliate helpers ─────────────────────────────────────────
  get isAffiliate(): boolean { return this.auth.user?.role_type === UserRole.AGENT; }
  get isAffiliateManager(): boolean {
    const r = this.auth.user?.role_type as string;
    return r === UserRole.A_MANAGER || r === UserRole.SUPERADMIN || r === UserRole.ADMIN;
  }
  get canSeeAffiliateSection(): boolean { return this.isAffiliate || this.isAffiliateManager; }

  /** ISV group visible to SUPER_ADMIN, M_SELLER, A_MANAGER, and SELLER (with isv_access flag) */
  get canSeeIsv(): boolean {
    const role = this.auth.user?.role_type as string;
    if (role === UserRole.SUPERADMIN || role === UserRole.M_SELLER || role === UserRole.A_MANAGER) return true;
    if (role === UserRole.SELLER) return !!(this.auth.user as any)?.isv_access;
    return false;
  }

  /** Verify/Approve sub-item: SUPER_ADMIN + M_SELLER + A_MANAGER */
  get canVerifyIsv(): boolean {
    const role = this.auth.user?.role_type as string;
    return role === UserRole.SUPERADMIN || role === UserRole.M_SELLER || role === UserRole.A_MANAGER;
  }

  ngOnInit() { this.loadNotifications(); }
  ngOnDestroy() {}

  @HostListener('document:click')
  onDocumentClick() {
    this.closeAll();
    // collapse any click-opened sidebar fly-outs when clicking elsewhere
    this.expandedGroups = {};
  }

  toggleNotifications(e: Event) {
    e.stopPropagation();
    this.showNotifications = !this.showNotifications;
    this.showProfile = false;
  }

  toggleProfile(e: Event) {
    e.stopPropagation();
    this.showProfile = !this.showProfile;
    this.showNotifications = false;
  }

  closeAll() {
    this.showProfile = false;
    this.showNotifications = false;
  }

  private get usesPersonalNotifications(): boolean { return this.isAffiliate || this.isAManager; }

  markRead(n: CrmNotification) {
    if (n.read) return;
    if (!this.usesPersonalNotifications) { n.read = true; return; }
    this.http.put(`${this.apiBase}/notifications/${n.id}/read`, {}).subscribe({
      next: () => { n.read = true; },
      error: () => { /* Keep unread if the update fails. */ }
    });
  }

  markAllRead() {
    const markLoadedRead = () => this.notifications.forEach(n => n.read = true);
    if (!this.usesPersonalNotifications) { markLoadedRead(); return; }
    this.http.put(`${this.apiBase}/notifications/read-all`, {}).subscribe({
      next: markLoadedRead,
      error: () => { /* Keep unread if the update fails. */ }
    });
  }

  logout() { this.auth.logout(); }

  loadNotifications() {
    this.notifLoading = true;
    const personal = this.usesPersonalNotifications;
    const endpoint = personal ? 'notifications' : 'activities';
    this.http.get<any>(`${this.apiBase}/${endpoint}?limit=10`).subscribe({
      next: (res) => {
        const items: any[] = res?.data || res?.activities || [];
        this.notifications = items.slice(0, 10).map((a: any, i: number) => ({
          id: a.id || i,
          text: personal ? (a.message || a.title || 'New notification') : (a.subject || a.description || a.title || 'New activity'),
          time: this.timeAgo(a.created_at || a.activity_date),
          read: personal ? a.is_read === true : false,
        }));
        this.notifLoading = false;
      },
      error: () => {
        this.notifLoading = false;
        this.notifications = [];
      }
    });
  }

  private timeAgo(dateStr: string): string {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  readonly navItems: any[] = [
    { label: 'Dashboard', icon: 'dashboard', path: '/crm/dashboard', showOnlyForRoles: ['SUPER_ADMIN'] },
    { label: 'Rev tracker', icon: 'dashboard2', path: '/crm/dashboard-2', showOnlyForRoles: ['SUPER_ADMIN'] },
    { label: 'Track Affiliate', icon: 'affiliate', affiliateGroup: true },
    { label: 'Opportunities', icon: 'opportunities', path: '/crm/opportunities' },
    { label: 'Customer Scoring', icon: 'scoring', path: '/crm/customer-scoring', hideForRoles: ['AGENT', 'A_MANAGER'] },
    { label: 'Accounts', icon: 'accounts', children: [
        { label: 'Accounts', path: '/crm/accounts' },
        { label: 'Contacts', path: '/crm/contacts' },
      ]
    },
    {
      label: 'CRM', icon: 'crm', children: [
        { label: 'Lead Activities', path: '/crm/activities' },
        { label: 'Leads', path: '/crm/leads', hideForRoles: ['SELLER'] },
        { label: 'Opp. Scoring', path: '/crm/opportunity-scoring', hideForRoles: ['AGENT', 'A_MANAGER'] },
      ]
    },
    {
      label: 'Sales', icon: 'sales', children: [
        { label: 'Catalog', path: '/crm/products' },
        { label: 'Quotes', path: '/crm/quotes' },
        { label: 'Sales Order', path: '/crm/sales-orders' },
        { label: 'Invoices', path: '/crm/invoices' },
      ]
    },
    {
      label: 'Support', icon: 'support', children: [
        { label: 'Cases', path: '/crm/cases' },
        { label: 'Documents', path: '/crm/documents' },
        { label: 'Logs', path: '/crm/audit-logs', superAdminOnly: true },
      ]
    },
    {
      label: 'User', icon: 'user', superAdminOnly: true, children: [
        { label: 'Users', path: '/crm/users' },
        { label: 'Roles', path: '/crm/roles' },
        { label: 'Permissions', path: '/crm/permissions' },
      ]
    },
    { label: 'ISV', icon: 'isv', isvGroup: true, children: [
        { label: 'ISV List', path: '/crm/isv' },
        { label: 'ISV Approved', path: '/crm/isv-approved' },
        { label: 'Verify / Approve', path: '/crm/verify', verifyOnly: true },
      ]
    },
    { label: 'My Profile', icon: 'profile', path: '/crm/profile' },
  ];

  /** All affiliate nav items — rendered inside single collapsible "Track Affiliate" group */
  get trackAffiliateItems(): any[] {
    const items: any[] = [
      { label: 'Affiliate Dashboard', path: '/affiliate/dashboard' },
    ];
    if (this.isAffiliateManager) {
      items.push(
        { label: 'My Customers',          path: '/affiliate/customers' },
        { label: 'My Opportunities',      path: '/affiliate/opportunities' },
        { label: 'Customer Scores',       path: '/affiliate/scores' },
        { label: 'My Database',           path: '/affiliate/database' },
        { label: 'Campaigns',             path: '/affiliate/campaigns' },
        { label: 'My Links',              path: '/affiliate/links' },
        { label: 'Manage Affiliates',     path: '/affiliate/management' },
        { label: 'Attribution Conflicts', path: '/affiliate/conflicts' },
        { label: 'Audit Log',             path: '/affiliate/audit-log' },
        { label: 'Affiliate Progress',    path: '/crm/affiliate-progress' },
      );
    }
    return items;
  }

  expandedGroups: { [key: string]: boolean } = {};

  toggleGroup(label: string, e?: Event) {
    e?.stopPropagation();
    const willOpen = !this.expandedGroups[label];
    this.expandedGroups = willOpen ? { [label]: true } : {};
  }

  isHiddenForRole(item: any): boolean {
    if (item.showOnlyForRoles) return !item.showOnlyForRoles.includes(this.auth.user?.role_type);
    if (!item.hideForRoles) return false;
    return item.hideForRoles.includes(this.auth.user?.role_type);
  }
}
