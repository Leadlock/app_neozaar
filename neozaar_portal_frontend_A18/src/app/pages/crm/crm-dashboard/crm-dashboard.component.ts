import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CrmService } from '../../../core/services/crm/crm.service';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-crm-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './crm-dashboard.component.html'
})
export class CrmDashboardComponent implements OnInit {
  private crmService = inject(CrmService);
  private http       = inject(HttpClient);
  private auth       = inject(AuthService);
  private apiUrl     = environment.apiUrl;

  data:        any    = null;
  marketplace: any    = null;
  loading      = true;

  // ── Role helpers ──────────────────────────────────────────────
  get role(): string    { return this.auth.user?.role_type ?? ''; }
  get isAdmin(): boolean { return ['SUPER_ADMIN','ADMIN'].includes(this.role); }
  get isMSeller(): boolean { return this.role === 'M_SELLER'; }
  get isSeller(): boolean  { return this.role === 'SELLER'; }
  get isAgent(): boolean   { return ['AGENT','A_MANAGER'].includes(this.role); }

  /** Label shown in the header — depends on whose data is showing */
  get scopeLabel(): string {
    if (this.viewAsUser) return `Viewing: ${this.viewAsUser.name} (${this.viewAsUser.role_type})`;
    if (this.isAdmin || this.isMSeller) return 'All Users — Global View';
    return 'My Dashboard';
  }

  // ── View-as switcher (admin only) ─────────────────────────────
  showUserPicker = false;
  viewAsUser: any = null;          // currently viewed user object
  viewAsId: number | null = null;  // currently selected user ID
  crmUsers: any[] = [];
  usersLoaded = false;
  userSearch = '';

  get filteredUsers(): any[] {
    const q = this.userSearch.toLowerCase().trim();
    if (!q) return this.crmUsers;
    return this.crmUsers.filter(u =>
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.role_type?.toLowerCase().includes(q)
    );
  }

  loadUsers(): void {
    if (this.usersLoaded) return;
    this.crmService.getUsers().subscribe({
      next: (res: any) => {
        // Only show users with CRM roles
        const CRM = ['SUPER_ADMIN','ADMIN','M_SELLER','SELLER','AGENT','A_MANAGER','ISV','ISV_SELLER','SUPPORT_PARTNER'];
        this.crmUsers = (res.data || []).filter((u: any) => CRM.includes(u.role_type));
        this.usersLoaded = true;
      }
    });
  }

  openUserPicker(): void {
    this.loadUsers();
    this.showUserPicker = true;
  }

  selectUser(user: any): void {
    this.viewAsId   = user ? user.id : null;
    this.viewAsUser = user ? user : null;
    this.showUserPicker = false;
    this.userSearch = '';
    this.load();
  }

  resetView(): void {
    this.viewAsId   = null;
    this.viewAsUser = null;
    this.load();
  }

  // ── Data loading ──────────────────────────────────────────────
  ngOnInit(): void {
    this.load();
    this.http.get<any>(`${this.apiUrl}dashboard`).subscribe({
      next: (res: any) => { this.marketplace = res.data; },
      error: () => {}
    });
  }

  load(): void {
    this.loading = true;
    this.data = null;
    this.crmService.getDashboard(this.viewAsId ?? undefined).subscribe({
      next: (res: any) => { this.data = res.data; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  // ── Computed helpers ──────────────────────────────────────────
  getCount(arr: any[], key: string, val: string): number {
    return +(arr?.find((r: any) => r[key] === val)?.count || 0);
  }

  get totalPipeline(): string {
    return this.data?.pipeline_summary?.total_pipeline
      ? `₹${Number(this.data.pipeline_summary.total_pipeline).toLocaleString()}`
      : '₹0';
  }

  get totalRevenue(): string {
    return this.data?.pipeline_summary?.total_revenue
      ? `₹${Number(this.data.pipeline_summary.total_revenue).toLocaleString()}`
      : '₹0';
  }

  get totalOpportunities(): number {
    return +(this.data?.pipeline_summary?.total_opportunities || 0);
  }

  get wonCount(): number  { return +(this.data?.pipeline_summary?.won_count  || 0); }
  get lostCount(): number { return +(this.data?.pipeline_summary?.lost_count || 0); }

  get winRate(): string {
    const closed = this.wonCount + this.lostCount;
    if (!closed) return '—';
    return `${Math.round((this.wonCount / closed) * 100)}%`;
  }

  get maxLeadCount(): number {
    if (!this.data?.leads_by_status?.length) return 1;
    return Math.max(...this.data.leads_by_status.map((r: any) => +r.count), 1);
  }

  get maxOppCount(): number {
    if (!this.data?.opportunities_by_stage?.length) return 1;
    return Math.max(...this.data.opportunities_by_stage.map((r: any) => +r.count), 1);
  }

  roleColor(role: string): string {
    const map: any = {
      SUPER_ADMIN: '#7c3aed', ADMIN: '#2563eb', M_SELLER: '#0891b2',
      SELLER: '#059669', AGENT: '#d97706', A_MANAGER: '#b45309',
      ISV: '#db2777', ISV_SELLER: '#e11d48', SUPPORT_PARTNER: '#6b7280',
    };
    return map[role] || '#6b7280';
  }

  stageColor(stage: string): string {
    const scores: any = {
      'Discovery':10,'Qualification':20,'Assessment':30,'Demo':30,'Trial':30,
      'Scoping':30,'Technical Validation':30,'Proposal Shared':40,'Negotiation':40,
      'Private Offer':40,'Procurement':60,'PO Received':60,'Delivered':80,
      'Payment Pending':90,'Payment Received':95,'Closed Won':100,'Closed Lost':0,
    };
    const s = scores[stage] ?? 10;
    if (s >= 80) return '#059669';
    if (s >= 40) return '#d97706';
    if (s >= 20) return '#2563eb';
    return '#9ca3af';
  }
}
