import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, FormControl } from '@angular/forms';
import { ProductService } from '../../../pages/product/product-service.service';
import { ToasterService } from '../../../shared/providers/toaster/toaster.service';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-excel-upload',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './excelupload.component.html',
  styleUrls: ['./excelupload.component.css']
})
export class ExceluploadComponent implements OnInit {
  selectedFile: File | null = null;
  uploading = false;
  showModal = false;
  uploadForm: FormGroup<{
    actionType: FormControl<string | null>;
    actionFor: FormControl<string | null>;
  }>;

  // All possible action types
  allActionTypeOptions = [
    { value: 'product', label: 'Product' },
    { value: 'service', label: 'Service' },
    { value: 'solution', label: 'Solution' },
    { value: 'category', label: 'Category' },
    { value: 'inventory', label: 'Inventory' },
    { value: 'price', label: 'Price Update' }
  ];

  // All possible action for options
  allActionForOptions = [
    { value: 'customer', label: 'Customer' },
    { value: 'ISV', label: 'ISV' },
  
  ];

  // Filtered options based on URL/selection
  actionTypeOptions: { value: string; label: string }[] = [];
  actionForOptions: { value: string; label: string }[] = [];

  // Flags to control UI state
  isActionTypeDisabled = false;
  currentUrl = '';

  constructor(
    private productService: ProductService, 
    private toasterService: ToasterService,
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.uploadForm = this.fb.group({
      actionType: [''],
      actionFor: ['']
    }) as FormGroup<{
      actionType: FormControl<string | null>;
      actionFor: FormControl<string | null>;
    }>;
  }

  ngOnInit() {
    this.detectUrlAndSetDefaults();
    this.setupFormListeners();
  }

  // Detect current URL and set defaults
  detectUrlAndSetDefaults() {
    this.currentUrl = this.router.url.toLowerCase();
    
    // Initialize with all options
    this.actionTypeOptions = [...this.allActionTypeOptions];
    this.actionForOptions = [...this.allActionForOptions];
    
    // Check URL patterns and set defaults
    if (this.currentUrl.includes('product')) {
      this.setActionType('product', true);
      this.updateActionForOptions('product');
    } else if (this.currentUrl.includes('service')) {
      this.setActionType('service', true);
      this.updateActionForOptions('service');
    } else if (this.currentUrl.includes('solution')) {
      this.setActionType('solution', true); // Not disabled for solutions
      this.updateActionForOptions('solution');
    } else {
      // Default to product if no specific URL pattern
      this.setActionType('product', false);
      this.updateActionForOptions('product');
    }
  }

  // Set action type and disable state
  setActionType(type: string, disable: boolean) {
    this.uploadForm.patchValue({ actionType: type });
    this.isActionTypeDisabled = disable;
    
    if (disable) {
      this.actionTypeControl.disable();
    } else {
      this.actionTypeControl.enable();
    }
    
    this.updateActionForOptions(type);
  }

  // Update action_for options based on action_type
  updateActionForOptions(actionType: string) {
    switch(actionType) {
      case 'product':
        // For products: show customer, admin, vendor, store
        this.actionForOptions = this.allActionForOptions.filter(option => 
          option.value !== 'isv'
        );
        // Set default to customer
        this.uploadForm.patchValue({ actionFor: 'customer' });
        break;
        
      case 'service':
        // For services: show only ISV and customer
        this.actionForOptions = this.allActionForOptions.filter(option => 
          option.value === 'isv' || option.value === 'customer'
        );
        // Set default to isv
        this.uploadForm.patchValue({ actionFor: 'isv' });
        break;
        
      case 'solution':
        // For solutions: show all options
        this.actionForOptions = [...this.allActionForOptions];
        // Set default to customer
        this.uploadForm.patchValue({ actionFor: 'customer' });
        break;
        
      default:
        // For other types: show all except isv
        this.actionForOptions = this.allActionForOptions.filter(option => 
          option.value !== 'isv'
        );
        // Set default to customer
        this.uploadForm.patchValue({ actionFor: 'customer' });
        break;
    }
  }

  // Setup form value change listeners
  setupFormListeners() {
    this.actionTypeControl.valueChanges.subscribe(value => {
      if (value) {
        this.updateActionForOptions(value);
      }
    });
  }

  // Getter methods for typed form controls
  get actionTypeControl(): FormControl<string | null> {
    return this.uploadForm.get('actionType') as FormControl<string | null>;
  }

  get actionForControl(): FormControl<string | null> {
    return this.uploadForm.get('actionFor') as FormControl<string | null>;
  }

  // Format file size for display
  formatFileSize(bytes: number): string {
    if (!bytes || bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Open modal
  openModal() {
    this.showModal = true;
  }

  // Close modal
  closeModal() {
    this.showModal = false;
    this.resetUploadForm();
  }

  onFileChange(event: any) {
    const file = event.target.files?.[0];
    if (!file) return;

    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];

    if (!allowedTypes.includes(file.type)) {
      this.toasterService.setToaster('error', 'Invalid Form', 'Please upload a valid Excel file (.xlsx or .xls)');
      return;
    }

    this.selectedFile = file;
    console.log('📁 File selected:', file.name);
  }

uploadFileToServer() {
  if (!this.selectedFile) {
    this.toasterService.setToaster('error', 'Invalid Form', 'Please select an Excel file first!');
    return;
  }

  // Validate form
  if (this.uploadForm.invalid) {
    this.toasterService.setToaster('error', 'Invalid Form', 'Please select valid options for upload');
    return;
  }

  const formData = new FormData();
  
  // Append the file
  formData.append('file', this.selectedFile, this.selectedFile.name);
  
  // Get values from form controls
  const actionType = this.actionTypeControl.value;
  const actionFor = this.actionForControl.value;
  
  if (actionType && actionFor) {
    formData.append('action_type', actionType);
    formData.append('action_for', actionFor);
  } else {
    this.toasterService.setToaster('error', 'Invalid Form', 'Please select both action type and action for');
    return;
  }

  console.log('Uploading with params:', { 
    action_type: actionType, 
    action_for: actionFor,
    file: this.selectedFile.name,
    currentUrl: this.currentUrl
  });

  this.uploading = true;

  // ✅ FIXED: Capital 'B' in saveBulkData
  this.productService.saveBulkData(formData).subscribe({
    next: (res: any) => {
      this.toasterService.setToaster('success', 'Success', 'Excel Uploaded Successfully');
      this.uploading = false;
      
      // Close modal after successful upload
      setTimeout(() => {
        this.closeModal();
      }, 1000);
    },
    error: (err) => {
      console.error('❌ Upload failed:', err);
      const errorMessage = err.error?.message || err.message || 'An error occurred during upload';
      this.toasterService.setToaster('error', 'Upload Failed', errorMessage);
      this.uploading = false;
    }
  });
}
  // Reset the form and file input
  resetUploadForm() {
    this.selectedFile = null;
    this.detectUrlAndSetDefaults(); // Reset to URL-based defaults
  }
}
