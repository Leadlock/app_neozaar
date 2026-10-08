import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';
import { AffiliateService } from '../../core/services/affiliate/affiliate.service';

type AssignTab = 'all' | 'category' | 'product' | 'service' | 'solution';

@Component({
  selector: 'app-seller-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './seller-dashboard.component.html'
})
export class SellerDashboardComponent implements OnInit {
  // Common
  currentUser: any;
  roleType: string = '';
  stats: any = { total_clicks: 0, total_leads: 0, won_leads: 0, lost_leads: 0, pending_leads: 0 };
  leads: any[] = [];
  pagination: any = { page: 1, limit: 5, total: 0, total_pages: 0, has_prev: false, has_next: false, pages: [] };
  loading = true;

  // Affiliate (AGENT) specific
  referralLink = '';
  copied = false;
  channels: any[] = [];
  showAddChannel = false;
  newChannel: any = { platform: '', name: '', url: '' };
  readonly platformOptions = ['LinkedIn', 'Instagram', 'Twitter', 'YouTube', 'Facebook', 'WhatsApp', 'Blog', 'Other'];
  assignments: any[] = [];
  assignmentsLoading = true;
  activeTab: AssignTab = 'all';

  // SELLER specific
  assignedOpportunities: any[] = [];
  oppsLoading = true;

  // AFFILIATE specific
  affiliateOpportunities: any[] = [];
  affiliateOppsLoading = true;

  // M_SELLER specific
  sellers: any[] = [];
  sellersLoading = true;
  readyOpportunities: any[] = []; // opportunities with score >= 40 and no seller assigned
  readyOppsLoading = true;
  showAssignModal = false;
  assignTarget: any = null;
  selectedSellerId: number | null = null;
  assigningInProgress = false;

  // Per-item UTM link modal
  showLinkModal = false;
  activeItem: any = null;
  itemLink = '';
  itemLinkCopied = false;

  private apiUrl = environment.apiUrl;
  private marketplaceUrl = environment.frontendUrl.replace('4200', '3000');


  constructor(private http: HttpClient, private authService: AuthService, private affiliateSvc: AffiliateService) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.roleType = this.currentUser?.role_type || '';

    if (this.isAManager) {
      this.loadAManagerDashboard();
    } else if (this.isAffiliate) {
      this.initAffiliateView();
    } else if (this.isSeller) {
      this.initSellerView();
    } else if (this.isMSeller) {
      this.initMSellerView();
    }

