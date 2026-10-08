import { AffiliateScopeComponent } from '../affiliate-scope.component';
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AffiliateService } from '../../../core/services/affiliate/affiliate.service';

@Component({
  selector: 'app-affiliate-campaigns',
  standalone: true,
  imports: [CommonModule, FormsModule, AffiliateScopeComponent],
  template: `
<div class="crm-page">
  <app-affiliate-scope (changed)="changeAffiliate($event)" />
  <div class="crm-header">
    <div>
      <h1 class="crm-title">Campaigns</h1>
      <p class="crm-subtitle">Email campaigns to your contact database</p>
    </div>
    <button class="neo-btn neo-btn-primary" (click)="showCreate=!showCreate">+ New Campaign</button>
  </div>

  <!-- Create campaign form -->
  @if (showCreate) {
    <div class="neo-card" style="margin-bottom:2rem">
      <h3 style="font-size:0.9rem;font-weight:700;color:var(--crm-text);margin-bottom:1.25rem;text-transform:uppercase;letter-spacing:0.06em">Create Campaign</h3>
      <div style="display:flex;flex-direction:column;gap:1rem">
        <div class="form-group" style="margin:0">
          <label class="form-label">Campaign Name <span class="req">*</span></label>
          <input class="neo-input" placeholder="e.g. November Outreach" [(ngModel)]="form.name">
        </div>
        <div class="form-group" style="margin:0">
          <label class="form-label">Email Subject <span class="req">*</span></label>
          <input class="neo-input" placeholder="e.g. Discover NeoZaar Marketplace" [(ngModel)]="form.subject">
        </div>
        <div class="form-group" style="margin:0">
          <label class="form-label">Email Body (HTML supported — use [name] and [registration_url] as placeholders)</label>
          <textarea class="neo-input" rows="6" placeholder="Dear [name], …" [(ngModel)]="form.body_html" style="resize:vertical;"></textarea>
        </div>
      </div>
      <div style="display:flex;gap:0.75rem;margin-top:1.25rem">
        <button class="neo-btn neo-btn-primary" (click)="createCampaign()">Create Campaign</button>
        <button class="neo-btn" (click)="showCreate=false;resetForm()">Cancel</button>
      </div>
    </div>
  }

  @if (loading) {
    <div class="neo-card" style="text-align:center;padding:3rem;color:var(--crm-text-secondary)">Loading…</div>
  } @else if (!campaigns.length) {
    <div class="neo-card" style="text-align:center;padding:3rem;color:var(--crm-text-secondary)">
      <p style="font-size:0.9rem;font-weight:600">No campaigns yet</p>
      <p style="font-size:0.78rem;margin-top:0.35rem">Create your first campaign to send emails to your database.</p>
    </div>
  } @else {
    <div class="neo-table-wrap">
      <table class="neo-table">
        <thead>
          <tr>
            <th>Name</th><th>Subject</th><th>Status</th>
            <th>Contacts</th><th>Sent</th><th>Opened</th><th>Clicked</th><th>Registered</th><th>Created</th><th></th>
          </tr>
        </thead>
        <tbody>
          @for (c of campaigns; track c.id) {
            <tr>
              <td style="font-weight:600">{{ c.name }}</td>
              <td style="color:var(--crm-text-secondary);font-size:0.8rem;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ c.subject }}</td>
              <td><span class="neo-badge" [class]="statusBadge(c.status)">{{ c.status }}</span></td>
              <td>{{ c.total_contacts }}</td>
              <td>{{ c.sent_count }}</td>
              <td>{{ c.opened_count }}</td>
              <td>{{ c.clicked_count }}</td>
              <td>{{ c.registered_count }}</td>
              <td style="font-size:0.8rem;color:var(--crm-text-secondary)">{{ c.created_at | date:'mediumDate' }}</td>
              <td>
                @if (c.status === 'draft') {
                  <button class="neo-btn neo-btn-primary" style="padding:0.3rem 0.9rem;font-size:0.78rem" (click)="confirmSend(c)">Send</button>
                } @else if (c.status === 'sent') {
                  <button class="neo-btn" style="padding:0.3rem 0.9rem;font-size:0.78rem" (click)="viewSends(c)">Results</button>
                }
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  }

  <!-- Sends modal -->
  @if (sendsModal) {
    <div class="neo-modal-backdrop" (click)="sendsModal=null">
      <div class="neo-modal" (click)="$event.stopPropagation()" style="max-width:700px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem">
          <h2 style="font-size:1rem;font-weight:700;color:var(--crm-text)">Results: {{ sendsModal.name }}</h2>
          <button class="neo-btn" style="padding:0.3rem 0.8rem;font-size:0.8rem" (click)="sendsModal=null">✕ Close</button>
        </div>
        <div class="neo-table-wrap" style="max-height:400px;overflow-y:auto">
          <table class="neo-table">
            <thead><tr><th>Contact</th><th>Email</th><th>Status</th><th>Sent</th><th>Opened</th><th>Clicked</th><th>Registered</th></tr></thead>
            <tbody>
              @for (s of sends; track s.id) {
                <tr>
                  <td style="font-weight:600">{{ s.contact_name }}</td>
                  <td style="color:var(--crm-text-secondary);font-size:0.8rem">{{ s.contact_email }}</td>
                  <td>{{ s.status }}</td><td style="font-size:0.8rem;color:var(--crm-text-secondary)">{{ s.sent_at | date:'mediumDate' }}</td>
                  <td><span [style.color]="s.opened ? 'var(--crm-primary)' : 'var(--crm-text-secondary)'">{{ s.opened ? '✓' : '—' }}</span></td>
                  <td><span [style.color]="s.clicked ? 'var(--crm-primary)' : 'var(--crm-text-secondary)'">{{ s.clicked ? '✓' : '—' }}</span></td>
                  <td><span [style.color]="s.registered ? 'var(--crm-primary)' : 'var(--crm-text-secondary)'">{{ s.registered ? '✓' : '—' }}</span></td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  }
</div>`,
})
export class AffiliateCampaignsComponent implements OnInit {
  private svc = inject(AffiliateService);
  selectedAffiliate: number | undefined;
  changeAffiliate(id: number | undefined) { this.selectedAffiliate = id; this.load();  }

