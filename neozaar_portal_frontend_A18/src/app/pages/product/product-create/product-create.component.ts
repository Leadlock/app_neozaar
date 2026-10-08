import { Component, ElementRef, OnInit, AfterViewInit, ViewChild, HostListener, QueryList, ViewChildren, Input, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, Validators, FormArray, FormControl, FormGroup, FormsModule, ReactiveFormsModule, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { SeoServiveService } from '../../seo/seo-servive.service';
import { AngularEditorModule } from '@kolkov/angular-editor';
import { HelperServiceService } from '../../../utils/helper-service.service';
import { ActivatedRoute, Router } from '@angular/router';
import { SelectableProductListModalComponent } from '../../../shared/components/products/selectable-product-list-modal/selectable-product-list-modal.component';
import { ToasterService } from '../../../shared/providers/toaster/toaster.service';
import { finalize, catchError } from 'rxjs';
import { ProductService } from '../product-service.service';
import { AuthService } from '../../../core/services/auth.service';
import { debounceTime, distinctUntilChanged, switchMap, filter } from 'rxjs/operators';
import { of, throwError } from 'rxjs';
import { FileUploadComponent } from '../only-product/file-upload.component';
import { ImageUploadComponent } from '../only-product/image-upload/image-upload.component';
import { CleditorComponent } from '../../../shared/components/cleditor/cleditor.component';
import { UserRole } from '../../../core/modal/user.modal';
import { MasterService } from '../../master/master.service';
import { CategorySubcategoryComponent } from '../../../shared/components/category-subcategory/category-subcategory.component';
import { TagsInputComponent } from '../../../shared/components/tags-input/tags-input.component';


type CategoryKeys =
  | 'platformCategory'
  | 'selling'
  | 'targetAudience'
  | 'targetSegment'
  | 'industry'
  | 'cloudProvider'
  | 'ctaModel'
  | 'complianceCertification';

interface Category {
  id: number;
  name: string;
  created_at: string | null;
  updated_at: string | null;
}

@Component({
  selector: 'app-product-create',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SelectableProductListModalComponent,
    FileUploadComponent,
    ImageUploadComponent,
    AngularEditorModule,
    CleditorComponent,
    CategorySubcategoryComponent,
    TagsInputComponent,
  ],
  templateUrl: './product-create.component.html',
  styleUrl: './product-create.component.css'
})
export class ProductCreateComponent implements OnInit, AfterViewInit {
  @ViewChildren('searchContainer') searchContainers!: QueryList<ElementRef>;
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @Input() imageFormArray!: FormArray;

  cat: Category[] = [];
  showDropdown = false;
  filteredBrands: any[] = [];
  existingProductData: any;
  currentStep = 0;
  productForm!: FormGroup;
  isproductSelectModalOpen = false;
  productSelectData: any[] = [];

  imageFile: File | null = null;
  customCouponImageUrl: string | null = null;
  profileUrl = 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D';
  errorMessage = '';
  supportOptions: any[] = [];
  showBundleSection = false;
  isreqSending = false;
  productId = 0;
  updateButton = false;
  uploadedFiles: File[] = [];
  consentPolicy = false;
  acceptTerms = false;
  selectedFile: File | null = null;
  ProductModalOpen: any;
  imagePreviews: string[] = [];
  maxImages = 5;
  UserRole = UserRole;
  public readonly Role = UserRole;
  currentUserRole: any;
  isLoading: boolean = false;
  showCloudInput = false;
  newCloud = '';
  // Free-form searchable tags for this product/service/solution.
  tags: string[] = [];
  savingTags = false;
    availableTargetAudiences: any[] = [];   
  availableindustrys: any[] = [];
  availableTargetSegments: any[] = [];

  showInput: Record<CategoryKeys, boolean> = {
    platformCategory: false,
    selling: false,
    targetAudience: false,
    targetSegment: false,
    industry: false,
    cloudProvider: false,
    ctaModel: false,
    complianceCertification: false
  };

  Newcategories: Record<CategoryKeys, string[]> = {
    platformCategory: ['Cloud Infra', 'Data & AI', 'Security', 'DevOps', 'FinOps', 'Digital Workplace'],
    selling: ['B2B', 'B2C'],
    targetAudience: ['Cloud architects', 'security operations teams', 'IT administrators', 'Compliance Officers', 'Remote Workforce Leaders', 'Security Teams'],
    targetSegment: ['SMB', 'Mid-market', 'Enterprise', 'Government', 'Retail', 'Healthcare', 'ITIES', 'BFSI', 'Logistics'],
    industry: ['SMB', 'Mid-market', 'Enterprise', 'Government', 'Retail', 'Healthcare', 'ITIES', 'BFSI', 'Logistics'],
    cloudProvider: ['AWS', 'Azure', 'GCP', 'SaaS', 'On-Premise'],
    ctaModel: ['Request for Demo', 'Proof of Concept', 'Free Trial','Check Funding Eligibility','Request Scoping','Request Assessment'],
    complianceCertification: ['ISO 27001', 'SOC2', 'HIPAA', 'GDPR', 'Other'],
  };

  categories = ['saas', 'Cloud1', 'Bank1', 'Health Care1', 'Startup', 'Cloud', 'Bank', 'Health Care'];
  platFormTypeArray = ['SAAS', 'PASS', 'None'];
  externalSupport = ['Yes', 'No'];
  coSellingArray = ['Neozaar', 'AWS', 'Azure', 'GCP', 'MS 365', 'Other'];

  selectedFields = [
    {
      slug: 'color',
      options: ['India', 'MEA', 'APAC', 'North America', 'Europe', 'Global']
    },
  ];

  searchControls: { [key: string]: FormControl } = {};
  filteredOptions: { [key: string]: string[] } = {};

  // Form arrays
  broucherUpload: FormArray;
  customerCasestudyUpload: FormArray;
  serviceLevelDocument: FormArray;
  attachments: FormArray;

  // Sub forms
  technicalInfoForm: FormGroup;
  pricingInfoForm: FormGroup;
  supportInfoForm: FormGroup;
  mediaInfoForm: FormGroup;
  complienceInfoForm: FormGroup;

  steps = [
    { key: 'productInfo', label: 'Product Information' },
    { key: 'pricing', label: 'Pricing & Media' },
  ];

  constructor(
    private helperService: HelperServiceService,
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private toasterService: ToasterService,
    private productService: ProductService,
    private auth: AuthService,
    private serviceseo: SeoServiveService,
    private changeDetectorRef: ChangeDetectorRef,
    private masterService: MasterService
  ) {
    console.log('🟢 ProductCreateComponent constructor called');
    
    // Initialize form arrays
    this.broucherUpload = this.fb.array([]);
    this.customerCasestudyUpload = this.fb.array([]);
    this.serviceLevelDocument = this.fb.array([]);
    this.attachments = this.fb.array([]);

    // Initialize sub-forms
    this.technicalInfoForm = this.fb.group({});
    this.pricingInfoForm = this.fb.group({});
    this.supportInfoForm = this.fb.group({});
    this.mediaInfoForm = this.fb.group({});
    this.complienceInfoForm = this.fb.group({});

    if (this.route.snapshot.paramMap.get('type') === 'bundle') {
      this.showBundleSection = true;
    }
  }

  ngOnInit() {
    console.log('🟢 ngOnInit started');
       this.getalltargetaudience();
    this.getallindustrys();
    this.getalltargetsegment();
    try {
      this.initializeForm();
      console.log('✅ Form initialized successfully');
      
      this.getCategories();
      this.loadmyvendor();
      this.setupBrandSearch();

      const currentUser = this.auth.getCurrentUser();
      this.currentUserRole = currentUser?.role_type;
      console.log('Current user role:', this.currentUserRole);

      if (this.router.url.includes('/edit')) {
        console.log('📝 Edit mode detected');
        this.updateButton = true;
        this.loadProduct();
        
        if (this.imageFormArray && this.imageFormArray.controls) {
          this.imageFormArray.controls.forEach(ctrl => {
            const val = ctrl.value;
            if (typeof val === 'string') {
              this.imagePreviews.push(val);
            }
            if (val instanceof File) {
              const url = URL.createObjectURL(val);
              this.imagePreviews.push(url);
            }
          });
        }
      }
    } catch (error) {
      console.error('🔴 Error in ngOnInit:', error);
      this.toasterService.setToaster('error', 'Initialization Error', 'Failed to initialize form');
    }
  }

