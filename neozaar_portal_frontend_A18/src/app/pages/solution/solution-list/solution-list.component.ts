import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Observable } from 'rxjs';
import { Store } from '@ngrx/store';
import { ExceluploadComponent } from '../../../shared/components/excelupload/excelupload.component';
import { UserserviceService } from '../../../core/services/userservice.service';
import { UserRole } from '../../../core/modal/user.modal';
import { HasRoleDirective } from '../../../shared/directives/has-role.directive';
import { SolutionserviceService } from '../solutionservice.service';
import { ToasterService } from '../../../shared/providers/toaster/toaster.service';
import { selectProducts } from '../../../shared/store/selector/product.selectors';
import { AuthService } from '../../../core/services/auth.service';
import { MasterService } from '../../master/master.service';
import { CopyproductComponent } from '../../../shared/components/copyproduct/copyproduct.component';
import { ListingZohoActionsComponent } from '../../../shared/components/listing-zoho-actions/listing-zoho-actions.component';
import { PublicLinkPanelComponent } from '../../../shared/components/public-link-panel/public-link-panel.component';
import { environment } from '../../../../environments/environment';

interface Pagination {
  total: number;
  page: number;
  limit: number;
  next_page: number | null;
  prev_page: number | null;
  pages: number[];
}

@Component({
  selector: 'app-solution-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, HasRoleDirective, ReactiveFormsModule, ExceluploadComponent, CopyproductComponent, ListingZohoActionsComponent, PublicLinkPanelComponent],
  templateUrl: './solution-list.component.html',
  styleUrls: ['./solution-list.component.css']
})
export class SolutionListComponent implements OnInit {

  public readonly Role = UserRole;
  
  frontendUrl = environment.frontendUrl;
  priceForm!: FormGroup;
  statusForm!: FormGroup;
  filterForm!: FormGroup;

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
  pages: number[] = [];
  pricedata: any;
  singleLeadData: any;
  isLeadModalOpen = false;

  // User and Admin Data
  UserRole = UserRole;
  profileUrl = 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?q=80&w=2070&auto=format&fit=crop';
  currencies = ['INR', 'USD', 'EUR', 'GBP', 'AUD'];
  showCurrencySelector = false;

  // Admin specific
  @ViewChild('filterModal') filterModal!: ElementRef;
  allUsers: any[] = [];
  filteredUsers: any[] = [];
  selectedUserId: number | null = null;
  selectedUserName: string = '';
  showFilterModal = false;
  userSearchTerm = '';

  // Status options
  statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'draft', label: 'Draft' },
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' }
  ];

  constructor(
    private SolutionserviceService: SolutionserviceService,
    private store: Store,
    private toasterService: ToasterService,
    private fb: FormBuilder,
    private userservice: UserserviceService,
    private authservice: AuthService,
    private masterService: MasterService,
  ) {
    this.productList$ = this.store.select(selectProducts);
  }

  currentUserRole: any;
  isAdmin = false;

  ngOnInit(): void {
    this.initializeForms();
    this.restoreFilters();
    this.getData();
    this.getfilter();
    
    const currentUser = this.authservice.getCurrentUser();
    this.currentUserRole = currentUser?.role_type;
    this.isAdmin = this.currentUserRole === UserRole.ADMIN;
    
    if (this.isAdmin) {
      this.loadAllUsers();
    }
  }

  private initializeForms(): void {
    this.priceForm = this.fb.group({
      currency: ['INR', Validators.required],
      pricing: this.fb.array([])
    });

    this.statusForm = this.fb.group({
      status: [''],
      remark: ['']
    });

    this.filterForm = this.fb.group({
      userFilter: [''],
      statusFilter: [''],
      categoryFilter: [''],
      cloudFilter: [''],
      dateFrom: [''],
      dateTo: ['']
    });
  }

  get pricing(): FormArray {
    return this.priceForm.get('pricing') as FormArray;
  }

  slugify(text: string): string {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  selectedActionFor: 'customer' | 'ISV' | 'both' | 'all' = 'all';
  filter: any;

  getData(page: number = this.currentPage): void {
    this.currentPage = page;
    this.saveFilters();
    const filterParams: any = {};
    if (this.isAdmin && this.selectedUserId) {
      filterParams.user_id = this.selectedUserId;
    }

    const solutionParams: any = {
      type: 'products',
      page: page,
      limit: this.limit,
      search: this.searchTerm,
      status: this.status,
      category: this.category,
      cloud_provider: this.cloud_provider,
      action_for: this.selectedActionFor === 'all' ? undefined : this.selectedActionFor,
      filter: filterParams
    };
    if (this.is_feature !== '') solutionParams.is_feature = this.is_feature === 'true';
    this.SolutionserviceService.getProductList(solutionParams).subscribe({
      next: (solutions: any) => {
        if (solutions.status === 'success') {
          this.productList = solutions.data.map((p: any) => ({ ...p, slug: this.slugify(p.name), owner_name: p.owner_name || 'N/A', itemType: 'solution' }));
          this.pagination = solutions.pagination;
          this.currentPage = solutions.pagination.page;
          this.totalPages = solutions.pagination.total_pages;
          this.visiblePages = solutions.pagination.pages;
        }
      },
      error: (err) => {
        console.error('HTTP error:', err);
        this.toasterService.setToaster('error', 'Error', 'Failed to load data');
      }
    });
  }

  goToPage(page: any): void {
    if (page !== this.currentPage) {
      this.getData(page);
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.getData(this.currentPage + 1);
    }
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.getData(this.currentPage - 1);
    }
  }

    onCopySuccess(newProductId: number) {
  console.log(`Copy succeeded, new ID: ${newProductId}`);
}

