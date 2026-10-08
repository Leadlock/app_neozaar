import { Component, ElementRef, inject, OnInit, ViewChild,HostListener, QueryList, ViewChildren } from '@angular/core';
import { FormBuilder, Validators, FormArray, FormControl, FormGroup, FormsModule, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HelperServiceService } from '../../../utils/helper-service.service';
import { ActivatedRoute, Router } from '@angular/router';
import {SelectableProductListModalComponent} from '../../../shared/components/products/selectable-product-list-modal/selectable-product-list-modal.component';
import { ToasterService } from '../../../shared/providers/toaster/toaster.service';
import { finalize, Observable, pipe, take } from 'rxjs';
import { ProductService } from '../product-service.service';
import { AuthService } from '../../../core/services/auth.service';
import { debounceTime, distinctUntilChanged, switchMap, filter } from 'rxjs/operators';
import { of } from 'rxjs';
import { FileUploadComponent } from '../only-product/file-upload.component'; // ✅ Adjust the path
import {ImageUploadComponent} from '../only-product/image-upload/image-upload.component'
import {BundleService} from '../../bundle/bundle.service';
// interface FieldOption {
//   label: string;
//   type: 'Textarea' | 'Multi-Select';
//   options?: string[];
//   value?: any;
// }
@Component({
  selector: 'app-bundle-create',
  standalone: true,
  imports: [CommonModule, FormsModule, CommonModule, ReactiveFormsModule, SelectableProductListModalComponent,FileUploadComponent,ImageUploadComponent],
  templateUrl: './bundle-create.component.html',
  styleUrl: './bundle-create.component.css'
})
export class BundleCreateComponent {
  @ViewChildren('searchContainer') searchContainers!: QueryList<ElementRef>;

  // @ViewChild('modalGroup') modalGroup!: ElementRef<HTMLDialogElement>;
    // Removed duplicate router property; use the constructor-injected router instead.
     currentStep = 0;
  productForm!: FormGroup;
  isproductSelectModalOpen: boolean = false
  productSelectData: any[]=[];
  partnerSelectData: any[]=[];
  serviceSelectData: any[]=[];
  image_url: File | null = null;
  customCouponImageUrl: any = '';
  consentPolicy = false;
  acceptTerms = false;
  couponForm!: FormGroup;
  profileUrl = 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
  // defaultImage = 'assets/default-profile.png';
  errorMessage = '';
showBundleSection :boolean= false;
  isreqSending: boolean = false;
productId: number = 0;
updateButton:boolean=false;
  uploadedFiles: File[] = [];
  consent_data_privacy_policy:boolean =false;
    accept_bundle_listing_terms:boolean =false;

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

Newcategories = {
  platformCategory: ['Web', 'Mobile', 'Desktop'],
  selling: ['B2B', 'B2C'],
  targetAudience: ['SMB', 'Mid-market', 'Enterprise','Govt'],
  primarybusinessoutcome: ['Faster Cloud Migration','Optimized Cloud Costs','Industry-specific Use Case', 'Improved Security & Compliance','AI/Analytics Deployment', 'Others'],
  cloudPlatform:['Azure VMs','AKS','App Service','Synapse','Others'],
  supportedAwsService: ['AWS', 'Azure', 'GCP'],
  cloudProvider: ['AWS', 'Azure', 'GCP', 'SaaS', 'On-Premise'],


};

selectedProducts = [
    {
      image: 'https://via.placeholder.com/50',  // replace with actual product image
      title: 'Acronis Cyber Protect for Endpoint...',
      isv: 'ISV NAME'
    },
    {
      image: 'https://via.placeholder.com/50',
      title: 'Acronis Cyber Protect for Endpoint...',
      isv: 'ISV NAME'
    },
    {
      image: 'https://via.placeholder.com/50',
      title: 'Acronis Cyber Protect for Endpoint...',
      isv: 'ISV NAME'
    }
  ];

 categories = ['saas', 'Cloud1', 'Bank1', 'Health Care1', 'Startup', 'Cloud', 'Bank', 'Health Care'];
 platFormTypeArray=['SAAS', 'PASS', 'None'];
 externalSupport=['Yes','No'];
   coSellingArray = ['Neozaar', 'AWS', 'Azure', 'GCP', 'MS 365', 'Other'];

