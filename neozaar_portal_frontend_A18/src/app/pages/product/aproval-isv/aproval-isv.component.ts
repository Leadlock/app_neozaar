import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  Validators,
  FormGroup,
  ReactiveFormsModule,
  FormsModule,
  FormControl,
  FormArray,
  AbstractControl,
  ValidationErrors,
  ValidatorFn,
} from '@angular/forms';
import { Router } from '@angular/router';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

import { FileUploadComponent } from '../only-product/file-upload.component';
import { ImageUploadComponent } from '../only-product/image-upload/image-upload.component';
import { CustomPhoneInputComponent } from '../../../shared/components/custom-phone-input/custom-phone-input.component';

import { UserserviceService } from '../../../core/services/userservice.service';
import { ToasterService } from '../../../shared/providers/toaster/toaster.service';

@Component({
  selector: 'app-aproval-isv',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    FileUploadComponent,
    ImageUploadComponent,
    CustomPhoneInputComponent,
  ],
  templateUrl: './aproval-isv.component.html',
  styleUrls: ['./aproval-isv.component.css'],
})
export class AprovalIsvComponent implements OnInit {
  isvForm!: FormGroup;
  customCouponImageUrl: string | null = null;
  imageFile: File | null = null;

  cloudOptions = ['AWS', 'Azure', 'GCP'];
  marketplaceOptions = ['AWS', 'Azure', 'GCP'];

  showCloudInput = false;
  newCloud = '';
  showMarketplaceInput = false;
  newMarketplace = '';
  loading = false;

  isvid: number | null = null;
  isvdata: any;
  invalidMessage = '';

  // File name variables for UI display
  uploadTermsFileName: string = '';
  brandLogoFileName: string = '';
  businessCertificationFileNames: string[] = [];
  
  // Store the existing business certification URL
  existingBusinessCertUrl: string | null = null;
  existingSignedDocUrl: string | null = null;

