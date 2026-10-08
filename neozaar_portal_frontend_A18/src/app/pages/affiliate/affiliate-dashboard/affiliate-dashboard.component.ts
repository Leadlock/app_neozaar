import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AffiliateService } from '../../../core/services/affiliate/affiliate.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-affiliate-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
<div class="crm-page">
  @if (isAffiliate) {
    <nav class="affiliate-dashboard-nav" aria-label="Affiliate dashboard sections">
      <a routerLink="/affiliate/customers"      routerLinkActive="neo-btn-primary" class="neo-btn">My Customers</a>
      <a routerLink="/affiliate/opportunities"  routerLinkActive="neo-btn-primary" class="neo-btn">My Opportunities</a>
      <a routerLink="/affiliate/database"       routerLinkActive="neo-btn-primary" class="neo-btn">My Database</a>
      <a routerLink="/affiliate/campaigns"      routerLinkActive="neo-btn-primary" class="neo-btn">Campaigns</a>
      <a routerLink="/affiliate/links"          routerLinkActive="neo-btn-primary" class="neo-btn">My Links</a>
      <a routerLink="/affiliate/scores"         routerLinkActive="neo-btn-primary" class="neo-btn">Customer Scores</a>
    </nav>
  }
  <div class="crm-header">
    <div>
      <h1 class="crm-title">Affiliate Dashboard</h1>
      <p class="crm-subtitle">{{ isAffiliate ? 'Your affiliate performance overview' : 'All affiliate performance' }}</p>
    </div>
    <button class="neo-btn" (click)="load()">Refresh</button>
  </div>

  @if (loading) {
    <div class="crm-grid-4">
      @for (i of [1,2,3,4]; track i) {
        <div class="neo-stat"><div class="skeleton" style="height:18px;width:55%;margin-bottom:6px"></div></div>
      }
    </div>
  }

  @if (!loading && data) {

    <!-- ── Affiliate own view ───────────────────────────────── -->
    @if (isAffiliate) {
      <div class="affiliate-metrics-grid">
        <div class="neo-stat">
          <span class="neo-stat-label">UTM Link Clicks</span>
          <span class="neo-stat-value accent">{{ fmt(data.links?.total_clicks) }}</span>
          <span style="font-size:0.68rem;color:var(--crm-text-secondary);margin-top:0.15rem">{{ fmt(data.links?.clicks_7_days) }} in last 7 days · {{ fmt(data.links?.clicks_30_days) }} in last 30 days</span>
        </div>
        <div class="neo-stat">
          <span class="neo-stat-label">Unique Visitors</span>
          <span class="neo-stat-value">{{ fmt(data.links?.unique_visitors) }}</span>
          <span style="font-size:0.68rem;color:var(--crm-text-secondary);margin-top:0.15rem">Deduplicated by privacy-safe visitor hash</span>
        </div>
        <div class="neo-stat">
          <span class="neo-stat-label">UTM Registrations</span>
          <span class="neo-stat-value">{{ fmt(data.links?.registrations) }}</span>
          <span style="font-size:0.68rem;color:var(--crm-text-secondary);margin-top:0.15rem">{{ fmt(data.links?.verified_customers) }} verified customers</span>
        </div>
        <div class="neo-stat">
          <span class="neo-stat-label">Click-to-Registration</span>
          <span class="neo-stat-value">{{ data.links?.click_to_registration_rate || 0 }}%</span>
          <span style="font-size:0.68rem;color:var(--crm-text-secondary);margin-top:0.15rem">{{ fmt(data.links?.active) }} active of {{ fmt(data.links?.total) }} links</span>
        </div>
        <div class="neo-stat">
          <span class="neo-stat-label">Total Customers</span>
          <span class="neo-stat-value accent">{{ fmt(data.customers?.total) }}</span>
          <span style="font-size:0.68rem;color:var(--crm-text-secondary);margin-top:0.15rem">+{{ fmt(data.customers?.new_this_month) }} this month</span>
          <a routerLink="/affiliate/customers" style="font-size:0.75rem;margin-top:0.35rem">{{ fmt(data.customers?.pending_verification) }} awaiting verification</a>
        </div>
        <div class="neo-stat">
          <span class="neo-stat-label">Active Opportunities</span>
          <span class="neo-stat-value">{{ fmt(data.opportunities?.active) }}</span>
        </div>
        <div class="neo-stat">
          <span class="neo-stat-label">Won</span>
          <span class="neo-stat-value">{{ fmt(data.opportunities?.won) }}</span>
        </div>
        <div class="neo-stat">
          <span class="neo-stat-label">Pipeline Value</span>
          <span class="neo-stat-value accent">{{ fmtCurrency(data.opportunities?.pipeline_value) }}</span>
        </div>
        <div class="neo-stat">
          <span class="neo-stat-label">Conversion Rate</span>
          <span class="neo-stat-value">{{ data.opportunities?.conversion_rate }}%</span>
        </div>
        <div class="neo-stat">
          <span class="neo-stat-label">Avg Customer Score</span>
          <span class="neo-stat-value">{{ data.scoring?.avg_customer_score }}</span>
        </div>
        <div class="neo-stat">
          <span class="neo-stat-label">Emails Sent</span>
          <span class="neo-stat-value">{{ fmt(data.campaigns?.emails_sent) }}</span>
          <span style="font-size:0.68rem;color:var(--crm-text-secondary);margin-top:0.15rem">{{ fmt(data.campaigns?.registrations) }} registrations</span>
        </div>
        <div class="neo-stat">
          <span class="neo-stat-label">Database Contacts</span>
          <span class="neo-stat-value">{{ fmt(data.database?.total_contacts) }}</span>
          <span style="font-size:0.68rem;color:var(--crm-text-secondary);margin-top:0.15rem">{{ fmt(data.database?.registered) }} registered</span>
        </div>
      </div>

    }

    <!-- ── Manager / SuperAdmin view ───────────────────────── -->
    @if (isManager) {
      <div class="crm-grid-4">
        <div class="neo-stat">
          <span class="neo-stat-label">Total Affiliates</span>
          <span class="neo-stat-value accent">{{ fmt(data.overview?.total_affiliates) }}</span>
          <span style="font-size:0.68rem;color:var(--crm-text-secondary);margin-top:0.15rem">{{ fmt(data.overview?.active_affiliates) }} active</span>
        </div>
        <div class="neo-stat">
          <span class="neo-stat-label">Total Customers</span>
          <span class="neo-stat-value">{{ fmt(data.overview?.total_customers) }}</span>
          <span style="font-size:0.68rem;color:var(--crm-text-secondary);margin-top:0.15rem">+{{ fmt(data.overview?.customers_this_month) }} this month</span>
        </div>
        <div class="neo-stat">
          <span class="neo-stat-label">Open Opportunities</span>
          <span class="neo-stat-value">{{ fmt(data.overview?.open_opps) }}</span>
        </div>
        <div class="neo-stat">
          <span class="neo-stat-label">Won</span>
          <span class="neo-stat-value">{{ fmt(data.overview?.won_opps) }}</span>
        </div>
        <div class="neo-stat">
          <span class="neo-stat-label">Pipeline Value</span>
          <span class="neo-stat-value accent">{{ fmtCurrency(data.overview?.pipeline_value) }}</span>
        </div>
        <div class="neo-stat">
          <span class="neo-stat-label">Won Revenue</span>
          <span class="neo-stat-value">{{ fmtCurrency(data.overview?.won_revenue) }}</span>
        </div>
        <div class="neo-stat">
          <span class="neo-stat-label">Avg Customer Score</span>
          <span class="neo-stat-value">{{ data.overview?.avg_customer_score }}</span>
        </div>
      </div>

      @if (data.affiliates?.length) {
        <div class="neo-card" style="margin-top:0.5rem">
          <h3 style="font-size:0.85rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--crm-text-secondary);margin-bottom:1.25rem">Affiliate Performance</h3>
          <div class="neo-table-wrap">
            <table class="neo-table">
              <thead>
                <tr><th>Affiliate</th><th>Email</th><th>Customers</th><th>Opps</th><th>Won</th><th>Pipeline</th><th>Avg Score</th><th>Status</th></tr>
              </thead>
              <tbody>
                @for (a of data.affiliates; track a.id) {
                  <tr>
                    <td style="font-weight:600">{{ a.name }}</td>
                    <td style="color:var(--crm-text-secondary)">{{ a.email }}</td>
                    <td>{{ fmt(a.customers) }}</td>
                    <td>{{ fmt(a.total_opps) }}</td>
                    <td>{{ fmt(a.won) }}</td>
                    <td>{{ fmtCurrency(a.pipeline) }}</td>
                    <td>{{ a.avg_score }}</td>
                    <td>
                      <span class="neo-badge" [class.neo-badge-active]="a.is_active">
                        {{ a.is_active ? 'Active' : 'Inactive' }}
                      </span>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      <div style="display:flex;gap:0.75rem;flex-wrap:wrap;margin-top:1.5rem">
        <a routerLink="/affiliate/management"  class="neo-btn neo-btn-primary">Manage Affiliates</a>
        <a routerLink="/affiliate/customers"   class="neo-btn">All Customers</a>
        <a routerLink="/affiliate/opportunities" class="neo-btn">All Opportunities</a>
        <a routerLink="/affiliate/conflicts"   class="neo-btn">Attribution Conflicts</a>
        <a routerLink="/affiliate/audit-log"   class="neo-btn">Audit Log</a>
      </div>
    }
  }
</div>`,
  styles: [`
    :host .crm-page {
      padding: 1rem 1.5rem;
    }
    :host .crm-header {
      margin-bottom: 0.75rem;
    }
    :host .crm-title {
      font-size: 1.5rem;
      line-height: 1.15;
    }
    :host .crm-subtitle {
      margin-top: 0.15rem;
    }
    .affiliate-metrics-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      grid-template-rows: repeat(4, minmax(0, 1fr));
      gap: 0.65rem;
    }
    .affiliate-metrics-grid .neo-stat {
      min-height: 0;
      padding: 0.7rem 1rem;
      gap: 0.18rem;
    }
    .affiliate-metrics-grid .neo-stat-value {
      font-size: 1.4rem;
      line-height: 1.1;
    }
    .affiliate-metrics-grid .neo-stat-label {
      font-size: 0.68rem;
      line-height: 1.15;
    }
    .affiliate-metrics-grid .neo-stat > span:not(.neo-stat-value):not(.neo-stat-label),
    .affiliate-metrics-grid .neo-stat > a {
      line-height: 1.2;
    }
    .affiliate-dashboard-nav {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
      margin-bottom: 0.75rem;
    }
    .affiliate-dashboard-nav .neo-btn {
      padding: 0.45rem 0.75rem;
      font-size: 0.75rem;
    }
    @media (max-width: 1024px) {
      .affiliate-metrics-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        grid-template-rows: none;
      }
    }
    @media (max-width: 640px) {
      :host .crm-page { padding: 0.75rem; }
      .affiliate-metrics-grid { grid-template-columns: minmax(0, 1fr); }
    }
  `],
})
export class AffiliateDashboardComponent implements OnInit {
  private affiliateSvc = inject(AffiliateService);
  private auth         = inject(AuthService);

  loading = true;
  data: any = null;

  get role(): string { return this.auth.user?.role_type ?? ''; }
  get isAffiliate(): boolean { return this.role === 'AGENT'; }
  get isManager(): boolean   { return ['A_MANAGER','SUPER_ADMIN','ADMIN'].includes(this.role); }

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    const obs = this.isAffiliate
      ? this.affiliateSvc.getAffiliateDashboard()
      : this.affiliateSvc.getManagerDashboard();
    obs.subscribe({
      next: (r: any) => { this.data = r.data; this.loading = false; },
      error: ()      => { this.loading = false; },
    });
  }

  fmt(n: any): string { return (Number(n) || 0).toLocaleString(); }
  fmtCurrency(n: any): string {
    return '₹' + (Number(n) || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  }
}