  ngAfterViewInit() {
    console.log('🟢 ngAfterViewInit called');
    setTimeout(() => this.moveUnderline(this.currentStep));
    window.addEventListener('resize', () => this.moveUnderline(this.currentStep));
  }

  @HostListener('document:click', ['$event'])
  handleClickOutside(event: MouseEvent) {
    if (!this.searchContainers || !this.searchContainers.length) return;

    const containers = this.searchContainers.toArray();
    this.selectedFields.forEach((field, index) => {
      const container = containers[index];
      if (container && !container.nativeElement.contains(event.target)) {
        if (this.searchControls[field.slug]) {
          this.searchControls[field.slug].setValue('');
          this.filteredOptions[field.slug] = [];
        }
      }
    });
  }

  // ========== FORM INITIALIZATION ==========
  private initializeForm(): void {
    try {
      this.productForm = this.fb.group({
        productInfo: this.fb.group({
          user_id: [this.auth.userId],
          action_id: [this.route.snapshot.paramMap.get('type') === 'product' ? 1 : 2],
          action_type: [this.route.snapshot.paramMap.get('type')],
          name: ['', [Validators.required]],
          brand_name: ['', [Validators.required]],
          meteringEndPoint: ['', this.optionalUrlValidator()],
          description: ['', [Validators.required, Validators.maxLength(500)]],
          primary_use_cases: ['', [Validators.required, Validators.minLength(3)]],
          longdescription: ['', [Validators.required, Validators.minLength(200)]],
          keyFeatures: this.fb.array([this.fb.control('', Validators.required)]),
          image_url: [''],
          starting_price: ['', [Validators.required, Validators.min(1)]],
          // action_for: ['', [Validators.required]],
          screenshots: this.fb.array([]),
          customerCasestudyUpload: this.customerCasestudyUpload,
          broucherUpload: this.broucherUpload,
          serviceLevelDocument: this.serviceLevelDocument,
          oem_sku: [''],
          technicalPrerequsite: ['', [Validators.required, Validators.minLength(3)]],
          pricingModel: ['', Validators.required],
          demovideoLink: ['', this.optionalUrlValidator()],
          terms_of_use_url: ['', this.optionalUrlValidator()],
          privacy_policy_url: ['', this.optionalUrlValidator()],
          acceptTerms: [false],
          is_feature: [false],
          consentPolicy: [false]
        }),
        taxonomy_data: this.fb.group({}),
        productSelectData: this.fb.array([]),
        differentiation: [''],
        WhatsIncluded: [''],
        categoryType: [''],
        coSelling: this.fb.array([]),
        selling: this.fb.array([]),
        attachments: this.attachments,
        targetAudience: this.fb.array([], minSelectedCheckboxes(1)),
        industry: this.fb.array([], minSelectedCheckboxes(1)),
        targetSegment: this.fb.array([], minSelectedCheckboxes(1)),
        ctaModel: this.fb.array([], minSelectedCheckboxes(1)),
        // platformCategory: this.fb.array([], minSelectedCheckboxes(1)),
        cloudProvider: this.fb.array([], minSelectedCheckboxes(1)),
        complianceCertification: this.fb.array([]),
      });

      this.addToSelections('Neozaar');
      this.initializeTaxonomyData();
    } catch (error) {
      console.error('🔴 Error in initializeForm:', error);
      throw error;
    }
  }

  private initializeTaxonomyData(): void {
    try {
      const taxonomyGroup = this.productForm.get('taxonomy_data') as FormGroup;
      this.selectedFields.forEach(field => {
        taxonomyGroup.addControl(
          field.slug,
          this.fb.control([], [Validators.required])
        );
        this.initBackendSearch(field.slug, field.options);
      });
    } catch (error) {
      console.error('🔴 Error in initializeTaxonomyData:', error);
    }
  }

  // ========== FORM GETTERS ==========
  get productInfoForm(): FormGroup {
    return this.productForm.get('productInfo') as FormGroup;
  }

  get keyFeatures(): FormArray {
    return this.productInfoForm.get('keyFeatures') as FormArray;
  }

  get pricingModel(): FormControl {
    return this.productInfoForm.get('pricingModel') as FormControl;
  }

  get targetAudienceArray(): FormArray {
    return this.productForm.get('targetAudience') as FormArray;
  }

  get industryArray(): FormArray {
    return this.productForm.get('industry') as FormArray;
  }
  get targetSegmentArray(): FormArray {
    return this.productForm.get('targetSegment') as FormArray;
  }

  get ctaModelArray(): FormArray {
    return this.productForm.get('ctaModel') as FormArray;
  }

  get platformCategoryArray(): FormArray {
    return this.productForm.get('platformCategory') as FormArray;
  }

  get cloudProviderArray(): FormArray {
    return this.productForm.get('cloudProvider') as FormArray;
  }

  get complianceCertificationArray(): FormArray {
    return this.productForm.get('complianceCertification') as FormArray;
  }

  get coSelling(): FormArray {
    return this.productForm.get('coSelling') as FormArray;
  }

  get screenshots(): FormArray {
    return this.productInfoForm.get('screenshots') as FormArray;
  }

  get activeStep() {
    return this.steps[this.currentStep];
  }

  // ========== BRAND SEARCH SETUP ==========
  private setupBrandSearch(): void {
    try {
      const brandControl = this.productForm.get('productInfo.brand_name');
      if (brandControl) {
        brandControl.valueChanges.pipe(
          debounceTime(300),
          distinctUntilChanged(),
          switchMap(value => {
            if (typeof value !== 'string' || !value.trim()) return of(null);
            this.isLoading = true;
            console.log('🔍 Searching brands for:', value);
            return this.productService.getmyvendor(value).pipe(
              catchError(error => {
                console.error('🔴 Error in brand search:', error);
                return of(null);
              })
            );
          })
        ).subscribe({
          next: (res: any) => {
            this.isLoading = false;
            console.log('📦 Brand search response:', res);
            
            try {
              if (res && res.data && res.data.brands && Array.isArray(res.data.brands)) {
                this.filteredBrands = res.data.brands.slice(0, 10);
              } else if (res && Array.isArray(res)) {
                this.filteredBrands = res.slice(0, 10);
              } else {
                this.filteredBrands = [];
              }
              this.showDropdown = this.filteredBrands.length > 0;
              console.log(`✅ Found ${this.filteredBrands.length} brands`);
            } catch (error) {
              console.error('🔴 Error processing brand response:', error);
              this.filteredBrands = [];
              this.showDropdown = false;
            }
          },
          error: (err) => {
            console.error('🔴 Error loading brands:', err);
            this.isLoading = false;
            this.filteredBrands = [];
            this.showDropdown = false;
          }
        });
      }
    } catch (error) {
      console.error('🔴 Error in setupBrandSearch:', error);
    }
  }