  // File validation constants
  private readonly MAX_FILE_SIZE_KB = 200; // 200KB
  private readonly MAX_TOTAL_FILE_SIZE_MB = 10; // 10MB for multiple files
  private readonly ALLOWED_FILE_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ];

  constructor(
    private userservice: UserserviceService,
    private route: ActivatedRoute,
    private toasterService: ToasterService,
    private fb: FormBuilder,
    private router: Router
  ) {}

  // ✅ Custom Email Domain Validator
  allowedEmailDomainsValidator(allowedDomains: string[]): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const email = control.value;
      if (!email) return null;
      const domain = email.split('@')[1];
      return allowedDomains.includes(domain?.toLowerCase())
        ? null
        : { invalidDomain: true };
    };
  }

  ngOnInit(): void {
    const idStr = this.route.snapshot.paramMap.get('id');
    this.isvid = idStr ? Number(idStr) : null;

    this.isvForm = this.fb.group({
      name: ['', Validators.required],
      email: [
        '',
        [
          Validators.required,
          Validators.email,
          // Temporarily commented out for debugging
          // this.allowedEmailDomainsValidator([
          //   'gmail.com',
          //   'yahoo.com',
          //   'outlook.com',
          //   'hotmail.com',
          // ]),
        ],
      ],
      image_url: [],
      company_name: ['', Validators.required],
      registered_business_name: ['', Validators.required],
      brand_name: ['', Validators.required],
      mobile: ['', Validators.required],
      Legal_entity_type: ['', Validators.required],
      tax_id: ['', Validators.required],
      headquater_country: ['', Validators.required],
      website_url: ['', Validators.required],
      linkedin_url: [''],
      cloud_partnership: this.fb.control<string[]>([]),
      existing_marketplace_listing: this.fb.control<string[]>([]),
      preferred_engagement: [''],
      data_privacy: [false, Validators.requiredTrue],
      neozaar_tc: [false, Validators.requiredTrue],
      brand_logo: ['', Validators.required],
      designation: ['', Validators.required],
      sla_link: ['', Validators.required],
      support_desk_email: ['', [Validators.required, Validators.email]],
      Tearms_of_use: [''],
      commission_percentage: ['', [Validators.required]],
      terms_of_use_link: ['', [Validators.required]],
      business_certification: this.fb.array([]),
      agreement_document: this.fb.array([], Validators.required),
      accept_terms: [false, Validators.requiredTrue],
    });

    if (this.isvid) this.getIsvDetail();
  }

  // ✅ Getters
  get agreement_document(): FormArray {
    return this.isvForm.get('agreement_document') as FormArray;
  }

  get business_certification(): FormArray {
    return this.isvForm.get('business_certification') as FormArray;
  }

  // ✅ File Validation Helper
  private validateFile(file: File): { valid: boolean; message?: string } {
    const fileSizeKB = file.size / 1024;
    const fileType = file.type.toLowerCase();

    // Check file type
    if (!this.ALLOWED_FILE_TYPES.includes(fileType)) {
      const allowedTypes = this.ALLOWED_FILE_TYPES
        .map(t => t.split('/')[1])
        .filter(t => t)
        .join(', ');
      return {
        valid: false,
        message: `Invalid file type. Allowed types: ${allowedTypes}`
      };
    }

    // Check file size
    if (fileSizeKB > this.MAX_FILE_SIZE_KB) {
      return {
        valid: false,
        message: `File size (${Math.round(fileSizeKB)}KB) exceeds maximum limit of ${this.MAX_FILE_SIZE_KB}KB`
      };
    }

    return { valid: true };
  }

  // ✅ File Upload Handler for Brand Logo
  addCouponImage(event: Event) {
    const target = event.target as HTMLInputElement;
    if (!target.files?.length) return;

    const file = target.files[0];
    
    // Validate file
    const validation = this.validateFile(file);
    if (!validation.valid) {
      this.toasterService.setToaster('error', 'Validation Error', validation.message || 'Invalid file');
      this.resetFileInput(target);
      this.isvForm?.get('brand_logo')?.setValue(null);
      this.customCouponImageUrl = null;
      this.imageFile = null;
      return;
    }

    this.imageFile = file;

    if (this.customCouponImageUrl) {
      URL.revokeObjectURL(this.customCouponImageUrl);
    }

    this.customCouponImageUrl = URL.createObjectURL(file);
    this.isvForm.get('brand_logo')?.setValue('hasFile');
    this.brandLogoFileName = file.name;
  }

  // ✅ Cloud Partnership
  toggleCloudPartnership(cloud: string): void {
    const selected = [...(this.isvForm.get('cloud_partnership')?.value || [])];
    const index = selected.indexOf(cloud.toLowerCase());
    if (index > -1) selected.splice(index, 1);
    else selected.push(cloud.toLowerCase());
    this.isvForm.get('cloud_partnership')?.setValue(selected);
  }

  addCustomCloud(): void {
    if (!this.newCloud.trim()) return;
    this.cloudOptions.push(this.newCloud);
    this.toggleCloudPartnership(this.newCloud);
    this.newCloud = '';
    this.showCloudInput = false;
  }

  // ✅ Marketplace
  toggleMarketplace(market: string): void {
    const selected = [...(this.isvForm.get('existing_marketplace_listing')?.value || [])];
    const index = selected.indexOf(market.toLowerCase());
    if (index > -1) selected.splice(index, 1);
    else selected.push(market.toLowerCase());
    this.isvForm.get('existing_marketplace_listing')?.setValue(selected);
  }

  addCustomMarketplace(): void {
    if (!this.newMarketplace.trim()) return;
    this.marketplaceOptions.push(this.newMarketplace);
    this.toggleMarketplace(this.newMarketplace);
    this.newMarketplace = '';
    this.showMarketplaceInput = false;
  }

  cancelAddMarketplace(): void {
    this.newMarketplace = '';
    this.showMarketplaceInput = false;
  }

  allowOnlyLettersAndSpaces(event: KeyboardEvent): void {
    const char = event.key;
    const pattern = /^[A-Za-z\s]$/;
    if (!pattern.test(char)) {
      event.preventDefault();
    }
  }

  validatePaste(event: ClipboardEvent): void {
    const pastedText = event.clipboardData?.getData('text') || '';
    const pattern = /^[A-Za-z\s]+$/;
    if (!pattern.test(pastedText)) {
      event.preventDefault();
      this.toasterService.setToaster('error', 'Validation Error', 'Only letters and spaces are allowed.');
    }
  }

  isChecked(cloud: string): boolean {
    const selected = this.isvForm.get('cloud_partnership')?.value || [];
    return selected.includes(cloud.toLowerCase());
  }

  cancelAddCloud(): void {
    this.newCloud = '';
    this.showCloudInput = false;
  }

  isCheckedmarket(market: string): boolean {
    const selected = this.isvForm.get('existing_marketplace_listing')?.value || [];
    return selected.includes(market.toLowerCase());
  }

  // ✅ Terms Upload with validation
  onTermsFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    // Validate all files before adding
    const files = Array.from(input.files);
    let hasInvalidFile = false;

    for (const file of files) {
      const validation = this.validateFile(file);
      if (!validation.valid) {
        this.toasterService.setToaster('error', 'Validation Error', validation.message || 'Invalid file');
        hasInvalidFile = true;
        break;
      }
    }

    if (hasInvalidFile) {
      this.resetFileInput(input);
      return;
    }

    // Check total file size
    const totalSizeMB = files.reduce((total, file) => total + file.size, 0) / (1024 * 1024);
    if (totalSizeMB > this.MAX_TOTAL_FILE_SIZE_MB) {
      this.toasterService.setToaster('error', 'Validation Error', 
        `Total file size (${totalSizeMB.toFixed(2)}MB) exceeds maximum limit of ${this.MAX_TOTAL_FILE_SIZE_MB}MB`);
      this.resetFileInput(input);
      return;
    }

    // Clear existing files
    this.clearFormArray(this.agreement_document);

    // Add validated files
    files.forEach((file) => {
      this.agreement_document.push(new FormControl(file));
    });

    // Update file names for display
    this.uploadTermsFileName = files.map(file => file.name).join(', ');
    this.agreement_document.updateValueAndValidity();
  }

  // ✅ Business Certification with validation
  onBusinessCertificationSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    // Validate all files before adding
    const files = Array.from(input.files);
    let hasInvalidFile = false;

    for (const file of files) {
      const validation = this.validateFile(file);
      if (!validation.valid) {
        this.toasterService.setToaster('error', 'Validation Error', validation.message || 'Invalid file');
        hasInvalidFile = true;
        break;
      }
    }

    if (hasInvalidFile) {
      this.resetFileInput(input);
      return;
    }

    // Check total file size
    const totalSizeMB = files.reduce((total, file) => total + file.size, 0) / (1024 * 1024);
    if (totalSizeMB > this.MAX_TOTAL_FILE_SIZE_MB) {
      this.toasterService.setToaster('error', 'Validation Error', 
        `Total file size (${totalSizeMB.toFixed(2)}MB) exceeds maximum limit of ${this.MAX_TOTAL_FILE_SIZE_MB}MB`);
      this.resetFileInput(input);
      return;
    }

    // Clear existing files
    this.clearFormArray(this.business_certification);

    // Add validated files
    files.forEach((file) => {
      this.business_certification.push(new FormControl(file));
    });

    // Update file names for display
    this.businessCertificationFileNames = files.map(file => file.name);
    this.business_certification.updateValueAndValidity();
    
    // Clear existing URL since new files are uploaded
    this.existingBusinessCertUrl = null;
 
  }

  // ✅ Remove business certification file
  removeBusinessCertificationFile(index: number): void {
    this.business_certification.removeAt(index);
    this.businessCertificationFileNames.splice(index, 1);
  }

  // ✅ Helper to clear form array
  private clearFormArray(formArray: FormArray): void {
    while (formArray.length !== 0) {
      formArray.removeAt(0);
    }
  }

  // ✅ Helper to reset file input
  private resetFileInput(input: HTMLInputElement): void {
    input.value = '';
  }

  // ✅ Number Validation
  validateNumber(event: any): void {
    const value = event.target.value;
    const pattern = /^(?:\d{1,2}(?:\.\d{1})?)$/;
    if (!pattern.test(value) && value !== '') {
      event.target.value = '';
      this.toasterService.setToaster('error', 'Validation Error', 'Please enter a valid number (max 2 digits before decimal, 1 after)');
    }
  }

  // ✅ Extract filename from URL
  private extractFileNameFromUrl(url: string): string {
    if (!url) return '';
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      const fileName = pathParts[pathParts.length - 1];
      return decodeURIComponent(fileName);
    } catch (e) {
      // If URL parsing fails, try simple extraction
      const parts = url.split('/');
      return parts[parts.length - 1] || 'File';
    }
  }

  // ✅ Submit - UPDATED VERSION with better error handling
  onSubmit(): void {


    // Mark all fields as touched to show validation errors
    Object.keys(this.isvForm.controls).forEach(key => {
      const control = this.isvForm.get(key);
      control?.markAsTouched();
    });

    if (this.isvForm.invalid) {
      const invalidFields = Object.keys(this.isvForm.controls).filter(
        key => this.isvForm.get(key)?.invalid
      );
     
      const firstInvalidField = invalidFields[0];
      const fieldName = this.getFieldDisplayName(firstInvalidField);
      
      this.toasterService.setToaster('error', 'Validation Error', 
        `Please fill all required fields. Check "${fieldName}"`);
      return;
    }

    if (!this.isvid) {
      this.toasterService.setToaster('error', 'Error', 'ISV ID not found');
      return;
    }

    this.loading = true;
    const formData = new FormData();

    // Append text fields
    const textFields = [
      'name', 'email', 'company_name', 'registered_business_name', 'mobile', 
      'brand_name', 'Legal_entity_type', 'tax_id', 'headquater_country', 
      'website_url', 'linkedin_url', 'preferred_engagement', 'designation', 
      'sla_link', 'support_desk_email', 'terms_of_use_link', 'commission_percentage'
    ];

    textFields.forEach(field => {
      const value = this.isvForm.get(field)?.value;
      if (value !== null && value !== undefined && value !== '') {
        formData.append(field, value.toString());
      }
    });

    // Append boolean fields
    formData.append('data_privacy', this.isvForm.get('data_privacy')?.value ? 'true' : 'false');
    formData.append('neozaar_tc', this.isvForm.get('neozaar_tc')?.value ? 'true' : 'false');
    formData.append('accept_terms', this.isvForm.get('accept_terms')?.value ? 'true' : 'false');

    // Append arrays as JSON
    const cloudPartnership = this.isvForm.get('cloud_partnership')?.value || [];
    const marketplaceListing = this.isvForm.get('existing_marketplace_listing')?.value || [];

    if (cloudPartnership.length > 0) {
      formData.append('cloud_partnership', JSON.stringify(cloudPartnership));
    }
    if (marketplaceListing.length > 0) {
      formData.append('existing_marketplace_listing', JSON.stringify(marketplaceListing));
    }

    // ✅ Append brand logo file if uploaded
    if (this.imageFile) {
      // Validate file size before appending
      const fileSizeKB = this.imageFile.size / 1024;
      if (fileSizeKB > this.MAX_FILE_SIZE_KB) {
        this.toasterService.setToaster('error', 'Validation Error', 
          `Brand logo file size (${Math.round(fileSizeKB)}KB) exceeds maximum limit of ${this.MAX_FILE_SIZE_KB}KB`);
        this.loading = false;
        return;
      }
      formData.append('brand_logo', this.imageFile, this.imageFile.name);
    } else if (this.isvdata?.isv_detail?.company_detail?.brand_logo) {
      // If no new file but we have existing URL, send the URL
      formData.append('brand_logo', this.isvdata.isv_detail.company_detail.brand_logo);
    } else {
      this.toasterService.setToaster('error', 'Validation Error', 'Brand logo is required');
      this.loading = false;
      return;
    }

    // ✅ Append agreement documents
    const signedDocs = this.agreement_document.value;
    if (Array.isArray(signedDocs) && signedDocs.length > 0) {
      // Validate each file size
      for (const file of signedDocs) {
        if (file instanceof File) {
          const fileSizeKB = file.size / 1024;
          if (fileSizeKB > this.MAX_FILE_SIZE_KB) {
            this.toasterService.setToaster('error', 'Validation Error', 
              `File "${file.name}" size (${Math.round(fileSizeKB)}KB) exceeds maximum limit of ${this.MAX_FILE_SIZE_KB}KB`);
            this.loading = false;
            return;
          }
          formData.append('agreement_document', file, file.name);
        }
      }
    } else if (this.existingSignedDocUrl) {
      // If no new files but we have existing URL, send the URL
      formData.append('agreement_document', this.existingSignedDocUrl);
    } else {
      this.toasterService.setToaster('error', 'Validation Error', 'Agreement document is required');
      this.loading = false;
      return;
    }

    // ✅ Append business certification files
    const busDocs = this.business_certification.value;


    if (Array.isArray(busDocs) && busDocs.length > 0) {
      // User uploaded new files
      busDocs.forEach((file: File) => {
        if (file instanceof File) {
          // Validate file size
          const fileSizeKB = file.size / 1024;
          if (fileSizeKB > this.MAX_FILE_SIZE_KB) {
            this.toasterService.setToaster('error', 'Validation Error', 
              `File "${file.name}" size (${Math.round(fileSizeKB)}KB) exceeds maximum limit of ${this.MAX_FILE_SIZE_KB}KB`);
            this.loading = false;
            return;
          }
          formData.append('business_certification', file, file.name);
        }
      });
    } else if (this.existingBusinessCertUrl) {
      // No new files, but we have existing URL - send the URL
      formData.append('business_certification', this.existingBusinessCertUrl);
    }


    for (const pair of (formData as any).entries()) {
      console.log(pair[0] + ': ', pair[1]);
    }

    // ✅ Call API
    this.userservice.verfyisv(this.isvid, formData).subscribe({
      next: (response: any) => {
       
        this.loading = false;
        this.toasterService.setToaster('success', 'Success', 'ISV verified successfully!');
        this.router.navigate(['/isv']);
      },
      error: (error) => {

        this.loading = false;
        
        let errorMessage = 'Failed to verify ISV.';
        if (error.error?.message) {
          errorMessage = error.error.message;
        } else if (error.status === 413) {
          errorMessage = 'File too large. Please ensure all files are under 200KB.';
        } else if (error.status === 415) {
          errorMessage = 'Unsupported file type. Please upload only allowed file types.';
        }
        
        this.toasterService.setToaster('error', 'Error', errorMessage);
      },
    });
  }

  // ✅ Helper to get display names for form fields
  private getFieldDisplayName(fieldName: string): string {
    const fieldNames: { [key: string]: string } = {
      name: 'Name',
      email: 'Email',
      company_name: 'Company Name',
      registered_business_name: 'Registered Business Name',
      brand_name: 'Brand Name',
      mobile: 'Mobile',
      Legal_entity_type: 'Legal Entity Type',
      tax_id: 'Tax ID',
      headquater_country: 'Headquarter Country',
      website_url: 'Website URL',
      designation: 'Designation',
      sla_link: 'SLA Link',
      support_desk_email: 'Support Desk Email',
      commission_percentage: 'Commission Percentage',
      terms_of_use_link: 'Terms of Use Link',
      brand_logo: 'Brand Logo',
      data_privacy: 'Data Privacy Agreement',
      neozaar_tc: 'Neozaar Terms & Conditions',
      accept_terms: 'Accept Terms',
      agreement_document: 'Agreement Document'
    };
    
    return fieldNames[fieldName] || fieldName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  // ✅ Get ISV Detail - UPDATED VERSION
getIsvDetail(): void {
  this.userservice.getisvdetail(this.isvid!).subscribe({
    next: (res: any) => {
      this.isvdata = res?.data || {};

      // Access isv_detail from the response
      const isvDetail = this.isvdata.isv_detail || {};
      const companyDetail = isvDetail.company_detail || {};

      // Normalize cloud partnership data
      const cloudList = isvDetail.cloud_partnership || [];
      const normalizedClouds = Array.isArray(cloudList) 
        ? cloudList.map((c: string) => c?.trim()?.toLowerCase() || '')
        : [];

      // Normalize marketplace listing data
      const marketList = isvDetail.existing_marketplace_listing || [];
      const normalizedMarkets = Array.isArray(marketList)
        ? marketList.map((c: string) => c?.trim()?.toLowerCase() || '')
        : [];



      // ===== FIX: Add all unique marketplace values to options =====
      // This ensures custom values like "test" appear as checkboxes
      const allMarkets = new Set([...this.marketplaceOptions.map(m => m.toLowerCase()), ...normalizedMarkets]);
      this.marketplaceOptions = Array.from(allMarkets).map(m => 
        m.charAt(0).toUpperCase() + m.slice(1)
      );
      
      // Also update cloud options if needed
      const allClouds = new Set([...this.cloudOptions.map(c => c.toLowerCase()), ...normalizedClouds]);
      this.cloudOptions = Array.from(allClouds).map(c => 
        c.charAt(0).toUpperCase() + c.slice(1)
      );

   

      // Patch form values
      this.isvForm.patchValue({
        // User basic info
        name: this.isvdata?.name || '',
        email: this.isvdata?.email || '',
        mobile: this.isvdata?.mobile || '',
        designation: this.isvdata?.designation || '',

        // Company details
        company_name: companyDetail.company_name || '',
        registered_business_name: companyDetail.registered_business_name || '',
        brand_name: companyDetail.brand_name || '',
        Legal_entity_type: companyDetail.legal_entity_type || '',
        tax_id: companyDetail.tax_id || '',
        headquater_country: companyDetail.headquater_country || '',
        website_url: companyDetail.website_url || '',
        linkedin_url: companyDetail.linkedin_url || '',

        // ISV specific details
        cloud_partnership: normalizedClouds,
        existing_marketplace_listing: normalizedMarkets,
        preferred_engagement: isvDetail.preferred_engagement || '',
        support_desk_email: isvDetail.support_desk_email || '',
        sla_link: isvDetail.sla_link || '',
        terms_of_use_link: isvDetail.terms_of_use_link || '',
        commission_percentage: isvDetail.commission_percentage || '',
        
        // Checkboxes - convert to boolean
        neozaar_tc: !!isvDetail.neozaar_tc,
        data_privacy: !!isvDetail.data_privacy,
        accept_terms: true
      });

      // Handle brand logo
      const brandLogoUrl = companyDetail.brand_logo;
      if (brandLogoUrl) {
        this.customCouponImageUrl = brandLogoUrl;
        this.isvForm.get('brand_logo')?.setValue('hasFile');
        this.brandLogoFileName = this.extractFileNameFromUrl(brandLogoUrl) || 'Existing logo';
      } else {
        this.customCouponImageUrl = null;
        this.isvForm.get('brand_logo')?.setValue('');
      }

      // ===== YOUR EXISTING BUSINESS CERTIFICATION CODE - PRESERVED EXACTLY =====
      const businessCerts = this.isvdata.isv_detail?.business_certification;
      const certArray = this.isvForm.get('business_certification') as FormArray;

      if (businessCerts) {
        // 1. Clear existing controls to avoid duplicates
        certArray.clear();

        if (Array.isArray(businessCerts)) {
          // If it's an array, push each URL into the FormArray
          businessCerts.forEach((cert: string) => {
            if (cert) certArray.push(new FormControl(cert));
          });
        } else if (typeof businessCerts === 'string') {
          // If it's a single string, push it into the FormArray
          certArray.push(new FormControl(businessCerts));
        }

        // Keep your existing filename logic for other parts of your UI
        this.businessCertificationFileNames = certArray.value.map((url: any) => 
          this.extractFileNameFromUrl(url) || 'Certification File'
        );
      } else {
        certArray.clear();
        this.businessCertificationFileNames = [];
      }

      // Handle agreement documents
      const signedDocs = isvDetail.signed_document;
      if (signedDocs) {
        if (typeof signedDocs === 'string') {
          this.existingSignedDocUrl = signedDocs;
          const fileName = this.extractFileNameFromUrl(signedDocs);
          this.uploadTermsFileName = fileName || 'Existing signed document';
        } else if (Array.isArray(signedDocs) && signedDocs.length > 0) {
          this.existingSignedDocUrl = signedDocs[0];
          const fileName = this.extractFileNameFromUrl(signedDocs[0]);
          this.uploadTermsFileName = fileName || 'Existing signed document';
        } else if (signedDocs && typeof signedDocs === 'object') {
          this.uploadTermsFileName = signedDocs.name || signedDocs.url || 'Existing signed document';
        } else {
          this.uploadTermsFileName = 'Existing signed document';
        }
      } else {
        this.uploadTermsFileName = '';
      }

      // Force update the form controls
      this.isvForm.get('cloud_partnership')?.updateValueAndValidity();
      this.isvForm.get('existing_marketplace_listing')?.updateValueAndValidity();
      
     

      this.toasterService.setToaster('success', 'Success', 'ISV details loaded successfully');
    },
    error: (err) => {

      this.toasterService.setToaster('error', 'Error', 'Failed to load ISV details');
    },
  });
}
}
