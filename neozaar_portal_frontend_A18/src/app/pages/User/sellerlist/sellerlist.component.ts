import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { environment } from '../../../../environments/environment';

export type TabType = 'category' | 'product' | 'service' | 'solution';

export interface AssignTab {
  key: TabType;
  label: string;
}

@Component({
  selector: 'app-sellerlist',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './sellerlist.component.html',
  styleUrls: ['./sellerlist.component.css']
})
export class SellerlistComponent implements OnInit {
  sellers: any[] = [];
  pagination = { page: 1, limit: 10, total: 0, total_pages: 0, has_prev: false, has_next: false, pages: [] as number[] };
  loading = false;

  // UTM link modal
  showLinkModal = false;
  selectedSeller: any = null;
  generatedLink = '';
  copied = false;

  // Assign modal
  showAssignModal = false;
  assignSeller: any = null;
  activeTab: TabType = 'category';
  assignSearch = '';
  assigning = false;
  assignmentsLoading = false;
  assignmentsReady = false;
  assignmentError = '';
  assignmentSuccess = '';
  private assignmentRequest = 0;

  options: Record<TabType, any[]> = { category: [], product: [], service: [], solution: [] };
  currentAssignments: any[] = [];
  selectedIds: Record<TabType, Set<number>> = {
    category: new Set(), product: new Set(), service: new Set(), solution: new Set()
  };
  // allowed_types per assigned category id: null = all, else ['product','service','solution'] subset
  categoryAllowedTypes: Map<number, Set<string>> = new Map();

  readonly tabs: AssignTab[] = [
    { key: 'category', label: 'Categories' },
    { key: 'product',  label: 'Products'   },
    { key: 'service',  label: 'Services'   },
    { key: 'solution', label: 'Solutions'  },
  ];

  private apiUrl = environment.apiUrl;
  private frontendUrl = environment.frontendUrl;

  constructor(private http: HttpClient) {}

  ngOnInit(): void { this.loadSellers(); }