  // ========== PRODUCT LOADING ==========
// Replace loadProduct method
loadProduct() {
  try {
    this.productId = Number(this.route.snapshot.paramMap.get('id'));
    console.log(`📝 Loading product with ID: ${this.productId}`);
    
    this.productService.getProductById(this.productId).subscribe({
      next: (res: any) => {
        console.log('✅ Product loaded successfully:', res);
        
        try {
          const product = res.data;
          this.existingProductData = product;

          // Set category data for child component
          this.categoryData = {
            category: this.convertToArray(product.category),
            category_subcategory: this.convertToArray(product.category_subcategory)
          };

          if (product.product_logo) {
            this.customCouponImageUrl = product.product_logo;
          }

          // Clear all existing form arrays to avoid duplication
          this.clearAllFormArrays();

          // FIRST: Update available options (targetAudience, targetSegment, etc.) from product data
          this.updateAvailableOptionsFromProduct(product);

          // SECOND: Populate selected values into FormArrays
          this.patchFormData(product);

          // Force change detection to reflect UI
          this.changeDetectorRef.detectChanges();
        } catch (error) {
          console.error('🔴 Error processing product data:', error);
          this.toasterService.setToaster('error', 'Error', 'Failed to process product data');
        }
      },
      error: (err) => {
        console.error('🔴 Error loading product:', err);
        this.toasterService.setToaster('error', 'Error', 'Failed to load product');
        this.router.navigate(['/dashboard']);
      }
    });
  } catch (error) {
    console.error('🔴 Error in loadProduct:', error);
    this.toasterService.setToaster('error', 'Error', 'Failed to load product');
  }
}

// New method: update available options (e.g., targetAudience, targetSegment) from product data
private updateAvailableOptionsFromProduct(product: any): void {
  try {
    // For target audience: add any audience from product that is not already in availableTargetAudiences
    const productAudiences = product.target_audience;
    if (Array.isArray(productAudiences)) {
      productAudiences.forEach((audience: string) => {
        if (!this.availableTargetAudiences.includes(audience)) {
          this.availableTargetAudiences.push(audience);
          console.log(`➕ Added custom target audience: ${audience}`);
        }
      });
    }

    // For target segment: add any segment from product not in availableTargetSegments
    const productSegments = product.target_segments;
    if (Array.isArray(productSegments)) {
      productSegments.forEach((segment: string) => {
        if (!this.availableTargetSegments.includes(segment)) {
          this.availableTargetSegments.push(segment);
          console.log(`➕ Added custom target segment: ${segment}`);
        }
      });
    }

    // Also handle cloudProvider, ctaModel, complianceCertification etc. if needed
    // For cloudProvider
    const productCloudProviders = product.cloud_provider_support;
    if (Array.isArray(productCloudProviders)) {
      productCloudProviders.forEach((cp: string) => {
        if (!this.Newcategories.cloudProvider.includes(cp)) {
          this.Newcategories.cloudProvider.push(cp);
          console.log(`➕ Added custom cloud provider: ${cp}`);
        }
      });
    }

    // For ctaModel
    const productCtaModels = product.cta_model;
    if (Array.isArray(productCtaModels)) {
      productCtaModels.forEach((cta: string) => {
        if (!this.Newcategories.ctaModel.includes(cta)) {
          this.Newcategories.ctaModel.push(cta);
          console.log(`➕ Added custom CTA model: ${cta}`);
        }
      });
    }

    // For compliance certifications
    const productCompliance = product.compliance_certifications;
    if (Array.isArray(productCompliance)) {
      productCompliance.forEach((cert: string) => {
        if (!this.Newcategories.complianceCertification.includes(cert)) {
          this.Newcategories.complianceCertification.push(cert);
          console.log(`➕ Added custom compliance certification: ${cert}`);
        }
      });
    }

    // For platform category (if used)
    const productCategories = product.category_subcategory;
    if (Array.isArray(productCategories)) {
      productCategories.forEach((cat: string) => {
        if (!this.Newcategories.platformCategory.includes(cat)) {
          this.Newcategories.platformCategory.push(cat);
          console.log(`➕ Added custom platform category: ${cat}`);
        }
      });
    }
  } catch (error) {
    console.error('Error updating available options from product:', error);
  }
}

  getCategories() {
    console.log('🟢 Fetching categories...');
    this.isLoading = true;
    this.masterService.getAllCategories().subscribe({
      next: (res: any) => {
        console.log('✅ Categories loaded:', res);
        this.cat = res?.data?.categories || [];
        this.isLoading = false;
      },
      error: (err) => {
        console.error('🔴 Error fetching categories:', err);
        this.isLoading = false;
        this.toasterService.setToaster('error', 'Error', 'Failed to load categories');
      }
    });
  }
  getalltargetaudience() {
  this.isLoading = true;
  this.masterService.getalltargetaudience().subscribe({
    next: (res: any) => {
      if (res?.data?.audiences && Array.isArray(res.data.audiences)) {
        // Extract 'name' from each object and store as string[]
        this.availableTargetAudiences = res.data.audiences.map((item: any) => item.name);
        console.log('✅ Loaded coverage options:', this.availableTargetAudiences);
      } else if (res?.data && Array.isArray(res.data)) {
        // Fallback if the array is directly under data
        this.availableTargetAudiences = res.data.map((item: any) => item.name);
      } else {
        this.availableTargetAudiences = [];
      }
    },
    error: (err) => {
      console.error('🔴 Error loading coverage options:', err);
      this.toasterService.setToaster('error', 'Error', 'Failed to load coverage options');
    },
    complete: () => {
      this.isLoading = false;
    }
  });
}

getallindustrys() {
  this.isLoading = true;
  this.masterService.getallindustry().subscribe({
    next: (res: any) => {
      if (res?.data?.industry && Array.isArray(res.data.industry)) {
        // Extract 'name' from each object and store as string[]
        this.availableindustrys = res.data.industry.map((item: any) => item.name);
        console.log('✅ Loaded coverage options:', this.availableindustrys);
      } else if (res?.data && Array.isArray(res.data)) {
        // Fallback if the array is directly under data
        this.availableindustrys = res.data.map((item: any) => item.name);
      } else {
        this.availableindustrys = [];
      }
    },
    error: (err) => {
      console.error('🔴 Error loading coverage options:', err);
      this.toasterService.setToaster('error', 'Error', 'Failed to load coverage options');
    },
    complete: () => {
      this.isLoading = false;
    }
  });
}
getalltargetsegment() {
  this.isLoading = true;
  this.masterService.getalltargetsegment().subscribe({
    next: (res: any) => {
      // FIX: Changed targetSegment to targetSegments
      if (res?.data?.targetSegments && Array.isArray(res.data.targetSegments)) {
        this.availableTargetSegments = res.data.targetSegments.map((item: any) => item.name);
        console.log('✅ Loaded coverage options:', this.availableTargetSegments);
      } else if (res?.data && Array.isArray(res.data)) {
        this.availableTargetSegments = res.data.map((item: any) => item.name);
      } else {
        this.availableTargetSegments = [];
      }
    },
    error: (err) => {
      console.error('🔴 Error loading coverage options:', err);
      this.toasterService.setToaster('error', 'Error', 'Failed to load coverage options');
    },
    complete: () => {
      this.isLoading = false;
    }
  });
}
  loadmyvendor(search: string = '') {
    console.log(`🔍 Loading vendors with search: "${search}"`);
    this.isLoading = true;
    this.productService.getmyvendor(search).subscribe({
      next: (res: any) => {
        console.log('✅ Vendors loaded:', res);
        this.isLoading = false;
        
        try {
          if (Array.isArray(res)) {
            this.filteredBrands = search ? res : res.slice(0, 10);
          } else {
            this.filteredBrands = [];
          }
        } catch (error) {
          console.error('🔴 Error processing vendors:', error);
          this.filteredBrands = [];
        }
      },
      error: (err) => {
        console.error('🔴 Error loading vendors:', err);
        this.isLoading = false;
        this.filteredBrands = [];
      }
    });
  }

  // ========== CATEGORY MANAGEMENT ==========
  private apiToUiCategoryMap: Record<string, CategoryKeys> = {
    // category_subcategory: 'platformCategory',
   

    target_audience: 'targetAudience',
    target_segment: 'targetSegment',
    industry: 'industry',
    cloud_provider_support: 'cloudProvider',
  };

  private syncBackendToCategoriesAndForm(product: any): void {
    try {
      console.log('🔄 Syncing backend data to categories and form');
      
      Object.keys(this.apiToUiCategoryMap).forEach(apiKey => {
        const formKey = this.apiToUiCategoryMap[apiKey];
        const raw = product[apiKey];
        if (!raw) return;

        const values: string[] = Array.isArray(raw) ? raw : [raw];

        values.forEach(v => {
          const value = v.toString().trim();
          if (!value) return;

          if (!this.Newcategories[formKey].includes(value)) {
            this.Newcategories[formKey].push(value);
            console.log(`✅ Added new category value: ${formKey} -> ${value}`);
          }

          const fa = this.productForm.get(formKey) as FormArray;
          if (fa && !fa.value.includes(value)) {
            this.toggleArrayItem(formKey, value);
          }
        });
      });
    } catch (error) {
      console.error('🔴 Error in syncBackendToCategoriesAndForm:', error);
    }
  }

