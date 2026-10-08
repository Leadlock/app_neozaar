import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AffiliateService } from '../../../core/services/affiliate/affiliate.service';

/**
 * Affiliate Audit Log
 * Route: /affiliate/audit-log
 */
@Component({
  selector: 'app-affiliate-audit-log',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
<div class="crm-page">
  <div class="crm-header">
    <div>
      <h1 class="crm-title">Affiliate Audit Log</h1>
      <p class="crm-subtitle">Full activity history for all affiliate actions</p>
    </div>
    <a routerLink="/affiliate/dashboard" class="neo-btn" style="text-decoration:none;">← Back to Dashboard</a>
  </div>

  @if (loading) {
    <div class="neo-card" style="text-align:center;padding:3rem;color:var(--crm-text-secondary)">Loading audit log…</div>
  } @else if (error) {
    <div class="neo-card" style="text-align:center;padding:2rem;color:var(--crm-text-secondary)">{{ error }}</div>
  } @else if (!logs.length) {
    <div class="neo-card" style="text-align:center;padding:3rem;color:var(--crm-text-secondary)">
      <p style="font-size:0.9rem;font-weight:600">No Audit Entries</p>
      <p style="font-size:0.78rem;margin-top:0.35rem">No affiliate activity has been logged yet.</p>
    </div>
  } @else {
    <div class="neo-card" style="padding:0;overflow:hidden;">
      <div style="padding:1.1rem 1.5rem;border-bottom:1px solid rgba(16,42,67,0.07);font-size:0.78rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--crm-text-secondary)">
        Log Entries ({{ logs.length }})
      </div>
      <div class="neo-table-wrap" style="box-shadow:none;border-radius:0;">
        <table class="neo-table">
          <thead>
            <tr>
              <th>Action</th>
              <th>Affiliate</th>
              <th>Entity</th>
              <th>Details</th>
              <th>Performed By</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            @for (log of logs; track log.id) {
              <tr>
                <td>
                  <span class="neo-badge"
                    [class.neo-badge-active]="log.action === 'created'"
                    [class.neo-badge-warning]="log.action === 'updated'"
                    [class.neo-badge-danger]="log.action === 'deleted'">
                    {{ log.action || '—' }}
                  </span>
                </td>
                <td style="font-weight:600">{{ log.affiliate_name || '—' }}</td>
                <td>{{ log.entity_type || log.model || '—' }}</td>
                <td style="max-width:260px;white-space:normal;font-size:0.8rem;color:var(--crm-text-secondary)">{{ log.details || log.description || '—' }}</td>
                <td>{{ log.performed_by || log.user_name || '—' }}</td>
                <td style="white-space:nowrap;color:var(--crm-text-secondary);font-size:0.8rem">{{ log.created_at | date:'medium' }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  }
</div>`,
})
export class AffiliateAuditLogComponent implements OnInit {
  private svc = inject(AffiliateService);
  logs: any[] = [];
  loading = true;
  error = '';

  ngOnInit() {
    this.svc.getAuditLog().subscribe({
      next: (r: any) => {
        this.logs = r.data || r.logs || (Array.isArray(r) ? r : []);
        this.loading = false;
      },
      error: (e: any) => {
        this.error = e?.error?.message || 'Failed to load audit log.';
        this.loading = false;
      },
    });
  }
}