  selectedFields = [
    {
      slug: 'supported_regions',
      options: ['India', 'MEA', 'APAC', 'North America', 'Europe', 'Global']
    },
  ];
    searchControls: { [key: string]: FormControl } = {};
  filteredOptions: { [key: string]: string[] } = {};

  constructor(private helperService: HelperServiceService, private fb: FormBuilder, private route: ActivatedRoute, private router: Router,
    private toasterService: ToasterService, private productService: ProductService,private auth:AuthService, private bndleService:BundleService,
  ) {

  
    if(this.route.snapshot.paramMap.get('type')=='bundle'){
 this.showBundleSection = true;
    }


  }
  ngOnInit(){
   this.productForm = this.fb.group({
     productInfo: this.fb.group({
      user_id:[this.auth.userId],
      action_id: [this.route.snapshot.paramMap.get('type')=='product'?1:2],
      action_type: [this.route.snapshot.paramMap.get('type')],
      // license_type:['monthly'],
      name: ['', Validators.required],
      description: ['',Validators.required],
      demovideoLink:['',Validators.required],
      bundleType:['',Validators.required],
      longdescription:['',Validators.required],
      supported_regions:[''],
      keyFeatuares: this.fb.array([this.fb.control('')]),
      
    }),
    technicalInfo: this.fb.group({
      bundle_pricing_model:['', Validators.required],
      deploymentModel:[''],
      technicalPrerequsite:[''],
      meteringEndPoint:[''],
      targetCustomerSegments:['',Validators.required],
      workloadTypes:['',Validators.required],
    cloud_provider_focus:[''],
         
    }),
    pricing: this.fb.group({
          pricingModel:[''],
      billingDimension:[''],
      licenceModel:[''],
    externalSupport:['Yes'],
      productRole:['', Validators.required],
          serviceRole:['' , Validators.required],
          freeAssesment:['No'],
             
   }),
    supportInfo: this.fb.group({
 
    serviceLevelDocument:this.fb.array([]) ,
     licensingmodel: ['', Validators.required],
     free_assessment_poc:[''],
    indicative_price_range:['', Validators.required],
    engagementDuration:['', Validators.required],
    deliveryMode:['', Validators.required]
    // engagementDuration:[''],
  }),
  mediaInfo: this.fb.group({
    image_url: [null, Validators.required],
    // screenshots: this.fb.array([]),
    customerCasestudyUpload:this.fb.array([]) ,
    broucherUpload:this.fb.array([]) ,
     consent_data_privacy_policy :[false],
  accept_bundle_listing_terms :[false],
    // demovideoLink:[''],
    
    
  }),
  complienceInfo: this.fb.group({
    expoertCompliance:[''],
    EULA:[''],
    privcyPolicy:[''],
  }),
  taxonomy_data: this.fb.group({}),
  productSelectData: this.fb.array([]),
  serviceSelectData: this.fb.array([]),
  partnerSelectData: this.fb.array([]),
  differentiation: [''],
  WhatsIncluded: [''],
  categoryType:[''],

  primarybusinessoutcome:this.fb.array([]),
  coSelling: this.fb.array([]),
  selling: this.fb.array([]),
  attachments: this.fb.array([]) , // <--- here's where files g
  targetAudience: this.fb.array([]),
  platformCategory: this.fb.array([]),
  // cloudProvider: this.fb.array([]),
  supportedAwsService: this.fb.array([]),
  cloudProvider: this.fb.array([]),

 

       // status: [true],
      // is_publish:[true]
    });
  this.addToSelections('Neozaar');
  
    const taxonomyGroup = this.productForm.get('taxonomy_data') as FormGroup;
    this.selectedFields.forEach(field => {
      // Set default selected values
      taxonomyGroup.addControl(field.slug, this.fb.control([]));
      // Init debounced search for each field
      this.initBackendSearch(field.slug, field.options);
    });


    if(this.router.url.includes('/edit')){
      this.updateButton=true
      this.loadProduct();
    }
  }

