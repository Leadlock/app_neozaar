import { AffiliateScopeComponent } from '../affiliate-scope.component';
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AffiliateService } from '../../../core/services/affiliate/affiliate.service';
import { AuthService } from '../../../core/services/auth.service';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-affiliate-database',
  standalone: true,
  imports: [CommonModule, FormsModule, AffiliateScopeComponent],
  styles: [`
    .contact-form-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 1rem;
    }
    .contact-form-grid-three-columns {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
    @media (max-width: 640px) {
      .contact-form-grid { grid-template-columns: minmax(0, 1fr); }
    }
  `],
  template: `
<div class="crm-page">
  <app-affiliate-scope (changed)="changeAffiliate($event)" />
  <div class="crm-header">
    <div>
      <h1 class="crm-title">My Database</h1>
      <p class="crm-subtitle">Your private prospect contact list. Upload contacts from a CSV or JSON file.</p>
      <p class="crm-subtitle">Required fields: name, email (business email), phone. Company, designation and country are optional.</p>
    </div>
    <div style="display:flex;gap:0.6rem;align-items:center">
      <button class="neo-btn" (click)="showAddForm=!showAddForm">+ Add Contact</button>
      <button class="neo-btn neo-btn-primary" type="button" (click)="contactFileInput.click()">Upload Contacts</button>
      <input #contactFileInput type="file" accept=".csv,.json" hidden (change)="onFileImport($event)">
    </div>
  </div>

  <!-- Stats row -->
  @if (stats) {
    <div class="crm-grid-4" style="margin-bottom:2rem">
      <div class="neo-stat">
        <span class="neo-stat-label">Total Contacts</span>
        <span class="neo-stat-value accent">{{ stats.total }}</span>
      </div>
      <div class="neo-stat">
        <span class="neo-stat-label">Registered Customers</span>
        <span class="neo-stat-value">{{ stats.registered_customers }}</span>
      </div>
      <div class="neo-stat">
        <span class="neo-stat-label">Unregistered</span>
        <span class="neo-stat-value">{{ stats.unregistered }}</span>
      </div>
      <div class="neo-stat">
        <span class="neo-stat-label">Duplicates</span>
        <span class="neo-stat-value">{{ stats.duplicates }}</span>
      </div>
    </div>
  }

  <!-- Add contact form -->
  @if (showAddForm) {
    <div class="neo-card" style="margin-bottom:2rem">
      <h3 style="font-size:0.9rem;font-weight:700;color:var(--crm-text);margin-bottom:1.25rem;text-transform:uppercase;letter-spacing:0.06em">Add Contact</h3>
      <div class="contact-form-grid" [class.contact-form-grid-three-columns]="isAffiliateManager">
        <div class="form-group" style="margin:0">
          <label class="form-label" for="affiliate-contact-name">Name <span class="req">*</span></label>
          <input id="affiliate-contact-name" class="neo-input" placeholder="Full name" [(ngModel)]="newContact.name" required maxlength="255">
        </div>
        <div class="form-group" style="margin:0">
          <label class="form-label" for="affiliate-contact-email">Business email <span class="req">*</span></label>
          <input id="affiliate-contact-email" class="neo-input" type="email" placeholder="name@company.com" [(ngModel)]="newContact.email" required maxlength="255">
        </div>
        <div class="form-group" style="margin:0">
          <label class="form-label" for="affiliate-contact-phone">Phone number <span class="req">*</span></label>
          <input id="affiliate-contact-phone" class="neo-input" type="tel" placeholder="+91 …" [(ngModel)]="newContact.phone" required maxlength="50">
        </div>
        <div class="form-group" style="margin:0">
          <label class="form-label">Company</label>
          <input class="neo-input" placeholder="Company name" [(ngModel)]="newContact.company">
        </div>
        <div class="form-group" style="margin:0">
          <label class="form-label">Designation</label>
          <input class="neo-input" placeholder="e.g. CTO" [(ngModel)]="newContact.designation">
        </div>
        <div class="form-group" style="margin:0">
          <label class="form-label">Country</label>
          <input class="neo-input" placeholder="Country" [(ngModel)]="newContact.country">
        </div>
      </div>
      <div style="display:flex;gap:0.75rem;margin-top:1.25rem">
        <button class="neo-btn neo-btn-primary" [disabled]="savingContact" (click)="addContact()">{{ savingContact ? 'Saving...' : 'Save Contact' }}</button>
        <button class="neo-btn" [disabled]="savingContact" (click)="showAddForm=false">Cancel</button>
      </div>
      @if (contactError) {
        <p role="alert" style="margin-top:1rem;color:#b42318">{{ contactError }}</p>
      }
    </div>
  }

  <!-- Import result -->
  @if (importError) {
    <p role="alert" style="margin-bottom:1rem;color:#b42318">{{ importError }}</p>
  }
  @if (importResult) {
    <div class="neo-card-sm" style="margin-bottom:1.5rem;background:var(--crm-accent-bg);display:flex;align-items:center;justify-content:space-between">
      <span style="font-size:0.85rem;color:var(--crm-text)">
        Import complete: <strong>{{ importResult.imported }}</strong> imported,
        <strong>{{ importResult.duplicates }}</strong> duplicates,
        <strong>{{ importResult.errors?.length || 0 }}</strong> errors.
      </span>
      <button class="neo-btn" style="padding:0.3rem 0.8rem;font-size:0.75rem" (click)="importResult=null">Dismiss</button>
    </div>
    @if (importResult.errors?.length) {
      <div class="neo-card-sm" role="alert" style="margin-bottom:1.5rem">
        <p>These contacts were not imported. Correct the required fields and upload them again:</p>
        <ul>
          @for (error of importResult.errors; track $index) {
            <li>Contact {{ error.row_number || $index + 1 }}: {{ error.error }}</li>
          }
        </ul>
      </div>
    }
  }

  <!-- Filters -->
  <div class="neo-card-sm" style="display:flex;gap:1.25rem;flex-wrap:wrap;margin-bottom:2rem;align-items:flex-end">
    <div class="form-group" style="margin:0;flex:1;min-width:200px">
      <label class="form-label">Search</label>
      <input class="neo-input" placeholder="Name, email, company…" [(ngModel)]="search" (keyup.enter)="load()">
    </div>
    <div class="form-group" style="margin:0;min-width:160px">
      <label class="form-label">Status</label>
      <select class="neo-select" [(ngModel)]="statusFilter" (change)="load()">
        <option value="">All</option>
        <option value="prospect">Prospect</option>
        <option value="emailed">Emailed</option>
        <option value="registered">Registered</option>
        <option value="customer">Customer</option>
      </select>
    </div>
    <button class="neo-btn" (click)="load()">Search</button>
  </div>

  @if (loading) {
    <div class="neo-card" style="text-align:center;padding:3rem;color:var(--crm-text-secondary)">Loading…</div>
  } @else if (!contacts.length) {
    <div class="neo-card" style="text-align:center;padding:3rem;color:var(--crm-text-secondary)">
      <p style="font-size:0.9rem;font-weight:600">No contacts yet</p>
      <p style="font-size:0.78rem;margin-top:0.35rem">Add contacts manually or import a CSV file.</p>
    </div>
  } @else {
    <div class="neo-table-wrap">
      <table class="neo-table">
        <thead>
          <tr><th>Name</th><th>Email</th><th>Company</th><th>Status</th><th>Customer?</th><th>Imported</th><th></th></tr>
        </thead>
        <tbody>
          @for (c of contacts; track c.id) {
            <tr>
              <td style="font-weight:600">{{ c.name }}</td>
              <td style="color:var(--crm-text-secondary);font-size:0.8rem">{{ c.email || '—' }}</td>
              <td>{{ c.company || '—' }}</td>
              <td><span class="neo-badge">{{ c.status }}</span></td>
              <td>{{ c.is_customer ? '✓' : '—' }}</td>
              <td style="font-size:0.8rem;color:var(--crm-text-secondary)">{{ c.imported_at | date:'mediumDate' }}</td>
              <td>
                <button class="neo-btn" style="padding:0.25rem 0.65rem;font-size:0.75rem" (click)="deleteContact(c.id)">Remove</button>
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
</div>`,
})
export class AffiliateDatabaseComponent implements OnInit {
  private svc = inject(AffiliateService);
  selectedAffiliate: number | undefined;
  changeAffiliate(id: number | undefined) { this.selectedAffiliate = id; this.load(); this.loadStats(); }