  loadSellers(): void {
    this.loading = true;
    this.http.get<any>(`${this.apiUrl}user/sellers?page=${this.pagination.page}&limit=${this.pagination.limit}`).subscribe({
      next: (res) => { this.sellers = res.data || []; this.updatePagination(res.pagination); this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  updatePagination(p: any): void {
    if (!p) return;
    this.pagination.total = p.total || 0;
    this.pagination.total_pages = p.total_pages || Math.ceil(this.pagination.total / this.pagination.limit);
    this.pagination.has_prev = p.has_prev || false;
    this.pagination.has_next = p.has_next || false;
    const start = Math.max(1, this.pagination.page - 2);
    const end = Math.min(this.pagination.total_pages, start + 4);
    this.pagination.pages = Array.from({ length: Math.max(0, end - start + 1) }, (_, i) => start + i);
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.pagination.total_pages) return;
    this.pagination.page = page;
    this.loadSellers();
  }

  // ── UTM Link ──────────────────────────────────────────────
  openLinkModal(seller: any): void {
    this.selectedSeller = seller;
    this.generatedLink = `${this.frontendUrl.replace('4200', '3000')}marketplace?ref=${seller.id}&utm_source=seller&utm_medium=referral&utm_campaign=seller_${seller.id}`;
    this.copied = false;
    this.showLinkModal = true;
  }

  copyLink(): void {
    navigator.clipboard.writeText(this.generatedLink);
    this.copied = true;
    setTimeout(() => this.copied = false, 2000);
  }

  // ── Assign Modal ──────────────────────────────────────────
  openAssignModal(seller: any): void {
    const request = ++this.assignmentRequest;
    this.assignSeller = seller;
    this.activeTab = 'category';
    this.assignSearch = '';
    this.selectedIds = { category: new Set(), product: new Set(), service: new Set(), solution: new Set() };
    this.categoryAllowedTypes = new Map();
    this.options = { category: [], product: [], service: [], solution: [] };
    this.currentAssignments = [];
    this.assignmentError = '';
    this.assignmentSuccess = '';
    this.assignmentsLoading = true;
    this.assignmentsReady = false;
    this.showAssignModal = true;

    forkJoin({
      options: this.http.get<any>(`${this.apiUrl}seller/assign-options`),
      assignments: this.http.get<any>(`${this.apiUrl}seller/assignments/${seller.id}`)
    }).subscribe({
      next: ({ options, assignments }) => {
        if (request !== this.assignmentRequest) return;
        this.assignmentsLoading = false;
        if (!options.success || !assignments.success) {
          this.assignmentError = 'Unable to load assignments. Close and reopen this panel to retry.';
          return;
        }
        this.options.category = options.data.categories.map((item: any) => ({ ...item, id: Number(item.id) }));
        this.options.product = options.data.products.map((item: any) => ({ ...item, id: Number(item.id) }));
        this.options.service = options.data.services.map((item: any) => ({ ...item, id: Number(item.id) }));
        this.options.solution = options.data.solutions.map((item: any) => ({ ...item, id: Number(item.id) }));
        this.currentAssignments = assignments.data;
        assignments.data.forEach((a: any) => {
            const tab = a.item_type as TabType;
            if (this.selectedIds[tab]) this.selectedIds[tab].add(Number(a.item_id));
            if (tab === 'category' && a.allowed_types?.length) {
              this.categoryAllowedTypes.set(Number(a.item_id), new Set(a.allowed_types));
            }
        });
        this.assignmentsReady = true;
      },
      error: (error) => {
        if (request !== this.assignmentRequest) return;
        this.assignmentsLoading = false;
        this.assignmentError = error?.error?.message || 'Unable to load assignments. Close and reopen this panel to retry.';
      }
    });
  }

  get filteredOptions(): any[] {
    const q = this.assignSearch.toLowerCase().trim();
    if (!q) return this.options[this.activeTab];
    return this.options[this.activeTab].filter(o => o.name.toLowerCase().includes(q));
  }

  get assignedInTab(): any[] {
    return this.options[this.activeTab].filter(o => this.selectedIds[this.activeTab].has(o.id));
  }

  isSelected(id: number): boolean {
    return this.selectedIds[this.activeTab].has(id);
  }

  toggle(id: number): void {
    const set = this.selectedIds[this.activeTab];
    set.has(id) ? set.delete(id) : set.add(id);
  }

  totalSelected(): number {
    return (['category', 'product', 'service', 'solution'] as TabType[])
      .reduce((sum, t) => sum + this.selectedIds[t].size, 0);
  }

  isTypeAllowed(categoryId: number, type: string): boolean {
    const set = this.categoryAllowedTypes.get(categoryId);
    if (!set || set.size === 0) return true; // none selected = all allowed
    return set.has(type);
  }

  toggleAllowedType(categoryId: number, type: string): void {
    if (!this.categoryAllowedTypes.has(categoryId)) {
      this.categoryAllowedTypes.set(categoryId, new Set(['product', 'service', 'solution']));
    }
    const set = this.categoryAllowedTypes.get(categoryId)!;
    set.has(type) ? set.delete(type) : set.add(type);
    // if all 3 selected, treat as no restriction (null)
    if (set.size === 3) this.categoryAllowedTypes.delete(categoryId);
  }

  getAllowedTypesLabel(categoryId: number): string {
    const set = this.categoryAllowedTypes.get(categoryId);
    if (!set || set.size === 0) return 'All types';
    return Array.from(set).map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(', ');
  }

  saveAssignments(): void {
    if (!this.assignmentsReady || this.assigning || !this.assignSeller) return;
    this.assignmentError = '';
    const items: { item_type: string; item_id: number; allowed_types?: string[] }[] = [];
    (['category', 'product', 'service', 'solution'] as TabType[]).forEach(type => {
      this.selectedIds[type].forEach(id => {
        const entry: any = { item_type: type, item_id: id };
        if (type === 'category') {
          const set = this.categoryAllowedTypes.get(id);
          entry.allowed_types = (set && set.size > 0) ? Array.from(set) : null;
        }
        items.push(entry);
      });
    });

    this.assigning = true;
    // The API replaces catalog selections in a single transaction.
    this.http.post<any>(`${this.apiUrl}seller/assign-replace`, {
      seller_id: this.assignSeller.id,
      items
    }).subscribe({
      next: (res) => {
        this.assigning = false;
        if (!res.success) {
          this.assignmentError = res.message || 'Failed to save assignments.';
          return;
        }
        this.showAssignModal = false;
        this.assignmentSuccess = 'Assignments saved successfully.';
      },
      error: (error) => {
        this.assigning = false;
        this.assignmentError = error?.error?.message || 'Failed to save assignments. Please try again.';
      }
    });
  }
}