  steps = [
  { key: 'productInfo', label: 'Bundle Detail', required: true },
  { key: 'technicalInfo', label: 'Business & Technical fit', required: true },
  { key: 'pricing', label: 'Bundle composition', required: true },
  { key: 'supportInfo', label: 'Commercials & Engagement', required: true },
  { key: 'mediaInfo', label: 'Media & Legal', required: true },
];


get productInfoForm() {
  return this.productForm.get('productInfo') as FormGroup;
}

get technicalInfoForm() {
  return this.productForm.get('technicalInfo') as FormGroup;
}

get pricingInfoForm() {
  return this.productForm.get('pricing') as FormGroup;
}

get supportInfoForm() {
  return this.productForm.get('supportInfo') as FormGroup;
}
get mediaInfoForm() {
  return this.productForm.get('mediaInfo') as FormGroup;
}
get complienceInfoForm() {
  return this.productForm.get('complienceInfo') as FormGroup;
}
get activeStep() {
  return this.steps[this.currentStep];
}
    get broucherUpload(): FormArray {
    return this.mediaInfoForm.get('broucherUpload') as FormArray;
  }

    get serviceLevelDocument(): FormArray {
    return this.supportInfoForm.get('serviceLevelDocument') as FormArray;
  } 
   get customerCasestudyUpload(): FormArray {
    return this.mediaInfoForm.get('customerCasestudyUpload') as FormArray;
  }

    get attachments(): FormArray {
    return this.productForm.get('attachments') as FormArray;
  }
//  get screenshots(): FormArray {
//     return this.mediaInfoForm.get('screenshots') as FormArray;
//   }
  // 
getCategoryArray(key: string): FormArray {
  return this.productForm.get(key) as FormArray;
}

isSelected(key: string, value: string): boolean {
  return this.getCategoryArray(key).value.includes(value);
}

toggleValue(key: string, value: string): void {
  const array = this.getCategoryArray(key);
  const index = array.value.indexOf(value);

  if (index === -1) {
    array.push(new FormControl(value));
  } else {
    array.removeAt(index);
  }
}