    this.loadStats();
    this.loadLeads();
  }

  // ─── Role checks ───
  get isAManager(): boolean { return this.roleType === 'A_MANAGER'; }
  get isMSeller(): boolean  { return this.roleType === 'M_SELLER'; }
  get isSeller(): boolean   { return this.roleType === 'SELLER'; }
  get isAffiliate(): boolean { return this.roleType === 'AGENT'; }

  get roleLabel(): string {
    if (this.isAManager) return 'Affiliate Manager';
    if (this.isMSeller) return 'Master Seller';
    if (this.isSeller) return 'Seller';
    return 'Affiliate';
  }

  // ─── A_MANAGER data ───
  amDashboard: any = null;
  amLoading = true;

  // ─── AFFILIATE (AGENT) INIT ───
  initAffiliateView(): void {
    this.referralLink = `${this.marketplaceUrl}marketplace?ref=${this.currentUser?.id}&utm_source=affiliate&utm_medium=referral&utm_campaign=affiliate_${this.currentUser?.id}`;
    this.loadAssignments();
    this.loadChannels();
    this.loadAffiliateOpportunities();
  }

  // ─── A_MANAGER INIT ───
  loadAManagerDashboard(): void {
    this.amLoading = true;
    this.affiliateSvc.getManagerDashboard().subscribe({
      next: (r: any) => { this.amDashboard = r.data; this.amLoading = false; },
      error: ()      => { this.amLoading = false; },
    });
  }

  fmtNum(n: any): string { return (Number(n) || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 }); }
  fmtCurrency(n: any): string { return '₹' + this.fmtNum(n); }

  // ─── SELLER INIT ───
  initSellerView(): void {
    this.referralLink = `${this.marketplaceUrl}marketplace?ref=${this.currentUser?.id}&utm_source=seller&utm_medium=referral&utm_campaign=seller_${this.currentUser?.id}`;
    this.loadAssignedOpportunities();
    this.loadAssignments();
  }

  // ─── M_SELLER INIT ───
  initMSellerView(): void {
    this.loadSellers();
    this.loadReadyOpportunities();
  }

  // ─── Common API calls ───
  loadStats(): void {
    this.http.get<any>(`${this.apiUrl}lead/seller/stats`).subscribe({
      next: (res) => { if (res.data) this.stats = res.data; },
      error: () => {}
    });
  }

  loadLeads(page = 1): void {
    this.loading = true;
    this.http.get<any>(`${this.apiUrl}lead/get-all?page=${page}&limit=${this.pagination.limit}`).subscribe({
      next: (res) => {
        this.leads = res.leads?.data || [];
        const p = res.leads?.pagination;
        if (p) {
          this.pagination = {
            ...this.pagination, ...p,
            total_pages: p.total_pages || Math.ceil(p.total / this.pagination.limit),
            has_prev: p.has_prev ?? page > 1,
            has_next: p.has_next ?? page < Math.ceil(p.total / this.pagination.limit),
            pages: p.pages || []
          };
        }
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  // ─── AFFILIATE: Opportunities linked to them ───
  loadAffiliateOpportunities(): void {
    this.affiliateOppsLoading = true;
    this.http.get<any>(`${this.apiUrl}internal/crm/opportunities?limit=50`).subscribe({
      next: (res) => { this.affiliateOpportunities = res.data || []; this.affiliateOppsLoading = false; },
      error: () => { this.affiliateOppsLoading = false; }
    });
  }

  // ─── Affiliate: Assignments ───
  loadAssignments(): void {
    this.assignmentsLoading = true;
    this.http.get<any>(`${this.apiUrl}seller/my-assignments`).subscribe({
      next: (res) => { this.assignments = res.data || []; this.assignmentsLoading = false; },
      error: () => { this.assignmentsLoading = false; }
    });
  }

  get filteredAssignments(): any[] {
    if (this.activeTab === 'all') return this.assignments;
    return this.assignments.filter(a => a.item_type === this.activeTab);
  }

  countByType(type: string): number {
    return this.assignments.filter(a => a.item_type === type).length;
  }

  // ─── SELLER: Assigned Opportunities ───
  loadAssignedOpportunities(): void {
    this.oppsLoading = true;
    this.http.get<any>(`${this.apiUrl}internal/crm/opportunities?limit=50`).subscribe({
      next: (res) => {
        this.assignedOpportunities = res.data || [];
        this.oppsLoading = false;
      },
      error: () => { this.oppsLoading = false; }
    });
  }

  // ─── M_SELLER: Sellers under me ───
  loadSellers(): void {
    this.sellersLoading = true;
    this.http.get<any>(`${this.apiUrl}internal/crm/opportunities/0/available-sellers`).subscribe({
      next: (res) => { this.sellers = res.data || []; this.sellersLoading = false; },
      error: () => { this.sellersLoading = false; }
    });
  }

  // ─── M_SELLER: Opportunities ready for seller assignment (score >= 20, no seller) ───
  loadReadyOpportunities(): void {
    this.readyOppsLoading = true;
    this.http.get<any>(`${this.apiUrl}internal/crm/opportunities?limit=100`).subscribe({
      next: (res) => {
        const all = res.data || [];
        this.readyOpportunities = all.filter((o: any) => (o.score || 0) >= 20 && !o.seller_id);
        this.readyOppsLoading = false;
      },
      error: () => { this.readyOppsLoading = false; }
    });
  }

  // ─── M_SELLER: Assign seller modal ───
  openAssignModal(opp: any): void {
    this.assignTarget = opp;
    this.selectedSellerId = null;
    this.showAssignModal = true;
  }

  assignSeller(): void {
    if (!this.selectedSellerId || !this.assignTarget) return;
    this.assigningInProgress = true;
    this.http.post<any>(`${this.apiUrl}internal/crm/opportunities/${this.assignTarget.id}/assign-seller`, {
      seller_id: this.selectedSellerId
    }).subscribe({
      next: (res) => {
        this.assigningInProgress = false;
        this.showAssignModal = false;
        this.loadReadyOpportunities(); // Refresh list
      },
      error: (err) => {
        this.assigningInProgress = false;
        alert(err.error?.message || 'Failed to assign seller');
      }
    });
  }

  // ─── UTM Link Modal ───
  openItemLink(item: any): void {
    this.activeItem = item;
    const type = item.action_type || item.item_type;
    const id = item.item_id || item.id;
    const utmSource = this.isSeller ? 'seller' : 'affiliate';
    this.itemLink = `${this.marketplaceUrl}${type}/${id}?utm_source=${utmSource}&utm_medium=referral&utm_campaign=${utmSource}_${this.currentUser?.id}`;
    this.itemLinkCopied = false;
    this.showLinkModal = true;
  }

  copyItemLink(): void {
    navigator.clipboard.writeText(this.itemLink);
    this.itemLinkCopied = true;
    setTimeout(() => this.itemLinkCopied = false, 2000);
  }

  copyLink(): void {
    navigator.clipboard.writeText(this.referralLink);
    this.copied = true;
    setTimeout(() => this.copied = false, 2000);
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.pagination.total_pages) return;
    this.pagination.page = page;
    this.loadLeads(page);
  }

  // ─── Affiliate: Social Channels ───
  loadChannels(): void {
    const stored = localStorage.getItem(`channels_${this.currentUser?.id}`);
    this.channels = stored ? JSON.parse(stored) : [];
  }

  addChannel(): void {
    if (!this.newChannel.platform) return;
    this.channels.push({ ...this.newChannel });
    localStorage.setItem(`channels_${this.currentUser?.id}`, JSON.stringify(this.channels));
    this.newChannel = { platform: '', name: '', url: '' };
    this.showAddChannel = false;
  }

  removeChannel(index: number): void {
    this.channels.splice(index, 1);
    localStorage.setItem(`channels_${this.currentUser?.id}`, JSON.stringify(this.channels));
  }

  getChannelIcon(platform: string): string {
    const icons: Record<string, string> = {
      'LinkedIn': 'ri-linkedin-fill',
      'Instagram': 'ri-instagram-fill',
      'Twitter': 'ri-twitter-x-fill',
      'YouTube': 'ri-youtube-fill',
      'Facebook': 'ri-facebook-fill',
      'WhatsApp': 'ri-whatsapp-fill',
      'Blog': 'ri-article-fill',
      'Other': 'ri-global-line'
    };
    return icons[platform] || 'ri-global-line';
  }
}
