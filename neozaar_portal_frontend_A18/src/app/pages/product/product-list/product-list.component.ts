import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Observable } from 'rxjs';
import { Store } from '@ngrx/store';
import { ExceluploadComponent } from '../../../shared/components/excelupload/excelupload.component';
import { UserserviceService } from '../../../core/services/userservice.service';
import { UserRole } from '../../../core/modal/user.modal';
import { HasRoleDirective } from '../../../shared/directives/has-role.directive';
import { ProductService } from '../product-service.service';
import { ToasterService } from '../../../shared/providers/toaster/toaster.service';
import { selectProducts } from '../../../shared/store/selector/product.selectors';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';
import { CopyproductComponent } from '../../../shared/components/copyproduct/copyproduct.component';
import { ListingZohoActionsComponent } from '../../../shared/components/listing-zoho-actions/listing-zoho-actions.component';
import { PublicLinkPanelComponent } from '../../../shared/components/public-link-panel/public-link-panel.component';
import { MasterService } from '../../master/master.service';



interface Pagination {
  total: number;
  total_pages: number;
  page: number;
  limit: number;
  next_page: number | null;
  prev_page: number | null;
  pages: number[];
}

@Component({
  selector: 'app-product-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, HasRoleDirective, ReactiveFormsModule, ExceluploadComponent,CopyproductComponent, ListingZohoActionsComponent, PublicLinkPanelComponent],
  templateUrl: './product-list.component.html',
  styleUrls: ['./product-list.component.css']
})
export class ProductListComponent implements OnInit {
  // Forms
  priceForm!: FormGroup;
  statusForm!: FormGroup;
  baseUrl = environment.frontendUrl;

  // Pagination
  pageSize = 10;
  currentPage = 1;
  totalPages = 0;
  pagination!: Pagination;
  visiblePages: (number | string)[] = [];

  // Filters
  isReqSend = false;
  status = '';
  category = '';
  cloud_provider = '';
  brand = '';
  is_feature = '';
  paymentmode: any;
  limit = 10;
  searchTerm = '';

  // Data
  productList: any[] = [];
  productList$!: Observable<any>;
  cat: any;
  aws: any;
  azure: any;
  brands: any[] = [];
  pages: number[] = [];
  pricedata: any;
  singleLeadData: any;
  isLeadModalOpen = false;

  // Misc
  UserRole = UserRole;
  profileUrl =
    'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?q=80&w=2070&auto=format&fit=crop';
  currencies = ['INR', 'USD', 'EUR', 'GBP', 'AUD'];
  showCurrencySelector = false;

  constructor(
    private productService: ProductService,
    private store: Store,
    private toasterService: ToasterService,
    private fb: FormBuilder,
    private userservce: UserserviceService,
    private authservice: AuthService,
    private masterService: MasterService,
  ) {
    this.productList$ = this.store.select(selectProducts);
  }
  
  public readonly Role = UserRole;
  currentUserRole: any;

  ngOnInit(): void {
    this.initForms();
    this.restoreFilters();
    this.getData();
    this.getfilter();
    const currentUser = this.authservice.getCurrentUser();
    this.currentUserRole = currentUser?.role_type;
    
  }

  initForms(): void {
    this.priceForm = this.fb.group({
      currency: ['INR', Validators.required],
      pricing: this.fb.array([])
    });

    this.statusForm = this.fb.group({
      status: [''],
      remark: ['']
    });
  }

  get pricing(): FormArray {
    return this.priceForm.get('pricing') as FormArray;
  }