  // 

loadProduct() {
  this.productId = Number(this.route.snapshot.paramMap.get('id'));

  this.productService.getBundleById(this.productId).subscribe({
    next: async (res: any) => {
      const product = res.data;

      // if (!product || this.route.snapshot.paramMap.get('type') !== product.type) {
      //   this.router.navigate(['/dashboard']);
      //   return;
      // }

      // Patch basic product info
      this.productInfoForm.patchValue({
        name: product.name,
        description: product.short_description,
        demovideoLink: product.demo_video_url,
        bundleType: product.bundle_type,
        longdescription: product.detailed_description,
       
      });

      // Patch technical info
      this.technicalInfoForm.patchValue({
        bundle_pricing_model: product.bundle_pricing_model,
        deploymentModel: product.deployment_model,
        technicalPrerequsite: '', // Adjust if data available
        meteringEndPoint: '',     // Adjust if data available
        targetCustomerSegments: product.target_customer_segments,
        workloadTypes: product.workload_types,
        cloud_provider_focus: '' // You'll populate FormArray below
      });

      // Patch pricing info
      this.pricingInfoForm.patchValue({
        pricingModel: '',
        billingDimension: '',
        licenceModel: product.licensing_model,
        externalSupport: product.external_support_required==true ?'Yes':'No',
        freeAssesment: product.free_assessment_poc==true ?'Yes':'No',
        productRole: product.product_role_in_bundle,
        serviceRole: product.service_role_in_bundle
      });

      // Patch support info
      this.supportInfoForm.patchValue({
        licensingmodel: product.licensing_model,
        free_assessment_poc: product.free_assessment_poc,
        indicative_price_range: product.indicative_price_range,
        engagementDuration: product.engagement_duration,
        deliveryMode: product.delivery_mode
      });

      // Patch media info
      this.customCouponImageUrl = product.bundle_logo;
      // this.image_url = await this.urlToFile(product.bundle_logo, 'product.jpg');
      this.mediaInfoForm.patchValue({
        image_url: this.image_url,
         consent_data_privacy_policy: product.consent_data_privacy_policy,
        accept_bundle_listing_terms: product.accept_bundle_listing_terms
        // demovideoLink: product.demo_video_url
      });

      // Populate form arrays (attachments, datasheets, case studies)
      this.resetFormArray(this.broucherUpload, product.datasheets);
      this.resetFormArray(this.customerCasestudyUpload, product.case_studies);

      // Taxonomy data: supported_regions
      const taxonomyDataGroup = this.productForm.get('taxonomy_data') as FormGroup;
      // if (!taxonomyDataGroup.get('supported_regions')) {
      //   taxonomyDataGroup.addControl('supported_regions', this.fb.control([]));
      // }
      taxonomyDataGroup.get('supported_regions')?.setValue(product.supported_regions || []);

      // Populate cloud provider (string to FormArray)
     const cloudProviderArray = this.productForm.get('cloudProvider') as FormArray;
cloudProviderArray.clear();

const cloudProviderString = product.cloud_provider_focus?.[0] || '';
const cloudProvider = cloudProviderString.split(',').map((s: string) => s.trim()).filter(Boolean);

cloudProvider.forEach((value: any) => cloudProviderArray.push(this.fb.control(value)));

      (product.cloud_provider_focus || []).forEach((value: string) => {
        cloudProviderArray.push(this.fb.control(value));
      });

      // Primary business outcomes
const pboArray = this.productForm.get('primarybusinessoutcome') as FormArray;
pboArray.clear();

const outcomesString = product.primary_business_outcome?.[0] || '';
const outcomes = outcomesString.split(',').map((s: string) => s.trim()).filter(Boolean);
outcomes.forEach((value: any) => pboArray.push(this.fb.control(value)));

      // Populate selected ISV products
      // const psArray = this.productForm.get('productSelectData') as FormArray;
      // psArray.clear();
      // (product.isv_products_details || []).forEach((item: number) => {
      //   psArray.push(this.fb.control(item));
      // });

      this.productSelectData=product.isv_products_details || [];
        // const psArray = this.productForm.get('productSelectData') as FormArray;
      // product.isv_products_details?.forEach((item: string) => {
      //   this.productSelectData.push(this.fb.control(item));
      // });
      console.log(this.productSelectData);
      
      // Populate partner data
      const ptArray = this.productForm.get('partnerSelectData') as FormArray;
      ptArray.clear();
      (product.spectrum_partners || []).forEach((item: any) => {
        ptArray.push(this.fb.control(item));
      });

      // Populate services
      const ssArray = this.productForm.get('serviceSelectData') as FormArray;
      ssArray.clear();
      (product.select_spectrum_partner_services || []).forEach((item: any) => {
        ssArray.push(this.fb.control(item));
      });

    },
    error: (err) => {
      this.router.navigate(['/dashboard']);
      console.error('HTTP error:', err);
    }
  });
}

resetFormArray(formArray: FormArray, values: string[]) {
  formArray.clear();
  values?.forEach((url: string) => {
    formArray.push(this.fb.control(url));
  });
}
allowOnlyAlphabets(event: KeyboardEvent) {
  const pattern = /^[a-zA-Z]$/;
  const inputChar = String.fromCharCode(event.keyCode);

  if (!pattern.test(inputChar)) {
    event.preventDefault(); // block invalid char
  }
}

// async urlToFile(url: string, filename: string): Promise<File> {
//   const response = await fetch(url);
//   const blob = await response.blob();
//   const contentType = blob.type || 'image/jpeg';
//   return new File([blob], filename, { type: contentType });
// }




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

  // Simulates a backend API search
  mockBackendSearch(slug: string, query: string, options: string[]) {
    // Simulated backend filter
    return of(
      options.filter(opt =>
        opt.toLowerCase().includes(query.toLowerCase())
      )
    );
  }

  get taxonomy_data() {
    return this.productForm.get('taxonomy_data') as FormGroup;
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

  // Check if input value should trigger + button
shouldShowAddButton(fieldSlug: string): boolean {
  const inputValue = this.searchControls[fieldSlug]?.value?.trim();
  if (!inputValue) return false;

  const selected = this.taxonomy_data.get(fieldSlug)?.value || [];
  const options = this.filteredOptions[fieldSlug] || [];

  // Show + only if value is NOT in filtered options or selected
  return !options.includes(inputValue) && !selected.includes(inputValue);
}

// Add the typed value as a new tag
addNewOption(fieldSlug: string) {
  const inputValue = this.searchControls[fieldSlug]?.value?.trim();
  if (!inputValue) return;

  const current = this.taxonomy_data.get(fieldSlug)?.value || [];
  const updated = [...current, inputValue];

  this.taxonomy_data.get(fieldSlug)?.setValue(updated);
  this.taxonomy_data.get(fieldSlug)?.markAsTouched();
  this.searchControls[fieldSlug].setValue('');
}


  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;

    if (!files) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isSupported = ['image/jpeg', 'image/png', 'application/pdf', 'video/mp4'].includes(
        file.type
      );

      if (isSupported) {
        this.uploadedFiles.push(file);
      } else {
        alert(`File type not supported: ${file.name}`);
      }
    }

  }

  removeFile(index: number): void {
    this.uploadedFiles.splice(index, 1);
  }


  //  File Array
