import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AffiliateService } from '../../../core/services/affiliate/affiliate.service';

@Component({
  selector: 'app-affiliate-opportunities',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
<div class="crm-page">
  <div class="crm-header">
    <div>
      <h1 class="crm-title">My Opportunities</h1>
      <p class="crm-subtitle">CRM opportunities for your attributed customers</p>
    </div>
  </div>

  <div class="neo-card-sm" style="display:flex;gap:1.25rem;flex-wrap:wrap;margin-bottom:2rem;align-items:flex-end">
    <div class="form-group" style="margin:0;flex:1;min-width:200px">
      <label class="form-label">Search</label>
      <input class="neo-input" placeholder="Opportunity name…" [(ngModel)]="search" (keyup.enter)="load()">
    </div>
    <div class="form-group" style="margin:0;min-width:180px">
      <label class="form-label">Stage</label>
      <select class="neo-select" [(ngModel)]="stageFilter" (change)="load()">
        <option value="">All Stages</option>
        @for (s of stages; track s) { <option [value]="s">{{ s }}</option> }
      </select>
    </div>
    <button class="neo-btn" (click)="load()">Search</button>
  </div>

  @if (loading) {
    <div class="neo-card" style="text-align:center;padding:3rem;color:var(--crm-text-secondary)">Loading…</div>
  } @else if (!opps.length) {
    <div class="neo-card" style="text-align:center;padding:3rem;color:var(--crm-text-secondary)">
      <p style="font-size:0.9rem;font-weight:600">No opportunities yet</p>
      <p style="font-size:0.78rem;margin-top:0.35rem">Opportunities are created by the sales team once your customers reach the required score.</p>
    </div>
  } @else {
    <div class="neo-table-wrap">
      <table class="neo-table">
        <thead>
          <tr>
            <th>Name</th><th>Customer</th><th>Stage</th><th>Deal Value</th>
            <th>Cust. Score</th><th>Expected Close</th><th>Created</th>
          </tr>
        </thead>
        <tbody>
          @for (o of opps; track o.id) {
            <tr>
              <td style="font-weight:600">{{ o.name }}</td>
              <td>{{ o.contact_name || '—' }}</td>
              <td><span class="neo-badge">{{ o.stage }}</span></td>
              <td>₹{{ (o.deal_value||0).toLocaleString('en-IN') }}</td>
              <td>{{ o.customer_score ?? '—' }}</td>
              <td style="font-size:0.8rem;color:var(--crm-text-secondary)">
                {{ o.expected_close_date ? (o.expected_close_date | date:'mediumDate') : '—' }}
              </td>
              <td style="font-size:0.8rem;color:var(--crm-text-secondary)">{{ o.created_at | date:'mediumDate' }}</td>
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
export class AffiliateOpportunitiesComponent implements OnInit {
  private svc = inject(AffiliateService);
  opps: any[] = [];
  loading = true;
  search = '';
  stageFilter = '';
  page  = 1;
  limit = 20;
  total = 0;

  stages = ['Discovery','Qualification','Assessment','Demo','Trial','Proposal Shared',
            'Negotiation','Procurement','PO Received','Closed Won','Closed Lost'];

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    const params: any = { page: this.page, limit: this.limit };
    if (this.search) params.search = this.search;
    if (this.stageFilter) params.stage = this.stageFilter;
    this.svc.getOpportunities(params).subscribe({
      next: (r: any) => { this.opps = r.data || []; this.total = r.total || 0; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  changePage(d: number) { this.page += d; this.load(); }
}