  campaigns: any[] = [];
  sends: any[] = [];
  loading    = true;
  showCreate = false;
  sendsModal: any = null;
  form = { name: '', subject: '', body_html: '' };

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.svc.getCampaigns(this.selectedAffiliate ? { affiliate_id: this.selectedAffiliate } : {}).subscribe({
      next: (r: any) => { this.campaigns = r.data || []; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  resetForm() { this.form = { name: '', subject: '', body_html: '' }; }

  createCampaign() {
    if (!this.form.name || !this.form.subject) return;
    this.svc.createCampaign(this.form, this.selectedAffiliate).subscribe({
      next: () => { this.showCreate = false; this.resetForm(); this.load(); },
      error: () => alert('Failed to create campaign'),
    });
  }

  confirmSend(c: any) {
    if (!confirm(`Send campaign "${c.name}" to all eligible contacts in this campaign’s affiliate database?`)) return;
    this.svc.sendCampaign(c.id).subscribe({
      next: (r: any) => { alert(r.message || 'Campaign sent'); this.load(); },
      error: (e: any) => alert(e.error?.message || 'Failed to send campaign'),
    });
  }

  viewSends(c: any) {
    this.sendsModal = c;
    this.svc.getCampaignSends(c.id).subscribe({ next: (r: any) => { this.sends = r.data || []; } });
  }

  statusBadge(s: string): string {
    return s === 'sent' ? 'neo-badge-active' : s === 'draft' ? 'neo-badge-gray' : s === 'cancelled' ? 'neo-badge-danger' : '';
  }
}