// Platform
  get selectedPlatformControl(): FormControl {
  return this.productForm.get('platformType') as FormControl;
}

selectPlatform(category: string): void {
  if (this.selectedPlatformControl.value === category) {
    this.selectedPlatformControl.setValue('');  // Unselect if same clicked
  } else {
    this.selectedPlatformControl.setValue(category);
  }
}
// Platform
// external Support require
  get selectedExternalsupport(): FormControl {
  return this.pricingInfoForm.get('externalSupport') as FormControl;
}
  // 👇 Declare form controls as class properties
   get selectfree(): FormControl {
  return this.pricingInfoForm.get('freeAssesment') as FormControl;
   }
  // selectedExternalsupport = new FormControl('');
selectfreeacc(choice: string): void {
  this.selectfree.setValue(
    this.selectfree.value === choice ? '' : choice
  );
}

selectExternalsupport(choice: string): void {
  this.selectedExternalsupport.setValue(
    this.selectedExternalsupport.value === choice ? '' : choice
  );
}

// TextArea
 get keyFeatuares(): FormArray {
    return this.productInfoForm.get('keyFeatuares') as FormArray;
  }

  addTextarea(): void {
    this.keyFeatuares.push(this.fb.control(''));
  }

  removeTextarea(index: number): void {
    if (this.keyFeatuares.length > 1) {
      this.keyFeatuares.removeAt(index);
    }
  }

// TextArea


urlToFile(url: string, filename: string): Promise<File> {
  return fetch(url)
    .then(res => res.blob())
    .then(blob => new File([blob], filename, { type: blob.type }));
}

  onDiscard(): void {
    this.productForm.reset(); // reset all form fields
  }
  
  // minSelectedValidator(min: number) {
  //   return (control: AbstractControl) => {
  //     const value = control.value;
  //     return value && value.length >= min ? null : { minSelected: true };
  //   };
  // }
  // Add a dynamic field to the 'taxonomy_data' FormGroup
  // addDynamicField(label: string): void {
  //   const group = this.productForm.get('taxonomy_data') as FormGroup;
  //   if (!group.get(label)) {
  //     group.addControl(label, new FormControl(''));
  //   }
  // }

// Category MultiSelect
get category(): FormArray {
  return this.productForm.get('category') as FormArray;
}

isSelectedcategory(category: string): boolean {
  return this.category.value.includes(category);
}

toggleCategory(category: string): void {
  const index = this.category.value.indexOf(category);

  if (index === -1) {
    this.category.push(new FormControl(category));
  } else {
    this.category.removeAt(index);
  }
}


// Co-selling
  get coSelling(): FormArray {
    return this.productForm.get('coSelling') as FormArray;
  }

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
  // // Co-selling


  addCouponImage(e: Event) {
    const { image, imageUrl } = this.helperService.getImageFileAndUrl(e);
    // console.log('image', image);
    this.image_url = image;
    this.customCouponImageUrl = imageUrl;
    this.mediaInfoForm.get('image_url')?.setValue(image);
  }
selectedFile: File | null = null;
  onFileSelected1(event: Event) {
  const fileInput = event.target as HTMLInputElement;
  if (fileInput.files && fileInput.files.length > 0) {
    this.selectedFile = fileInput.files[0];
    console.log(this.selectedFile);
    
  }
}




