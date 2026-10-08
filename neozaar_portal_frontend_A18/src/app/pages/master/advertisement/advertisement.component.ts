import { Component, OnInit } from '@angular/core';
import { MasterService } from '../master.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-advertisement',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './advertisement.component.html',
  styleUrls: ['./advertisement.component.css']
})
export class AdvertisementComponent implements OnInit {
  adsList: any[] = [];
  isLoading = false;
  showForm = false;
  searchQuery: string = '';
  allItems: any[] = [];
  isSearchActive = false;

  get filteredAds() {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) return this.adsList;
    return (this.isSearchActive ? this.allItems : this.adsList).filter(a => a.title?.toLowerCase().includes(q) || a.label?.toLowerCase().includes(q));
  }

  onSearchChange() {
    if (!this.searchQuery.trim()) { this.isSearchActive = false; this.allItems = []; return; }
    if (!this.isSearchActive) {
      this.isSearchActive = true;
      this.masterService.getAllAds(1, 9999).subscribe({
        next: (res: any) => { this.allItems = res.data?.advertisments || []; }
      });
    }
  }
  isEditMode = false;
  paginationData: any = null;
  currentPage: number = 1;

  // Product list for the modal
  products: any[] = [];
  filteredProducts: any[] = [];
  productSearchTerm = '';
  showProductModal = false;
  selectedProductName = '';
  itemsPerPage: number = 10;
  totalItems: number = 0;
  totalPages: number = 0;
  hasNext: boolean = false;
  hasPrev: boolean = false;
  categories: any[] = [];

  // Form State
  adForm: any = {
    id: null,
    title: '',
    link: '',
    is_feature: false,
    page_type: '',
    ads_position: '',
    product_id: '',
    category_name: null,
    from_date: null,
    to_date: null
  };
  selectedFile: File | null = null;
  imagePreview: string | null = null;
  selectedMobileFile: File | null = null;
  mobileImagePreview: string | null = null;

  constructor(private masterService: MasterService) {}

  ngOnInit(): void {
    this.loadAds(1);
    this.loadAllProducts();
    this.getCategories();
  }

  // Load ads list with pagination
  loadAds(page: number = 1) {
    this.isLoading = true;
    this.masterService.getAllAds(page).subscribe({
      next: (res) => {
        this.adsList = res.data.advertisments;
        this.paginationData = res.pagination;
        this.isLoading = false;
      },
      error: (err) => {
        console.error(err);
        this.isLoading = false;
      }
    });
  }

  // Load all products for the modal
  loadAllProducts(search: string = '', page: number = 1) {
    this.masterService.getAllProducts(search).subscribe({
      next: (res) => {
        this.products = res.data;
        this.filteredProducts = [...this.products];
      },
      error: (err) => console.error(err)
    });
  }

  // Filter products based on search term
  filterProducts() {
    if (!this.productSearchTerm.trim()) {
      this.filteredProducts = [...this.products];
    } else {
      const term = this.productSearchTerm.toLowerCase();
      this.filteredProducts = this.products.filter(p =>
        p.name?.toLowerCase().includes(term) ||
        p.id?.toString().includes(term)
      );
    }
  }

  openProductModal() {
    this.productSearchTerm = '';
    this.filteredProducts = [...this.products];
    this.showProductModal = true;
  }

  selectProduct(product: any) {
    this.adForm.product_id = product.id;
    this.selectedProductName = product.name;
    this.showProductModal = false;
  }

  // When page_type changes, reset product if needed
  onPageTypeChange() {
    if (this.adForm.page_type !== 'product') {
      this.adForm.product_id = '';
      this.selectedProductName = '';
    }
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.paginationData.total_pages) {
      this.loadAds(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  // Load categories
  getCategories() {
    this.isLoading = true;
    this.masterService.getAllCategories(this.currentPage, this.itemsPerPage).subscribe({
      next: (res: any) => {
        if (res?.data?.categories) {
          this.categories = res.data.categories;
        } else if (res?.data && Array.isArray(res.data)) {
          this.categories = res.data;
        } else if (res?.categories && Array.isArray(res.categories)) {
          this.categories = res.categories;
        } else if (Array.isArray(res)) {
          this.categories = res;
        } else {
          this.categories = [];
        }

        if (res?.pagination) {
          this.currentPage = res.pagination.page;
          this.itemsPerPage = res.pagination.limit;
          this.totalItems = res.pagination.total;
          this.totalPages = res.pagination.total_pages;
          this.hasNext = res.pagination.has_next;
          this.hasPrev = res.pagination.has_prev;
        } else {
          this.totalItems = this.categories.length;
          this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
          this.hasNext = this.currentPage < this.totalPages;
          this.hasPrev = this.currentPage > 1;
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error fetching categories:', err);
        this.isLoading = false;
        alert('Failed to load categories: ' + err.message);
      }
    });
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      const reader = new FileReader();
      reader.onload = () => this.imagePreview = reader.result as string;
      reader.readAsDataURL(file);
    }
  }

  onMobileFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedMobileFile = file;
      const reader = new FileReader();
      reader.onload = () => this.mobileImagePreview = reader.result as string;
      reader.readAsDataURL(file);
    }
  }

  openCreate() {
    this.isEditMode = false;
    this.adForm = {
      id: null,
      title: '',
      link: '',
      is_feature: false,
      page_type: '',
      ads_position: '',
      product_id: '',
      category_name: null,
      from_date: null,
      to_date: null
    };
    this.selectedProductName = '';
    this.selectedFile = null;
    this.imagePreview = null;
    this.selectedMobileFile = null;
    this.mobileImagePreview = null;
    this.showForm = true;
  }

  // Edit function – populates all fields correctly
  openEdit(ad: any) {
    this.isEditMode = true;
    this.adForm = {
      id: ad.id,
      title: ad.title || '',
      link: ad.link || '',
      is_feature: ad.is_feature || false,
      page_type: ad.page_type || '',
      ads_position: ad.ads_position || '',
      product_id: ad.product_id || '',
      category_name: ad.category_name || null,
      from_date: ad.from_date ? this.formatDate(ad.from_date) : null,
      to_date: ad.to_date ? this.formatDate(ad.to_date) : null
    };
    this.imagePreview = ad.image || null;
    this.mobileImagePreview = ad.mobile_banner || null;
    this.selectedFile = null;
    this.selectedMobileFile = null;
    this.showForm = true;

    // Set product name for display
    if (this.adForm.product_id) {
      const found = this.products.find(p => p.id == this.adForm.product_id);
      this.selectedProductName = found ? found.name : `Product ID: ${this.adForm.product_id}`;
    } else {
      this.selectedProductName = '';
    }
  }

  // Helper to format date to YYYY-MM-DD for input[type="date"]
  private formatDate(date: any): string | null {
    if (!date) return null;
    const d = new Date(date);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().split('T')[0];
  }

  saveAd() {
    const formData = new FormData();
    formData.append('title', this.adForm.title);
    formData.append('link', this.adForm.link);
    formData.append('page_type', this.adForm.page_type);
    formData.append('ads_position', this.adForm.ads_position);
    if (this.adForm.from_date) {
      formData.append('from_date', this.adForm.from_date);
    }
    if (this.adForm.to_date) {
      formData.append('to_date', this.adForm.to_date);
    }
    formData.append('product_id', this.adForm.product_id || '');
    formData.append('is_feature', String(this.adForm.is_feature));
    if (this.adForm.category_name) {
      formData.append('category_name', this.adForm.category_name);
    }

    if (this.selectedFile) {
      formData.append('image', this.selectedFile);
    }
    if (this.selectedMobileFile) {
      formData.append('mobile_banner', this.selectedMobileFile);
    }

    const request = this.isEditMode
      ? this.masterService.updateAd(this.adForm.id, formData)
      : this.masterService.createAd(formData);

    request.subscribe({
      next: () => {
        this.loadAds(this.currentPage);
        this.showForm = false;
      },
      error: (err) => console.error("Save failed", err)
    });
  }

  toggleFeature(ad: any) {
    const originalValue = ad.is_feature;
    ad.is_feature = !ad.is_feature;

    const formData = new FormData();
    formData.append('title', ad.title);
    formData.append('link', ad.link || '');
    formData.append('page_type', ad.page_type || '');
    formData.append('ads_position', ad.ads_position || '');
    formData.append('product_id', ad.product_id || '');
    formData.append('is_feature', String(ad.is_feature));
    if (ad.from_date) formData.append('from_date', ad.from_date);
    if (ad.to_date) formData.append('to_date', ad.to_date);
    if (ad.category_name) formData.append('category_name', ad.category_name);

    this.masterService.updateAd(ad.id, formData).subscribe({
      next: () => console.log('Feature status updated'),
      error: (err) => {
        ad.is_feature = originalValue;
        console.error('Update failed', err);
      }
    });
  }

  deleteAd(id: any) {
    if (confirm('Permanently delete this advertisement?')) {
      this.masterService.deleteAd(id).subscribe(() => this.loadAds(this.currentPage));
    }
  }

  // ==================== DAY CALCULATION METHODS (UTC) ====================
  /**
   * Calculate total days between from_date and to_date (UTC based).
   * Returns null if either date is missing or invalid.
   */
  getDaysDifference(fromDate: string | null | undefined, toDate: string | null | undefined): number | null {
    if (!fromDate || !toDate) return null;
    
    const start = new Date(fromDate);
    const end = new Date(toDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
    
    // Convert to UTC midnight for accurate day difference
    const startUTC = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
    const endUTC = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
    
    const diffTime = endUTC - startUTC;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 ? diffDays : 0;
  }

  /**
   * Calculate remaining days from today until to_date (UTC based).
   * Returns null if to_date is missing/invalid.
   * Returns 0 if to_date is today or in the past.
   */
  getRemainingDays(toDate: string | null | undefined): number | null {
    if (!toDate) return null;
    
    const end = new Date(toDate);
    if (isNaN(end.getTime())) return null;
    
    const today = new Date();
    const todayUTC = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
    const endUTC = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
    
    const diffTime = endUTC - todayUTC;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 ? diffDays : 0;
  }
}
