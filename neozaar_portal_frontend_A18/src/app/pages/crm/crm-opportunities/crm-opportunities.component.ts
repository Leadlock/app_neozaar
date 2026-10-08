import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { CrmService } from '../../../core/services/crm/crm.service';
import { AuthService } from '../../../core/services/auth.service';
import { MasterService } from '../../master/master.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-crm-opportunities',
  standalone: true,
  imports: [CommonModule, FormsModule, DecimalPipe],
  templateUrl: './crm-opportunities.component.html'
})
export class CrmOpportunitiesComponent implements OnInit {
  private crmService: CrmService = inject(CrmService);
  private http: HttpClient = inject(HttpClient);
  private authService: AuthService = inject(AuthService);
  private masterService: MasterService = inject(MasterService);
  private apiUrl = environment.apiUrl;
  opportunities: any[] = [];
  total = 0; page = 1; limit = 20; loading = false;
  filters = { stage: '', search: '', dateRange: '' };

  // ── Advanced filter panel ──────────────────────────────────────
  showFilterPanel = false;
  advFilters = {
    owner_name:     '',
    seller_name:    '',
    affiliate_name: '',
    cloud:          '',
    type:           '',
    score_min:      '',
    score_max:      '',
  };

  readonly dateRanges = [
    { label: 'All Time',    value: ''   },
    { label: 'Last 7 Days', value: '7'  },
    { label: '15 Days',     value: '15' },
    { label: '1 Month',     value: '30' },
  ];

  /** All unique user names extracted from loaded opportunities */
  get filterOwnerOptions(): string[] {
    return [...new Set(this.opportunities.map(o => o.owner_name).filter(Boolean))].sort();
  }
  get filterSellerOptions(): string[] {
    return [...new Set(this.opportunities.map(o => o.seller_name).filter(Boolean))].sort();
  }
  get filterAffiliateOptions(): string[] {
    return [...new Set(this.opportunities.map(o => o.affiliate_name).filter(Boolean))].sort();
  }
  get filterTypeOptions(): string[] {
    return [...new Set(this.opportunities.map(o => o.type).filter(Boolean))].sort();
  }

  /** Count of active advanced filters (for badge on button) */
  get activeFilterCount(): number {
    return Object.values(this.advFilters).filter(v => v !== '').length + (this.filters.dateRange ? 1 : 0);
  }

  /** All sub-stages that belong to the currently selected stage group (or single stage) */
  private get _activeStageSet(): string[] | null {
    if (!this.filters.stage) return null;
    const grp = this._stageGroupDefs.find(g => g.label === this.filters.stage);
    if (grp) return grp.sub;
    return [this.filters.stage]; // exact single stage
  }

  /** Apply advanced filters on top of already-loaded opportunities */
  get filteredOpportunities(): any[] {
    const cutoff = this.filters.dateRange ? this._dateCutoff(+this.filters.dateRange) : null;
    const stageSet = this._activeStageSet;
    return this.opportunities.filter(o => {
      const score = this.getOppScore(o.stage);
      if (stageSet && !stageSet.includes(o.stage?.trim()))                                      return false;
      if (this.advFilters.owner_name    && o.owner_name     !== this.advFilters.owner_name)    return false;
      if (this.advFilters.seller_name   && o.seller_name    !== this.advFilters.seller_name)   return false;
      if (this.advFilters.affiliate_name && o.affiliate_name !== this.advFilters.affiliate_name) return false;
      if (this.advFilters.cloud         && o.cloud          !== this.advFilters.cloud)          return false;
      if (this.advFilters.type          && o.type           !== this.advFilters.type)           return false;
      if (this.advFilters.score_min     && score < +this.advFilters.score_min)                  return false;
      if (this.advFilters.score_max     && score > +this.advFilters.score_max)                  return false;
      if (cutoff && new Date(o.created_at) < cutoff)                                            return false;
      return true;
    });
  }

