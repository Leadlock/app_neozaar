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
import { SolutionserviceService } from '../solutionservice.service';
import { AuthService } from '../../../core/services/auth.service';
import { debounceTime, distinctUntilChanged, switchMap, filter } from 'rxjs/operators';
import { of, throwError } from 'rxjs';
import { FileUploadComponent } from '../../product/only-product/file-upload.component';
import { ImageUploadComponent } from '../../product/only-product/image-upload/image-upload.component';
import { CleditorComponent } from '../../../shared/components/cleditor/cleditor.component';
import { UserserviceService } from '../../../core/services/userservice.service';
import { UserRole } from '../../../core/modal/user.modal';
import { CategorySubcategoryComponent } from '../../../shared/components/category-subcategory/category-subcategory.component';
import { MasterService } from '../../master/master.service';
import { TagsInputComponent } from '../../../shared/components/tags-input/tags-input.component';

type CategoryKeys =
  | 'platformCategory'
  | 'selling'
  | 'targetAudience'
  | 'industry'
  | 'targetSegment'
  | 'cloudProvider'
  | 'ctaModel'
  | 'coverage'
  | 'complianceCertification';

@Component({
  selector: 'app-solution-create',
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
    TagsInputComponent
  ],
  templateUrl: './solution-create.component.html',
  styleUrl: './solution-create.component.css'
})
export class SolutionCreateComponent implements OnInit, AfterViewInit {
  @ViewChildren('searchContainer') searchContainers!: QueryList<ElementRef>;
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @Input() imageFormArray!: FormArray;

  // Component state
  existingProductData: any;
  currentStep = 0;
  productForm!: FormGroup;
  isproductSelectModalOpen = false;
  productSelectData: any[] = [];
  isIsvProductModalOpen = false;
  isServiceModalOpen = false;
  selectedIsvProducts: any[] = [];
  selectedSpectrumServices: any[] = [];
  imageFile: File | null = null;
  customCouponImageUrl: string | null = null;
  profileUrl = 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D';
  errorMessage = '';
  supportOptions: any[] = [];
  showBundleSection = false;
  isreqSending = false;
  productId = 0;
  updateButton = false;
  // Free-form searchable tags for this solution.
  tags: string[] = [];
  savingTags = false;
  uploadedFiles: File[] = [];
  consentPolicy = false;
  acceptTerms = false;
  selectedFile: File | null = null;
  ProductModalOpen: any;
  imagePreviews: string[] = [];
  maxImages = 5;
  UserRole = UserRole;
  vendorname: any[] = [];
  isLoading: boolean = false;
  showDropdown = false;
  filteredBrands: any[] = [];
  showCloudInput = false;
  newCloud = '';
  availableTargetAudiences: any[] = [];   
  availableTargetSegments: any[] = [];     // ✅ fixed property name (lowercase 't')
  availableindustrys: any[] = [];

  // Categories and options
  showInput: Record<CategoryKeys, boolean> = {
    platformCategory: false,
    coverage: false,
    selling: false,
    targetAudience: false,
    industry: false,
    targetSegment: false,
    cloudProvider: false,
    ctaModel: false,
    complianceCertification: false
  };