  toggleArrayItem(field: CategoryKeys, item: string): void {
    try {
      const fa = this.productForm.get(field) as FormArray;
      if (!fa) return;
      
      const index = fa.value.indexOf(item);
      if (index > -1) {
        fa.removeAt(index);
        console.log(`❌ Removed from ${field}: ${item}`);
      } else {
        fa.push(new FormControl(item));
        console.log(`✅ Added to ${field}: ${item}`);
      }
    } catch (error) {
      console.error(`🔴 Error toggling array item for ${field}:`, error);
    }
  }

  isChecked(field: CategoryKeys, item: string): boolean {
    try {
      const fa = this.productForm.get(field) as FormArray;
      return fa ? fa.value.includes(item) : false;
    } catch (error) {
      console.error(`🔴 Error checking if checked for ${field}:`, error);
      return false;
    }
  }

  // ========== CUSTOM VALUE INPUT ==========
  addCustomValue(field: CategoryKeys): void {
    try {
      if (!this.newCloud.trim()) return;
      const value = this.newCloud.trim();
      console.log(`➕ Adding custom value to ${field}: ${value}`);

      this.toggleArrayItem(field, value);

      if (!this.Newcategories[field].includes(value)) {
        this.Newcategories[field].push(value);
      }

      this.newCloud = '';
      this.showInput[field] = false;
    } catch (error) {
      console.error('🔴 Error adding custom value:', error);
    }
  }

  cancelInput(field: CategoryKeys): void {
    this.newCloud = '';
    this.showInput[field] = false;
  }

  onKeyDown(event: KeyboardEvent): void {
    const key = event.key;
    const controlKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'];
    if (controlKeys.includes(key)) return;

    if (this.newCloud.length >= 50) {
      event.preventDefault();
      return;
    }

    const allowedPattern = /^[a-zA-Z &-]$/;
    if (!allowedPattern.test(key)) {
      event.preventDefault();
    }
  }

  onTextInput(value: string): void {
    this.newCloud = value
      .replace(/[^a-zA-Z &-]/g, '')
      .slice(0, 50);
  }

  // ========== FORM ARRAY UTILITIES ==========
  private clearAllFormArrays(): void {
    try {
      console.log('🔄 Clearing all form arrays');
      
      const arraysToClear = [
        this.screenshots,
        this.keyFeatures,
        this.targetAudienceArray,
        this.industryArray,
        this.targetSegmentArray,
        this.ctaModelArray,
        this.platformCategoryArray,
        this.cloudProviderArray,
        this.complianceCertificationArray,
        this.broucherUpload,
        this.customerCasestudyUpload,
        this.serviceLevelDocument,
        this.attachments,
        this.coSelling
      ];

      arraysToClear.forEach((array) => {
        if (array && array instanceof FormArray) {
          while (array.length) {
            array.removeAt(0);
          }
        }
      });
      
      console.log('✅ All form arrays cleared');
    } catch (error) {
      console.error('🔴 Error clearing form arrays:', error);
    }
  }

  private convertToArray(input: any): string[] {
    try {
      if (!input) return [];
      if (Array.isArray(input)) return input;
      if (typeof input === 'string') {
        const trimmed = input.trim();
        if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
          const inner = trimmed.slice(1, -1);
          return inner.split(',').map(x => x.trim()).filter(x => x.length > 0);
        }
        if (trimmed.startsWith('[')) {
          try {
            const parsed = JSON.parse(trimmed);
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        }
      }
      return [];
    } catch (error) {
      console.error('🔴 Error converting to array:', error);
      return [];
    }
  }

  private patchArraySafely(formArray: FormArray, data: any[] | string | any): void {
    try {
      if (!formArray || !(formArray instanceof FormArray)) {
        console.warn('Cannot patch - not a FormArray');
        return;
      }

      while (formArray.length) {
        formArray.removeAt(0);
      }

      if (!data) return;

      let dataArray: any[] = [];
      if (Array.isArray(data)) {
        dataArray = data;
      } else if (typeof data === 'string') {
        try {
          dataArray = JSON.parse(data);
          if (!Array.isArray(dataArray)) dataArray = [data];
        } catch {
          dataArray = [data];
        }
      } else {
        dataArray = [data];
      }

      const validItems = dataArray.filter(item => item != null && item !== '');
      validItems.forEach(item => {
        formArray.push(new FormControl(item));
      });
      
      console.log(`✅ Patched ${validItems.length} items to FormArray`);
    } catch (error) {
      console.error('🔴 Error patching array:', error);
    }
  }

  private patchScreenshots(screenshots: any[] | string[]): void {
    try {
      console.log('🔄 Patching screenshots:', screenshots);
      
      while (this.screenshots.length) {
        this.screenshots.removeAt(0);
      }

      if (!screenshots || !Array.isArray(screenshots) || screenshots.length === 0) {
        this.imagePreviews = [];
        this.changeDetectorRef.detectChanges();
        return;
      }

      const validScreenshots = screenshots.filter(screenshot => {
        if (typeof screenshot === 'string') {
          return screenshot && screenshot.trim().length > 0;
        } else if (screenshot && typeof screenshot === 'object' && screenshot.url) {
          return screenshot.url && typeof screenshot.url === 'string' && screenshot.url.trim().length > 0;
        }
        return false;
      });

      validScreenshots.forEach((screenshot) => {
        const url = typeof screenshot === 'string' ? screenshot.trim() : screenshot.url.trim();
        this.screenshots.push(new FormControl(url));
      });

      this.buildImagePreviews();
      console.log(`✅ Patched ${validScreenshots.length} screenshots`);
    } catch (error) {
      console.error('🔴 Error in patchScreenshots:', error);
    }
  }

  private buildImagePreviews(): void {
    try {
      this.imagePreviews = [];
      if (!this.screenshots || this.screenshots.length === 0) return;

      this.imagePreviews = this.screenshots.controls
        .map(control => control.value && typeof control.value === 'string' ? control.value.trim() : null)
        .filter(url => url !== null);
      
      this.changeDetectorRef.detectChanges();
      console.log(`✅ Built ${this.imagePreviews.length} image previews`);
    } catch (error) {
      console.error('🔴 Error in buildImagePreviews:', error);
    }
  }

  private patchFormData(product: any): void {
    try {
      console.log('🔄 Patching form data:', product);
      
      this.productInfoForm.patchValue({
        name: product.name || '',
        brand_name: product.brand_name || '',
        primary_use_cases: product.primary_use_cases || '',
        description: product.short_description || '',
        longdescription: product.long_description || '',
        oem_sku: product.oem_sku || '',
        meteringEndPoint: product.api_metering_endpoint || '',
        technicalPrerequsite: product.technical_prerequisites || '',
        demovideoLink: product.demo_video_link || '',
        terms_of_use_url: product.terms_of_use_url || '',
        privacy_policy_url: product.privacy_policy_url || '',
        pricingModel: this.cleanString(product.pricing_model),
        acceptTerms: product.accept_marketplace_terms || false,
        consentPolicy: product.consent_data_privacy_policy || false,
        starting_price: product.starting_price || '',
        is_feature: product.is_feature || false,
      });

      const featuresArray = this.convertToArray(product.key_features);
      this.patchArraySafely(this.keyFeatures, featuresArray);
      this.patchArraySafely(this.targetAudienceArray, product.target_audience);
      this.patchArraySafely(this.industryArray, product.industry);
      this.patchArraySafely(this.targetSegmentArray, product.target_segments);
      this.patchArraySafely(this.ctaModelArray, product.cta_model);
      this.patchArraySafely(this.platformCategoryArray, product.category_subcategory);
      this.patchArraySafely(this.platformCategoryArray, product.subcategory);
      this.patchArraySafely(this.cloudProviderArray, product.cloud_provider_support);
      this.patchArraySafely(this.complianceCertificationArray, product.compliance_certifications);
      this.patchScreenshots(product.screenshots);
      this.patchArraySafely(this.broucherUpload, product.brochures);
      this.patchArraySafely(this.customerCasestudyUpload, product.customer_case_studies);
      this.patchArraySafely(this.serviceLevelDocument, product.sla_documents);
      this.patchArraySafely(this.attachments, product.files || []);

      const taxonomyGroup = this.productForm.get('taxonomy_data') as FormGroup;
      if (taxonomyGroup?.get('color')) {
        taxonomyGroup.get('color')?.setValue(product.regions_supported || []);
      }

      this.productForm.patchValue({
        differentiation: product.differentiation || '',
        WhatsIncluded: product.whats_included || '',
      });

      // Existing tags (products.tags comes back as a string[]).
      this.tags = Array.isArray(product.tags) ? [...product.tags] : [];

      if (product.co_selling_partners) {
        this.patchArraySafely(this.coSelling, product.co_selling_partners);
      }
      
      console.log('✅ Form data patched successfully');
    } catch (error) {
      console.error('🔴 Error patching form:', error);
    }
  }

