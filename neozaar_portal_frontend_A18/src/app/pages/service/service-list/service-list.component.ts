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
// import { ProductService } from '../../product/product-service.service';
import { ServiceService } from '../service.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToasterService } from '../../../shared/providers/toaster/toaster.service';
import { selectProducts } from '../../../shared/store/selector/product.selectors';
import { environment } from '../../../../environments/environment';
import { MasterService } from '../../master/master.service';
import { CopyproductComponent } from '../../../shared/components/copyproduct/copyproduct.component';
import { ListingZohoActionsComponent } from '../../../shared/components/listing-zoho-actions/listing-zoho-actions.component';
import { PublicLinkPanelComponent } from '../../../shared/components/public-link-panel/public-link-panel.component';


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
  selector: 'app-service-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, HasRoleDirective, ReactiveFormsModule,ExceluploadComponent, CopyproductComponent, ListingZohoActionsComponent, PublicLinkPanelComponent],
  templateUrl: './service-list.component.html',
  styleUrl: './service-list.component.css'
})
export class ServiceListComponent {

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
  is_feature = '';
  paymentmode: any;
  limit = 10;
  searchTerm = '';

  // Data  
  ServiceList: any[] = [];
 ServiceList$!: Observable<any>;
  cat: any;
  aws: any;
  azure: any;
  pages: number[] = [];
  pricedata: any;
  singleLeadData: any;
  isLeadModalOpen = false;

  public readonly Role = UserRole; 

  // This is the actual role of the logged-in user (usually from a service)
  // public currentUserRole: string = UserRole.ISV;
  
  profileUrl =
    'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?q=80&w=2070&auto=format&fit=crop';
  currencies = ['INR', 'USD', 'EUR', 'GBP', 'AUD'];
  showCurrencySelector = false; // ✅ to toggle currency dropdown visibility

  constructor(
    private ServiceService: ServiceService,
    private store: Store,
    private toasterService: ToasterService,
    private fb: FormBuilder,
    private userservce : UserserviceService ,
    private authservice :AuthService,
    private masterService : MasterService
  ) {
    this.ServiceList$ = this.store.select(selectProducts);
  }
currentUserRole:any;
  ngOnInit(): void {
    this.priceForm = this.fb.group({
      currency: ['INR', Validators.required], // ✅ currency is global now
      pricing: this.fb.array([])
    });

    this.statusForm = this.fb.group({
      status: [''],
      remark: ['']
    });

     const currentUser = this.authservice.getCurrentUser();
     this.currentUserRole = currentUser?.role_type;

    // ISV users only see published services
    if (this.currentUserRole === UserRole.ISV) {
      this.status = 'published';
    }

    this.restoreFilters();
    this.getData();
    this.getfilter();
  }

  get pricing(): FormArray {
    return this.priceForm.get('pricing') as FormArray;
  }

  slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')   // replace spaces & special chars
    .replace(/^-+|-+$/g, '');      // remove ending hyphens
}


filter:any;

