import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AffiliateService } from '../../../core/services/affiliate/affiliate.service';

@Component({
  selector: 'app-affiliate-customers',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
<div class="crm-page">
  <div class="crm-header">
    <div>
      <h1 class="crm-title">My Customers</h1>
      <p class="crm-subtitle">Customers attributed to your affiliate account</p>
    </div>
    <button class="neo-btn" (click)="load()" [disabled]="loading">Refresh</button>
  </div>

  <div style="display:flex;gap:0.75rem;flex-wrap:wrap;margin-bottom:1rem">
    <button class="neo-btn" [class.neo-btn-primary]="view==='customers'" [attr.aria-pressed]="view==='customers'" (click)="switchView('customers')">Verified customers</button>
    <button class="neo-btn" [class.neo-btn-primary]="view==='registrations'" [attr.aria-pressed]="view==='registrations'" (click)="switchView('registrations')">Awaiting verification</button>
  </div>
  <p class="crm-subtitle" style="margin-bottom:1rem">Signups appear under Awaiting verification until they verify their email. Verified customers show their current CRM score and progress.</p>

  <div class="neo-card-sm" style="display:flex;gap:1.25rem;flex-wrap:wrap;margin-bottom:2rem;align-items:flex-end">
    <div class="form-group" style="margin:0;flex:1;min-width:200px">
      <label class="form-label">Search</label>
      <input class="neo-input" [placeholder]="view==='customers' ? 'Name, email, company…' : 'Name or email…'" [(ngModel)]="search" (keyup.enter)="applySearch()">
    </div>
    <button class="neo-btn" (click)="applySearch()">Search</button>
  </div>

  @if (loading) {
    <div class="neo-card" style="text-align:center;padding:3rem;color:var(--crm-text-secondary)">Loading…</div>
  } @else if (error) {
    <div class="neo-card" role="alert">{{ error }} <button class="neo-btn" (click)="load()">Retry</button></div>
  } @else if (!customers.length) {
    <div class="neo-card" style="text-align:center;padding:3rem;color:var(--crm-text-secondary)">
      <p style="font-size:0.9rem;font-weight:600">{{ search ? 'No matching customers' : view==='registrations' ? 'No signups awaiting verification' : 'No verified customers yet' }}</p>
      <p style="font-size:0.78rem;margin-top:0.35rem">{{ view==='registrations' ? 'New referral signups appear here until they verify their email.' : 'Customers who register through your affiliate links or campaigns appear here after email verification.' }}</p>
    </div>
  } @else {
    <div class="neo-table-wrap">
      <table class="neo-table">
        <thead>
          <tr>
            @if (view==='registrations') {
              <th>Name</th><th>Email</th><th>Product / Service / Solution</th><th>Source</th><th>Registered</th><th>Status</th>
            } @else {
            <th>Name</th><th>Email</th><th>Company</th><th>Source</th>
            <th>Registered</th><th>Score</th><th>Score Label</th><th>Latest activity</th><th>CRM Stage</th><th>Opportunity</th>
            }
          </tr>
        </thead>
        <tbody>
          @for (c of customers; track c.id) {
            <tr>
              <td style="font-weight:600">{{ c.name }}</td>
              <td style="color:var(--crm-text-secondary);font-size:0.8rem">{{ c.email }}</td>
              <td>{{ (view==='registrations' ? c.catalog_name : c.company) || '—' }}</td>
              <td>
                <span class="neo-badge">
                  {{ c.attribution_type === 'email_campaign' ? 'Campaign' : c.attribution_type === 'manual_assignment' ? 'Assigned by manager' : 'UTM Link' }}
                </span>
              </td>
              <td style="font-size:0.8rem;color:var(--crm-text-secondary)">{{ (c.registered_at || c.created_at) | date:'mediumDate' }}</td>
              @if (view==='registrations') {
                <td><span class="neo-badge">Awaiting verification</span></td>
              } @else {
              <td><strong>{{ c.score ?? 0 }}</strong></td>
              <td><span class="neo-badge">{{ c.score_label || '—' }}</span></td>
              <td>
                <span>{{ activityLabel(c.latest_activity) }}</span>
                @if (c.latest_activity_at) { <small style="display:block;color:var(--crm-text-secondary)">{{ c.latest_activity_at | date:'mediumDate' }}</small> }
              </td>
              <td>{{ c.lead_stage || c.status || '—' }}</td>
              <td>{{ c.latest_opp_stage || '—' }}</td>
              }
            </tr>
          }
        </tbody>
      </table>
    </div>
    <div style="display:flex;align-items:center;gap:0.75rem;margin-top:1.25rem">
      <button class="neo-btn" [disabled]="page===1" (click)="changePage(-1)">← Prev</button>
      <span style="font-size:0.8rem;color:var(--crm-text-secondary)">Page {{ page }} · {{ total }} total</span>
      <button class="neo-btn" [disabled]="page*limit>=total" (click)="changePage(1)">Next →</button>
    </div>
  }
</div>`,
})
export class AffiliateCustomersComponent implements OnInit {
  private svc  = inject(AffiliateService);
  customers: any[] = [];
  loading = true;
  search  = '';
  page    = 1;
  limit   = 20;
  total   = 0;
  view: 'customers' | 'registrations' = 'customers';
  error = '';
  private requestId = 0;

  ngOnInit() { this.load(); }

  load() {
    const requestId = ++this.requestId;
    this.loading = true;
    this.error = '';
    const params: any = { page: this.page, limit: this.limit };
    if (this.search) params.search = this.search;
    const request = this.view === 'registrations' ? this.svc.getRegistrations(params) : this.svc.getCustomers(params);
    request.subscribe({
      next: (r: any) => {
        if (requestId !== this.requestId) return;
        this.customers = r.data || []; this.total = r.total || 0; this.loading = false;
      },
      error: () => {
        if (requestId !== this.requestId) return;
        this.customers = []; this.total = 0; this.loading = false;
        this.error = 'Unable to load customers. Please try again.';
      },
    });
  }

  changePage(d: number) { this.page += d; this.load(); }
  applySearch() { this.page = 1; this.load(); }
  switchView(view: 'customers' | 'registrations') { this.view = view; this.page = 1; this.load(); }
  activityLabel(value: string | null | undefined) {
    const labels: Record<string, string> = {
      customer_registration: 'Registered', product_page_visit: 'Viewed catalog item',
      catalog_engagement: 'Scrolled catalog page', brochure_download: 'Downloaded brochure',
      use_case_download: 'Downloaded case study', cta_action: 'Created opportunity',
    };
    return value ? (labels[value] || value.replaceAll('_', ' ')) : '—';
  }
}
