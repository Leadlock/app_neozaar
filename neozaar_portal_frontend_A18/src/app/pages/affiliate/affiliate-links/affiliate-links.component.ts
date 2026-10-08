import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AffiliateService } from '../../../core/services/affiliate/affiliate.service';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';
import { AffiliateScopeComponent } from '../affiliate-scope.component';

@Component({
  selector: 'app-affiliate-links',
  standalone: true,
  imports: [CommonModule, FormsModule, AffiliateScopeComponent],
  template: `
<div class="crm-page">
  <app-affiliate-scope defaultLabel="My links" (changed)="selectAffiliate($event)" />
  <div class="crm-header">
    <div>
      <h1 class="crm-title">My Links</h1>
      <p class="crm-subtitle">Trackable affiliate links assigned to your account</p>
    </div>
  </div>

  @if (loading) {
    <div class="neo-card" style="text-align:center;padding:3rem;color:var(--crm-text-secondary)">Loading…</div>
  } @else if (!links.length) {
    <div class="neo-card" style="text-align:center;padding:3rem;color:var(--crm-text-secondary)">
      <p style="font-size:0.9rem;font-weight:600">No links assigned yet</p>
      <p style="font-size:0.78rem;margin-top:0.35rem">Ask your affiliate manager to generate tracking links for your products.</p>
    </div>
  } @else {
    <div class="neo-table-wrap">
      <table class="neo-table">
        <thead>
          <tr>
            <th>Label / Item</th><th>Type</th><th>Slug</th>
            <th>UTM Source</th><th>Clicks</th><th>Registrations</th><th>Created</th><th></th>
          </tr>
        </thead>
        <tbody>
          @for (l of links; track l.id) {
            <tr>
              <td style="font-weight:600">{{ l.label || l.catalog_name || 'Generic Link' }}</td>
              <td><span class="neo-badge">{{ l.catalog_type || 'generic' }}</span></td>
              <td style="font-family:monospace;font-size:0.8rem;color:var(--crm-text-secondary)">{{ l.slug }}</td>
              <td style="font-size:0.8rem;color:var(--crm-text-secondary)">{{ l.utm_source }}</td>
              <td>{{ l.click_count }}</td>
              <td>{{ l.registrations }}</td>
              <td style="font-size:0.8rem;color:var(--crm-text-secondary)">{{ l.created_at | date:'mediumDate' }}</td>
              <td>
                <button class="neo-btn" style="padding:0.3rem 0.9rem;font-size:0.78rem" (click)="copyLink(l)">
                  {{ copied === l.id ? '✓ Copied' : 'Copy Link' }}
                </button>
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  }
</div>`,
})
export class AffiliateLinksComponent implements OnInit {
  private svc  = inject(AffiliateService);
  private auth = inject(AuthService);
  links: any[] = [];
  loading = true;
  copied: number | null = null;
  selectedAffiliate?: number;
  selectAffiliate(id?: number) { this.selectedAffiliate = id; this.load(); }

  get affiliateId(): number { return this.selectedAffiliate || this.auth.user?.id as number; }

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.svc.getLinks(this.affiliateId).subscribe({
      next: (r: any) => { this.links = r.data || []; this.loading = false; },
      error: () => { this.loading = false; },
    });
  }

  copyLink(l: any) {
    const base = environment.frontendUrl.replace(/\/$/, '');
    const url = `${base}/go/affiliate-track?slug=${l.slug}`;
    navigator.clipboard.writeText(url).then(() => {
      this.copied = l.id;
      setTimeout(() => { this.copied = null; }, 2000);
    });
  }
}
