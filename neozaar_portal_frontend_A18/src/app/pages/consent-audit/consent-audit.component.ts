import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConsentAuditService, ConsentFilters } from '../../core/services/consent-audit.service';

type Tab = 'overview' | 'ledger' | 'notices' | 'integrity' | 'dsar';

/**
 * Consent Audit Console — SUPER_ADMIN only.
 * Read-only view over the consent ledger: KPIs, a searchable event
 * table, per-subject drill-down (with the exact notice shown),
 * the notice-version registry, hash-chain integrity, and the DSAR queue.
 */
@Component({
  selector: 'app-consent-audit',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './consent-audit.component.html',
})
export class ConsentAuditComponent implements OnInit {
  private api = inject(ConsentAuditService);

  tab: Tab = 'overview';

  // Shared filters (ledger + overview)
  filters: ConsentFilters = { from: '', to: '', country: '', sourceApp: '', action: '', q: '' };

  // Overview
  overview: any = null;
  loadingOverview = false;

  // Ledger
  rows: any[] = [];
  total = 0;
  limit = 50;
  offset = 0;
  loadingRows = false;
  private searchTimer: any;

  // Subject drill-down
  subject: any = null;
  loadingSubject = false;
  openNoticeKey: string | null = null;

  // Notices
  noticeList: any[] = [];
  loadingNotices = false;
  viewedNotice: any = null;

  // Integrity
  integrity: any = null;
  loadingIntegrity = false;

  // DSAR
  dsar: any[] = [];
  loadingDsar = false;
  dsarStatus = '';

  ngOnInit(): void {
    this.loadOverview();
  }

  tabs: Tab[] = ['overview', 'ledger', 'notices', 'integrity', 'dsar'];

  go(tab: string): void {
    this.tab = tab as Tab;
    if (tab === 'overview' && !this.overview) this.loadOverview();
    if (tab === 'ledger' && !this.rows.length) this.loadRows();
    if (tab === 'notices' && !this.noticeList.length) this.loadNotices();
    if (tab === 'integrity' && !this.integrity) this.loadIntegrity();
    if (tab === 'dsar' && !this.dsar.length) this.loadDsar();
  }

  // ── overview ──────────────────────────────────────
  loadOverview(): void {
    this.loadingOverview = true;
    this.api.overview(this.cleanFilters()).subscribe({
      next: (r) => { this.overview = r.data; this.loadingOverview = false; },
      error: () => (this.loadingOverview = false),
    });
  }

  /** Trend oldest → newest, so the chart reads left to right. */
  trendAsc(): any[] {
    return (this.overview?.trend || []).slice().reverse();
  }

  /** Tallest stacked total across the range (>=1), so bars normalise to <=100%. */
  maxTrend(): number {
    const t = this.overview?.trend || [];
    return Math.max(1, ...t.map((d: any) => (d.grants || 0) + (d.withdrawals || 0)));
  }

  /** Bar height as a %: 0 when the value is 0, otherwise at least 4% so it's visible. */
  barPct(value: number): number {
    if (!value) return 0;
    return Math.max(4, (value / this.maxTrend()) * 100);
  }

  // ── ledger ────────────────────────────────────────
  applyFilters(): void {
    this.offset = 0;
    this.loadRows();
    if (this.tab === 'overview') this.loadOverview();
  }

  onSearch(): void {
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.applyFilters(), 350);
  }

  loadRows(): void {
    this.loadingRows = true;
    this.api.events(this.cleanFilters(), this.limit, this.offset).subscribe({
      next: (r) => {
        this.rows = r.data?.rows || [];
        this.total = r.data?.total || 0;
        this.loadingRows = false;
      },
      error: () => (this.loadingRows = false),
    });
  }

  page(dir: number): void {
    const next = this.offset + dir * this.limit;
    if (next < 0 || next >= this.total) return;
    this.offset = next;
    this.loadRows();
  }

  get pageInfo(): string {
    if (!this.total) return '0';
    return `${this.offset + 1}–${Math.min(this.offset + this.limit, this.total)} of ${this.total}`;
  }

  exportCsv(): void {
    this.api.exportCsv(this.cleanFilters()).subscribe((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `consent-events-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    });
  }

  // ── subject drill-down ────────────────────────────
  openSubject(row: any): void {
    const id = row.user_id ? String(row.user_id) : row.anon_id;
    this.loadingSubject = true;
    this.subject = { _id: id };
    this.openNoticeKey = null;
    this.api.subject(id).subscribe({
      next: (r) => { this.subject = { _id: id, ...r.data }; this.loadingSubject = false; },
      error: () => { this.subject = null; this.loadingSubject = false; },
    });
  }

  closeSubject(): void {
    this.subject = null;
  }

  noticeFor(ev: any): any {
    const key = `${ev.notice_version}|${ev.notice_locale}`;
    return (this.subject?.noticesSeen || []).find(
      (n: any) => `${n.version}|${n.locale}` === key
    );
  }

  toggleNotice(key: string): void {
    this.openNoticeKey = this.openNoticeKey === key ? null : key;
  }

  // ── notices ───────────────────────────────────────
  loadNotices(): void {
    this.loadingNotices = true;
    this.api.notices().subscribe({
      next: (r) => { this.noticeList = r.data || []; this.loadingNotices = false; },
      error: () => (this.loadingNotices = false),
    });
  }

  viewNotice(n: any): void {
    this.api.notice(n.version, n.locale).subscribe({
      next: (r) => (this.viewedNotice = r.data),
      error: () => {},
    });
  }

  // ── integrity ─────────────────────────────────────
  loadIntegrity(): void {
    this.loadingIntegrity = true;
    this.integrity = null;
    this.api.integrity().subscribe({
      next: (r) => { this.integrity = r.data; this.loadingIntegrity = false; },
      error: () => (this.loadingIntegrity = false),
    });
  }

  // ── dsar ──────────────────────────────────────────
  loadDsar(): void {
    this.loadingDsar = true;
    this.api.dsar(this.dsarStatus).subscribe({
      next: (r) => { this.dsar = r.data || []; this.loadingDsar = false; },
      error: () => (this.loadingDsar = false),
    });
  }

  // ── helpers ───────────────────────────────────────
  private cleanFilters(): ConsentFilters {
    const f: any = {};
    for (const k of Object.keys(this.filters)) {
      const v = (this.filters as any)[k];
      if (v) f[k] = v;
    }
    return f;
  }

  purposeChips(p: any): string[] {
    if (!p) return [];
    const out: string[] = [];
    if (p.analytics) out.push('analytics');
    if (p.marketing) out.push('marketing');
    return out.length ? out : ['necessary only'];
  }
}
