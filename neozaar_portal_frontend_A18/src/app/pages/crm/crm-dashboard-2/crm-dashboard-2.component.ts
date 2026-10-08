import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CrmService } from '../../../core/services/crm/crm.service';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';

/** Flat opportunity record from GET /crm/opportunities */
interface Opp {
  id: number;
  name: string;
  stage: string;
  type: string;
  cloud: string;
  deal_value: number;
  neozaar_revenue: number;
  owner_name: string;
  owner_id: number;
  seller_name: string;
  affiliate_name: string;
  created_at: string;
  contact_company: string;
  contact_name: string;
  stage_score?: number;
}

/** Row shown in the opportunity detail table */
interface OppTableRow {
  sr: number;
  customerName: string;
  productName: string;
  productType: string;
  revenue: number;
  neoRevenue: number;
  weightedRevenue: number;
  stage: string;
  id: number;
}

/** Per-user revenue row shown in the user-breakdown table */
interface UserRow {
  id: number;
  name: string;
  role_type: string;
  dealTotal: number;
  revenueTotal: number;
  oppCount: number;
  wonCount: number;
  winRate: string;
}

const CRM_ROLES = ['SUPER_ADMIN', 'ADMIN', 'M_SELLER', 'SELLER', 'AGENT', 'A_MANAGER', 'ISV', 'ISV_SELLER', 'SUPPORT_PARTNER'];

const STAGE_SCORES: Record<string, number> = {
  Discovery: 10, Qualification: 20,
  Assessment: 30, Demo: 30, Trial: 30, Scoping: 30, 'Technical Validation': 30,
  'Proposal Shared': 40, Negotiation: 40, 'Private Offer': 40,
  Procurement: 60, 'PO Received': 60,
  Delivered: 80,
  'Payment Pending': 90,
  'Payment Received': 100, 'Closed Won': 100,
  'Closed Lost': 0,
};

@Component({
  selector: 'app-crm-dashboard-2',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './crm-dashboard-2.component.html',
})
export class CrmDashboard2Component implements OnInit {
  private http   = inject(HttpClient);
  private crm    = inject(CrmService);
  private auth   = inject(AuthService);
  private apiUrl = environment.apiUrl;

  // ── Expose module constants to template ─────────────────────
  readonly STAGE_SCORES = STAGE_SCORES;

  // ── Auth helpers ─────────────────────────────────────────────
  get role()     { return this.auth.user?.role_type ?? ''; }
  get isAdmin()  { return ['SUPER_ADMIN', 'ADMIN'].includes(this.role); }
  get isMSeller(){ return this.role === 'M_SELLER'; }
  get canViewAll() { return this.isAdmin || this.isMSeller; }

  // ── View-as user picker ───────────────────────────────────────
  showUserPicker = false;
  viewAsUser: any = null;
  userSearch = '';
  crmUsers: any[] = [];
  usersLoaded = false;

  get filteredUsers(): any[] {
    const q = this.userSearch.toLowerCase().trim();
    if (!q) return this.crmUsers;
    return this.crmUsers.filter(u =>
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.role_type?.toLowerCase().includes(q)
    );
  }

  loadUsers(): void {
    if (this.usersLoaded) return;
    this.crm.getUsers().subscribe({
      next: (res: any) => {
        this.crmUsers = (res.data || []).filter((u: any) => CRM_ROLES.includes(u.role_type));
        this.usersLoaded = true;
      }
    });
  }

  openUserPicker(): void { this.loadUsers(); this.showUserPicker = true; }

  selectUser(user: any): void {
    this.viewAsUser = user ?? null;
    this.showUserPicker = false;
    this.userSearch = '';
    this.oppTablePage = 1;
    this.applyUserFilter();
  }

  resetView(): void { this.viewAsUser = null; this.oppTablePage = 1; this.applyUserFilter(); }

  get scopeLabel(): string {
    if (this.viewAsUser) return `Viewing: ${this.viewAsUser.name} (${this.viewAsUser.role_type})`;
    if (this.canViewAll) return 'All Users — Global Revenue View';
    return 'My Revenue';
  }

  // ── Date range filter ────────────────────────────────────────
  dateRange = '90'; // default last 90 days
  readonly dateRanges = [
    { label: 'Last 30 days',  value: '30'  },
    { label: 'Last 90 days',  value: '90'  },
    { label: 'Last 6 months', value: '180' },
    { label: 'Last 1 year',   value: '365' },
    { label: 'All Time',      value: ''    },
  ];

  // ── Advanced filter panel (mirrors the Opportunities page filter) ─────────
  showFilterPanel = false;
  advFilters = {
    owner_name:     '',
    seller_name:    '',
    affiliate_name: '',
    type:           '',
    customer:       '',
    score_min:      '',
    score_max:      '',
  };