  /**
   * Safely slugify a string with null/undefined check
   */
  slugify(text: string | null | undefined): string {
    if (!text) {
      return ''; // Return empty string for null/undefined values
    }
    
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  filter: any;

  onCopySuccess(newProductId: number) {
  // e.g., show a toast: "Product copied! Redirecting..."
  console.log(`Copy succeeded, new ID: ${newProductId}`);
}

onCopyError(errorMsg: string) {
  // e.g., show an error snackbar
  alert(errorMsg);
}
  
  getData(page: number = this.currentPage): void {
    this.isReqSend = true;
    this.currentPage = page;
    this.saveFilters();
    
    const params: any = {
      type: 'products',
      page: page,
      limit: this.limit,
      search: this.searchTerm,
      status: this.status,
      category: this.category,
      cloud_provider: this.cloud_provider,
      brand: this.brand,
    };
    if (this.is_feature !== '') params.is_feature = this.is_feature === 'true';
    
    // Only add filter if it has a value
    if (this.filter) {
      params.filter = { user_id: this.filter };
    }

    this.productService.getProductList(params)
      .subscribe({
        next: (res: any) => {
          this.isReqSend = false;
          if (res.status === 'success') {
            // Safely map products with null checks
            this.productList = (res.data || []).map((p: any) => ({
              ...p,
              // Use optional chaining and nullish coalescing
              name: p?.name || p?.product_name || 'Unnamed Product',
              slug: this.slugify(p?.name || p?.product_name || ''),
              description: p?.description || p?.short_description || '',
              product_logo: p?.product_logo || p?.logo || '/assets/default-product.png'
            }));
            
            this.pagination = res.pagination || {
              total: 0,
              page: 1,
              limit: this.limit,
              next_page: null,
              prev_page: null,
              pages: [1]
            };
            
            this.currentPage = this.pagination.page;
            this.totalPages = this.pagination.total_pages;
            this.visiblePages = this.pagination.pages || this.generateVisiblePages();
          }
        },
        error: (err) => {
          this.isReqSend = false;
          console.error('HTTP error:', err);
          this.toasterService.setToaster('error', 'Error', 'Failed to load products');
          this.productList = [];
        }
      });
  }

  /**
   * Generate visible pages if pagination.pages is not available
   */
  generateVisiblePages(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;
    const total = this.totalPages || 1;
    let start = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(total, start + maxVisible - 1);
    
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  getStatus(product: any) {
    if (!product) return { label: 'Unknown', class: 'text-gray-700 bg-gray-100' };
    
    if (product.is_drapt && !product.is_approved && product.status !== 'Rejected') {
      return { label: 'Pending Approval', class: 'text-yellow-700 bg-yellow-100' };
    }

    if (product.is_approved && !product.is_publish) {
      return { label: 'Approved', class: 'text-blue-700 bg-blue-100' };
    }

    if (product.is_approved && product.is_publish) {
      return { label: 'Published', class: 'text-green-700 bg-green-100' };
    }

    if (!product.is_approved && product.status === 'Rejected') {
      return { label: 'Rejected', class: 'text-red-700 bg-red-100' };
    }

    // Check status field as fallback
    switch(product.status?.toLowerCase()) {
      case 'published':
        return { label: 'Published', class: 'text-green-700 bg-green-100' };
      case 'approved':
        return { label: 'Approved', class: 'text-blue-700 bg-blue-100' };
      case 'rejected':
        return { label: 'Rejected', class: 'text-red-700 bg-red-100' };
      case 'draft':
        return { label: 'Draft', class: 'text-gray-700 bg-gray-100' };
      default:
        return { label: 'Unknown', class: 'text-gray-700 bg-gray-100' };
    }
  }

  goToPage(page: any): void {
    const pageNum = typeof page === 'number' ? page : parseInt(page, 10);
    if (!isNaN(pageNum) && pageNum !== this.currentPage) {
      this.getData(pageNum);
    }
  }

  nextPage(): void {
    if (this.currentPage < (this.totalPages || 1)) {
      this.getData(this.currentPage + 1);
    }
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.getData(this.currentPage - 1);
    }
  }

  user: any;

  
  
  getfilter(): void {
    this.masterService.getAllCategories().subscribe({
      next: (res: any) => (this.cat = res.data.categories || [])
    });
    
    this.productService.getaws().subscribe({
      next: (res: any) => (this.aws = res.data || [])
    });
    
    this.productService.getazure().subscribe({
      next: (res: any) => (this.azure = res.data || [])
    });

    this.productService.getBrands().subscribe({
      next: (res: any) => (this.brands = res.data?.brands || [])
    });
    
    this.userservce.getusers().subscribe({
      next: (res: any) => (this.user = res.data || [])
    });
  }

  toggleFeature(item: any): void {
    const newValue = !item.is_feature;
    this.productService.toggleFeatureStatus(item.id, { type: 'product', is_feature: newValue }).subscribe({
      next: (res: any) => {
        if (res.status === 'success' || res.success) {
          item.is_feature = newValue;
          this.toasterService.setToaster('success', 'Updated', `Product ${newValue ? 'marked as featured' : 'removed from featured'}`);
        } else {
          this.toasterService.setToaster('error', 'Error', res.message || 'Failed to update featured status');
        }
      },
      error: () => this.toasterService.setToaster('error', 'Error', 'Failed to update featured status')
    });
  }

  deleteProduct(productId: number): void {
    if (!productId) {
      this.toasterService.setToaster('error', 'Error', 'Invalid product ID');
      return;
    }
    
    if (!confirm('Are you sure you want to delete this product?')) return;

    this.productService.deleteProduct(productId).subscribe({
      next: (res: any) => {
        if (res.status === 'success' || res.success) {
          this.toasterService.setToaster('success', 'Deleted', 'Product deleted successfully');
          this.getData(this.currentPage); // Refresh current page
        } else {
          this.toasterService.setToaster('error', 'Error', res.message || 'Failed to delete product');
        }
      },
      error: (err) => {
        console.error('Delete error:', err);
        this.toasterService.setToaster('error', 'Error', 'Failed to delete product. Please try again.');
      }
    });
  }

  pushToZoho(product: any): void {
    if (!product?.id) {
      this.toasterService.setToaster('error', 'Error', 'Invalid product ID');
      return;
    }

    const alreadyPushed = !!product.zoho_campaign_key;
    const promptMessage = alreadyPushed
      ? `"${product.name}" was already pushed to Zoho${product.zoho_campaign_pushed_at ? ' on ' + new Date(product.zoho_campaign_pushed_at).toLocaleDateString() : ''}. Push again and create a new draft?`
      : `Push "${product.name}" to Zoho as a draft?`;

    if (!confirm(promptMessage)) return;

    this.productService.pushToZoho(product.id, alreadyPushed).subscribe({
      next: (res: any) => {
        if (res.status === 'success') {
          const stillAlready = res.data?.alreadyPushed;
          this.toasterService.setToaster(
            'success',
            stillAlready ? 'Already pushed' : 'Pushed to Zoho',
            stillAlready ? 'No new draft created — try again if you meant to push again.' : 'Draft created in Zoho Campaigns.'
          );
          this.getData(this.currentPage); // Refresh so the button/date stays current
        } else {
          this.toasterService.setToaster('error', 'Error', res.message || 'Failed to push to Zoho');
        }
      },
      error: (err) => {
        console.error('Push to Zoho error:', err);
        this.toasterService.setToaster('error', 'Error', 'Failed to push to Zoho. Please try again.');
      }
    });
  }

  downloadExcel(): void {
    const link = document.createElement('a');
    link.href = 'https://neozaar-my.sharepoint.com/:x:/p/admin/EYVdDsD1qO1AqNEGN-FFxxIBwoVVGZ442Y8eFArVqaQZfA?e=Emc1o1';
    link.download = 'neozaar_bulkupload_products.xlsx';
    link.target = '_blank';
    link.click();
  }

  openLeadModal(product: any): void {
    if (!product?.id) {
      this.toasterService.setToaster('error', 'Error', 'Invalid product');
      return;
    }
    
    this.isLeadModalOpen = true;
    this.singleLeadData = product;
    this.pricing.clear();

    this.productService.getProductById(product.id).subscribe({
      next: (res: any) => {
        if (!res.data?.pricing_model) return;

        try {
          const pricingModels = JSON.parse(res.data.pricing_model);
          
          if (!Array.isArray(pricingModels)) return;

          this.showCurrencySelector = pricingModels.some(
            (m: string) => this.mapModelType(m) !== 'free'
          );

          pricingModels.forEach((modelName: string) => {
            const modelType = this.mapModelType(modelName);
            this.pricing.push(
              this.fb.group({
                action_id: [product.id],
                action_type: ['product'],
                model_type: [modelType],
                base_price: [
                  modelType === 'free' ? 0 : null,
                  modelType === 'free' ? [] : [Validators.required, Validators.min(0)]
                ]
              })
            );
          });
        } catch (e) {
          console.error('Error parsing pricing model:', e);
        }
      },
      error: (err) => {
        console.error('Pricing fetch error:', err);
        this.toasterService.setToaster('error', 'Error', 'Failed to load pricing data');
      }
    });

    this.statusForm.patchValue({
      status: product.status || '',
      remark: product.remark || ''
    });
  }

  mapModelType(label: string): string {
    if (!label) return '';
    
    switch (label.toLowerCase().trim()) {
      case 'free demo':
      case 'free':
        return 'free';
      case 'byol':
        return 'byol';
      case 'custom quota':
      case 'custom_quote':
        return 'custom_quote';
      case 'pay-as-you-go':
      case 'pay_as_you_go':
        return 'pay_as_you_go';
      case 'subscription':
        return 'subscription';
      default:
        return label.toLowerCase().replace(/\s+/g, '_');
    }
  }

  submitPricing(): void {
    if (this.priceForm.invalid) {
      this.priceForm.markAllAsTouched();
      this.toasterService.setToaster('error', 'Invalid Form', 'Please fill all required fields');
      return;
    }

    const { currency, pricing } = this.priceForm.value;

    const finalPayload = pricing.map((p: any) => ({
      action_id: p.action_id,
      action_type: p.action_type,
      model_type: p.model_type,
      base_price: p.model_type === 'free' ? 0 : Number(p.base_price) || 0,
      currency: currency,
      details: [{ billing_period: 'monthly' }],
    }));

    console.log('Sending payload:', finalPayload);
    
    // TODO: Send API request
    this.toasterService.setToaster('success', 'Success', 'Pricing updated successfully');
    this.isLeadModalOpen = false;
  }

  blockInvalidInput(event: KeyboardEvent): void {
    if (['e', 'E', '+', '-', '.'].includes(event.key)) {
      event.preventDefault();
    }
  }

  /**
   * Clear all filters
   */


  
  clearFilters(): void {
    this.status = '';
    this.category = '';
    this.cloud_provider = '';
    this.brand = '';
    this.is_feature = '';
    this.filter = '';
    this.searchTerm = '';
    sessionStorage.removeItem('productListFilters');
    this.getData(1);
  }

  private saveFilters(): void {
    const filters = {
      status: this.status,
      category: this.category,
      cloud_provider: this.cloud_provider,
      brand: this.brand,
      is_feature: this.is_feature,
      filter: this.filter,
      searchTerm: this.searchTerm,
      currentPage: this.currentPage,
    };
    sessionStorage.setItem('productListFilters', JSON.stringify(filters));
  }

  private restoreFilters(): void {
    const saved = sessionStorage.getItem('productListFilters');
    if (saved) {
      try {
        const filters = JSON.parse(saved);
        this.status = filters.status || '';
        this.category = filters.category || '';
        this.cloud_provider = filters.cloud_provider || '';
        this.brand = filters.brand || '';
        this.is_feature = filters.is_feature || '';
        this.filter = filters.filter || '';
        this.searchTerm = filters.searchTerm || '';
        this.currentPage = filters.currentPage || 1;
      } catch (e) {
        sessionStorage.removeItem('productListFilters');
      }
    }
  }
}