  cleanString(value: string): string {
    if (!value) return '';
    return value.replace(/^"|"$/g, '');
  }

  // ========== VALIDATORS ==========
  optionalUrlValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value?.trim();
      if (!value) return null;
      const urlPattern = /^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/[\w-./?%&=]*)?$/i;
      return urlPattern.test(value) ? null : { invalidUrl: true };
    };
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  // ========== TAXONOMY MANAGEMENT ==========
  initBackendSearch(fieldSlug: string, allOptions: string[]) {
    try {
      if (!this.searchControls[fieldSlug]) {
        const control = new FormControl('');
        this.searchControls[fieldSlug] = control;

        control.valueChanges.pipe(
          debounceTime(300),
          distinctUntilChanged(),
          filter((text): text is string => text !== null && text !== undefined),
          switchMap((searchText: string) => {
            if (!searchText?.trim()) return of([]);
            return this.mockBackendSearch(fieldSlug, searchText, allOptions);
          })
        ).subscribe((options: string[]) => {
          const selected = this.taxonomy_data.get(fieldSlug)?.value || [];
          this.filteredOptions[fieldSlug] = options.filter(opt => !selected.includes(opt));
        });
      }
    } catch (error) {
      console.error(`🔴 Error initializing backend search for ${fieldSlug}:`, error);
    }
  }

  mockBackendSearch(slug: string, query: string, options: string[]) {
    return of(options.filter(opt => opt.toLowerCase().includes(query.toLowerCase())));
  }

  get taxonomy_data() {
    return this.productForm.get('taxonomy_data') as FormGroup;
  }

  toggleChip(fieldSlug: string, option: string) {
    try {
      const current = this.taxonomy_data.get(fieldSlug)?.value || [];
      const updated = current.includes(option)
        ? current.filter((val: string) => val !== option)
        : [...current, option];
      this.taxonomy_data.get(fieldSlug)?.setValue(updated);
      this.taxonomy_data.get(fieldSlug)?.markAsTouched();
    } catch (error) {
      console.error(`🔴 Error toggling chip for ${fieldSlug}:`, error);
    }
  }

  removeTag(fieldSlug: string, tag: string) {
    try {
      const current = this.taxonomy_data.get(fieldSlug)?.value || [];
      const updated = current.filter((val: string) => val !== tag);
      this.taxonomy_data.get(fieldSlug)?.setValue(updated);
      this.taxonomy_data.get(fieldSlug)?.markAsTouched();
    } catch (error) {
      console.error(`🔴 Error removing tag for ${fieldSlug}:`, error);
    }
  }

  shouldShowAddButton(fieldSlug: string): boolean {
    try {
      const inputValue = this.searchControls[fieldSlug]?.value?.trim();
      if (!inputValue) return false;
      const selected = this.taxonomy_data.get(fieldSlug)?.value || [];
      const options = this.filteredOptions[fieldSlug] || [];
      return !options.includes(inputValue) && !selected.includes(inputValue);
    } catch (error) {
      console.error(`🔴 Error checking add button for ${fieldSlug}:`, error);
      return false;
    }
  }

  addNewOption(fieldSlug: string) {
    try {
      const inputValue = this.searchControls[fieldSlug]?.value?.trim();
      if (!inputValue) return;
      const current = this.taxonomy_data.get(fieldSlug)?.value || [];
      const updated = [...current, inputValue];
      this.taxonomy_data.get(fieldSlug)?.setValue(updated);
      this.taxonomy_data.get(fieldSlug)?.markAsTouched();
      this.searchControls[fieldSlug].setValue('');
    } catch (error) {
      console.error(`🔴 Error adding new option for ${fieldSlug}:`, error);
    }
  }

  // ========== FILE HANDLING ==========
  onFileSelected(event: Event): void {
    try {
      const input = event.target as HTMLInputElement;
      const files = input.files;
      if (!files) return;

      console.log(`📁 Selected ${files.length} files`);
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const isSupported = ['image/jpeg', 'image/png', 'application/pdf', 'video/mp4'].includes(file.type);
        if (isSupported) {
          this.uploadedFiles.push(file);
          console.log(`✅ File added: ${file.name}`);
        } else {
          console.warn(`⚠️ Unsupported file type: ${file.type}`);
          alert(`File type not supported: ${file.name}`);
        }
      }
      // Reset input value to allow selecting same file again
      input.value = '';
    } catch (error) {
      console.error('🔴 Error in onFileSelected:', error);
    }
  }

  removeFile(index: number): void {
    try {
      const removed = this.uploadedFiles.splice(index, 1);
      console.log(`❌ File removed: ${removed[0]?.name}`);
    } catch (error) {
      console.error('🔴 Error removing file:', error);
    }
  }

  onFileSelected1(event: Event) {
    try {
      const fileInput = event.target as HTMLInputElement;
      if (fileInput.files && fileInput.files.length > 0) {
        this.selectedFile = fileInput.files[0];
        console.log(`✅ Selected file: ${this.selectedFile.name}`);
      }
      // Reset input value
      fileInput.value = '';
    } catch (error) {
      console.error('🔴 Error in onFileSelected1:', error);
    }
  }

  // ========== KEY FEATURES MANAGEMENT ==========
  addTextarea(): void {
    try {
      this.keyFeatures.push(this.fb.control('', Validators.required));
      console.log(`✅ Added new key feature field, total: ${this.keyFeatures.length}`);
    } catch (error) {
      console.error('🔴 Error adding textarea:', error);
    }
  }

  removeTextarea(index: number): void {
    try {
      if (this.keyFeatures.length > 1) {
        this.keyFeatures.removeAt(index);
        console.log(`❌ Removed key feature at index ${index}, remaining: ${this.keyFeatures.length}`);
      }
    } catch (error) {
      console.error('🔴 Error removing textarea:', error);
    }
  }

  // ========== CO-SELLING MANAGEMENT ==========
  isCoSelling(name: string): boolean {
    return this.coSelling.value.includes(name);
  }

  toggleCoSelling(name: string): void {
    try {
      if (name === 'Neozaar') return;
      const index = this.coSelling.value.indexOf(name);
      if (index === -1) {
        this.addToSelections(name);
        console.log(`✅ Added co-selling partner: ${name}`);
      } else {
        this.removeFromSelections(name);
        console.log(`❌ Removed co-selling partner: ${name}`);
      }
    } catch (error) {
      console.error('🔴 Error toggling co-selling:', error);
    }
  }

  private addToSelections(name: string): void {
    this.coSelling.push(new FormControl(name));
  }

  private removeFromSelections(name: string): void {
    const index = this.coSelling.controls.findIndex(control => control.value === name);
    if (index !== -1) {
      this.coSelling.removeAt(index);
    }
  }

  // ========== IMAGE UPLOAD ==========
  addCouponImage(event: Event) {
    try {
      const target = event.target as HTMLInputElement;
      if (!target.files?.length) return;

      const file = target.files[0];
      const maxFileSizeKB = 200;
      const fileSizeKB = file.size / 1024;

      console.log(`📸 Uploading image: ${file.name}, size: ${fileSizeKB.toFixed(2)} KB`);

      if (fileSizeKB > maxFileSizeKB) {
        console.warn(`⚠️ File too large: ${fileSizeKB.toFixed(2)} KB`);
        alert(`File is too large (${Math.round(fileSizeKB)} KB). Maximum allowed size is ${maxFileSizeKB} KB.`);
        this.productForm?.get('productInfo.image_url')?.setValue(null);
        this.customCouponImageUrl = null;
        target.value = '';
        return;
      }

      this.imageFile = file;

      if (this.customCouponImageUrl) {
        URL.revokeObjectURL(this.customCouponImageUrl);
      }

      this.customCouponImageUrl = URL.createObjectURL(file);
      this.productForm?.get('productInfo.image_url')?.setValue('hasFile');
      console.log(`✅ Image uploaded successfully: ${this.customCouponImageUrl}`);
      
      // Reset input value
      target.value = '';
    } catch (error) {
      console.error('🔴 Error in addCouponImage:', error);
    }
  }

  onImageSelected(event: Event): void {
    try {
      const input = event.target as HTMLInputElement;
      const files = input.files;
      if (!files) return;

      const maxFileSizeKB = 200;
      const allowedTypes = ['image/jpeg', 'image/png'];

      console.log(`📸 Selected ${files.length} images`);

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        if (!allowedTypes.includes(file.type)) {
          console.warn(`⚠️ Unsupported image type: ${file.type}`);
          alert(`Unsupported file type: ${file.name}`);
          continue;
        }

        const fileSizeKB = file.size / 1024;
        if (fileSizeKB > maxFileSizeKB) {
          console.warn(`⚠️ Image too large: ${fileSizeKB.toFixed(2)} KB`);
          alert(`File too large (max ${maxFileSizeKB} KB): ${file.name}`);
          continue;
        }

        const isDuplicate = this.imageFormArray && this.imageFormArray.controls.some(ctrl => {
          const existingFile = ctrl.value as File;
          return existingFile && existingFile.name === file.name && existingFile.size === file.size;
        });

        if (isDuplicate) {
          console.warn(`⚠️ Duplicate image skipped: ${file.name}`);
          alert(`Duplicate file skipped: ${file.name}`);
          continue;
        }

        if (this.imageFormArray && this.imageFormArray.length < this.maxImages) {
          this.imageFormArray.push(new FormControl(file));
          const url = URL.createObjectURL(file);
          this.imagePreviews.push(url);
          console.log(`✅ Image added: ${file.name}`);
        } else {
          console.warn(`⚠️ Max images reached: ${this.maxImages}`);
          alert(`Max ${this.maxImages} images allowed`);
          break;
        }
      }

      // Reset input value
      input.value = '';
    } catch (error) {
      console.error('🔴 Error in onImageSelected:', error);
    }
  }

  // ========== CATEGORY MANAGEMENT ==========
  getCategoryArray(key: string): FormArray {
    return this.productForm.get(key) as FormArray;
  }

  isSelected(key: string, value: string): boolean {
    const array = this.getCategoryArray(key);
    return array ? array.value.includes(value) : false;
  }

  selectBrand(brandName: string) {
    try {
      this.productInfoForm.patchValue({ brand_name: brandName });
      this.showDropdown = false;
      console.log(`✅ Brand selected: ${brandName}`);
    } catch (error) {
      console.error('🔴 Error selecting brand:', error);
    }
  }

  hideDropdown() {
    setTimeout(() => this.showDropdown = false, 200);
  }

  isSelectedPrice(value: string): boolean {
    return this.pricingModel.value === value;
  }

  toggleValue(key: string, value: string): void {
    try {
      const array = this.getCategoryArray(key);
      if (array && !array.value.includes(value)) {
        while (array.length) {
          array.removeAt(0);
        }
        array.push(new FormControl(value));
        console.log(`✅ Toggled value for ${key}: ${value}`);
      }
    } catch (error) {
      console.error(`🔴 Error toggling value for ${key}:`, error);
    }
  }

  isLast(item: any, array: any[]): boolean {
    return array.indexOf(item) === array.length - 1;
  }

  // ========== PRODUCT SELECTION MODAL ==========
