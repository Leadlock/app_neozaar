import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AffiliateService } from '../../../core/services/affiliate/affiliate.service';

@Component({
  selector: 'app-affiliate-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
<div class="crm-page">
  <div class="crm-header">
    <div>
      <h1 class="crm-title">Affiliate Management</h1>
      <p class="crm-subtitle">Create, manage and assign catalog items to affiliates</p>
    </div>
    <button class="neo-btn neo-btn-primary" (click)="showCreate=!showCreate">+ New Affiliate</button>
  </div>

  <!-- Create affiliate form -->
  @if (showCreate) {
    <div class="neo-card" style="margin-bottom:2rem">
      <h3 style="font-size:0.85rem;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:var(--crm-text-secondary);margin-bottom:1.25rem">Create Affiliate</h3>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:1rem">
        <div class="form-group" style="margin:0">
          <label class="form-label">Full Name <span class="req">*</span></label>
          <input class="neo-input" placeholder="Full name" [(ngModel)]="form.name">
        </div>
        <div class="form-group" style="margin:0">
          <label class="form-label">Email <span class="req">*</span></label>
          <input class="neo-input" placeholder="email@example.com" [(ngModel)]="form.email">
        </div>
        <div class="form-group" style="margin:0">
          <label class="form-label">Mobile</label>
          <input class="neo-input" placeholder="+91 …" [(ngModel)]="form.mobile">
        </div>
        <div class="form-group" style="margin:0">
          <label class="form-label">Role</label>
          <select class="neo-select" [(ngModel)]="form.role_type">
            <option value="AGENT">Affiliate (AGENT)</option>
            <option value="A_MANAGER">Affiliate Manager (A_MANAGER)</option>
          </select>
        </div>
      </div>
      <div style="display:flex;gap:0.75rem;margin-top:1.25rem">
        <button class="neo-btn neo-btn-primary" (click)="createAffiliate()">Create</button>
        <button class="neo-btn" (click)="showCreate=false;resetForm()">Cancel</button>
      </div>
    </div>
  }

  <!-- Filters -->
  <div class="neo-card-sm" style="display:flex;gap:1.25rem;flex-wrap:wrap;margin-bottom:2rem;align-items:flex-end">
    <div class="form-group" style="margin:0;flex:1;min-width:200px">
      <label class="form-label">Search</label>
      <input class="neo-input" placeholder="Name, email…" [(ngModel)]="search" (keyup.enter)="load()">
    </div>
    <div class="form-group" style="margin:0;min-width:150px">
      <label class="form-label">Status</label>
      <select class="neo-select" [(ngModel)]="statusFilter" (change)="load()">
        <option value="">All</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
      </select>
    </div>
    <button class="neo-btn" (click)="load()">Search</button>
  </div>

  @if (loading) {
    <div class="neo-card" style="text-align:center;padding:3rem;color:var(--crm-text-secondary)">Loading…</div>
  } @else if (!affiliates.length) {
    <div class="neo-card" style="text-align:center;padding:3rem;color:var(--crm-text-secondary)">
      <p style="font-size:0.9rem;font-weight:600">No affiliates found</p>
    </div>
  } @else {
    <div class="neo-table-wrap">
      <table class="neo-table">
        <thead>
          <tr><th>Name</th><th>Email</th><th>Role</th><th>Ref Code</th><th>Customers</th><th>Links</th><th>Campaigns</th><th>Status</th><th></th></tr>
        </thead>
        <tbody>
          @for (a of affiliates; track a.id) {
            <tr>
              <td style="font-weight:600">{{ a.name }}</td>
              <td style="color:var(--crm-text-secondary)">{{ a.email }}</td>
              <td><span class="neo-badge">{{ a.role_type }}</span></td>
              <td style="font-family:monospace;font-size:0.8rem">{{ a.ref_code || '—' }}</td>
              <td>{{ a.total_customers }}</td>
              <td>{{ a.active_links }}</td>
              <td>{{ a.total_campaigns }}</td>
              <td>
                <span class="neo-badge" [class.neo-badge-active]="a.is_active">
                  {{ a.is_active ? 'Active' : 'Inactive' }}
                </span>
              </td>
              <td>
                <div style="display:flex;gap:0.4rem">
                  <button class="neo-btn" style="padding:0.3rem 0.75rem;font-size:0.78rem" (click)="selectAffiliate(a)">Manage</button>
                  <button class="neo-btn" style="padding:0.3rem 0.75rem;font-size:0.78rem"
                    [class.neo-btn-primary]="!a.is_active"
                    (click)="toggleStatus(a)">
                    {{ a.is_active ? 'Deactivate' : 'Activate' }}
                  </button>
                </div>
              </td>
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

  <!-- Affiliate detail panel (slide-in style using fixed right panel) -->
  @if (selected) {
    <div style="position:fixed;inset:0;z-index:900;background:rgba(16,42,67,0.35);backdrop-filter:blur(4px)" (click)="selected=null">
      <div style="position:absolute;right:0;top:0;bottom:0;width:min(520px,95vw);background:var(--crm-surface);box-shadow:-10px 0 30px rgba(16,42,67,0.18);overflow-y:auto;padding:2rem" (click)="$event.stopPropagation()">

        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem">
          <div>
            <h2 style="font-size:1.1rem;font-weight:800;color:var(--crm-text)">{{ selected.name }}</h2>
            <p style="font-size:0.8rem;color:var(--crm-text-secondary);margin-top:0.25rem">Ref: <code style="font-family:monospace">{{ selected.ref_code }}</code></p>
          </div>
          <button class="neo-btn" style="padding:0.35rem 0.9rem" (click)="selected=null">✕ Close</button>
        </div>

        <!-- Tabs -->
        <div style="display:flex;gap:0;border-bottom:2px solid rgba(16,42,67,0.08);margin-bottom:1.5rem">
          @for (tab of ['Assignments','Links','Create Link']; track tab) {
            <button style="padding:0.6rem 1.1rem;font-size:0.82rem;font-weight:700;border:none;background:none;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-2px;color:var(--crm-text-secondary)"
              [style.border-bottom-color]="activeTab===tab ? 'var(--crm-primary)' : 'transparent'"
              [style.color]="activeTab===tab ? 'var(--crm-text)' : 'var(--crm-text-secondary)'"
              (click)="activeTab=tab;loadTab()">{{ tab }}</button>
          }
        </div>

        @if (activeTab === 'Assignments') {
          <div>
            <div style="display:flex;gap:0.75rem;margin-bottom:1.25rem;flex-wrap:wrap;align-items:flex-end">
              <div class="form-group" style="margin:0">
                <label class="form-label">Catalog ID</label>
                <input class="neo-input" placeholder="Product / Service ID" [(ngModel)]="newAssign.catalog_id" style="width:160px">
              </div>
              <div class="form-group" style="margin:0">
                <label class="form-label">Type</label>
                <select class="neo-select" [(ngModel)]="newAssign.catalog_type" style="width:130px">
                  <option value="product">Product</option>
                  <option value="service">Service</option>
                  <option value="solution">Solution</option>
                </select>
              </div>
              <button class="neo-btn neo-btn-primary" style="align-self:flex-end" (click)="addAssignment()">Assign</button>
            </div>
            <div class="neo-table-wrap">
              <table class="neo-table">
                <thead><tr><th>Item</th><th>Type</th><th>Assigned</th><th></th></tr></thead>
                <tbody>
                  @for (asgn of assignments; track asgn.id) {
                    <tr>
                      <td style="font-weight:600">{{ asgn.catalog_name }}</td>
                      <td><span class="neo-badge">{{ asgn.catalog_type }}</span></td>
                      <td style="font-size:0.8rem;color:var(--crm-text-secondary)">{{ asgn.assigned_at | date:'mediumDate' }}</td>
                      <td><button class="neo-btn" style="padding:0.2rem 0.6rem;font-size:0.75rem" (click)="removeAssignment(asgn.id)">Remove</button></td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </div>
        }

        @if (activeTab === 'Links') {
          <div class="neo-table-wrap">
            <table class="neo-table">
              <thead><tr><th>Label</th><th>Slug</th><th>Clicks</th><th>Registrations</th></tr></thead>
              <tbody>
                @for (l of links; track l.id) {
                  <tr>
                    <td style="font-weight:600">{{ l.label || l.catalog_name || 'Generic' }}</td>
                    <td style="font-family:monospace;font-size:0.8rem;color:var(--crm-text-secondary)">{{ l.slug }}</td>
                    <td>{{ l.click_count }}</td>
                    <td>{{ l.registrations }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }

        @if (activeTab === 'Create Link') {
          <div style="display:flex;flex-direction:column;gap:1rem">
            <div class="form-group" style="margin:0">
              <label class="form-label">Catalog ID (optional)</label>
              <input class="neo-input" placeholder="Product / Service ID" [(ngModel)]="linkForm.catalog_id">
            </div>
            <div class="form-group" style="margin:0">
              <label class="form-label">Type</label>
              <select class="neo-select" [(ngModel)]="linkForm.catalog_type">
                <option value="product">Product</option>
                <option value="service">Service</option>
                <option value="solution">Solution</option>
                <option value="generic">Generic</option>
              </select>
            </div>
            <div class="form-group" style="margin:0">
              <label class="form-label">Destination</label>
              <p>The assigned catalog item determines the marketplace page. Generic links open the marketplace home page.</p>
            </div>
            <div class="form-group" style="margin:0">
              <label class="form-label">Label</label>
              <input class="neo-input" placeholder="Friendly name for this link" [(ngModel)]="linkForm.label">
            </div>
            <div class="form-group" style="margin:0">
              <label class="form-label">UTM Campaign</label>
              <input class="neo-input" placeholder="e.g. q4-outreach" [(ngModel)]="linkForm.utm_campaign">
            </div>
            <button class="neo-btn neo-btn-primary" (click)="createLink()">Generate Link</button>

            @if (createdLink) {
              <div class="neo-card-sm" style="background:var(--crm-accent-bg)">
                <p style="font-size:0.8rem;font-weight:700;color:var(--crm-text);margin-bottom:0.5rem">Link created successfully</p>
                <p style="font-size:0.8rem;color:var(--crm-text-secondary)">Slug: <code style="font-family:monospace">{{ createdLink.slug }}</code></p>
                <p style="font-size:0.8rem;color:var(--crm-text-secondary);margin-top:0.25rem">Track URL: <code style="font-family:monospace">/go/affiliate-track?slug={{ createdLink.slug }}</code></p>
              </div>
            }
          </div>
        }

      </div>
    </div>
  }
</div>`,
})
export class AffiliateManagementComponent implements OnInit {
  private svc = inject(AffiliateService);

  affiliates: any[] = [];
  loading      = true;
  search       = '';
  statusFilter = '';
  page         = 1;
  limit        = 20;
  total        = 0;
  showCreate   = false;
  selected: any = null;
  activeTab    = 'Assignments';
  assignments: any[] = [];
  links: any[] = [];
  createdLink: any = null;
  form     = { name: '', email: '', mobile: '', role_type: 'AGENT' };
  newAssign = { catalog_id: '', catalog_type: 'product' };
  linkForm  = { catalog_id: '', catalog_type: 'product', destination_path: '', label: '', utm_campaign: '' };

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    const params: any = { page: this.page, limit: this.limit };
    if (this.search) params.search = this.search;
    if (this.statusFilter) params.status = this.statusFilter;
    this.svc.getAffiliates(params).subscribe({
      next: (r: any) => { this.affiliates = r.data || []; this.total = r.total || 0; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  resetForm() { this.form = { name: '', email: '', mobile: '', role_type: 'AGENT' }; }

  createAffiliate() {
    if (!this.form.name || !this.form.email) return;
    this.svc.createAffiliate(this.form).subscribe({
      next: () => { this.showCreate = false; this.resetForm(); this.load(); },
      error: (e: any) => alert(e?.error?.message || 'Failed to create affiliate'),
    });
  }

  toggleStatus(a: any) {
    this.svc.setAffiliateStatus(a.id, !a.is_active).subscribe({ next: () => this.load() });
  }

  selectAffiliate(a: any) {
    this.selected  = a;
    this.activeTab = 'Assignments';
    this.loadTab();
  }

  loadTab() {
    if (!this.selected) return;
    if (this.activeTab === 'Assignments') {
      this.svc.getAssignments(this.selected.id).subscribe({ next: (r: any) => this.assignments = r.data || [] });
    }
    if (this.activeTab === 'Links') {
      this.svc.getLinks(this.selected.id).subscribe({ next: (r: any) => this.links = r.data || [] });
    }
    if (this.activeTab === 'Create Link') { this.createdLink = null; }
  }

  addAssignment() {
    if (!this.newAssign.catalog_id) return;
    this.svc.addAssignment(this.selected.id, this.newAssign).subscribe({
      next: () => { this.newAssign = { catalog_id: '', catalog_type: 'product' }; this.loadTab(); },
      error: (error: any) => alert(error?.error?.message || 'Failed to add assignment'),
    });
  }

  removeAssignment(assignId: number) {
    this.svc.removeAssignment(this.selected.id, assignId).subscribe({ next: () => this.loadTab() });
  }

  createLink() {
    this.svc.createLink(this.selected.id, this.linkForm).subscribe({
      next: (r: any) => { this.createdLink = r.data; this.loadTab(); },
      error: (e: any) => alert(e.error?.message || 'Failed to create link'),
    });
  }

  changePage(d: number) { this.page += d; this.load(); }
}