onSubmit(action: 'discard' | 'draft' | 'approval'): void {
  if (action === 'discard') {
    this.productForm.reset();
    this.toasterService.setToaster('info', 'Form Reset', 'All fields cleared');
    return;
  }

  
if(!this.customCouponImageUrl){
 this.toasterService.setToaster('error', 'Image Required', 'Please upload an image for the product.');
  return;
}
   else if(this.broucherUpload.controls.length === 0){
 this.toasterService.setToaster('error', 'Datasheet Required', 'Please upload at least one datasheet.');
  return;
      }else if(this.customerCasestudyUpload.controls.length === 0){
        this.toasterService.setToaster('error', 'Case Study Required', 'Please upload at least one case study.');
        return;
      }else if(this.mediaInfoForm.get('consent_data_privacy_policy')?.value !== true || this.mediaInfoForm.get('accept_bundle_listing_terms')?.value !== true){
        this.toasterService.setToaster('error', 'Terms & Conditions', 'Please accept the terms and conditions to proceed.');
        return;
      } 

  // 🔹 Validation checks
  // if (this.productForm.invalid) {
  //   this.productForm.markAllAsTouched();
  //   this.toasterService.setToaster('error', 'All Fields Required', '');
  //   return;
  // }
  // if (!this.customCouponImageUrl) {
  //   this.toasterService.setToaster('error', 'Image Required', 'Please upload an image for the product.');
  //   return;
  // }
  // if (this.productSelectData.length === 0 && this.route.snapshot.paramMap.get('type') === 'bundle') {
  //   this.toasterService.setToaster('error', 'PRODUCT', 'Please add at least one product to the bundle.');
  //   return;
  // }


  this.isreqSending = true;
  const data = { ...this.productForm.value };
  const formData = new FormData();

  // 🔹 Core fields
  formData.append('user_id', data.user_id);
  formData.append('name', data.productInfo.name);
  formData.append('consent_data_privacy_policy', data.mediaInfo.consent_data_privacy_policy); 
  formData.append('accept_bundle_listing_terms', data.mediaInfo.accept_bundle_listing_terms);
  formData.append('free_assessment_poc', this.selectfree.value === 'Yes' ? 'true' : 'false');
  formData.append('external_support_required', this.selectedExternalsupport.value === 'Yes' ? 'true' : 'false');

  // 🔹 Product Info
  formData.append('bundle_type', data.productInfo.bundleType);
  formData.append('short_description', data.productInfo.description);
  formData.append('demo_video_url', data.productInfo.demovideoLink);
  formData.append('primary_business_outcome', JSON.stringify(data.primarybusinessoutcome));
  formData.append('detailed_description', data.productInfo.longdescription);

  // 🔹 Technical Info
  formData.append('bundle_pricing_model', data.technicalInfo.bundle_pricing_model);
  formData.append('target_customer_segments', data.technicalInfo.targetCustomerSegments);
  formData.append('workload_types', data.technicalInfo.workloadTypes);

  // 🔹 Support Info
  formData.append('engagement_duration', data.supportInfo.engagementDuration);
  formData.append('delivery_mode', data.supportInfo.deliveryMode);
  formData.append('licensing_model', data.supportInfo.licensingmodel);
  formData.append('indicative_price_range', data.supportInfo.indicative_price_range);

  // 🔹 Pricing Info
  formData.append('product_role_in_bundle', data.pricing.productRole);
  formData.append('service_role_in_bundle', data.pricing.serviceRole);

  // 🔹 Taxonomy
  formData.append('supported_regions', JSON.stringify(data.taxonomy_data.supported_regions));
  formData.append('cloud_provider_focus', JSON.stringify(data.cloudProvider));

  // 🔹 File uploads
  for (let fileControl of this.serviceLevelDocument.controls) {
    formData.append('serviceLevelDocument', fileControl.value);
  }
  if (this.image_url) {
    formData.append('bundle_logo', this.image_url);
  }
  if (this.selectedFile) {
    formData.append('sales_enable_collateral', this.selectedFile);
  }
  this.uploadedFiles.forEach((file) => {
    formData.append('files[]', file);
  });
  for (let fileControl of this.attachments.controls) {
    formData.append('sla_documents', fileControl.value);
  }
  // for (let fileControl of this.screenshots.controls) {
  //   formData.append('screenshots', fileControl.value);
  // }
  for (let fileControl of this.broucherUpload.controls) {
    formData.append('datasheets', fileControl.value);
  }
  for (let fileControl of this.customerCasestudyUpload.controls) {
    formData.append('case_studies', fileControl.value);
  }

  // 🔹 Bundle-specific IDs
  // if (this.route.snapshot.paramMap.get('type') === 'bundle') {
    const product_ids = this.productSelectData.map(item => item.id);
    formData.append('select_isv_products', JSON.stringify(product_ids));

    const service_ids = this.serviceSelectData.map(item => item.id);
    formData.append('select_spectrum_partner_services', JSON.stringify(service_ids));

    const partner_ids = this.partnerSelectData.map(item => item.id);
    // formData.append('partners_ids', JSON.stringify(partner_ids));
  // }

  // 🔹 Flags based on action
  if (action === 'draft') {
    // formData.append('is_draft', 'true');
    // formData.append('is_publish', 'false');
    // formData.append('is_approved', 'false');
  } else if (action === 'approval') {
    // formData.append('is_draft', 'false');
    // formData.append('is_publish', 'false');
    // formData.append('is_approved', 'false');
  }

  // formData.append('published_by', '');
  // formData.append('approved_by', '');

  // Debug log
  for (const [key, value] of (formData as any).entries()) {
    console.log(`${key}: ${value}`);
  }


  // 🔹 API call
this.isreqSending = true; // set before API call

// if (this.router.url.includes('/edit')) {
//   formData.delete('user_id');

//   this.bndleService.updatBundle(this.route.snapshot.paramMap.get('id'), formData)
//     .pipe(finalize(() => this.isreqSending = false)) // reset after API completes
//     .subscribe({
//       next: (res: any) => {
//         if (res.status === 'success') {
//           this.toasterService.setToaster(
//             'success',
//             'Product update',
//             res.message || 'Product updated successfully'
//           );
//         }
//       },
//       error: (err: any) => {
//         console.error('HTTP error:', err);
//         this.toasterService.setToaster(
//           'error',
//           'Update failed',
//           'Something went wrong while updating'
//         );
//       }
//     });

// } else {
//   this.productService.createbundle(formData)
//     .pipe(finalize(() => this.isreqSending = false))
//     .subscribe({
//       next: (res: any) => {
//         if (res.status === 'success') {
//           this.toasterService.setToaster(
//             'success',
//             'Product Added',
//             res.message || 'Product added successfully'
//           );
//         }
//       },
//       error: (err: any) => {
//         console.error('HTTP error:', err);
//         this.toasterService.setToaster(
//           'error',
//           'Creation failed',
//           'Something went wrong while creating product'
//         );
//       }
//     });
// }

}


      closedModal(selectedItems: any[] | null) {
  this.isproductSelectModalOpen = false;
  
  if (selectedItems) {
    switch(this.currentModalType) {
      case 'products':
        this.productSelectData = selectedItems;
        break;
      case 'services':
        this.serviceSelectData = selectedItems;
        break;
      case 'partners':
        this.partnerSelectData = selectedItems;
        break;
    }
  }
}

  // ADD PRODUCT
  getCurrentSelections(): any[] {
  switch(this.currentModalType) {
    case 'products': return this.productSelectData;
    case 'services': return this.serviceSelectData;
    case 'partners': return this.partnerSelectData;
    default: return [];
  }
}
removeItem(item: any, type: 'products' | 'services' | 'partners') {
  switch(type) {
    case 'products':
      this.productSelectData = this.productSelectData.filter(p => p.id !== item.id);
      break;
    case 'services':
      this.serviceSelectData = this.serviceSelectData.filter(s => s.id !== item.id);
      break;
    case 'partners':
      this.partnerSelectData = this.partnerSelectData.filter(p => p.id !== item.id);
      break;
  }
}
currentModalType: 'products' | 'services' | 'partners' = 'products';
// isproductSelectModalOpen = false;

