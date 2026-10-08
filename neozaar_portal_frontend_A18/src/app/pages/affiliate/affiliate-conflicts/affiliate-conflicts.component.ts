import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AffiliateService } from '../../../core/services/affiliate/affiliate.service';

/**
 * Attribution Conflicts
 * Route: /affiliate/conflicts
 */
@Component({
  selector: 'app-affiliate-conflicts',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
<div class="crm-page">
  <div class="crm-header">
    <div>
      <h1 class="crm-title">Attribution Conflicts</h1>
      <p class="crm-subtitle">Review and manage pending affiliate attribution conflicts</p>
    </div>
    <a routerLink="/affiliate/dashboard" class="neo-btn" style="text-decoration:none;">← Back to Dashboard</a>
  </div>

  @if (loading) {
    <div class="neo-card" style="text-align:center;padding:3rem;color:var(--crm-text-secondary)">Loading conflicts…</div>
  } @else if (error) {
    <div class="neo-card" style="text-align:center;padding:2rem;color:var(--crm-text-secondary)">{{ error }}</div>
  } @else if (!conflicts.length) {
    <div class="neo-card" style="text-align:center;padding:3rem;color:var(--crm-text-secondary)">
      <p style="font-size:0.9rem;font-weight:600">No Conflicts Found</p>
      <p style="font-size:0.78rem;margin-top:0.35rem">There are no pending attribution conflicts at this time.</p>
    </div>
  } @else {
    <div class="neo-card" style="padding:0;overflow:hidden;">
      <div style="padding:1.1rem 1.5rem;border-bottom:1px solid rgba(16,42,67,0.07);font-size:0.78rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--crm-text-secondary)">
        Pending Conflicts ({{ conflicts.length }})
      </div>
      <div class="neo-table-wrap" style="box-shadow:none;border-radius:0;">
        <table class="neo-table">
          <thead>
            <tr>
              <th>Lead / Contact</th>
              <th>Email</th>
              <th>New Affiliate</th>
              <th>Previous Affiliate</th>
              <th>Date</th>
              <th>Status</th>
              <th>Resolve</th>
            </tr>
          </thead>
          <tbody>
            @for (c of conflicts; track c.id) {
              <tr>
                <td style="font-weight:600">{{ c.lead_name || c.contact_name || '—' }}</td>
                <td style="color:var(--crm-text-secondary);font-size:0.8rem">{{ c.lead_email || c.email || '—' }}</td>
                <td>{{ c.new_affiliate_name || '—' }}</td>
                <td>{{ c.previous_affiliate_name || c.old_affiliate_name || '—' }}</td>
                <td style="white-space:nowrap;color:var(--crm-text-secondary);font-size:0.8rem">{{ c.attributed_at | date:'mediumDate' }}</td>
                <td>
                  <span class="neo-badge"
                    [class.neo-badge-warning]="(c.status || 'pending') === 'pending'"
                    [class.neo-badge-active]="c.status === 'resolved'"
                    [class.neo-badge-danger]="c.status === 'rejected'">
                    {{ c.status || 'pending' }}
                  </span>
                </td>
                <td><button class="neo-btn" (click)="reassign(c)">Assign to requesting affiliate</button></td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  }
</div>`,
})
export class AffiliateConflictsComponent implements OnInit {
  private svc = inject(AffiliateService);
  conflicts: any[] = [];
  loading = true;
  error = '';

  reassign(conflict: any) {
    const reason = prompt('Reason for reassigning this customer (existing closed opportunities keep their history):');
    if (!reason?.trim()) return;
    this.svc.reassignCustomer(conflict.previous_affiliate_id, {
      crm_lead_id: conflict.crm_lead_id, new_affiliate_id: conflict.affiliate_id, reason: reason.trim()
    }).subscribe({ next: () => this.ngOnInit(), error: e => { this.error = e.error?.message || 'Reassignment failed'; } });
  }

  ngOnInit() {
    this.svc.getAttributionConflicts().subscribe({
      next: (r: any) => {
        this.conflicts = r.data || r.conflicts || (Array.isArray(r) ? r : []);
        this.loading = false;
      },
      error: (e: any) => {
        this.error = e?.error?.message || 'Failed to load conflicts.';
        this.loading = false;
      },
    });
  }
}