onCopyError(errorMsg: string) {
  alert(errorMsg);
}

  user: any;
  getfilter(): void {
   this.masterService.getAllCategories().subscribe({
      next: (res: any) => (this.cat = res.data.categories || [])
    });
    this.SolutionserviceService.getaws().subscribe({
      next: (res: any) => (this.aws = res.data)
    });
    this.SolutionserviceService.getazure().subscribe({
      next: (res: any) => (this.azure = res.data)
    });
    this.userservice.getusers().subscribe({
      next: (res: any) => (this.user = res.data)
    });
  }

  // Load all users for admin filter
  loadAllUsers(): void {
    this.userservice.getusers().subscribe({
      next: (res: any) => {
        if (res.status === 'success') {
          this.allUsers = res.data.map((user: any) => ({
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role_type,
            company: user.company_name || 'N/A'
          }));
          this.filteredUsers = [...this.allUsers];
        }
      },
      error: (err) => {
        console.error('Error loading users:', err);
      }
    });
  }

  // Open admin filter modal
  openFilterModal(): void {
    this.showFilterModal = true;
    setTimeout(() => {
      if (this.filterModal) {
        this.filterModal.nativeElement.focus();
      }
    }, 100);
  }

  // Close admin filter modal
  closeFilterModal(): void {
    this.showFilterModal = false;
    this.userSearchTerm = '';
    this.filteredUsers = [...this.allUsers];
  }

  // Filter users based on search term
  filterUsers(): void {
    if (!this.userSearchTerm.trim()) {
      this.filteredUsers = [...this.allUsers];
      return;
    }

    const searchTerm = this.userSearchTerm.toLowerCase();
    this.filteredUsers = this.allUsers.filter(user =>
      user.name.toLowerCase().includes(searchTerm) ||
      user.email.toLowerCase().includes(searchTerm) ||
      user.company.toLowerCase().includes(searchTerm) ||
      user.role.toLowerCase().includes(searchTerm)
    );
  }

  // Select user for filtering
  selectUser(user: any): void {
    this.selectedUserId = user.id;
    this.selectedUserName = user.name;
    this.closeFilterModal();
    this.applyUserFilter();
  }

  // Apply user filter and refresh data
  applyUserFilter(): void {
    this.getData(1); // Reset to page 1
  }

  // Clear user filter
  clearUserFilter(): void {
    this.selectedUserId = null;
    this.selectedUserName = '';
    this.getData(1);
  }

  // Apply status filter
  applyStatusFilter(): void {
    this.getData(1);
  }

  // Clear all filters
  clearAllFilters(): void {
    this.selectedUserId = null;
    this.selectedUserName = '';
    this.status = '';
    this.category = '';
    this.cloud_provider = '';
    this.is_feature = '';
    this.searchTerm = '';
    this.filterForm.reset();
    this.getData(1);
  }

  // Export data as CSV/Excel (Admin only)
  exportData(format: 'csv' | 'excel' = 'excel'): void {
    if (this.isAdmin) {
      const params: any = {};
      
      if (this.selectedUserId) {
        params.user_id = this.selectedUserId;
      }
      if (this.status) {
        params.status = this.status;
      }
      if (this.category) {
        params.category = this.category;
      }

      this.SolutionserviceService.exportData('products', format, params).subscribe({
        next: (blob: Blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `products_export_${new Date().toISOString().split('T')[0]}.${format === 'csv' ? 'csv' : 'xlsx'}`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          
          this.toasterService.setToaster('success', 'Export Successful', 'Data exported successfully');
        },
        error: (err) => {
          console.error('Export error:', err);
          this.toasterService.setToaster('error', 'Export Failed', 'Failed to export data');
        }
      });
    }
  }

  // Bulk actions for admin
  bulkAction(action: 'approve' | 'reject' | 'publish' | 'unpublish'): void {
    const selectedProducts = this.productList.filter(p => p.selected);
    
    if (selectedProducts.length === 0) {
      this.toasterService.setToaster('warning', 'No Selection', 'Please select at least one product');
      return;
    }

    const confirmMessage = `Are you sure you want to ${action} ${selectedProducts.length} product(s)?`;
    
    if (!confirm(confirmMessage)) return;

    selectedProducts.forEach(product => {
      switch (action) {
        case 'approve':
          this.approveProduct(product.id);
          break;
        case 'reject':
          this.rejectProduct(product.id);
          break;
        case 'publish':
          this.publishProduct(product.id, true);
          break;
        case 'unpublish':
          this.publishProduct(product.id, false);
          break;
      }
    });

    // Unselect all after action
    this.productList.forEach(p => p.selected = false);
  }

  private approveProduct(productId: number): void {
    this.SolutionserviceService.acceptItem(productId, 'product', true).subscribe({
      next: (res: any) => {
        if (res.status === 'success') {
          this.toasterService.setToaster('success', 'Approved', 'Product approved successfully');
          this.getData(this.currentPage);
        }
      }
    });
  }

  private rejectProduct(productId: number): void {
    this.SolutionserviceService.acceptItem(productId, 'product', false, 'Bulk rejection').subscribe({
      next: (res: any) => {
        if (res.status === 'success') {
          this.toasterService.setToaster('success', 'Rejected', 'Product rejected successfully');
          this.getData(this.currentPage);
        }
      }
    });
  }

  private publishProduct(productId: number, publish: boolean): void {
    this.SolutionserviceService.publishItem(productId, 'product', publish).subscribe({
      next: (res: any) => {
        if (res.status === 'success') {
          const action = publish ? 'published' : 'unpublished';
          this.toasterService.setToaster('success', 'Success', `Product ${action} successfully`);
          this.getData(this.currentPage);
        }
      }
    });
  }

  // Toggle select all
  toggleSelectAll(event: any): void {
    const checked = event.target.checked;
    this.productList.forEach(product => product.selected = checked);
  }

  // Check if any product is selected
  get hasSelectedProducts(): boolean {
    return this.productList.some(product => product.selected);
  }

  // Get count of selected products
  get selectedCount(): number {
    return this.productList.filter(product => product.selected).length;
  }

  toggleFeature(item: any): void {
    const newValue = !item.is_feature;
    this.SolutionserviceService.toggleFeatureStatus(item.id, { type: 'solution', is_feature: newValue }).subscribe({
      next: (res: any) => {
        if (res.status === 'success' || res.success) {
          item.is_feature = newValue;
          this.toasterService.setToaster('success', 'Updated', `Solution ${newValue ? 'marked as featured' : 'removed from featured'}`);
        } else {
          this.toasterService.setToaster('error', 'Error', res.message || 'Failed to update featured status');
        }
      },
      error: () => this.toasterService.setToaster('error', 'Error', 'Failed to update featured status')
    });
  }

  deleteProduct(productId: number): void {
    if (!confirm('Are you sure you want to delete this product?')) return;

    this.SolutionserviceService.deleteProduct(productId).subscribe({
      next: (res: any) => {
        if (res.status === 'success' || res.success) {
          this.toasterService.setToaster('success', 'Deleted', 'Product deleted successfully');
          this.getData();
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

  pushToZoho(item: any): void {
    if (!item?.id) {
      this.toasterService.setToaster('error', 'Error', 'Invalid solution ID');
      return;
    }

    const alreadyPushed = !!item.zoho_campaign_key;
    const promptMessage = alreadyPushed
      ? `"${item.name}" was already pushed to Zoho${item.zoho_campaign_pushed_at ? ' on ' + new Date(item.zoho_campaign_pushed_at).toLocaleDateString() : ''}. Push again and create a new draft?`
      : `Push "${item.name}" to Zoho as a draft?`;

    if (!confirm(promptMessage)) return;

    this.SolutionserviceService.pushToZoho(item.id, alreadyPushed).subscribe({
      next: (res: any) => {
        if (res.status === 'success') {
          const stillAlready = res.data?.alreadyPushed;
          this.toasterService.setToaster(
            'success',
            stillAlready ? 'Already pushed' : 'Pushed to Zoho',
            stillAlready ? 'No new draft created — try again if you meant to push again.' : 'Draft created in Zoho Campaigns.'
          );
          this.getData();
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

  downloadExcel() {
    const link = document.createElement('a');
    link.href = 'https://neozaar-my.sharepoint.com/:x:/p/admin/EYVdDsD1qO1AqNEGN-FFxxIBwoVVGZ442Y8eFArVqaQZfA?e=Emc1o1';
    link.download = 'neozaar_bulkupload_products.xlsx';
    link.click();
  }

  openLeadModal(product: any): void {
    this.isLeadModalOpen = true;
    this.singleLeadData = product;
    this.pricing.clear();

    this.SolutionserviceService.getProductById(this.singleLeadData.id).subscribe({
      next: (res: any) => {
        if (!res.data?.pricing_model) return;

        const pricingModels = JSON.parse(res.data.pricing_model);

        this.showCurrencySelector = pricingModels.some(
          (m: string) => this.mapModelType(m) !== 'free'
        );

        pricingModels.forEach((modelName: string) => {
          this.pricing.push(
            this.fb.group({
              action_id: [this.singleLeadData.id],
              action_type: ['product'],
              model_type: [this.mapModelType(modelName)],
              base_price: [
                this.mapModelType(modelName) === 'free' ? 0 : null,
                this.mapModelType(modelName) === 'free'
                  ? []
                  : [Validators.required]
              ]
            })
          );
        });
      },
      error: (err) => console.error('Pricing fetch error:', err)
    });

    this.statusForm.patchValue({
      status: product.status || '',
      remark: product.remark || ''
    });
  }

  mapModelType(label: string): string {
    switch (label.toLowerCase()) {
      case 'free demo':
        return 'free';
      case 'byol':
        return 'byol';
      case 'custom quota':
        return 'custom_quote';
      case 'pay-as-you-go':
        return 'pay_as_you_go';
      case 'subscription':
        return 'subscription';
      default:
        return label.toLowerCase();
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

    console.log('Sending payload to backend:', finalPayload);
  
  }

  blockInvalidInput(event: KeyboardEvent) {
    if (['e', 'E', '+', '-'].includes(event.key)) {
      event.preventDefault();
    }
  }

  // Track by function for performance
  trackByProductId(index: number, product: any): number {
    return product.id;
  }

  trackByUserId(index: number, user: any): number {
    return user.id;
  }

  private saveFilters(): void {
    const filters = {
      status: this.status,
      category: this.category,
      cloud_provider: this.cloud_provider,
      is_feature: this.is_feature,
      searchTerm: this.searchTerm,
      currentPage: this.currentPage,
      selectedActionFor: this.selectedActionFor,
      selectedUserId: this.selectedUserId,
      selectedUserName: this.selectedUserName,
    };
    sessionStorage.setItem('solutionListFilters', JSON.stringify(filters));
  }

  private restoreFilters(): void {
    const saved = sessionStorage.getItem('solutionListFilters');
    if (saved) {
      try {
        const filters = JSON.parse(saved);
        this.status = filters.status || '';
        this.category = filters.category || '';
        this.cloud_provider = filters.cloud_provider || '';
        this.is_feature = filters.is_feature || '';
        this.searchTerm = filters.searchTerm || '';
        this.currentPage = filters.currentPage || 1;
        this.selectedActionFor = filters.selectedActionFor || 'all';
        this.selectedUserId = filters.selectedUserId || null;
        this.selectedUserName = filters.selectedUserName || '';
      } catch (e) {
        sessionStorage.removeItem('solutionListFilters');
      }
    }
  }
}