openAddproductModal(type: 'products' | 'services' | 'partners') {
  this.currentModalType = type;
  this.isproductSelectModalOpen = true;
}



// closedModal(data: any) {
//   this.isproductSelectModalOpen = false; 
//   if(data != null){
//     this.productSelectData = data; // Get the selected data
//     // Close the modal
//   }


  
  // console.log("Selected data from modal:", data);
// }

// ngAfterViewInit() {
//   console.log('containers count:', this.searchContainers?.length); // should be 3
// }

  // Detect click outside
 @HostListener('document:click', ['$event'])
  handleClickOutside(event: MouseEvent) {
    if (!this.searchContainers || !this.searchContainers.length) return;

    const containers = this.searchContainers.toArray();

    this.selectedFields.forEach((field, index) => {
      const container = containers[index];
      if (container && !container.nativeElement.contains(event.target)) {
        this.searchControls[field.slug].setValue('');
        this.filteredOptions[field.slug] = [];
      }
    });
  }


 

  prevStep() {
    if (this.currentStep > 0) this.currentStep--;
        setTimeout(() => this.moveUnderline(this.currentStep));

  }

   setActiveTab(index: number) {
 if (index <= this.currentStep){
       this.currentStep = index;
    setTimeout(() => this.moveUnderline(index));
      return;
    }
    else{
     const currentGroup = this.productForm.get(this.activeStep.key) as FormGroup;
  // if (currentGroup.invalid) {
  //   currentGroup.markAllAsTouched();
  //   return;
  // }
  console.log(index);
    console.log(this.productForm.value.taxonomy_data.supported_regions.length);


  if (currentGroup.invalid) {
      currentGroup.markAllAsTouched();
      this.toasterService.setToaster('error', 'All Fields Required','');
      return;
    }
    else if(currentGroup === this.productInfoForm){
  const url = this.productInfoForm.value.demovideoLink;
  let isValidUrl = true;
  try {
    new URL(url); // throws if invalid
  } catch {
    isValidUrl = false;
  }
  if (!isValidUrl) {
    this.toasterService.setToaster(
      'error',
      'Invalid Video Link',
      'Please enter a valid demo video URL.'
    );
    return;
  }

else if(this.productForm.value.taxonomy_data.supported_regions.length === 0){
        this.toasterService.setToaster('error', 'Supported Regions Required', 'Please select at least one supported region.');
       return;
      }
    }else if(currentGroup === this.technicalInfoForm){
      console.log(this.productForm.value.primarybusinessoutcome);
      
      if(this.productForm.value.primarybusinessoutcome.length === 0){   
        this.toasterService.setToaster('error', 'primary business outcome Required', 'Please select at least one primary business outcome');
        return;
      }  else if(this.productForm.value.cloudProvider.length === 0){
         this.toasterService.setToaster('error', 'Cloud Provider Required', 'Please select Cloud Provider');
        return;
      }
    }else if(currentGroup === this.pricingInfoForm){
      if(this.productSelectData.length === 0){
        this.toasterService.setToaster('error', 'Product Required', 'Please select at least one product');
        return;     
      }
    }else if(currentGroup === this.mediaInfoForm){
if(this.productForm.value.broucherUpload.length === 0){
 this.toasterService.setToaster('error', 'Datasheet Required', 'Please upload at least one datasheet.');
  return;
      }else if(this.productForm.value.customerCasestudyUpload.length === 0){
        this.toasterService.setToaster('error', 'Case Study Required', 'Please upload at least one case study.');
        return;
      }

    }
    this.currentStep = index;
    setTimeout(() => this.moveUnderline(index));
  }
}

  // moveUnderline(index: number) {
  //   const tabs = document.querySelectorAll('.tab-button');
  //   const underline = document.querySelector('.tab-underline') as HTMLElement;
  //   const el = tabs[index] as HTMLElement;
  //   const rect = el.getBoundingClientRect();
  //   const parentRect = el.parentElement!.getBoundingClientRect();
  //   underline.style.left = `${rect.left - parentRect.left-6}px`;
  //   underline.style.width = `${rect.width}px`;
  // }

  moveUnderline(index: number) {
  const underline = document.querySelector('.tab-underline') as HTMLElement;
  const tabs = document.querySelectorAll('.tab-button');
  const totalTabs = tabs.length;

  // Calculate cumulative width from first tab to current
  let width = 0;
  for (let i = 0; i <= index; i++) {
    const el = tabs[i] as HTMLElement;
    width += el.getBoundingClientRect().width;
  }

  underline.style.width = `${width+(index*index*index)+10}px`;
}


  ngAfterViewInit() {
    setTimeout(() => this.moveUnderline(this.currentStep));
    window.addEventListener('resize', () => this.moveUnderline(this.currentStep));
  }
  //  tabs = [
  //   'Product Information',
  //   'Technical Information',
  //   'Pricing & Licensing',
  //   'Support Information',
  //   'Media & Assets',
  //   'Legal & Compliance'
  // ];
}
