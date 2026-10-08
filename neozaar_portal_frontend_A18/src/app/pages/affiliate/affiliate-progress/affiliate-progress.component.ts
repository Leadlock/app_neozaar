import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AffiliateService } from '../../../core/services/affiliate/affiliate.service';

/**
 * SuperAdmin Affiliate Progress
 * Route: /crm/affiliate-progress
 */
@Component({
  selector: 'app-affiliate-progress',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
<div class="crm-page">
  <div class="crm-header">
    <div>
      <h1 class="crm-title">Affiliate Progress</h1>
      <p class="crm-subtitle">Overview of all affiliate pipeline activity and performance</p>
    </div>
    <a routerLink="/affiliate/dashboard" class="neo-btn" style="text-decoration:none;">← Back to Dashboard</a>
  </div>

  @if (loading) {
    <div class="neo-card" style="text-align:center;padding:3rem;color:var(--crm-text-secondary)">Loading affiliate progress…</div>
  }
  @else if (data) {
    <!-- Summary stat cards -->
    <div class="crm-grid-4" style="margin-bottom:2rem;">
      <div class="neo-stat">
        <span class="neo-stat-label">Active Affiliates</span>
        <span class="neo-stat-value">{{ data.summary?.active_affiliates ?? 0 }}</span>
      </div>
      <div class="neo-stat">
        <span class="neo-stat-label">Attributed Customers</span>
        <span class="neo-stat-value">{{ data.summary?.attributed_customers ?? 0 }}</span>
      </div>
      <div class="neo-stat">
        <span class="neo-stat-label">Won Opportunities</span>
        <span class="neo-stat-value">{{ data.summary?.won_opportunities ?? 0 }}</span>
      </div>
      <div class="neo-stat">
        <span class="neo-stat-label">Won Revenue</span>
        <span class="neo-stat-value accent">₹{{ fmtNum(data.summary?.won_revenue) }}</span>
      </div>
      <div class="neo-stat">
        <span class="neo-stat-label">Total Pipeline</span>
        <span class="neo-stat-value">₹{{ fmtNum(data.summary?.total_pipeline) }}</span>
      </div>
      @if (data.summary?.pending_conflicts > 0) {
        <div class="neo-stat">
          <span class="neo-stat-label" style="color:#b45309;">Attribution Conflicts</span>
          <span class="neo-stat-value" style="color:#b45309;">{{ data.summary.pending_conflicts }}</span>
          <a routerLink="/affiliate/conflicts" class="neo-btn" style="font-size:0.75rem;padding:0.35rem 0.9rem;margin-top:0.5rem;text-decoration:none;display:inline-block;">Resolve →</a>
        </div>
      }
    </div>

    <!-- Top affiliates -->
    @if (data.top_affiliates?.length) {
      <div class="neo-card" style="padding:0;overflow:hidden;margin-bottom:1.5rem;">
        <div style="padding:1.1rem 1.5rem;border-bottom:1px solid rgba(16,42,67,0.07);font-size:0.78rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--crm-text-secondary);">
          Top Affiliates
        </div>
        <div class="neo-table-wrap" style="box-shadow:none;border-radius:0;">
          <table class="neo-table">
            <thead>
              <tr><th>Affiliate</th><th>Customers</th><th>Won</th><th>Pipeline</th></tr>
            </thead>
            <tbody>
              @for (a of data.top_affiliates; track a.id) {
                <tr>
                  <td style="font-weight:600">{{ a.name }}</td>
                  <td>{{ a.customers }}</td>
                  <td>{{ a.won }}</td>
                  <td style="font-weight:700;color:var(--crm-primary)">₹{{ fmtNum(a.pipeline) }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    }

    <!-- Stage pipeline -->
    @if (data.stage_pipeline?.length) {
      <div class="neo-card" style="padding:0;overflow:hidden;margin-bottom:1.5rem;">
        <div style="padding:1.1rem 1.5rem;border-bottom:1px solid rgba(16,42,67,0.07);font-size:0.78rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--crm-text-secondary);">
          Affiliate Pipeline by Stage
        </div>
        <div class="neo-table-wrap" style="box-shadow:none;border-radius:0;">
          <table class="neo-table">
            <thead><tr><th>Stage</th><th>Count</th><th>Value</th></tr></thead>
            <tbody>
              @for (s of data.stage_pipeline; track s.stage) {
                <tr>
                  <td>{{ s.stage }}</td>
                  <td><span class="neo-badge neo-badge-new">{{ s.count }}</span></td>
                  <td style="font-weight:700;color:var(--crm-primary)">₹{{ fmtNum(s.value) }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    }

    <!-- Recent opportunities -->
    @if (data.recent_opportunities?.length) {
      <div class="neo-card" style="padding:0;overflow:hidden;margin-bottom:1.5rem;">
        <div style="padding:1.1rem 1.5rem;border-bottom:1px solid rgba(16,42,67,0.07);font-size:0.78rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--crm-text-secondary);">
          Recent Affiliate Opportunities
        </div>
        <div class="neo-table-wrap" style="box-shadow:none;border-radius:0;">
          <table class="neo-table">
            <thead><tr><th>Name</th><th>Affiliate</th><th>Contact</th><th>Stage</th><th>Value</th><th>Created</th></tr></thead>
            <tbody>
              @for (o of data.recent_opportunities; track o.id) {
                <tr>
                  <td style="font-weight:600">{{ o.name }}</td>
                  <td>{{ o.affiliate_name }}</td>
                  <td>{{ o.contact_name }}</td>
                  <td><span class="neo-badge neo-badge-new">{{ o.stage }}</span></td>
                  <td style="font-weight:700;color:var(--crm-primary)">₹{{ fmtNum(o.deal_value) }}</td>
                  <td style="color:var(--crm-text-secondary);font-size:0.8rem">{{ o.created_at | date:'mediumDate' }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    }

    <!-- Attribution conflicts -->
    @if (data.attribution_conflicts?.length) {
      <div class="neo-card" style="padding:0;overflow:hidden;">
        <div style="padding:1.1rem 1.5rem;border-bottom:1px solid rgba(16,42,67,0.07);font-size:0.78rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#b45309;">
          Attribution Conflicts Requiring Resolution
        </div>
        <div class="neo-table-wrap" style="box-shadow:none;border-radius:0;">
          <table class="neo-table">
            <thead><tr><th>Affiliate</th><th>Lead</th><th>Email</th><th>Date</th></tr></thead>
            <tbody>
              @for (c of data.attribution_conflicts; track c.id) {
                <tr>
                  <td style="font-weight:600">{{ c.new_affiliate_name }}</td>
                  <td>{{ c.lead_name }}</td>
                  <td style="color:var(--crm-text-secondary);font-size:0.8rem">{{ c.lead_email }}</td>
                  <td style="color:var(--crm-text-secondary);font-size:0.8rem">{{ c.attributed_at | date:'mediumDate' }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <div style="padding:1rem 1.5rem;">
          <a routerLink="/affiliate/conflicts" class="neo-btn neo-btn-primary" style="text-decoration:none;display:inline-block;">Resolve Conflicts</a>
        </div>
      </div>
    }
  }
</div>`,
})
export class AffiliateProgressComponent implements OnInit {
  private svc = inject(AffiliateService);
  data: any = null;
  loading = true;

  ngOnInit() {
    this.svc.getSuperAdminProgress().subscribe({
      next: (r: any) => { this.data = r.data; this.loading = false; },
      error: ()       => { this.loading = false; },
    });
  }

  fmtNum(n: any): string {
    return (Number(n) || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
  }
}
