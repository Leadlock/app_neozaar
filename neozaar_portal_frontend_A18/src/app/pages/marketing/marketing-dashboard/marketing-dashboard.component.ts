import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MarketingService, MarketingDashboard } from '../marketing.service';
import { ToasterService } from '../../../shared/providers/toaster/toaster.service';

@Component({
  selector: 'app-marketing-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
  <div class="p-6 max-w-[1400px] mx-auto">
    <!-- Header -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-2xl font-bold text-slate-900">Marketing Dashboard</h1>
        <p class="text-sm text-slate-500 mt-1">Engagement, contacts and campaign performance across NeoZaar.</p>
      </div>
      <a routerLink="/campaigns"
         class="px-4 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 text-white text-sm font-medium hover:from-orange-600 hover:to-orange-700 transition-all">
        Go to Campaigns
      </a>
    </div>

    <div *ngIf="isLoading" class="text-slate-400 text-sm py-16 text-center">Loading marketing insights…</div>

    <ng-container *ngIf="!isLoading && data">
      <!-- KPI cards -->
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div class="kpi">
          <span class="kpi-label">Total Contacts</span>
          <span class="kpi-value">{{ data.totalContacts }}</span>
          <span class="kpi-sub">{{ data.newContacts30d }} new in 30 days</span>
        </div>
        <div class="kpi">
          <span class="kpi-label">Known Contacts</span>
          <span class="kpi-value">{{ data.knownContacts }}</span>
          <span class="kpi-sub">{{ data.anonymousVisitors }} anonymous</span>
        </div>
        <div class="kpi">
          <span class="kpi-label">Marketing Qualified</span>
          <span class="kpi-value">{{ data.marketingQualified }}</span>
          <span class="kpi-sub" *ngIf="data.crmHotLeads !== undefined">{{ data.crmHotLeads }} CRM hot leads</span>
        </div>
        <div class="kpi">
          <span class="kpi-label">Avg Engagement Score</span>
          <span class="kpi-value">{{ data.avgMarketingScore }}</span>
          <span class="kpi-sub">{{ data.eventsLast30d }} events / 30d</span>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <!-- Lifecycle funnel -->
        <div class="card lg:col-span-1">
          <h2 class="card-title">Lifecycle Funnel</h2>
          <div class="space-y-2 mt-3">
            <div *ngFor="let s of lifecycleRows" class="flex items-center justify-between">
              <span class="text-sm text-slate-600 capitalize">{{ s.label }}</span>
              <span class="text-sm font-semibold text-slate-900">{{ s.value }}</span>
            </div>
          </div>
        </div>

        <!-- Campaign performance (reuses existing campaigns) -->
        <div class="card lg:col-span-1">
          <h2 class="card-title">Campaigns</h2>
          <div class="flex items-center gap-6 mt-4">
            <div>
              <div class="text-3xl font-bold text-slate-900">{{ data.campaignsTotal }}</div>
              <div class="text-xs text-slate-500 mt-1">Total campaigns</div>
            </div>
            <div>
              <div class="text-3xl font-bold text-orange-600">{{ data.campaignsPushed }}</div>
              <div class="text-xs text-slate-500 mt-1" title="Pushed to Zoho as an unsent draft — not yet sent. Zoho send status isn't tracked here yet.">Pushed to Zoho</div>
            </div>
          </div>
          <p class="text-[11px] text-slate-400 mt-2">"Pushed" means a draft was created in Zoho — sending still happens manually inside Zoho.</p>
          <div class="border-t border-slate-100 mt-3 pt-3" *ngIf="data.campaignLinkCount">
            <div class="flex items-center gap-4">
              <div>
                <div class="text-lg font-semibold text-slate-900">{{ data.campaignLinkViews }}</div>
                <div class="text-[11px] text-slate-500">public link views <span class="text-slate-400">({{ data.campaignLinkViews30d }} in 30d)</span></div>
              </div>
              <div>
                <div class="text-lg font-semibold text-slate-900">{{ data.campaignLinkClicks }}</div>
                <div class="text-[11px] text-slate-500">clicks</div>
              </div>
            </div>
          </div>
          <a routerLink="/campaigns" class="text-xs text-orange-600 hover:underline mt-4 inline-block">Manage campaigns →</a>
        </div>

        <!-- Source performance -->
        <div class="card lg:col-span-1">
          <h2 class="card-title">Top Marketing Sources</h2>
          <div class="mt-3 space-y-2" *ngIf="data.sources?.length; else noSources">
            <div *ngFor="let s of data.sources" class="flex items-center justify-between">
              <span class="text-sm text-slate-600">{{ s.source }}</span>
              <span class="text-sm font-semibold text-slate-900">{{ s.contacts }}</span>
            </div>
          </div>
          <ng-template #noSources>
            <p class="text-xs text-slate-400 mt-3">No source data yet. Sources populate as contacts are tracked.</p>
          </ng-template>
        </div>
      </div>

      <!-- Recent activity -->
      <div class="card mt-4">
        <h2 class="card-title">Recent Activity</h2>
        <div class="mt-3" *ngIf="data.recentEvents?.length; else noEvents">
          <div *ngFor="let e of data.recentEvents"
               class="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
            <div class="flex items-center gap-3">
              <span class="text-xs font-medium px-2 py-1 rounded bg-orange-50 text-orange-700">{{ e.event_type }}</span>
              <span class="text-sm text-slate-600" *ngIf="e.ref_type">{{ e.ref_type }} #{{ e.ref_id }}</span>
            </div>
            <span class="text-xs text-slate-400">{{ e.occurred_at | date:'medium' }}</span>
          </div>
        </div>
        <ng-template #noEvents>
          <p class="text-xs text-slate-400 mt-3">No tracked events yet. Events appear here once website/email tracking is active.</p>
        </ng-template>
      </div>
    </ng-container>
  </div>
  `,
  styles: [`
    .kpi { background:#fff; border:1px solid #eef1f5; border-radius:14px; padding:16px 18px; display:flex; flex-direction:column; gap:2px; }
    .kpi-label { font-size:11px; text-transform:uppercase; letter-spacing:.05em; color:#94a3b8; font-weight:600; }
    .kpi-value { font-size:28px; font-weight:700; color:#0f172a; line-height:1.1; }
    .kpi-sub { font-size:11px; color:#94a3b8; }
    .card { background:#fff; border:1px solid #eef1f5; border-radius:14px; padding:18px; }
    .card-title { font-size:13px; font-weight:700; color:#0f172a; text-transform:uppercase; letter-spacing:.04em; }
  `],
})
export class MarketingDashboardComponent implements OnInit {
  data: MarketingDashboard | null = null;
  isLoading = false;
  lifecycleRows: { label: string; value: number }[] = [];

  constructor(private svc: MarketingService, private toaster: ToasterService) {}

  ngOnInit(): void {
    this.isLoading = true;
    this.svc.getDashboard().subscribe({
      next: (res: any) => {
        this.isLoading = false;
        if (res.status === 'success') {
          this.data = res.data;
          const lc = res.data.lifecycle || {};
          this.lifecycleRows = [
            { label: 'Visitor', value: lc.visitor || 0 },
            { label: 'Subscriber', value: lc.subscriber || 0 },
            { label: 'Lead', value: lc.lead || 0 },
            { label: 'MQL', value: lc.mql || 0 },
            { label: 'SQL', value: lc.sql || 0 },
            { label: 'Customer', value: lc.customer || 0 },
          ];
        } else {
          this.toaster.setToaster('error', 'Error', res.message || 'Failed to load dashboard');
        }
      },
      error: () => {
        this.isLoading = false;
        this.toaster.setToaster('error', 'Error', 'Failed to load marketing dashboard.');
      },
    });
  }
}