  private _dateCutoff(days: number): Date {
    const d = new Date();
    d.setDate(d.getDate() - days);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  resetAdvFilters() {
    this.advFilters = { owner_name:'', seller_name:'', affiliate_name:'', cloud:'', type:'', score_min:'', score_max:'' };
    this.filters.dateRange = '';
  }
  toggleFilterPanel() { this.showFilterPanel = !this.showFilterPanel; }
  closeFilterPanel()  { this.showFilterPanel = false; this.showStagePicker = false; }

  // ── Stage picker dropdown ─────────────────────────────────────
  showStagePicker = false;
  toggleStagePicker(e: Event) { e.stopPropagation(); this.showStagePicker = !this.showStagePicker; }
  closeStagePicker()           { this.showStagePicker = false; }
  selectStageGroup(group: any) {
    // clicking a group selects ALL its sub-stages via the first one (or clears if already selected)
    if (this.filters.stage === group.label) {
      this.filters.stage = '';
    } else {
      this.filters.stage = group.label;
    }
    this.showStagePicker = false;
    this.load();
  }
  selectStageSub(sub: string) {
    this.filters.stage = this.filters.stage === sub ? '' : sub;
    this.showStagePicker = false;
    this.load();
  }

  readonly _stageGroupDefs = [
    { score: 10,  label: 'Discovery',      sub: ['Discovery'],                                                color: '#ef4444' },
    { score: 20,  label: 'Qualification',  sub: ['Qualification'],                                            color: '#dc2626' },
    { score: 30,  label: 'Evaluation',     sub: ['Assessment','Demo','Trial','Scoping','Technical Validation'],color: '#f97316' },
    { score: 40,  label: 'Proposal',       sub: ['Proposal Shared','Negotiation','Private Offer'],            color: '#f59e0b' },
    { score: 60,  label: 'Procurement',    sub: ['Procurement','PO Received'],                                color: '#10b981' },
    { score: 80,  label: 'Delivered',      sub: ['Delivered'],                                                color: '#047857' },
    { score: 90,  label: 'Payment Pending',sub: ['Payment Pending'],                                          color: '#065f46' },
    { score: 100, label: 'Closed',         sub: ['Payment Received','Closed Won'],                            color: '#3b82f6' },
  ];

  /** Grouped stage rows for the stage picker panel — enriched with live deal totals */
  get stageGroups() {
    const maxDeal = Math.max(...this._stageGroupDefs.map(g => {
      return this.opportunities.filter(o => g.sub.includes(o.stage?.trim()))
                               .reduce((s, o) => s + (+o.deal_value || 0), 0);
    }), 1);
    return this._stageGroupDefs.map(g => {
      const opps = this.opportunities.filter(o => g.sub.includes(o.stage?.trim()));
      const deal = opps.reduce((s, o) => s + (+o.deal_value || 0), 0);
      const neo  = opps.reduce((s, o) => s + (+o.neozaar_revenue || 0), 0);
      return { ...g, deal, neo, count: opps.length, pct: Math.round((deal / maxDeal) * 100) };
    });
  }

  get stagePickerLabel(): string {
    if (!this.filters.stage) return 'All Stages';
    // find group label
    const grp = this.stageGroups.find(g => g.label === this.filters.stage || g.sub.includes(this.filters.stage));
    return grp ? grp.label : this.filters.stage;
  }

  showModal = false; editMode = false; selected: any = null;
  form: any = {
    name:'', type:'', product_type:'', deal_value:'', neozaar_revenue:'',
    expected_close_date:'', stage:'Discovery', notes:'', next_followup:'',
    private_offer_required:false, edp_eligible:false, macc_eligible:false, poc_required:false,
    // contact fields — only used when creating manually (no existing contact_id)
    contact_id: null, contact_name: '', contact_email: '', contact_phone: '', contact_company: ''
  };

  viewMode: 'table' | 'kanban' = 'kanban';

  // ── Sub-categories (loaded from API for Type dropdown) ────────
  subCategories: string[] = [];
  subCategoriesLoaded = false;

  loadSubCategories(): void {
    if (this.subCategoriesLoaded) return;
    this.masterService.getAllSubCategories(1, 500).subscribe({
      next: (res: any) => {
        // API returns: { data: { subcategories: [...] } } or { data: [...] } or [...]
        let arr: any[] = [];
        if (res?.data?.subcategories && Array.isArray(res.data.subcategories)) {
          arr = res.data.subcategories;
        } else if (Array.isArray(res?.data)) {
          arr = res.data;
        } else if (Array.isArray(res?.subcategories)) {
          arr = res.subcategories;
        } else if (Array.isArray(res)) {
          arr = res;
        }
        this.subCategories = arr.map((s: any) => s.name).filter(Boolean).sort();
        this.subCategoriesLoaded = true;
      },
      error: () => { this.subCategoriesLoaded = true; }
    });
  }

  // ── "Others" text input for Type field ───────────────────────
  showTypeOther = false;
  typeOtherText = '';

  onTypeChange(): void {
    if (this.form.type === '__other__') {
      this.showTypeOther = true;
      this.form.type = '';
    } else {
      this.showTypeOther = false;
      this.typeOtherText = '';
    }
  }

  confirmTypeOther(): void {
    if (this.typeOtherText.trim()) {
      this.form.type = this.typeOtherText.trim();
      this.showTypeOther = false;
    }
  }

  cancelTypeOther(): void {
    this.showTypeOther = false;
    this.typeOtherText = '';
    this.form.type = '';
  }

  // ── Engagement type checkboxes ────────────────────────────────
  engagement = { visited: false, telephonic: false, teams: false };

  // ── Comment tracker ───────────────────────────────────────────
  commentLog: { text: string; ts: Date }[] = [];
  newComment = '';

  addComment(): void {
    const t = this.newComment.trim();
    if (!t) return;
    this.commentLog.unshift({ text: t, ts: new Date() });
    this.newComment = '';
  }

  fmtCommentTime(d: Date): string {
    return d.toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    });
  }

  readonly productTypes = ['Product', 'Service', 'Solution'];

  readonly stages = [
    'Discovery',
    'Qualification',
    'Assessment', 'Demo', 'Trial', 'Scoping', 'Technical Validation',
    'Proposal Shared', 'Negotiation', 'Private Offer',
    'Procurement', 'PO Received',
    'Delivered',
    'Payment Pending',
    'Payment Received', 'Closed Won', 'Closed Lost'
  ];
  readonly kanbanStages = ['Discovery','Qualification','Demo','Proposal Shared','Negotiation','Procurement','Delivered','Payment Received'];

  readonly stageScores: { [key: string]: number } = {
    'Discovery': 10,
    'Qualification': 20,
    'Assessment': 30, 'Demo': 30, 'Trial': 30, 'Scoping': 30, 'Technical Validation': 30,
    'Proposal Shared': 40, 'Negotiation': 40, 'Private Offer': 40,
    'Procurement': 60, 'PO Received': 60,
    'Delivered': 80,
    'Payment Pending': 90,
    'Payment Received': 100, 'Closed Won': 100,
    'Closed Lost': 0,
  };

  readonly lostReasons = [
    'Price too high', 'Competitor selected', 'No budget', 'Project cancelled',
    'No response', 'Technical limitation', 'Not interested', 'Timeline changed', 'Other'
  ];

  showLostModal = false;
  lostTarget: any = null;
  lostReason = '';
  lostNotes = '';

  openCloseLost(o: any) {
    this.lostTarget = o;
    this.lostReason = '';
    this.lostNotes = '';
    this.showLostModal = true;
  }

  confirmCloseLost() {
    if (!this.lostReason) return;
    this.crmService.changeOpportunityStage(this.lostTarget.id, 'Closed Lost', this.lostNotes, this.lostReason)
      .subscribe({ next: () => { this.showLostModal = false; this.load(); } });
  }

  getOppScore(stage: string): number {
    return this.stageScores[stage?.trim()] || 10;
  }

  getScoreColor(score: number): string {
    if (score >= 80) return 'neo-badge-active';
    if (score >= 40) return 'neo-badge-warning';
    if (score >= 20) return 'neo-badge-new';
    return 'neo-badge-gray';
  }

  getStageColor(stage: string): string {
    const score = this.getOppScore(stage);
    if (score >= 100) return '#3b82f6';
    if (score >= 90)  return '#065f46';
    if (score >= 80)  return '#047857';
    if (score >= 60)  return '#10b981';
    if (score >= 40)  return '#f59e0b';
    if (score >= 30)  return '#f97316';
    if (score >= 20)  return '#dc2626';
    return '#ef4444';
  }

  affiliates: any[] = [];
  affiliatesLoaded = false;
  contacts: any[] = [];
  useExistingContact = false;
  selectedContactPreview: any = null;

  ngOnInit() { this.load(); this.loadAffiliates(); this.loadSubCategories(); }
  load() {
    this.loading = true;
    // If filters.stage is a group label (not a real stage), don't send it to the API —
    // the client-side filteredOpportunities getter handles it via _activeStageSet
    const isGroupLabel = this._stageGroupDefs.some(g => g.label === this.filters.stage);
    const apiFilters = { ...this.filters, stage: isGroupLabel ? '' : this.filters.stage };
    this.crmService.getOpportunities({ page: this.page, limit: this.limit, ...apiFilters }).subscribe({
      next: (res: any) => { this.opportunities = res.data; this.total = res.total; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }
  openCreate() {
    this.editMode = false;
    this.useExistingContact = false;
    this.selectedContactPreview = null;
    this.form = { name:'',type:'',product_type:'',deal_value:'',neozaar_revenue:'',expected_close_date:'',stage:'Discovery',notes:'',next_followup:'',private_offer_required:false,edp_eligible:false,macc_eligible:false,poc_required:false,contact_id:null,contact_name:'',contact_email:'',contact_phone:'',contact_company:'',contact_industry:'',contact_country:'' };
    this.showTypeOther = false;
    this.typeOtherText = '';
    this.engagement = { visited: false, telephonic: false, teams: false };
    this.commentLog = [];
    this.newComment = '';
    if (!this.contacts.length) {
      this.crmService.getContacts({ limit: 200 }).subscribe({ next: (res: any) => { this.contacts = res.data || []; } });
    }
    this.showModal = true;
  }

  onToggleExistingContact(): void {
    this.form.contact_id = null;
    this.selectedContactPreview = null;
  }

  onContactSelected(): void {
    const contact = this.contacts.find(c => c.id === this.form.contact_id);
    if (!contact) { this.selectedContactPreview = null; return; }
    this.selectedContactPreview = contact;
  }

  loadAffiliates(): void {
    this.http.get<any>(`${this.apiUrl}seller/sellers-list`).subscribe({
      next: (res) => { this.affiliates = (res.data || []).filter((u: any) => u.role_type === 'AGENT' || u.role_type === 'A_MANAGER'); this.affiliatesLoaded = true; },
      error: () => { this.affiliatesLoaded = true; }
    });
  }
  openEdit(o: any) {
    this.editMode = true;
    this.selected = o;
    this.form = { ...o };
    this.showTypeOther = false;
    this.typeOtherText = '';
    this.engagement = { visited: false, telephonic: false, teams: false };
    this.useExistingContact = false;
    this.showModal = true;
  }

  private oppPayload(form: any, contactId?: number): any {
    // Build engagement note suffix
    const engLabels: string[] = [];
    if (this.engagement.visited)    engLabels.push('Visited');
    if (this.engagement.telephonic) engLabels.push('Telephonic Call');
    if (this.engagement.teams)      engLabels.push('Teams Call');
    const engSuffix = engLabels.length
      ? `\n[Engagement: ${engLabels.join(', ')}]`
      : '';

    return {
      contact_id:   contactId ?? form.contact_id ?? null,
      lead_id:      form.lead_id ?? null,
      name:         form.name,
      type:         form.type || null,
      cloud:        form.product_type || form.cloud || null,   // reuse cloud column for product_type
      deal_value:   form.deal_value || 0,
      neozaar_revenue: form.neozaar_revenue || 0,
      expected_close_date: form.expected_close_date || null,
      stage:        form.stage || 'Discovery',
      budget:       form.budget || null,
      timeline:     form.timeline || null,
      notes:        ((form.notes || '') + engSuffix).trim() || null,
      next_followup: form.next_followup || null,
      private_offer_required: form.private_offer_required ?? false,
      edp_eligible:  form.edp_eligible ?? false,
      macc_eligible: form.macc_eligible ?? false,
      poc_required:  form.poc_required ?? false,
    };
  }

  save() {
    if (!this.editMode && !this.form.contact_id && (this.form.contact_company || this.form.contact_name)) {
      const contactPayload = {
        name: this.form.contact_name || this.form.contact_company,
        company: this.form.contact_company || null,
        email: this.form.contact_email,
        phone: this.form.contact_phone,
        industry: this.form.contact_industry || null,
        country: this.form.contact_country || null,
        type: 'lead'
      };
      this.crmService.createContact(contactPayload).subscribe({
        next: (res: any) => {
          this.crmService.createOpportunity(this.oppPayload(this.form, res.data.id)).subscribe({ next: () => { this.showModal = false; this.load(); } });
        }
      });
    } else {
      const obs = this.editMode
        ? this.crmService.updateOpportunity(this.selected.id, this.oppPayload(this.form))
        : this.crmService.createOpportunity(this.oppPayload(this.form));
      obs.subscribe({ next: () => { this.showModal = false; this.load(); } });
    }
  }
  delete(id: number) {
    if (!confirm('Delete opportunity?')) return;
    this.crmService.deleteOpportunity(id).subscribe({
      next: () => this.load(),
      error: (err: any) => alert(err?.error?.message || 'Failed to delete opportunity'),
    });
  }
  stageColor(stage: string): string {
    const score = this.stageScores[stage?.trim()] || 10;
    if (score >= 100) return 'neo-badge-active';
    if (score >= 80) return 'neo-badge-active';
    if (score >= 40) return 'neo-badge-warning';
    if (score >= 20) return 'neo-badge-new';
    return 'neo-badge-gray';
  }
  getByStage(stage: string): any[] { return this.opportunities.filter(o => o.stage === stage); }
  getStageCount(stage: string): number { return this.getByStage(stage).length; }
  get pages() { return Math.ceil(this.total / this.limit); }
  prevPage() { if (this.page > 1) { this.page--; this.load(); } }
  nextPage() { if (this.page < this.pages) { this.page++; this.load(); } }

  // ─── Assign Seller (M_SELLER only) ───
  get today(): string { return new Date().toISOString().split('T')[0]; }

  get isMSeller(): boolean { return this.authService.user?.role_type === 'M_SELLER'; }

  showAssignModal = false;
  assignTarget: any = null;
  selectedSellerId: number | null = null;
  sellers: any[] = [];
  sellersLoaded = false;
  assigning = false;

  canAssignSeller(opp: any): boolean {
    // M_SELLER can assign/re-assign at any time once past Discovery.
    // The !opp.seller_id guard is intentionally removed — when a SELLER creates
    // their own opportunity it auto-assigns seller_id to themselves, and M_SELLER
    // must still be able to re-assign it to a different seller.
    return this.isMSeller && this.getOppScore(opp.stage) >= 20;
  }

  openAssignSeller(opp: any): void {
    this.assignTarget = opp;
    this.selectedSellerId = null;
    this.showAssignModal = true;
    if (!this.sellersLoaded) {
      this.http.get<any>(`${this.apiUrl}internal/crm/opportunities/0/available-sellers`).subscribe({
        next: (res) => { this.sellers = res.data || []; this.sellersLoaded = true; },
        error: () => { this.sellersLoaded = true; }
      });
    }
  }

  assignSeller(): void {
    if (!this.selectedSellerId || !this.assignTarget) return;
    this.assigning = true;
    this.http.post<any>(`${this.apiUrl}internal/crm/opportunities/${this.assignTarget.id}/assign-seller`, {
      seller_id: this.selectedSellerId
    }).subscribe({
      next: () => { this.assigning = false; this.showAssignModal = false; this.load(); },
      error: (err) => { this.assigning = false; alert(err.error?.message || 'Failed to assign seller'); }
    });
  }

  // ─── Share with another seller (SELLER hand-off) ───
  get isSeller(): boolean { return this.authService.user?.role_type === 'SELLER'; }
  get currentUserId(): number | null { return (this.authService.user?.id as number) ?? null; }

  showShareModal = false;
  shareTarget: any = null;
  selectedShareSellerId: number | null = null;
  shareNote = '';
  shareSellers: any[] = [];
  shareSellersLoaded = false;
  sharing = false;

  /** A SELLER may hand off an opportunity they currently hold (assigned to them or created by them). */
  canShareSeller(opp: any): boolean {
    if (!this.isSeller) return false;
    const uid = this.currentUserId;
    return uid != null && (opp.seller_id === uid || opp.created_by === uid);
  }

  openShareSeller(opp: any): void {
    this.shareTarget = opp;
    this.selectedShareSellerId = null;
    this.shareNote = '';
    this.showShareModal = true;
    // Always reload the shareable-seller list scoped to the current opp/user.
    this.shareSellersLoaded = false;
    this.http.get<any>(`${this.apiUrl}internal/crm/opportunities/${opp.id}/share-sellers`).subscribe({
      next: (res) => { this.shareSellers = res.data || []; this.shareSellersLoaded = true; },
      error: () => { this.shareSellersLoaded = true; }
    });
  }

  shareSeller(): void {
    if (!this.selectedShareSellerId || !this.shareTarget) return;
    this.sharing = true;
    this.http.post<any>(`${this.apiUrl}internal/crm/opportunities/${this.shareTarget.id}/share-seller`, {
      seller_id: this.selectedShareSellerId,
      note: this.shareNote?.trim() || undefined,
    }).subscribe({
      next: () => { this.sharing = false; this.showShareModal = false; this.load(); },
      error: (err) => { this.sharing = false; alert(err.error?.message || 'Failed to share opportunity'); }
    });
  }
}