onCheckvalidate() {
  try {
    if (this.productForm.invalid) {
      this.productForm.markAllAsTouched();
      
      // Collect all invalid fields with their error messages
      const invalidFields: string[] = [];
      const errorMessages: string[] = [];
      
      // Check productInfo group
      const productInfo = this.productForm.get('productInfo') as FormGroup;
      if (productInfo) {
        Object.keys(productInfo.controls).forEach(key => {
          const control = productInfo.get(key);
          if (control && control.invalid) {
            const fieldName = this.getFieldLabel(key);
            invalidFields.push(fieldName);
            
            if (control.errors) {
              if (control.errors['required']) {
                errorMessages.push(`${fieldName} is required`);
              }
              if (control.errors['minlength']) {
                errorMessages.push(`${fieldName} needs at least ${control.errors['minlength'].requiredLength} characters`);
              }
              if (control.errors['maxlength']) {
                errorMessages.push(`${fieldName} cannot exceed ${control.errors['maxlength'].requiredLength} characters`);
              }
              if (control.errors['min']) {
                errorMessages.push(`${fieldName} must be at least ${control.errors['min'].min}`);
              }
              if (control.errors['invalidUrl']) {
                errorMessages.push(`${fieldName} must be a valid URL`);
              }
            }
          }
        });
      }
      
      // Check form arrays
      const arrayFields = [
        { name: 'Key Features', array: this.keyFeatures },
        { name: 'Target Audience', array: this.targetAudienceArray },
        { name: 'Industry', array: this.industryArray },
        { name: 'Target Segment', array: this.targetSegmentArray },
        { name: 'CTA Model', array: this.ctaModelArray },
        { name: 'Platform Category', array: this.platformCategoryArray },
        { name: 'Cloud Provider', array: this.cloudProviderArray },
        { name: 'Regions Supported', array: this.taxonomy_data?.get('color') as FormArray },
        { name: 'Screenshots', array: this.screenshots },
        { name: 'Brochures', array: this.broucherUpload },
        { name: 'SLA Documents', array: this.serviceLevelDocument }
      ];
      
      arrayFields.forEach(field => {
        if (field.array && field.array.length === 0 && field.name !== 'Screenshots' && field.name !== 'Brochures' && field.name !== 'SLA Documents') {
          invalidFields.push(field.name);
          errorMessages.push(`${field.name} must have at least one item selected`);
        }
      });
      
      // Check for empty arrays that are required
      if (this.screenshots.length === 0 && this.currentStep === 1) {
        errorMessages.push('At least one screenshot is required');
      }
      
      if (this.broucherUpload.length === 0 && this.currentStep === 1) {
        errorMessages.push('At least one brochure is required');
      }
      
      if (!this.customCouponImageUrl && this.currentStep === 1) {
        errorMessages.push('Product logo is required');
      }
      
      // Display all errors in console
      console.warn('⚠️ Form is invalid');
      console.error('❌ Invalid fields:', invalidFields);
      console.error('❌ Error details:', errorMessages);
      
      // Show first error to user
      if (errorMessages.length > 0) {
        this.toasterService.setToaster('error', 'Validation Error', errorMessages[0]);
      } else {
        this.toasterService.setToaster('error', 'All Fields Required', 'Please fill all required fields');
      }
      
      // Scroll to first invalid field
      this.scrollToFirstInvalidField();
      
    } else {
      console.log('✅ Form is valid, opening modal');
      this.ProductModalOpen = true;
    }
  } catch (error) {
    console.error('🔴 Error in onCheckvalidate:', error);
    this.toasterService.setToaster('error', 'Error', 'An error occurred during validation');
  }
}