  /** Unique option lists derived from the loaded rev-tracker data */
  get filterOwnerOptions(): string[] {
    return [...new Set(this.allOpps.map(o => o.owner_name).filter(Boolean))].sort();
  }
  get filterSellerOptions(): string[] {
    return [...new Set(this.allOpps.map(o => o.seller_name).filter(Boolean))].sort();
  }
  get filterAffiliateOptions(): string[] {
    return [...new Set(this.allOpps.map(o => o.affiliate_name).filter(Boolean))].sort();
  }
  get filterTypeOptions(): string[] {
    return [...new Set(this.allOpps.map(o => o.type).filter(Boolean))].sort();
  }

  /** Count of active advanced filters (drives the badge on the Filter button) */
  get activeFilterCount(): number {
    return Object.values(this.advFilters).filter(v => v !== '').length;
  }

  toggleFilterPanel(): void { this.showFilterPanel = !this.showFilterPanel; }
  closeFilterPanel(): void  { this.showFilterPanel = false; }

  resetAdvFilters(): void {
    this.advFilters = { owner_name:'', seller_name:'', affiliate_name:'', type:'', customer:'', score_min:'', score_max:'' };
    this.oppTablePage = 1;
  }

  clearAdvFilter(key: keyof CrmDashboard2Component['advFilters']): void {
    this.advFilters[key] = '';
    this.oppTablePage = 1;
  }

  // ── Raw data ─────────────────────────────────────────────────
  allOpps: Opp[] = [];
  loading = true;