  private auth = inject(AuthService);
  get isAffiliateManager(): boolean { return this.auth.user?.role_type === 'A_MANAGER'; }
  contacts: any[] = [];
  stats: any = null;
  loading     = true;
  search      = '';
  statusFilter = '';
  page        = 1;
  limit       = 20;
  total       = 0;
  showAddForm = false;
  savingContact = false;
  contactError = '';
  importResult: any = null;
  importError = '';
  newContact  = { name: '', email: '', phone: '', company: '', designation: '', country: '' };

  ngOnInit() { this.load(); this.loadStats(); }

  load() {
    this.loading = true;
    const params: any = { page: this.page, limit: this.limit };
    if (this.selectedAffiliate) params.affiliate_id = this.selectedAffiliate;
    if (this.search) params.search = this.search;
    if (this.statusFilter) params.status = this.statusFilter;
    this.svc.getContacts(params).subscribe({
      next: (r: any) => { this.contacts = r.data || []; this.total = r.total || 0; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  loadStats() {
    this.svc.getDatabaseStats(this.selectedAffiliate).subscribe({ next: (r: any) => { this.stats = r.data; } });
  }

  addContact() {
    if (this.savingContact) return;
    this.contactError = '';
    const name = this.newContact.name.trim();
    const email = this.newContact.email.trim().toLowerCase();
    const phone = this.newContact.phone.trim();
    if (!name || !email || !phone) {
      this.contactError = 'Name, business email and phone number are required.';
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      this.contactError = 'Enter a valid business email address.';
      return;
    }
    this.savingContact = true;
    this.svc.addContact({ ...this.newContact, name, email, phone }, this.selectedAffiliate).subscribe({
      next: () => {
        this.savingContact = false;
        this.newContact = { name: '', email: '', phone: '', company: '', designation: '', country: '' };
        this.showAddForm = false;
        this.load(); this.loadStats();
      },
      error: (error: any) => {
        this.savingContact = false;
        this.contactError = error?.error?.message || 'Failed to add contact. Please try again.';
      },
    });
  }

  deleteContact(id: number) {
    if (!confirm('Remove this contact?')) return;
    this.svc.deleteContact(id, this.selectedAffiliate).subscribe({ next: () => { this.load(); this.loadStats(); } });
  }

  onFileImport(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.importError = '';
    this.importResult = null;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        let contacts: any[] = [];
        if (file.name.toLowerCase().endsWith('.json')) {
          contacts = JSON.parse(text);
        } else {
          const workbook = XLSX.read(text, { type: 'string', raw: true });
          const lines = XLSX.utils.sheet_to_json<string[]>(workbook.Sheets[workbook.SheetNames[0]], { header: 1, defval: '', raw: false, blankrows: false });
          const aliases: Record<string, string> = { fullname: 'name', businessemail: 'email', phonenumber: 'phone' };
          const headers = (lines[0] || []).map(h => {
            const key = h.trim().toLowerCase().replace(/[\s_-]/g, '');
            return aliases[key] || key;
          });
          if (!['name', 'email', 'phone'].every(field => headers.includes(field))) {
            this.importError = 'CSV must include Name, Business email (or email), and Phone number (or phone) columns.';
            return;
          }
          contacts = lines.slice(1).map(vals => {
            const row: any = {};
            headers.forEach((h, i) => row[h] = (vals[i] || '').trim());
            return row;
          });
        }
        this.svc.importContacts(contacts, this.selectedAffiliate).subscribe({
          next: (r: any) => { this.importResult = r.data; this.load(); this.loadStats(); },
          error: (error: any) => { this.importError = error?.error?.message || 'Import failed'; },
        });
      } catch { this.importError = 'Could not parse file. Use CSV or JSON.'; }
    };
    reader.onerror = () => { this.importError = 'Could not read file. Please try again.'; };
    reader.readAsText(file);
    (event.target as HTMLInputElement).value = '';
  }

  changePage(d: number) { this.page += d; this.load(); }
}