  Newcategories: Record<CategoryKeys, string[]> = {
    coverage: [],
    platformCategory: [
      'Cloud Infra',
      'Cloud Infrastructure',
      'Security',
      'Networking & Connectivity',
      'Data & AI',
      'Data, Storage & Backup',
      'DevOps',
      'DevOps & CI/CD',
      'Containers & Kubernetes',
      'Data Analytics & Business Intelligence',
      'Artificial Intelligence & Machine Learning',
      'Application Modernization',
      'Integration & API Management',
      'Identity & Access Management',
      'Compliance, Risk & Governance',
      'Monitoring, Logging & Observability',
      'FinOps',
      'Cost Management & FinOps',
      'Migration & Modernization',
      'Digital Workplace',
      'Business Applications',
      'Collaboration & Productivity',
      'End-User Computing',
      'Industry-Specific Solutions',
      'Managed Services'
    ],
    selling: ['B2B', 'B2C'],
    targetAudience: ['Cloud architects', 'security operations teams', 'IT administrators', 'Compliance Officers', 'Remote Workforce Leaders', 'Security Teams'],
    industry: ['SMB', 'Mid-market', 'Enterprise', 'Government', 'Retail', 'Healthcare', 'ITIES', 'BFSI', 'Logistics'],
    targetSegment: ['SMB', 'Mid-market', 'Enterprise', 'Government', 'Retail', 'Healthcare', 'ITIES', 'BFSI', 'Logistics'],
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
      options: ['Asia', 'MEA', 'APAC', 'North America', 'Europe', 'Global']
    },
  ];

  searchControls: { [key: string]: FormControl } = {};
  filteredOptions: { [key: string]: string[] } = {};
  brandNames: string[] = [];

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
    { key: 'productInfo', label: 'Solution Information' },
    { key: 'pricing', label: 'Pricing & Media' },
  ];

  categoryData: { category: string[], category_subcategory: string[] } = { category: [], category_subcategory: [] };

  public readonly Role = UserRole;
  currentUserRole: any;

  constructor(
    private helperService: HelperServiceService,
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private toasterService: ToasterService,
    private SolutionserviceService: SolutionserviceService,
    private auth: AuthService,
    private serviceseo: SeoServiveService,
    private changeDetectorRef: ChangeDetectorRef,
    private userservce: UserserviceService,
    private authservice: AuthService,
    private masterService: MasterService
  ) {
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
    console.log('🟢 SolutionCreateComponent initialized');
    this.initializeForm();
    this.debugScreenshots();
    this.loadbrandname();
    this.setupBrandSearch();
    this.getalltargetsegment();
    this.getalltargetaudience();
    this.getallindustrys();

    const currentUser = this.authservice.getCurrentUser();
    this.currentUserRole = currentUser?.role_type;

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
  }

  ngAfterViewInit() {
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
            return this.SolutionserviceService.getallbrandname().pipe(
              catchError(error => {
                console.error('🔴 Error in brand search:', error);
                return of(null);
              })
            );
          })
        ).subscribe({
          next: (res: any) => {
            this.isLoading = false;
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

  // ========== FORM INITIALIZATION ==========
  private initializeForm(): void {
    this.productForm = this.fb.group({
      productInfo: this.fb.group({
        user_id: [this.auth.userId],
        action_id: [this.route.snapshot.paramMap.get('type') === 'product' ? 1 : 2],
        action_type: [this.route.snapshot.paramMap.get('type')],
        name: ['', [Validators.required]],
        brand_name: [''],
        meteringEndPoint: ['', this.optionalUrlValidator()],
        description: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(500)]],
        scope: ['', [Validators.required, Validators.minLength(3)]],
        why_choose_neozaar: [''],
        solution_differentiator: [''],
        challenges_addressed: [''],
        primary_use_cases: [''],
        longdescription: ['', [Validators.required, Validators.minLength(200)]],
        keyFeatures: this.fb.array([this.fb.control('', Validators.required)]),
        customerChallenges: this.fb.array([this.fb.control('', Validators.required)]),
        businessOutcomes: this.fb.array([this.fb.control('', Validators.required)]),
        useCases: this.fb.array([this.fb.control('', Validators.required)]),
        image_url: [''],
        starting_price: ['', [Validators.required, Validators.min(1)]],
        action_for: [''],
        screenshots: this.fb.array([]),
        customerCasestudyUpload: this.customerCasestudyUpload,
        broucherUpload: this.broucherUpload,
        serviceLevelDocument: this.serviceLevelDocument,
        oem_sku: [''],
        technicalPrerequsite: [''],
        pricingModel: [''],
        demovideoLink: ['', this.optionalUrlValidator()],
        terms_of_use_url: ['', this.optionalUrlValidator()],
        acceptTerms: [false],
        consentPolicy: [false],
        is_feature: [false],
      }),
      coverage: this.fb.array([]),
      taxonomy_data: this.fb.group({}),
      productSelectData: this.fb.array([]),
      differentiation: [''],
      WhatsIncluded: [''],
      categoryType: [''],
      coSelling: this.fb.array([]),
      selling: this.fb.array([]),
      attachments: this.attachments,
      targetAudience: this.fb.array([]),
      industry: this.fb.array([]),
      targetSegment: this.fb.array([]),
      ctaModel: this.fb.array([], maxSelectedCheckboxes(1)),
      cloudProvider: this.fb.array([]),
      complianceCertification: this.fb.array([]),
    });

    this.addToSelections('Neozaar');
    this.initializeTaxonomyData();
  }

  private initializeTaxonomyData(): void {
    const taxonomyGroup = this.productForm.get('taxonomy_data') as FormGroup;
    this.selectedFields.forEach(field => {
      taxonomyGroup.addControl(
        field.slug,
        this.fb.control([], [Validators.required])
      );
      this.initBackendSearch(field.slug, field.options);
    });
  }

  // ========== FORM GETTERS ==========
  get productInfoForm(): FormGroup {
    return this.productForm.get('productInfo') as FormGroup;
  }

  get coverage(): FormArray {
    return this.productForm.get('coverage') as FormArray;
  }

  get keyFeatures(): FormArray {
    return this.productInfoForm.get('keyFeatures') as FormArray;
  }

  get customerChallenges(): FormArray {
    return this.productInfoForm.get('customerChallenges') as FormArray;
  }

  get businessOutcomes(): FormArray {
    return this.productInfoForm.get('businessOutcomes') as FormArray;
  }

  get useCases(): FormArray {
    return this.productInfoForm.get('useCases') as FormArray;
  }

  addChallenge(): void { this.customerChallenges.push(this.fb.control('', Validators.required)); }
  removeChallenge(i: number): void { if (this.customerChallenges.length > 1) this.customerChallenges.removeAt(i); }

  addOutcome(): void { this.businessOutcomes.push(this.fb.control('', Validators.required)); }
  removeOutcome(i: number): void { if (this.businessOutcomes.length > 1) this.businessOutcomes.removeAt(i); }

  addUseCase(): void { this.useCases.push(this.fb.control('', Validators.required)); }
  removeUseCase(i: number): void { if (this.useCases.length > 1) this.useCases.removeAt(i); }

  groupByBrand(items: any[]): { brand: string, items: any[] }[] {
    const map = new Map<string, any[]>();
    items.forEach(item => {
      const brand = item.brand_name || 'Other';
      if (!map.has(brand)) map.set(brand, []);
      map.get(brand)!.push(item);
    });
    return Array.from(map.entries()).map(([brand, items]) => ({ brand, items }));
  }

  get isvProductsByBrand() { return this.groupByBrand(this.selectedIsvProducts); }
  get servicesByBrand() { return this.groupByBrand(this.selectedSpectrumServices); }

  openIsvProductModal(): void { this.isIsvProductModalOpen = true; }
  closeIsvProductModal(data: any): void {
    this.isIsvProductModalOpen = false;
    if (data != null) {
      this.selectedIsvProducts = data;
      this.aggregateInheritedFields();
    }
  }
  removeIsvProduct(p: any): void {
    this.selectedIsvProducts = this.selectedIsvProducts.filter(x => x !== p);
    this.aggregateInheritedFields();
  }

  openServiceModal(): void { this.isServiceModalOpen = true; }
  closeServiceModal(data: any): void {
    this.isServiceModalOpen = false;
    if (data != null) {
      this.selectedSpectrumServices = data;
      this.aggregateInheritedFields();
    }
  }
  removeService(s: any): void {
    this.selectedSpectrumServices = this.selectedSpectrumServices.filter(x => x !== s);
    this.aggregateInheritedFields();
  }

  private aggregateInheritedFields(): void {
    const allItems = [...this.selectedIsvProducts, ...this.selectedSpectrumServices];

    const collect = (key: string): string[] => {
      const set = new Set<string>();
      allItems.forEach(item => {
        const val = item[key];
        if (Array.isArray(val)) val.forEach((v: string) => v && set.add(v));
        else if (typeof val === 'string' && val.trim()) set.add(val.trim());
      });
      return Array.from(set);
    };

    const patch = (fa: FormArray, values: string[]) => {
      while (fa.length) fa.removeAt(0);
      values.forEach(v => fa.push(new FormControl(v)));
    };

    patch(this.targetAudienceArray, collect('target_audience'));
    patch(this.industryArray, collect('industry'));
    patch(this.targetSegmentArray, collect('target_segments'));
    patch(this.cloudProviderArray, collect('cloud_provider_support'));

    const regions = collect('regions_supported');
    const colorCtrl = this.taxonomy_data.get('color');
    if (colorCtrl) colorCtrl.setValue(regions);
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

  get taxonomy_data() {
    return this.productForm.get('taxonomy_data') as FormGroup;
  }

  // ========== PRODUCT LOADING ==========
loadProduct() {
  this.productId = Number(this.route.snapshot.paramMap.get('id'));
  console.log(`📝 Loading solution with ID: ${this.productId}`);

  this.SolutionserviceService.getProductById(this.productId).subscribe({
    next: (res: any) => {
      const product = res.data;
      this.existingProductData = product;

      // Set category data for child component (if you use category/subcategory)
      this.categoryData = {
        category: this.convertToArray(product.category),
        category_subcategory: this.convertToArray(product.category_subcategory)
      };

      if (product.product_logo) {
        this.customCouponImageUrl = product.product_logo;
      }

      // Clear all existing form arrays to avoid duplicates
      this.clearAllFormArrays();

      // 1) Add any missing options to the available lists (target audience, segments, cloud, regions, etc.)
      this.updateAvailableOptionsFromProduct(product);

      // 2) Populate the selected values into the FormArrays
      this.patchFormData(product);

      this.changeDetectorRef.detectChanges();
    },
    error: (err) => {
      console.error('🔴 Error loading product:', err);
      this.router.navigate(['/dashboard']);
      this.toasterService.setToaster('error', 'Error', 'Failed to load solution');
    }
  });
}
private updateAvailableOptionsFromProduct1(product: any): void {
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

  private updateAvailableOptionsFromProduct(product: any): void {
    try {
      const productAudiences = product.target_audience;
      if (Array.isArray(productAudiences)) {
        productAudiences.forEach((audience: string) => {
          if (!this.availableTargetAudiences.includes(audience)) {
            this.availableTargetAudiences.push(audience);
            console.log(`➕ Added custom target audience: ${audience}`);
          }
        });
      }

      const productSegments = product.industry;
      if (Array.isArray(productSegments)) {
        productSegments.forEach((segment: string) => {
          if (!this.availableindustrys.includes(segment)) {
            this.availableindustrys.push(segment);
            console.log(`➕ Added custom target segment: ${segment}`);
          }
        });
      }

      const productCloudProviders = product.cloud_provider_support;
      if (Array.isArray(productCloudProviders)) {
        productCloudProviders.forEach((cp: string) => {
          if (!this.Newcategories.cloudProvider.includes(cp)) {
            this.Newcategories.cloudProvider.push(cp);
            console.log(`➕ Added custom cloud provider: ${cp}`);
          }
        });
      }

      const productCtaModels = product.cta_model;
      if (Array.isArray(productCtaModels)) {
        productCtaModels.forEach((cta: string) => {
          if (!this.Newcategories.ctaModel.includes(cta)) {
            this.Newcategories.ctaModel.push(cta);
            console.log(`➕ Added custom CTA model: ${cta}`);
          }
        });
      }

      const productCompliance = product.compliance_certifications;
      if (Array.isArray(productCompliance)) {
        productCompliance.forEach((cert: string) => {
          if (!this.Newcategories.complianceCertification.includes(cert)) {
            this.Newcategories.complianceCertification.push(cert);
            console.log(`➕ Added custom compliance certification: ${cert}`);
          }
        });
      }

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

  loadbrandname() {
    console.log('🔍 Loading brand names...');
    this.SolutionserviceService.getallbrandname().subscribe({
      next: (res: any) => {
        if (res && res.data && res.data.brands && Array.isArray(res.data.brands)) {
          this.brandNames = res.data.brands.map((b: any) => b.brand_name);
          console.log('✅ Loaded brand names:', this.brandNames.length);
        } else {
          this.brandNames = [];
        }
      },
      error: (err) => {
        console.error('🔴 Error loading coverage:', err);
        this.toasterService.setToaster('error', 'Error', 'Failed to load brand names');
      }
    });
  }

  getalltargetaudience() {
    this.isLoading = true;
    this.masterService.getalltargetaudience().subscribe({
      next: (res: any) => {
        if (res?.data?.audiences && Array.isArray(res.data.audiences)) {
          this.availableTargetAudiences = res.data.audiences.map((item: any) => item.name);
          console.log('✅ Loaded target audiences:', this.availableTargetAudiences);
        } else if (res?.data && Array.isArray(res.data)) {
          this.availableTargetAudiences = res.data.map((item: any) => item.name);
        } else {
          this.availableTargetAudiences = [];
        }
      },
      error: (err) => {
        console.error('🔴 Error loading target audiences:', err);
        this.toasterService.setToaster('error', 'Error', 'Failed to load target audiences');
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  // ✅ FIXED: using correct property name 'availableTargetSegments'
  getalltargetsegment() {
    this.isLoading = true;
    this.masterService.getalltargetsegment().subscribe({
      next: (res: any) => {
        if (res?.data?.targetSegments && Array.isArray(res.data.targetSegments)) {
          this.availableTargetSegments = res.data.targetSegments.map((item: any) => item.name);
          console.log('✅ Loaded target segments:', this.availableTargetSegments);
        } else if (res?.data && Array.isArray(res.data)) {
          this.availableTargetSegments = res.data.map((item: any) => item.name);
        } else {
          this.availableTargetSegments = [];
        }
      },
      error: (err) => {
        console.error('🔴 Error loading target segments:', err);
        this.toasterService.setToaster('error', 'Error', 'Failed to load target segments');
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
          this.availableindustrys = res.data.industry.map((item: any) => item.name);
          console.log('✅ Loaded industries:', this.availableindustrys);
        } else if (res?.data && Array.isArray(res.data)) {
          this.availableindustrys = res.data.map((item: any) => item.name);
        } else {
          this.availableindustrys = [];
        }
      },
      error: (err) => {
        console.error('🔴 Error loading industries:', err);
        this.toasterService.setToaster('error', 'Error', 'Failed to load industries');
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  // ========== CATEGORY MANAGEMENT ==========
  private apiToUiCategoryMap: Record<string, CategoryKeys> = {
    category_subcategory: 'platformCategory',
    target_audience: 'targetAudience',
    target_segment: 'targetSegment',
    industry: 'industry',
    cloud_provider_support: 'cloudProvider',
  };

  private syncBackendToCategoriesAndForm(product: any): void {
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
        }

        const fa = this.productForm.get(formKey) as FormArray;
        if (fa && !fa.value.includes(value)) {
          this.toggleArrayItem(formKey, value);
        }
      });
    });
  }

  toggleArrayItem(field: CategoryKeys, item: string): void {
    const fa = this.productForm.get(field) as FormArray;
    if (!fa) {
      console.error(`FormArray '${field}' not found`);
      return;
    }

    const index = fa.value.indexOf(item);
    if (index > -1) {
      fa.removeAt(index);
      console.log(`❌ Removed ${item} from ${field}`);
    } else {
      fa.push(new FormControl(item));
      console.log(`✅ Added ${item} to ${field}`);
    }
  }

  isChecked(field: CategoryKeys, item: string): boolean {
    const formArray = this.productForm.get(field) as FormArray;
    if (!formArray) {
      return false;
    }
    return formArray.value.includes(item);
  }

  // ========== CUSTOM VALUE INPUT ==========
  addCustomValue(field: CategoryKeys): void {
    if (!this.newCloud.trim()) return;
    const value = this.newCloud.trim();

    this.toggleArrayItem(field, value);

    if (!this.Newcategories[field].includes(value)) {
      this.Newcategories[field].push(value);
    }

    this.newCloud = '';
    this.showInput[field] = false;
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
      const arraysToClear = [
        this.screenshots,
        this.keyFeatures,
        this.customerChallenges,
        this.businessOutcomes,
        this.useCases,
        this.pricingModel,
        this.targetAudienceArray,
        this.industryArray,
        this.targetSegmentArray,
        this.ctaModelArray,
        this.cloudProviderArray,
        this.complianceCertificationArray,
        this.broucherUpload,
        this.customerCasestudyUpload,
        this.serviceLevelDocument,
        this.attachments,
        this.coSelling,
        this.coverage,
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
  }

  private patchArraySafely(formArray: FormArray, data: any[] | string | any): void {
    try {
      if (!formArray || !(formArray instanceof FormArray)) {
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
    } catch (error) {
      console.error('🔴 Error patching array:', error);
    }
  }

  private patchScreenshots(screenshots: any[] | string[]): void {
    try {
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
    } catch (error) {
      console.error('🔴 Error in buildImagePreviews:', error);
    }
  }

  private debugScreenshots(): void {
    console.log('🔍 Screenshots FormArray initialized');
  }

  private patchFormData(product: any): void {
    try {
      console.log('🔄 Patching form data');

      this.productInfoForm.patchValue({
        name: product.name || '',
        brand_name: product.brand_name || '',
        primary_use_cases: product.primary_use_cases || '',
        description: product.short_description || '',
        is_feature: product.is_feature || false,
        longdescription: product.long_description || '',
        oem_sku: product.oem_sku || '',
        meteringEndPoint: product.api_metering_endpoint || '',
        technicalPrerequsite: product.technical_prerequisites || '',
        demovideoLink: product.demo_video_link || '',
        terms_of_use_url: product.terms_of_use_url || '',
        pricingModel: this.cleanString(product.pricing_model),
        acceptTerms: product.accept_marketplace_terms || false,
        consentPolicy: product.consent_data_privacy_policy || false,
        starting_price: product.starting_price || '',
        action_for: product.action_for || '',
      });

      if (product.extraDataForServiceSolution) {
        this.productInfoForm.patchValue({
          challenges_addressed: product.extraDataForServiceSolution.challenges_addressed || '',
          why_choose_neozaar: product.extraDataForServiceSolution.why_choose_neozaar || '',
          scope: product.extraDataForServiceSolution.scope || '',
          solution_differentiator: product.extraDataForServiceSolution.solution_differentiator || '',
        });
      }

      const featuresArray = this.convertToArray(product.key_features);
      this.patchArraySafely(this.keyFeatures, featuresArray);
      this.patchArraySafely(this.customerChallenges, product.customer_challenges || []);
      this.patchArraySafely(this.businessOutcomes, product.primary_business_outcome || []);
      this.patchArraySafely(this.useCases, product.use_cases || []);
      if (product.select_isv_products?.length) this.resolveLinkedItems(product.select_isv_products, 'products');
      if (product.select_spectrum_partner_services?.length) this.resolveLinkedItems(product.select_spectrum_partner_services, 'services');
      this.patchArraySafely(this.targetAudienceArray, product.target_audience);
      this.patchArraySafely(this.targetSegmentArray, product.target_segments);
      this.patchArraySafely(this.industryArray, product.industry);
      this.patchArraySafely(this.ctaModelArray, product.cta_model);
      this.patchArraySafely(this.cloudProviderArray, product.cloud_provider_support);
      this.patchArraySafely(this.complianceCertificationArray, product.compliance_certifications);
      
      if (product.extraDataForServiceSolution?.coverage) {
        this.patchArraySafely(this.coverage, product.extraDataForServiceSolution.coverage);
      }

      this.patchScreenshots(product.screenshots);
      this.patchArraySafely(this.broucherUpload, product.brochures);
      this.patchArraySafely(this.customerCasestudyUpload, product.customer_case_studies);
      this.patchArraySafely(this.serviceLevelDocument, product.sla_documents);
      this.patchArraySafely(this.attachments, product.files || []);

      const taxonomyGroup = this.productForm.get('taxonomy_data') as FormGroup;
      if (taxonomyGroup?.get('color')) {
        taxonomyGroup.get('color')?.setValue(product.regions_supported || []);
      }

      if (product.co_selling_partners) {
        this.patchArraySafely(this.coSelling, product.co_selling_partners);
      }

      // Existing tags (products.tags comes back as a string[]).
      this.tags = Array.isArray(product.tags) ? [...product.tags] : [];

      console.log('✅ Form data patched successfully');
    } catch (error) {
      console.error('🔴 Error patching form:', error);
    }
  }

  // Save tags on their own, via the dedicated endpoint — never changes the
  // solution's publish/draft/approval status. Used in edit mode.
  saveTags(): void {
    const productId = this.route.snapshot.paramMap.get('id');
    if (!productId) return;
    this.savingTags = true;
    this.SolutionserviceService.updateTags(productId, this.tags || [])
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

  private resolveLinkedItems(raw: any[], target: 'products' | 'services'): void {
    const ids: number[] = raw.map((v: any) => typeof v === 'object' ? v.id : Number(v)).filter(Boolean);
    const fetches = ids.map(id => this.SolutionserviceService.getProductById(id).toPromise().then((r: any) => r?.data).catch(() => null));
    Promise.all(fetches).then(results => {
      const items = results.filter(Boolean);
      if (target === 'products') this.selectedIsvProducts = items;
      else this.selectedSpectrumServices = items;
      this.aggregateInheritedFields();
      this.changeDetectorRef.detectChanges();
    });
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
  }

  mockBackendSearch(slug: string, query: string, options: string[]) {
    return of(options.filter(opt => opt.toLowerCase().includes(query.toLowerCase())));
  }

  toggleChip(fieldSlug: string, option: string) {
    const current = this.taxonomy_data.get(fieldSlug)?.value || [];
    const updated = current.includes(option)
      ? current.filter((val: string) => val !== option)
      : [...current, option];
    this.taxonomy_data.get(fieldSlug)?.setValue(updated);
    this.taxonomy_data.get(fieldSlug)?.markAsTouched();
  }

  removeTag(fieldSlug: string, tag: string) {
    const current = this.taxonomy_data.get(fieldSlug)?.value || [];
    const updated = current.filter((val: string) => val !== tag);
    this.taxonomy_data.get(fieldSlug)?.setValue(updated);
    this.taxonomy_data.get(fieldSlug)?.markAsTouched();
  }

  shouldShowAddButton(fieldSlug: string): boolean {
    const inputValue = this.searchControls[fieldSlug]?.value?.trim();
    if (!inputValue) return false;
    const selected = this.taxonomy_data.get(fieldSlug)?.value || [];
    const options = this.filteredOptions[fieldSlug] || [];
    return !options.includes(inputValue) && !selected.includes(inputValue);
  }

  addNewOption(fieldSlug: string) {
    const inputValue = this.searchControls[fieldSlug]?.value?.trim();
    if (!inputValue) return;
    const current = this.taxonomy_data.get(fieldSlug)?.value || [];
    const updated = [...current, inputValue];
    this.taxonomy_data.get(fieldSlug)?.setValue(updated);
    this.taxonomy_data.get(fieldSlug)?.markAsTouched();
    this.searchControls[fieldSlug].setValue('');
  }

  // ========== FILE HANDLING ==========
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (!files) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isSupported = ['image/jpeg', 'image/png', 'application/pdf', 'video/mp4'].includes(file.type);
      if (isSupported) {
        this.uploadedFiles.push(file);
      } else {
        alert(`File type not supported: ${file.name}`);
      }
    }
    input.value = '';
  }

  removeFile(index: number): void {
    this.uploadedFiles.splice(index, 1);
  }

  onFileSelected1(event: Event) {
    const fileInput = event.target as HTMLInputElement;
    if (fileInput.files && fileInput.files.length > 0) {
      this.selectedFile = fileInput.files[0];
    }
    fileInput.value = '';
  }

  // ========== KEY FEATURES MANAGEMENT ==========
  addTextarea(): void {
    this.keyFeatures.push(this.fb.control('', Validators.required));
  }

  removeTextarea(index: number): void {
    if (this.keyFeatures.length > 1) {
      this.keyFeatures.removeAt(index);
    }
  }

  // ========== CO-SELLING MANAGEMENT ==========
  isCoSelling(name: string): boolean {
    return this.coSelling.value.includes(name);
  }

  toggleCoSelling(name: string): void {
    if (name === 'Neozaar') return;
    const index = this.coSelling.value.indexOf(name);
    if (index === -1) {
      this.addToSelections(name);
    } else {
      this.removeFromSelections(name);
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
    const target = event.target as HTMLInputElement;
    if (!target.files?.length) return;

    const file = target.files[0];
    const maxFileSizeKB = 200;
    const fileSizeKB = file.size / 1024;

    if (fileSizeKB > maxFileSizeKB) {
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
    target.value = '';
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (!files) return;

    const maxFileSizeKB = 200;
    const allowedTypes = ['image/jpeg', 'image/png'];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (!allowedTypes.includes(file.type)) {
        alert(`Unsupported file type: ${file.name}`);
        continue;
      }

      const fileSizeKB = file.size / 1024;
      if (fileSizeKB > maxFileSizeKB) {
        alert(`File too large (max ${maxFileSizeKB} KB): ${file.name}`);
        continue;
      }

      if (this.imageFormArray && this.imageFormArray.length < this.maxImages) {
        this.imageFormArray.push(new FormControl(file));
        const url = URL.createObjectURL(file);
        this.imagePreviews.push(url);
      } else {
        alert(`Max ${this.maxImages} images allowed`);
        break;
      }
    }

    input.value = '';
  }

  // ========== CATEGORY MANAGEMENT ==========
  getCategoryArray(key: string): FormArray {
    return this.productForm.get(key) as FormArray;
  }

  isSelected(key: string, value: string): boolean {
    const array = this.getCategoryArray(key);
    return array ? array.value.includes(value) : false;
  }

  isSelectedPrice(value: string): boolean {
    return this.pricingModel.value === value;
  }

  toggleValue(key: string, value: string): void {
    const array = this.getCategoryArray(key);
    if (array && !array.value.includes(value)) {
      while (array.length) {
        array.removeAt(0);
      }
      array.push(new FormControl(value));
    }
  }

  isLast(item: any, array: any[]): boolean {
    return array.indexOf(item) === array.length - 1;
  }

  onCategoryUpdate(data: any) {
    this.categoryData = data;
  }

  // ========== VALIDATION HELPERS ==========
  logInvalidFields(): void {
    console.group('%c FORM VALIDATION ERROR ', 'background: #ff0000; color: #fff; font-weight: bold;');
    
    const invalidFields: string[] = [];
    
    Object.keys(this.productForm.controls).forEach(key => {
      const control = this.productForm.get(key);
      if (control && control.invalid) {
        invalidFields.push(key);
        console.log(`❌ Invalid field: ${key}`, control.errors);
      }
    });

    const productInfo = this.productForm.get('productInfo') as FormGroup;
    if (productInfo) {
      Object.keys(productInfo.controls).forEach(key => {
        const control = productInfo.get(key);
        if (control && control.invalid) {
          invalidFields.push(`productInfo.${key}`);
          console.log(`❌ Invalid field: productInfo.${key}`, control.errors);
        }
      });
    }

    if (this.ctaModelArray.length === 0) console.log('❌ CTA Model is required');

    console.log('Total invalid fields:', invalidFields.length);
    console.groupEnd();
  }

  // ========== FORM SUBMISSION ==========
  onCheckvalidate(): void {
    if (this.productForm.invalid) {
      this.productForm.markAllAsTouched();
      console.log('⚠️ Form is invalid');
      this.logInvalidFields();
      this.toasterService.setToaster('error', 'Validation Error', 'Please fill all required fields');
      return;
    }

    if (this.selectedIsvProducts.length === 0 && this.selectedSpectrumServices.length === 0) {
      this.toasterService.setToaster('error', 'Validation Error', 'Please select at least one Product or Service.');
      return;
    }

    const selectedCtaModels = this.ctaModelArray.value.filter((v: string) => v && v.trim());
    if (selectedCtaModels.length !== 1) {
      const message = selectedCtaModels.length === 0
        ? 'Please select at least one CTA Model.'
        : 'Please select only one CTA Model.';
      this.toasterService.setToaster('error', 'Invalid Selection', message);
      return;
    }

    console.log('✅ Form is valid! Opening modal...');
    this.ProductModalOpen = true;
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

  onSubmit() {
    if (this.productForm.invalid) {
      this.productForm.markAllAsTouched();
      this.logInvalidFields();
      this.toasterService.setToaster('error', 'Validation Error', 'Please fill all required fields');
      return;
    }

    this.ProductModalOpen = false;
    this.isreqSending = true;

    const formData = this.prepareFormData();

    if (this.router.url.includes('/edit')) {
      this.updateProduct(formData);
    } else {
      this.createProduct(formData);
    }
  }

  private prepareFormData(): FormData {
    const data = this.productForm.value;
    const formData = new FormData();

    formData.append('name', data.productInfo.name || '');
    formData.append('brand_name', data.productInfo.brand_name || '');
    formData.append('is_feature', data.productInfo.is_feature ? 'true' : 'false');
    formData.append('short_description', data.productInfo.description || '');
    formData.append('primary_use_cases', data.productInfo.primary_use_cases || '');
    formData.append('solution_differentiator', data.productInfo.solution_differentiator || '');
    formData.append('long_description', data.productInfo.longdescription || '');
    formData.append('key_features', JSON.stringify(data.productInfo.keyFeatures));
    const challenges = (data.productInfo.customerChallenges || []).filter((c: string) => c?.trim());
    const outcomes = (data.productInfo.businessOutcomes || []).filter((o: string) => o?.trim());
    const ucases = (data.productInfo.useCases || []).filter((u: string) => u?.trim());
    formData.append('customer_challenges', JSON.stringify(challenges));
    formData.append('primary_business_outcome', JSON.stringify(outcomes));
    formData.append('use_cases', JSON.stringify(ucases));
    formData.append('select_isv_products', JSON.stringify(this.selectedIsvProducts.map((p: any) => p.id)));
    formData.append('select_spectrum_partner_services', JSON.stringify(this.selectedSpectrumServices.map((s: any) => s.id)));
    formData.append('cta_model', JSON.stringify(data.ctaModel));
    formData.append('target_audience', JSON.stringify(data.targetAudience));
    formData.append('industry', JSON.stringify(data.industry));
    formData.append('target_segments', JSON.stringify(data.targetSegment));
    formData.append('category_subcategory', this.categoryData.category_subcategory ? JSON.stringify(this.categoryData.category_subcategory) : '');
    formData.append('category', this.categoryData.category ? JSON.stringify(this.categoryData.category) : '');
    formData.append('regions_supported', JSON.stringify(data.taxonomy_data.color));
    formData.append('cloud_provider_support', JSON.stringify(data.cloudProvider));
    formData.append('technical_prerequisites', data.productInfo.technicalPrerequsite || '');
    formData.append('oem_sku', data.productInfo.oem_sku || '');
    formData.append('demo_video_link', data.productInfo.demovideoLink || '');
    formData.append('api_metering_endpoint', data.productInfo.meteringEndPoint || '');
    formData.append('terms_of_use_url', data.productInfo.terms_of_use_url || '');
    formData.append('pricing_model', data.productInfo.pricingModel || '');
    formData.append('compliance_certifications', JSON.stringify(data.complianceCertification));
    formData.append('consent_data_privacy_policy', data.productInfo.consentPolicy ? 'true' : 'false');
    formData.append('accept_marketplace_terms', data.productInfo.acceptTerms ? 'true' : 'false');
    formData.append('action_type', 'solution');
    formData.append('action_for', data.productInfo.action_for || '');
    formData.append('starting_price', data.productInfo.starting_price || '');
    formData.append('tags', JSON.stringify(this.tags || []));

    const service_solution_details = {
      overview: data.productInfo.overview || '',
      scope: data.productInfo.scope || '',
      approach: data.productInfo.approach || '',
      outcome: data.productInfo.outcome || [],
      challenges_addressed: data.productInfo.challenges_addressed || '',
      solution_differentiator: data.productInfo.solution_differentiator || '',
      why_choose_neozaar: data.productInfo.why_choose_neozaar || '',
      coverage: data.coverage || []
    };

    formData.append('service_solution_details', JSON.stringify(service_solution_details));

    if (this.serviceLevelDocument && this.serviceLevelDocument.length > 0) {
      this.serviceLevelDocument.controls.forEach(fileControl => {
        if (fileControl.value) {
          formData.append('sla_documents', fileControl.value);
        }
      });
    }

    if (this.imageFile) {
      formData.append('product_logo', this.imageFile, this.imageFile.name);
    }

    if (this.selectedFile) {
      formData.append('sales_enable_collateral', this.selectedFile, this.selectedFile.name);
    }

    this.uploadedFiles.forEach((file) => {
      formData.append('files[]', file);
    });

    if (this.attachments && this.attachments.length > 0) {
      this.attachments.controls.forEach(fileControl => {
        if (fileControl.value) {
          formData.append('attachments', fileControl.value);
        }
      });
    }

    const existingScreenshotUrls: string[] = [];
    if (this.screenshots && this.screenshots.length > 0) {
      this.screenshots.controls.forEach(fileControl => {
        if (fileControl.value) {
          if (fileControl.value instanceof File) {
            formData.append('screenshots', fileControl.value, fileControl.value.name);
          } else if (typeof fileControl.value === 'string' && fileControl.value.trim()) {
            existingScreenshotUrls.push(fileControl.value.trim());
          }
        }
      });
    }
    formData.append('existing_screenshots', JSON.stringify(existingScreenshotUrls));

    const existingBrochureUrls: string[] = [];
    if (this.broucherUpload && this.broucherUpload.length > 0) {
      this.broucherUpload.controls.forEach(fileControl => {
        if (fileControl.value) {
          if (typeof fileControl.value === 'string') {
            existingBrochureUrls.push(fileControl.value);
          } else {
            formData.append('brochures', fileControl.value);
          }
        }
      });
    }
    formData.append('existing_brochures', JSON.stringify(existingBrochureUrls));

    const existingCaseStudyUrls: string[] = [];
    if (this.customerCasestudyUpload && this.customerCasestudyUpload.length > 0) {
      this.customerCasestudyUpload.controls.forEach(fileControl => {
        if (fileControl.value) {
          if (typeof fileControl.value === 'string') {
            existingCaseStudyUrls.push(fileControl.value);
          } else {
            formData.append('customer_case_studies', fileControl.value);
          }
        }
      });
    }
    formData.append('existing_customer_case_studies', JSON.stringify(existingCaseStudyUrls));

    if (this.coSelling && this.coSelling.length > 0) {
      formData.append('co_selling_partners', JSON.stringify(this.coSelling.value));
    }

    if (this.route.snapshot.paramMap.get('type') === 'bundle') {
      const product_ids = this.productSelectData.map(item => item.id);
      if (product_ids.length > 0) {
        formData.append('product_ids', JSON.stringify(product_ids));
      }
    }

    console.log('✅ FormData prepared successfully');
    return formData;
  }

  private updateProduct(formData: FormData): void {
    const productId = this.route.snapshot.paramMap.get('id');
    console.log(`🔄 Updating solution ID: ${productId}`);

    formData.append('type', 'product');
    formData.delete('action_id');
    formData.delete('user_id');
    formData.delete('product_ids');
    // Tags are saved via the dedicated tags endpoint (saveTags), which does not
    // reset publish status. Keep them out of the normal update payload.
    formData.delete('tags');

    this.SolutionserviceService.updateProduct(productId, formData)
      .pipe(finalize(() => { this.isreqSending = false; }))
      .subscribe({
        next: (res: any) => {
          if (res.status === 'success') {
            this.toasterService.setToaster('success', 'Solution Updated', res.message || 'Solution updated successfully');
            this.router.navigate(['/solution', 'view', productId]);
          }
        },
        error: (err: any) => {
          console.error('🔴 HTTP error:', err);
          this.toasterService.setToaster('error', 'Update Failed', 'Failed to update solution');
        }
      });
  }

  private createProduct(formData: FormData): void {
    console.log('➕ Creating new solution');

    this.SolutionserviceService.createProduct(formData)
      .pipe(finalize(() => { this.isreqSending = false; }))
      .subscribe({
        next: (res: any) => {
          if (res.status === 'success') {
            this.toasterService.setToaster('success', 'Solution Added', 'Solution added successfully');
            const solutionId = res.data?.id || res.data?.product_id || res.id;
            if (solutionId) {
              this.router.navigate(['/solution', 'view', solutionId]);
            } else {
              this.router.navigate(['/solution']);
            }
          }
        },
        error: (err: any) => {
          console.error('🔴 HTTP error:', err);
          this.toasterService.setToaster('error', 'Creation Failed', 'Failed to create solution');
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
      this.toasterService.setToaster('error', 'Validation Error', 'Please fill all required fields');
      return;
    }

    if (!this.validateStep(currentGroup)) {
      return;
    }

    this.currentStep = index;
    setTimeout(() => this.moveUnderline(index));
  }

  private validateStep(currentGroup: FormGroup): boolean {
    if (currentGroup === this.productInfoForm) {
      if (!this.keyFeatures.value || this.keyFeatures.value.length === 0 || !this.keyFeatures.value[0]?.trim()) {
        this.toasterService.setToaster('error', 'Validation Error', 'Please add at least one Key Feature.');
        return false;
      }
    }
    return true;
  }

  // ========== UI HELPERS ==========
  moveUnderline(index: number) {
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

export function maxSelectedCheckboxes(max = 1): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    if (control instanceof FormArray) {
      const totalSelected = control.value.filter((v: string) => v && v.trim()).length;
      return totalSelected > max ? { maxSelected: true } : null;
    }
    return null;
  };
}

export function minSelectedCheckboxes(min = 1) {
  return (control: AbstractControl): ValidationErrors | null => {
    if (control instanceof FormArray) {
      return control.length >= min ? null : { required: true };
    }
    return null;
  };
}