getData(page: number = this.currentPage): void {
  this.currentPage = page;
  this.saveFilters();
  const serviceParams: any = {
    type: 'products',
    page,
    limit: this.limit,
    search: this.searchTerm,
    status: this.status,
    category: this.category,
    cloud_provider: this.cloud_provider,

    // ✅ FIX: convert "all" → undefined
    action_for:
      this.selectedActionFor === 'all'
        ? undefined
        : this.selectedActionFor,

    filter: {
      user_id: this.filter
    }
  };
  if (this.is_feature !== '') serviceParams.is_feature = this.is_feature === 'true';
  this.ServiceService.getServiceList(serviceParams).subscribe({
    next: (res: any) => {
      if (res.status === 'success') {
        this.ServiceList = res.data.map((p: any) => ({
          ...p,
          slug: this.slugify(p.name)
        }));

        this.pagination = res.pagination;
        this.currentPage = this.pagination.page;
        this.totalPages = this.pagination.total_pages;
        this.visiblePages = this.pagination.pages;
      }
    },
    error: (err) => console.error('HTTP error:', err)
  });
}



 
selectedActionFor: 'all' | 'customer' | 'ISV' | 'both' = 'all'


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
user:any;
  getfilter(): void {
  this.masterService.getAllCategories().subscribe({
      next: (res: any) => (this.cat = res.data.categories || [])
    });
    this.ServiceService.getaws().subscribe({
      next: (res: any) => (this.aws = res.data)
    });
    this.ServiceService.getazure().subscribe({
      next: (res: any) => (this.azure = res.data)
    });
    this.userservce.getusers().subscribe({
      next: (res: any) => (this.user = res.data)
    })

  }

  toggleFeature(item: any): void {
    const newValue = !item.is_feature;
    this.ServiceService.toggleFeatureStatus(item.id, { type: 'service', is_feature: newValue }).subscribe({
      next: (res: any) => {
        if (res.status === 'success' || res.success) {
          item.is_feature = newValue;
          this.toasterService.setToaster('success', 'Updated', `Service ${newValue ? 'marked as featured' : 'removed from featured'}`);
        } else {
          this.toasterService.setToaster('error', 'Error', res.message || 'Failed to update featured status');
        }
      },
      error: () => this.toasterService.setToaster('error', 'Error', 'Failed to update featured status')
    });
  }

  deleteService(productId: number): void {
    if (!confirm('Are you sure you want to delete this Service?')) return;

    this.ServiceService.deleteService(productId).subscribe({
      next: (res: any) => {
        if (res.status === 'success' || res.success) {
          this.toasterService.setToaster(
            'success',
            'Deleted',
            'Service deleted successfully'
          );
          this.getData();
        } else {
          this.toasterService.setToaster(
            'error',
            'Error',
            res.message || 'Failed to delete Service'
          );
        }
      },
      error: (err) => {
        console.error('Delete error:', err);
        this.toasterService.setToaster(
          'error',
          'Error',
          'Failed to delete Service. Please try again.'
        );
      }
    });
  }

  pushToZoho(item: any): void {
    if (!item?.id) {
      this.toasterService.setToaster('error', 'Error', 'Invalid service ID');
      return;
    }

    const alreadyPushed = !!item.zoho_campaign_key;
    const promptMessage = alreadyPushed
      ? `"${item.name}" was already pushed to Zoho${item.zoho_campaign_pushed_at ? ' on ' + new Date(item.zoho_campaign_pushed_at).toLocaleDateString() : ''}. Push again and create a new draft?`
      : `Push "${item.name}" to Zoho as a draft?`;

    if (!confirm(promptMessage)) return;

    this.ServiceService.pushToZoho(item.id, alreadyPushed).subscribe({
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

  openLeadModal(service: any): void {
    this.isLeadModalOpen = true;
    this.singleLeadData = service;
    this.pricing.clear();

    this.ServiceService.getServiceById(this.singleLeadData.id).subscribe({
      next: (res: any) => {
        if (!res.data?.pricing_model) return;

        const pricingModels = JSON.parse(res.data.pricing_model);

        // ✅ show currency dropdown only if there are non-free models
        this.showCurrencySelector = pricingModels.some(
          (m: string) => this.mapModelType(m) !== 'free'
        );

        pricingModels.forEach((modelName: string) => {
          this.pricing.push(
            this.fb.group({
              action_id: [this.singleLeadData.id],
              action_type: ['Service'],
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
      status: service.status || '',
      remark: service.remark || ''
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

  onCopySuccess(newProductId: number) {
  // e.g., show a toast: "Product copied! Redirecting..."
  console.log(`Copy succeeded, new ID: ${newProductId}`);
}

onCopyError(errorMsg: string) {
  // e.g., show an error snackbar
  alert(errorMsg);
}

submitPricing(): void {
  if (this.priceForm.invalid) {
    this.priceForm.markAllAsTouched();
    this.toasterService.setToaster('error', 'Invalid Form', 'Please fill all required fields');
    return;
  }

  const { currency, pricing } = this.priceForm.value;

  // 🧩 Prepare final payload
  const finalPayload = pricing.map((p: any) => ({
    action_id: p.action_id,
    action_type: p.action_type,
    model_type: p.model_type,
    base_price: p.model_type === 'free' ? 0 : Number(p.base_price) || 0,
    currency: currency, // global currency
    details: [{ billing_period: 'monthly' }],
  }));

  console.log('🟢 Sending payload to backend:', finalPayload);

  // 🚀 Send POST API request

}


blockInvalidInput(event: KeyboardEvent) {
  // Prevent entering e, E, +, - (these are invalid for price input)
  if (['e', 'E', '+', '-'].includes(event.key)) {
    event.preventDefault();
  }
}

  private saveFilters(): void {
    const filters = {
      status: this.status,
      category: this.category,
      cloud_provider: this.cloud_provider,
      is_feature: this.is_feature,
      filter: this.filter,
      searchTerm: this.searchTerm,
      currentPage: this.currentPage,
      selectedActionFor: this.selectedActionFor,
    };
    sessionStorage.setItem('serviceListFilters', JSON.stringify(filters));
  }

  private restoreFilters(): void {
    const saved = sessionStorage.getItem('serviceListFilters');
    if (saved) {
      try {
        const filters = JSON.parse(saved);
        this.status = filters.status || '';
        this.category = filters.category || '';
        this.cloud_provider = filters.cloud_provider || '';
        this.is_feature = filters.is_feature || '';
        this.filter = filters.filter || '';
        this.searchTerm = filters.searchTerm || '';
        this.currentPage = filters.currentPage || 1;
        this.selectedActionFor = filters.selectedActionFor || 'all';
      } catch (e) {
        sessionStorage.removeItem('serviceListFilters');
      }
    }
  }





}
