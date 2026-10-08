import { Component, OnInit, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-crm-products',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './crm-products.component.html'
})
export class CrmProductsComponent implements OnInit {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private apiUrl = environment.apiUrl;
  private frontendUrl = environment.frontendUrl;

  items: any[] = [];
  filteredItems: any[] = [];
  pagedItems: any[] = [];
  loading = false;
  loadError = '';
  get isAffiliate(): boolean { return this.auth.user?.role_type === 'AGENT'; }
  activeTab: 'products' | 'services' | 'solutions' = 'products';
  searchQuery = '';
  copiedId: number | null = null;
  linkError = '';
  page = 1;
  limit = 20;
  private failedImages = new Set<string>();
  private loadRequest = 0;

  ngOnInit() { this.load(); }

  @HostListener('window:focus')
  refreshOnReturn(): void {
    if (this.isAffiliate && !this.loading) this.load();
  }

  load() {
    const request = ++this.loadRequest;
    this.loading = true;
    this.loadError = '';
    const tab = this.activeTab;
    let url = '';
    if (this.isAffiliate) {
      url = `${this.apiUrl}seller/my-assignments`;
    } else if (this.activeTab === 'products') {
      url = `${this.apiUrl}products/get-all?published=true&type=product`;
    } else if (this.activeTab === 'services') {
      url = `${this.apiUrl}catalog/services?limit=200&status=published`;
    } else {
      url = `${this.apiUrl}catalog/solutions?limit=200&status=published`;
    }

    this.http.get<any>(url).subscribe({
      next: (res) => {
        if (request !== this.loadRequest) return;
        const items = res.data || res.products || [];
        const type = tab === 'products' ? 'product' : tab === 'services' ? 'service' : 'solution';
        this.items = this.isAffiliate
          ? items.filter((item: any) => item.item_type === type).map((item: any) => ({
              ...item, name: item.item_name, product_logo: item.item_logo
            }))
          : items;
        this.applyFilter();
        this.loading = false;
      },
      error: () => {
        if (request !== this.loadRequest) return;
        this.items = []; this.filteredItems = []; this.pagedItems = []; this.loading = false;
        this.loadError = 'Unable to load catalog items. Please try again.';
      }
    });
  }

  switchTab(tab: 'products' | 'services' | 'solutions') {
    this.activeTab = tab;
    this.searchQuery = '';
    this.page = 1;
    this.load();
  }

  applyFilter() {
    if (!this.searchQuery.trim()) {
      this.filteredItems = [...this.items];
    } else {
      const q = this.searchQuery.toLowerCase();
      this.filteredItems = this.items.filter(p =>
        (p.name || p.title || '').toLowerCase().includes(q) ||
        (p.brand_name || '').toLowerCase().includes(q) ||
        (p.category_name || '').toLowerCase().includes(q)
      );
    }
    this.page = 1;
    this.updatePagedItems();
  }

  updatePagedItems() {
    const start = (this.page - 1) * this.limit;
    this.pagedItems = this.filteredItems.slice(start, start + this.limit);
  }

  get totalPages(): number { return Math.ceil(this.filteredItems.length / this.limit); }

  prevPage() { if (this.page > 1) { this.page--; this.updatePagedItems(); } }
  nextPage() { if (this.page < this.totalPages) { this.page++; this.updatePagedItems(); } }

  getItemImage(item: any): string | null {
    // All catalog types use product_logo. Only fall back to the item's own images.
    const images = [item.product_logo, item.image_url, item.logo, item.image, item.thumbnail];
    return images
      .filter((url): url is string => typeof url === 'string')
      .map(url => url.trim())
      .find(url => !!url && !this.failedImages.has(url)) || null;
  }

  onImageError(item: any): void {
    const url = this.getItemImage(item);
    if (url) this.failedImages.add(url);
  }

  getUtmLink(item: any): string {
    const userId = this.auth.user?.id || '';
    const slug = item.slug || item.id;
    const base = this.frontendUrl;
    const path = this.activeTab === 'products' ? 'product'
      : this.activeTab === 'services' ? 'service'
      : 'solution';
    return `${base}${path}/${slug}?utm_source=crm&utm_medium=share&utm_campaign=internal&ref=${userId}`;
  }

  copyLink(item: any) {
    this.linkError = '';
    if (this.isAffiliate) {
      this.http.post<any>(`${this.apiUrl}affiliate/affiliates/${this.auth.user?.id}/links`, {
        catalog_id: item.id, label: item.name
      }).subscribe({
        next: res => this.copyUrl(item.id, `${this.frontendUrl.replace(/\/$/, '')}/go/affiliate-track?slug=${encodeURIComponent(res.data.slug)}`),
        error: err => { this.linkError = err.error?.message || 'Unable to generate affiliate link.'; }
      });
      return;
    }
    const link = this.getUtmLink(item);
    this.copyUrl(item.id, link);
  }

  private copyUrl(id: number, link: string) {
    navigator.clipboard.writeText(link).then(() => {
      this.copiedId = id;
      setTimeout(() => { this.copiedId = null; }, 2000);
    }).catch(() => { this.linkError = `Copy this link: ${link}`; });
  }
}