  // ── Filtered slice ────────────────────────────────────────────
  get visibleOpps(): Opp[] {
    let opps = this.allOpps;

    // user filter — role-aware name match
    if (this.viewAsUser) {
      opps = this.filterOppsByUser(opps, this.viewAsUser);
    }

    // date filter
    if (this.dateRange) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - +this.dateRange);
      cutoff.setHours(0, 0, 0, 0);
      opps = opps.filter(o => new Date(o.created_at) >= cutoff);
    }

    // advanced filters (owner / seller / affiliate / type / customer / score range)
    const f = this.advFilters;
    const hasAdv = this.activeFilterCount > 0;
    if (hasAdv) {
      const customerQ = f.customer.trim().toLowerCase();
      opps = opps.filter(o => {
        const score = STAGE_SCORES[o.stage] ?? 10;
        if (f.owner_name     && o.owner_name     !== f.owner_name)     return false;
        if (f.seller_name    && o.seller_name    !== f.seller_name)    return false;
        if (f.affiliate_name && o.affiliate_name !== f.affiliate_name) return false;
        if (f.type           && o.type           !== f.type)           return false;
        if (customerQ) {
          const cust = `${o.contact_company || ''} ${o.contact_name || ''}`.toLowerCase();
          if (!cust.includes(customerQ)) return false;
        }
        if (f.score_min && score < +f.score_min) return false;
        if (f.score_max && score > +f.score_max) return false;
        return true;
      });
    }

    return opps;
  }

  // ── Stage-band helpers ────────────────────────────────────────
  /** Returns {deal, neo, count} for all opps whose stage score falls in [minScore, maxScore] */
  private bandTotals(minScore: number, maxScore: number): { deal: number; neo: number; count: number } {
    const opps = this.visibleOpps.filter(o => {
      const s = STAGE_SCORES[o.stage] ?? 10;
      return s >= minScore && s <= maxScore;
    });
    return {
      deal:  opps.reduce((acc, o) => acc + (+o.deal_value      || 0), 0),
      neo:   opps.reduce((acc, o) => acc + (+o.neozaar_revenue || 0), 0),
      count: opps.length,
    };
  }

  // Card 1 — Total Expected Revenue: ALL active opps (score 10–99, every open stage)
  get band1(): { deal: number; neo: number; count: number } { return this.bandTotals(10, 99); }

  // Card 2 — Stage 20–39 (Qualification, Assessment, Demo, Trial, Scoping, Tech Validation)
  get band2(): { deal: number; neo: number; count: number } { return this.bandTotals(20, 39); }

  // Card 3 — Stage 40–59 (Proposal Shared, Negotiation, Private Offer)
  get band3(): { deal: number; neo: number; count: number } { return this.bandTotals(40, 59); }

  // Card 4 — Stage 60–79 (Procurement, PO Received)
  get band4(): { deal: number; neo: number; count: number } { return this.bandTotals(60, 79); }

  // Card 5 — Stage 80–99 (Delivered, Payment Pending)
  get band5(): { deal: number; neo: number; count: number } { return this.bandTotals(80, 99); }

  // Card 6 — Closed Won (Payment Received, Closed Won — score 100)
  get band6(): { deal: number; neo: number; count: number } { return this.bandTotals(100, 100); }

  // ── Legacy helpers still used by lower sections ───────────────
  get wonOpps(): Opp[] {
    return this.visibleOpps.filter(o => o.stage === 'Closed Won' || o.stage === 'Payment Received');
  }
  get activeOpps(): Opp[] {
    return this.visibleOpps.filter(o =>
      o.stage !== 'Closed Won' && o.stage !== 'Closed Lost' && o.stage !== 'Payment Received'
    );
  }
  get winRate(): string {
    const closed = this.visibleOpps.filter(o =>
      o.stage === 'Closed Won' || o.stage === 'Closed Lost' || o.stage === 'Payment Received'
    );
    if (!closed.length) return '—';
    const won = closed.filter(o => o.stage === 'Closed Won' || o.stage === 'Payment Received');
    return `${Math.round((won.length / closed.length) * 100)}%`;
  }

  // ── Revenue by Stage (bar chart data) ────────────────────────
  get revenueByStage(): { stage: string; deal: number; neo: number; pct: number }[] {
    const map = new Map<string, { deal: number; neo: number }>();
    for (const o of this.visibleOpps) {
      const s = o.stage || 'Unknown';
      const cur = map.get(s) ?? { deal: 0, neo: 0 };
      map.set(s, { deal: cur.deal + (+o.deal_value || 0), neo: cur.neo + (+o.neozaar_revenue || 0) });
    }
    const rows = Array.from(map.entries())
      .map(([stage, v]) => ({ stage, ...v, pct: 0 }))
      .sort((a, b) => (STAGE_SCORES[b.stage] ?? 0) - (STAGE_SCORES[a.stage] ?? 0));
    const maxDeal = Math.max(...rows.map(r => r.deal), 1);
    return rows.map(r => ({ ...r, pct: Math.round((r.deal / maxDeal) * 100) }));
  }

  // ── Revenue by Type ───────────────────────────────────────────
  get revenueByType(): { type: string; deal: number; neo: number; count: number }[] {
    const map = new Map<string, { deal: number; neo: number; count: number }>();
    for (const o of this.visibleOpps) {
      const t = o.type || 'Unclassified';
      const cur = map.get(t) ?? { deal: 0, neo: 0, count: 0 };
      map.set(t, { deal: cur.deal + (+o.deal_value || 0), neo: cur.neo + (+o.neozaar_revenue || 0), count: cur.count + 1 });
    }
    return Array.from(map.entries())
      .map(([type, v]) => ({ type, ...v }))
      .sort((a, b) => b.deal - a.deal)
      .slice(0, 10);
  }

  get maxTypeValue(): number {
    return Math.max(...this.revenueByType.map(r => r.deal), 1);
  }

  // ── Per-user revenue breakdown ────────────────────────────────
  get userRows(): UserRow[] {
    if (!this.canViewAll || this.viewAsUser) return [];
    // Build one row per known CRM user using the same role-aware filter
    const rows: UserRow[] = [];
    for (const u of this.crmUsers) {
      const userOpps = this.filterOppsByUser(this.visibleOpps, u);
      if (!userOpps.length) continue;
      const wonCount = userOpps.filter(o =>
        o.stage === 'Closed Won' || o.stage === 'Payment Received').length;
      const closed = userOpps.filter(o =>
        o.stage === 'Closed Won' || o.stage === 'Closed Lost' || o.stage === 'Payment Received');
      rows.push({
        id:           u.id,
        name:         u.name,
        role_type:    u.role_type,
        dealTotal:    userOpps.reduce((s, o) => s + (+o.deal_value      || 0), 0),
        revenueTotal: userOpps.reduce((s, o) => s + (+o.neozaar_revenue || 0), 0),
        oppCount:     userOpps.length,
        wonCount,
        winRate: closed.length
          ? `${Math.round((wonCount / closed.length) * 100)}%`
          : '—',
      });
    }
    return rows.sort((a, b) => b.dealTotal - a.dealTotal);
  }

  get maxUserDeal(): number {
    return Math.max(...this.userRows.map(r => r.dealTotal), 1);
  }

  // ── Opportunity detail table ──────────────────────────────────
  oppTablePage = 1;
  readonly oppTablePageSize = 15;

  /** Sort key and direction for the opportunity table */
  oppSortKey: keyof OppTableRow = 'sr';
  oppSortDir: 'asc' | 'desc' = 'asc';

  sortOppTable(key: keyof OppTableRow): void {
    if (this.oppSortKey === key) {
      this.oppSortDir = this.oppSortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.oppSortKey = key;
      this.oppSortDir = key === 'sr' ? 'asc' : 'desc';
    }
    this.oppTablePage = 1;
  }

  get oppTableRows(): OppTableRow[] {
    const rows: OppTableRow[] = this.visibleOpps.map((o, i) => {
      const score = (STAGE_SCORES[o.stage] ?? 10) / 100;
      return {
        sr:              i + 1,
        customerName:    o.contact_company || o.contact_name || '—',
        productName:     o.name || '—',
        productType:     o.type || '—',
        revenue:         +o.deal_value      || 0,
        neoRevenue:      +o.neozaar_revenue || 0,
        weightedRevenue: Math.round((+o.neozaar_revenue || 0) * score),
        stage:           o.stage,
        id:              o.id,
      };
    });

    // Sort
    rows.sort((a, b) => {
      const av = a[this.oppSortKey];
      const bv = b[this.oppSortKey];
      let cmp = 0;
      if (typeof av === 'number' && typeof bv === 'number') cmp = av - bv;
      else cmp = String(av).localeCompare(String(bv));
      return this.oppSortDir === 'asc' ? cmp : -cmp;
    });

    return rows;
  }

  get oppTablePageCount(): number {
    return Math.ceil(this.oppTableRows.length / this.oppTablePageSize) || 1;
  }

  get oppTablePagedRows(): OppTableRow[] {
    const start = (this.oppTablePage - 1) * this.oppTablePageSize;
    return this.oppTableRows.slice(start, start + this.oppTablePageSize);
  }

  // ── Recent won deals ──────────────────────────────────────────
  get recentWon(): Opp[] {
    return [...this.wonOpps]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 8);
  }

  // ── Lifecycle ─────────────────────────────────────────────────
  ngOnInit(): void {
    this.loadOpportunities();
    if (this.canViewAll) this.loadUsers();
  }

  loadOpportunities(): void {
    this.loading = true;
    this.crm.getOpportunities({ limit: 1000 }).subscribe({
      next: (res: any) => {
        this.allOpps = res.data ?? [];
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  applyUserFilter(): void { /* visibleOpps is a computed getter — updates automatically */ }

  /**
   * Filter opps for a specific user based on their role.
   * - AGENT / A_MANAGER  → match affiliate_name
   * - SELLER             → match seller_name  (they are assigned to opps, not the owner)
   * - M_SELLER           → match seller_name OR owner_name (they own or manage)
   * - Everyone else      → match owner_name
   * Falls back to checking all three fields if no role match is found.
   */
  filterOppsByUser(opps: Opp[], user: any): Opp[] {
    const name = (user.name ?? '').trim().toLowerCase();
    if (!name) return opps;
    const role = (user.role_type ?? '').toUpperCase();

    return opps.filter(o => {
      const ownerMatch     = o.owner_name?.trim().toLowerCase()     === name;
      const sellerMatch    = o.seller_name?.trim().toLowerCase()    === name;
      const affiliateMatch = o.affiliate_name?.trim().toLowerCase() === name;

      if (role === 'AGENT' || role === 'A_MANAGER') {
        return affiliateMatch;
      }
      if (role === 'SELLER') {
        // SELLER can be either the owner (self-created) or the assigned seller
        return ownerMatch || sellerMatch;
      }
      if (role === 'M_SELLER') {
        return ownerMatch || sellerMatch;
      }
      // ADMIN / SUPER_ADMIN / MANAGER / ISV / others → owner
      return ownerMatch;
    });
  }

  // ── Formatting helpers ────────────────────────────────────────
  fmt(n: number): string {
    if (n >= 10_000_000) return `₹${(n / 10_000_000).toFixed(1)}Cr`;
    if (n >= 100_000)    return `₹${(n / 100_000).toFixed(1)}L`;
    if (n >= 1_000)      return `₹${(n / 1_000).toFixed(1)}K`;
    return `₹${n.toLocaleString()}`;
  }

  fmtFull(n: number): string {
    return `₹${Number(n).toLocaleString('en-IN')}`;
  }

  onRowHover(e: MouseEvent, enter: boolean, idx = 0): void {
    const el = e.currentTarget as HTMLElement;
    el.style.background = enter ? 'rgba(16,42,67,0.07)' : (idx % 2 === 0 ? 'var(--crm-accent-bg)' : 'transparent');
  }

  roleColor(role: string): string {
    const map: Record<string, string> = {
      SUPER_ADMIN: '#7c3aed', ADMIN: '#2563eb', M_SELLER: '#0891b2',
      SELLER: '#059669', AGENT: '#d97706', A_MANAGER: '#b45309',
      ISV: '#db2777', ISV_SELLER: '#e11d48', SUPPORT_PARTNER: '#6b7280',
    };
    return map[role] || '#6b7280';
  }

  stageColor(stage: string): string {
    const s = STAGE_SCORES[stage] ?? 10;
    if (s >= 80) return '#059669';
    if (s >= 40) return '#d97706';
    if (s >= 20) return '#2563eb';
    if (s === 0) return '#ef4444';
    return '#9ca3af';
  }
}
