import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ProductService } from '../product/product-service.service';
import { MasterService } from '../master/master.service';
import { ToasterService } from '../../shared/providers/toaster/toaster.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-featured',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './featured.component.html',
})
export class FeaturedComponent implements OnInit, OnDestroy {
  activeTab: 'product' | 'service' | 'solution' | 'category' = 'product';
  tabs: Array<'product' | 'service' | 'solution' | 'category'> = ['product', 'service', 'solution', 'category'];
  items: any[] = [];
  categoriesList: any[] = [];
  isLoading = false;
  searchTerm = '';
  currentPage = 1;
  pagination: any = {};
  baseUrl = environment.frontendUrl;

  // Filters
  brandFilter = '';
  categoryFilter = '';
  statusFilter = '';

  // Filter options
  brands: any[] = [];
  categories: any[] = [];

  // Auto-search
  private searchSubject = new Subject<string>();

  constructor(
    private productService: ProductService,
    private masterService: MasterService,
    private toaster: ToasterService
  ) {}

  ngOnInit(): void {
    this.loadFilters();
    this.loadItems();

    // Auto-search with debounce
    this.searchSubject.pipe(
      debounceTime(400),
      distinctUntilChanged()
    ).subscribe((term) => {
      this.searchTerm = term;
      this.currentPage = 1;
      this.loadItems(1);
    });
  }

  ngOnDestroy(): void {
    this.searchSubject.complete();
  }

  onSearchInput(value: string): void {
    this.searchSubject.next(value);
  }

  loadFilters(): void {
    this.productService.getBrands().subscribe({
      next: (res: any) => {
        const raw = res.data?.brands || res.data || [];
        this.brands = raw.map((b: any) => ({ name: b.brand_name || b.name || b }));
      }
    });

    this.masterService.getAllCategories(1, 200).subscribe({
      next: (res: any) => (this.categories = res.data?.categories || [])
    });
  }

  setTab(tab: 'product' | 'service' | 'solution' | 'category'): void {
    this.activeTab = tab;
    this.currentPage = 1;
    this.searchTerm = '';
    this.brandFilter = '';
    this.categoryFilter = '';
    this.statusFilter = '';
    this.loadItems();
  }

  loadItems(page: number = 1): void {
    if (this.activeTab === 'category') {
      this.loadCategoriesList();
      return;
    }

    this.isLoading = true;

    const params: any = {
      type: 'products',
      page,
      limit: 10,
      search: this.searchTerm,
      filter: { action_type: this.activeTab, is_feature: true }
    };

    if (this.brandFilter) {
      params.brand = this.brandFilter;
    }
    if (this.categoryFilter) {
      params.category = this.categoryFilter;
    }

    this.productService.getProductList(params).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        if (res.status === 'success') {
          this.items = (res.data || []).filter((p: any) => p.is_feature);
          this.pagination = res.pagination || {};
          this.currentPage = page;
        }
      },
      error: () => {
        this.isLoading = false;
        this.toaster.setToaster('error', 'Error', 'Failed to load featured items');
      }
    });
  }

  loadCategoriesList(): void {
    this.isLoading = true;
    this.masterService.getAllCategories(1, 200).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        this.categoriesList = res?.data?.categories || [];
      },
      error: () => {
        this.isLoading = false;
        this.toaster.setToaster('error', 'Error', 'Failed to load categories');
      }
    });
  }

  toggleCategoryFeature(cat: any): void {
    const nextValue = !cat.is_feature;
    this.masterService.toggleCategoryFeature(cat.id, nextValue).subscribe({
      next: () => {
        cat.is_feature = nextValue;
        this.toaster.setToaster('success', 'Updated', `Category ${nextValue ? 'featured' : 'unfeatured'} on home page`);
      },
      error: () => this.toaster.setToaster('error', 'Error', 'Failed to update category')
    });
  }

  onFilterChange(): void {
    this.currentPage = 1;
    this.loadItems(1);
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.brandFilter = '';
    this.categoryFilter = '';
    this.statusFilter = '';
    this.currentPage = 1;
    this.loadItems(1);
  }

  get hasActiveFilters(): boolean {
    return !!(this.searchTerm || this.brandFilter || this.categoryFilter || this.statusFilter);
  }

  toggleFeature(item: any): void {
    const payload = { type: this.activeTab, is_feature: !item.is_feature };
    this.productService.toggleFeatureStatus(item.id, payload).subscribe({
      next: () => {
        this.toaster.setToaster('success', 'Updated', `Feature status updated`);
        this.loadItems(this.currentPage);
      },
      error: () => this.toaster.setToaster('error', 'Error', 'Failed to update feature status')
    });
  }

  getViewUrl(item: any): string {
    return `/${this.activeTab}/view/${item.id}`;
  }

  goToPage(page: any): void {
    if (typeof page === 'number') this.loadItems(page);
  }
}