// Helper method to get user-friendly field labels
private getFieldLabel(fieldKey: string): string {
  const labels: { [key: string]: string } = {
    'name': 'Product Name',
    'brand_name': 'Brand Name',
    'description': 'Short Description',
    'longdescription': 'Long Description',
    'primary_use_cases': 'Primary Use Cases',
    'keyFeatures': 'Key Features',
    'starting_price': 'Starting Price',
    'action_for': 'Action For',
    'pricingModel': 'Pricing Model',
    'technicalPrerequsite': 'Technical Prerequisites',
    'oem_sku': 'OEM SKU',
    'demovideoLink': 'Demo Video Link',
    'terms_of_use_url': 'Terms of Use URL',
    'privacy_policy_url': 'Privacy Policy URL',
    'meteringEndPoint': 'Metering Endpoint',
    'image_url': 'Product Logo'
  };
  return labels[fieldKey] || fieldKey.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

// Helper method to scroll to first invalid field
private scrollToFirstInvalidField(): void {
  try {
    const firstInvalidElement = document.querySelector('.ng-invalid');
    if (firstInvalidElement) {
      firstInvalidElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      (firstInvalidElement as HTMLElement).focus();
    }
  } catch (error) {
    console.error('Error scrolling to invalid field:', error);
  }
}

// Add this method to check specific field errors
checkFieldError(fieldName: string): string {
  const control = this.productForm.get(fieldName);
  if (control && control.invalid && control.touched) {
    if (control.errors?.['required']) {
      return `${this.getFieldLabel(fieldName)} is required`;
    }
    if (control.errors?.['minlength']) {
      return `${this.getFieldLabel(fieldName)} needs at least ${control.errors['minlength'].requiredLength} characters`;
    }
    if (control.errors?.['maxlength']) {
      return `${this.getFieldLabel(fieldName)} cannot exceed ${control.errors['maxlength'].requiredLength} characters`;
    }
    if (control.errors?.['min']) {
      return `${this.getFieldLabel(fieldName)} must be at least ${control.errors['min'].min}`;
    }
    if (control.errors?.['invalidUrl']) {
      return `${this.getFieldLabel(fieldName)} must be a valid URL`;
    }
  }
  return '';
}

// Add this method to check array field errors
checkArrayFieldError(arrayName: string, minRequired: number = 1): string {
  let array: FormArray | null = null;
  
  switch(arrayName) {
    case 'keyFeatures':
      array = this.keyFeatures;
      break;
    case 'targetAudience':
      array = this.targetAudienceArray;
      break;
    case 'industry':
      array = this.industryArray;
      break;
    case 'targetSegment':
      array = this.targetSegmentArray;
      break;
    case 'ctaModel':
      array = this.ctaModelArray;
      break;
    case 'platformCategory':
      array = this.platformCategoryArray;
      break;
    case 'cloudProvider':
      array = this.cloudProviderArray;
      break;
  }
  
  if (array && array.length < minRequired) {
    return `Please select at least ${minRequired} ${arrayName.replace(/([A-Z])/g, ' $1').trim()}`;
  }
  return '';
}

  closeAssignModal() {
    this.ProductModalOpen = false;
  }

  removeProduct(product: any) {
    this.productSelectData = this.productSelectData.filter(p => p !== product);
  }

  openAddproductModal() {
    this.isproductSelectModalOpen = true;
  }

  closedModal(data: any) {
    this.isproductSelectModalOpen = false;
    if (data != null) {
      this.productSelectData = data;
    }
  }

  // ========== CATEGORY UPDATE ==========
  categoryData: { category: string[], category_subcategory: string[] } = { category: [], category_subcategory: [] };

  onCategoryUpdate(data: any) {
    this.categoryData = data;
  }

  // ========== FORM SUBMISSION ==========
  onSubmit() {
    try {
      console.log('🔄 Submitting form...');
      
      if (this.productForm.invalid) {
        this.productForm.markAllAsTouched();
        this.logInvalidFields();
        console.warn('⚠️ Form validation failed');
        this.toasterService.setToaster('error', 'All Fields Required', 'Please fill all required fields');
        return;
      }

      this.ProductModalOpen = false;
      this.isreqSending = true;

      const formData = this.prepareFormData();
      console.log('📦 FormData prepared for submission');

      if (this.router.url.includes('/edit')) {
        console.log('📝 Updating existing product');
        this.updateProduct(formData);
      } else {
        console.log('➕ Creating new product');
        this.createProduct(formData);
      }
    } catch (error) {
      console.error('🔴 Error in onSubmit:', error);
      this.toasterService.setToaster('error', 'Error', 'Failed to submit form');
      this.isreqSending = false;
    }
  }

  private logInvalidFields(): void {
    const invalidFields = [];
    const controls = this.productForm.controls;
    for (const fieldName in controls) {
      if (controls[fieldName].invalid) {
        invalidFields.push(fieldName);
      }
    }
    console.warn('Invalid fields:', invalidFields);
  }

  private prepareFormData(): FormData {
    try {
      const data = this.productForm.value;
      const formData = new FormData();

      // Basic product info
      formData.append('name', data.productInfo.name);
      formData.append('is_feature', data.productInfo.is_feature);
      formData.append('brand_name', data.productInfo.brand_name);
      formData.append('short_description', data.productInfo.description);
      formData.append('primary_use_cases', data.productInfo.primary_use_cases);
      formData.append('long_description', data.productInfo.longdescription);
      formData.append('key_features', JSON.stringify(data.productInfo.keyFeatures));
      formData.append('cta_model', JSON.stringify(data.ctaModel));
      formData.append('target_audience', JSON.stringify(data.targetAudience));
      formData.append('industry', JSON.stringify(data.industry));
      formData.append('target_segments', JSON.stringify(data.targetSegment));
      formData.append('category_subcategory', this.categoryData.category_subcategory ? JSON.stringify(this.categoryData.category_subcategory) : '');
      // formData.append('subcategory', this.categoryData.category_subcategory ? JSON.stringify(this.categoryData.category_subcategory) : '');
      formData.append('category', this.categoryData.category ? JSON.stringify(this.categoryData.category) : '');
      formData.append('regions_supported', JSON.stringify(data.taxonomy_data.color));
      formData.append('cloud_provider_support', JSON.stringify(data.cloudProvider));
      formData.append('technical_prerequisites', data.productInfo.technicalPrerequsite);
      formData.append('oem_sku', data.productInfo.oem_sku);
      formData.append('demo_video_link', data.productInfo.demovideoLink);
      formData.append('api_metering_endpoint', data.productInfo.meteringEndPoint);
      formData.append('terms_of_use_url', data.productInfo.terms_of_use_url);
      formData.append('privacy_policy_url', data.productInfo.privacy_policy_url);
      formData.append('pricing_model', data.productInfo.pricingModel);
      formData.append('compliance_certifications', JSON.stringify(data.complianceCertification));
      formData.append('consent_data_privacy_policy', data.productInfo.consentPolicy);
      formData.append('accept_marketplace_terms', data.productInfo.acceptTerms);
      formData.append('action_type', 'product');
      formData.append('action_for',  'customer');
      formData.append('starting_price', data.productInfo.starting_price);
      formData.append('tags', JSON.stringify(this.tags || []));

      // File uploads
      this.serviceLevelDocument.controls.forEach(fileControl => {
        if (fileControl.value) {
          formData.append('sla_documents', fileControl.value);
        }
      });

      if (this.imageFile) {
        formData.append('product_logo', this.imageFile);
      }

      if (this.selectedFile) {
        formData.append('sales_enable_collateral', this.selectedFile);
      }

      this.uploadedFiles.forEach((file) => {
        formData.append('files[]', file);
      });

      this.attachments.controls.forEach(fileControl => {
        if (fileControl.value) {
          formData.append('attachments', fileControl.value);
        }
      });

      const existingScreenshotUrls: string[] = [];
      this.screenshots.controls.forEach(fileControl => {
        if (fileControl.value) {
          if (fileControl.value instanceof File) {
            formData.append('screenshots', fileControl.value, fileControl.value.name);
          } else if (typeof fileControl.value === 'string' && fileControl.value.trim()) {
            existingScreenshotUrls.push(fileControl.value.trim());
          }
        }
      });
      formData.append('existing_screenshots', JSON.stringify(existingScreenshotUrls));

      // Separate existing URLs from new File uploads for brochures
      const existingBrochureUrls: string[] = [];
      this.broucherUpload.controls.forEach(fileControl => {
        if (fileControl.value) {
          if (typeof fileControl.value === 'string') {
            existingBrochureUrls.push(fileControl.value);
          } else {
            formData.append('brochures', fileControl.value);
          }
        }
      });
      formData.append('existing_brochures', JSON.stringify(existingBrochureUrls));

      // Separate existing URLs from new File uploads for customer case studies
      const existingCaseStudyUrls: string[] = [];
      this.customerCasestudyUpload.controls.forEach(fileControl => {
        if (fileControl.value) {
          if (typeof fileControl.value === 'string') {
            existingCaseStudyUrls.push(fileControl.value);
          } else {
            formData.append('customer_case_studies', fileControl.value);
          }
        }
      });
      formData.append('existing_customer_case_studies', JSON.stringify(existingCaseStudyUrls));

      // Bundle products
      if (this.route.snapshot.paramMap.get('type') === 'bundle') {
        const product_ids = this.productSelectData.map(item => item.id);
        formData.append('product_ids', product_ids.length > 0 ? JSON.stringify(product_ids) : '[]');
      }

      return formData;
    } catch (error) {
      console.error('🔴 Error preparing form data:', error);
      throw error;
    }
  }

  // Save tags on their own, via the dedicated endpoint. This never changes the
  // product's publish/draft/approval status, so it's safe to use on published
  // items. Used in edit mode.
  saveTags(): void {
    const productId = this.route.snapshot.paramMap.get('id');
    if (!productId) return;
    this.savingTags = true;
    this.productService.updateTags(productId, this.tags || [])
      .pipe(finalize(() => { this.savingTags = false; }))
      .subscribe({
        next: (res: any) => {
          this.toasterService.setToaster('success', 'Tags Updated', res?.message || 'Tags saved successfully');
        },
        error: (err: any) => {
          console.error('🔴 Save tags error:', err);
          this.toasterService.setToaster('error', 'Tags Update Failed', err?.error?.message || 'Failed to save tags');
        }
      });
  }

  private updateProduct(formData: FormData): void {
    const productId = this.route.snapshot.paramMap.get('id');

    formData.append('type', 'product');
    formData.delete('action_id');
    formData.delete('action_type');
    formData.delete('user_id');
    formData.delete('product_ids');
    // Tags are saved via the dedicated tags endpoint (saveTags), which does not
    // reset publish status. Keep them out of the normal update payload.
    formData.delete('tags');

    console.log(`🔄 Updating product ID: ${productId}`);

    this.productService.updateProduct(productId, formData)
      .pipe(
        finalize(() => { 
          this.isreqSending = false;
          console.log('🏁 Update request completed');
        }),
        catchError(error => {
          console.error('🔴 Update error:', error);
          this.toasterService.setToaster('error', 'Update Failed', 'Failed to update product');
          return throwError(() => error);
        })
      )
      .subscribe({
        next: (res: any) => {
          if (res.status === 'success') {
            console.log('✅ Product updated successfully');
            this.toasterService.setToaster('success', 'Product Updated', res.message || 'Product updated successfully');

            this.router.navigate(['products', 'view', productId]);
          }
        },
        error: (err: any) => {
          console.error('🔴 Update subscription error:', err);
          this.toasterService.setToaster('error', 'Update Failed', 'Failed to update product');
        }
      });
  }

  private createProduct(formData: FormData): void {
    console.log('➕ Creating new product');
    
    this.productService.createProduct(formData)
      .pipe(
        finalize(() => { 
          this.isreqSending = false;
          console.log('🏁 Create request completed');
        }),
        catchError(error => {
          console.error('🔴 Create error:', error);
          this.toasterService.setToaster('error', 'Creation Failed', 'Failed to create product');
          return throwError(() => error);
        })
      )
      .subscribe({
        next: (res: any) => {
          if (res.status === 'success') {
            console.log('✅ Product created successfully');
            this.toasterService.setToaster('success', 'Product Added', res.message || 'Product added successfully');
            const productId = res.data?.id || res.data?.product_id || res.id;
            if (productId) {
              this.router.navigate(['products', 'view', productId]);
            } else {
              this.router.navigate(['/products']);
            }
          }
        },
        error: (err: any) => {
          console.error('🔴 Create subscription error:', err);
          this.toasterService.setToaster('error', 'Creation Failed', 'Failed to create product');
        }
      });
  }

  // ========== STEP NAVIGATION ==========
  prevStep() {
    if (this.currentStep > 0) {
      this.currentStep--;
      setTimeout(() => this.moveUnderline(this.currentStep));
    }
  }

  setActiveTab(index: number) {
    if (index <= this.currentStep) {
      this.currentStep = index;
      setTimeout(() => this.moveUnderline(index));
      return;
    }

    const currentGroup = this.productForm.get(this.activeStep.key) as FormGroup;
    if (currentGroup && currentGroup.invalid) {
      currentGroup.markAllAsTouched();
      this.toasterService.setToaster('error', 'All Fields Required', 'Please fill all required fields');
      return;
    }

    if (!this.validateStep(currentGroup)) {
      return;
    }

    this.currentStep = index;
    setTimeout(() => this.moveUnderline(index));
  }

  private validateStep(currentGroup: FormGroup): boolean {
    try {
      if (currentGroup === this.productInfoForm) {
        if (!this.keyFeatures.value || this.keyFeatures.value.length === 0 || !this.keyFeatures.value[0]?.trim()) {
          this.toasterService.setToaster('error', 'Validation Error', 'Please add at least one Key Feature.');
          return false;
        }
        if (this.targetAudienceArray.length === 0) {
          this.toasterService.setToaster('error', 'Validation Error', 'Please select at least one Target Audience.');
          return false;
        }
        if (this.ctaModelArray.length === 0) {
          this.toasterService.setToaster('error', 'Validation Error', 'Please select at least one CTA Model.');
          return false;
        }
        if (this.industryArray.length === 0) {
          this.toasterService.setToaster('error', 'Validation Error', 'Please select at least one Industry.');
          return false;
        }
        if (this.targetSegmentArray.length === 0) {
          this.toasterService.setToaster('error', 'Validation Error', 'Please select at least one Target Segment.');
          return false;
        }
        
        if (!this.taxonomy_data.get('color')?.value || this.taxonomy_data.get('color')?.value.length === 0) {
          this.toasterService.setToaster('error', 'Validation Error', 'Please select at least one Region Supported.');
          return false;
        }
        if (this.cloudProviderArray.length === 0) {
          this.toasterService.setToaster('error', 'Validation Error', 'Please select at least one Cloud Provider.');
          return false;
        }
      } else if (currentGroup === this.pricingInfoForm) {
        if (!this.customCouponImageUrl) {
          this.toasterService.setToaster('error', 'Validation Error', 'Please upload a logo for the product.');
          return false;
        }
        if (this.screenshots.controls.length === 0) {
          this.toasterService.setToaster('error', 'Validation Error', 'Please add at least one Screenshot.');
          return false;
        }
        if (this.broucherUpload.controls.length === 0) {
          this.toasterService.setToaster('error', 'Validation Error', 'Please add at least one Brochure.');
          return false;
        }
        if (this.productInfoForm.value.demovideoLink && !this.isValidUrl(this.productInfoForm.value.demovideoLink)) {
          this.toasterService.setToaster('error', 'Invalid Video Link', 'Please enter a valid demo video URL.');
          return false;
        }
      }
      return true;
    } catch (error) {
      console.error('🔴 Error in validateStep:', error);
      return false;
    }
  }

  // ========== UI HELPERS ==========
  moveUnderline(index: number) {
    try {
      const underline = document.querySelector('.tab-underline') as HTMLElement;
      const tabs = document.querySelectorAll('.tab-button');
      if (!underline || !tabs.length) return;

      let width = 0;
      for (let i = 0; i <= index; i++) {
        const el = tabs[i] as HTMLElement;
        if (el) {
          width += el.offsetWidth;
        }
      }
      underline.style.width = `${width + (index * 8)}px`;
    } catch (error) {
      console.error('🔴 Error moving underline:', error);
    }
  }

  goBack(): void {
    window.history.back();
  }

  allowOnlyNumbers(event: KeyboardEvent) {
    const allowedKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'];
    if (allowedKeys.includes(event.key)) return;
    if (!/^[0-9]$/.test(event.key)) {
      event.preventDefault();
    }
  }

  allowOnlyAlphabets(event: KeyboardEvent) {
    const pattern = /^[a-zA-Z]$/;
    const inputChar = String.fromCharCode(event.keyCode);
    if (!pattern.test(inputChar)) {
      event.preventDefault();
    }
  }

  onEditorChange(field: string, value: string) {
    this.productInfoForm.get(field)?.setValue(value);
    this.productInfoForm.get(field)?.markAsTouched();
  }

  getFilePreview(file: any): { type: 'image' | 'pdf', url: string } {
    let url = file instanceof File ? URL.createObjectURL(file) : file;
    if (typeof url === 'string' && url.toLowerCase().endsWith('.pdf')) {
      return { type: 'pdf', url };
    }
    return { type: 'image', url };
  }

  openPdf(url: string) {
    window.open(url, '_blank');
  }
}

export function minSelectedCheckboxes(min = 1) {
  return (control: AbstractControl): ValidationErrors | null => {
    if (control instanceof FormArray) {
      return control.length >= min ? null : { required: true };
    }
    return null;
  };
}
