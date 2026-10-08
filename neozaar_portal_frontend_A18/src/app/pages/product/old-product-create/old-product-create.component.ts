import { Component, ElementRef, inject, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, Validators, FormArray, FormControl, FormGroup, FormsModule, ReactiveFormsModule, AbstractControl } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HelperServiceService } from '../../../utils/helper-service.service';
import { ActivatedRoute, Router } from '@angular/router';
import {SelectableProductListModalComponent} from '../../../shared/components/products/selectable-product-list-modal/selectable-product-list-modal.component';
import { ToasterService } from '../../../shared/providers/toaster/toaster.service';
import { finalize, Observable, pipe, take } from 'rxjs';
import { ProductService } from '../product-service.service';
import { AuthService } from '../../../core/services/auth.service';



// interface FieldOption {
//   label: string;
//   type: 'Textarea' | 'Multi-Select';
//   options?: string[];
//   value?: any;
// }
@Component({
  selector: 'app-old-product-create',
  standalone: true,
  imports: [CommonModule, FormsModule, CommonModule, ReactiveFormsModule, SelectableProductListModalComponent],
  templateUrl: './old-product-create.component.html',
  styleUrl: './old-product-create.component.css'
})
export class OldProductCreateComponent implements OnInit {
  // @ViewChild('modalGroup') modalGroup!: ElementRef<HTMLDialogElement>;
    // Removed duplicate router property; use the constructor-injected router instead.
  
  productForm!: FormGroup;
  isproductSelectModalOpen: boolean = false
  productSelectData: any[]=[];
  image_url: File | null = null;
  customCouponImageUrl: any = '';
  couponForm!: FormGroup;
  profileUrl = 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'
  // defaultImage = 'assets/default-profile.png';
  errorMessage = '';
showBundleSection :boolean= false;
  isreqSending: boolean = false;
productId: number = 0;
updateButton:boolean=false;
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

  constructor(private helperService: HelperServiceService, private fb: FormBuilder, private route: ActivatedRoute, private router: Router,
    private toasterService: ToasterService, private productService: ProductService,private auth:AuthService
  ) {
    if(this.route.snapshot.paramMap.get('type')=='bundle'){
 this.showBundleSection = true;
    }

  }
  ngOnInit(): void {




    this.productForm = this.fb.group({
      user_id:[this.auth.userId],
      action_id: [this.route.snapshot.paramMap.get('type')=='product'?1:2],
      action_type: [this.route.snapshot.paramMap.get('type')],
      license_type:['monthly'],
      name: ['', Validators.required],
      description: ['', Validators.required],
      // image_url: [null, Validators.required],
      starting_price: [''],
      priceMax: [''],
      demo_available: [false],
      demo_person_email: [''],
      launch_url: [''],
      brand: [''],
      has_private_offer:[false],
      // category: this.fb.array([], [this.minSelectedValidator(1)]),
      // category: this.fb.array([]),
      category: [''],
      taxonomy_data: this.fb.group({}),
      productSelectData: this.fb.array([]),
      // status: [true],
      // is_publish:[true]
    });


    if(this.router.url.includes('/edit')){
      this.updateButton=true
      this.loadProduct();

    }


  }

    loadProduct() {

          this.productId = Number(this.route.snapshot.paramMap.get('id'));

    this.productService.getProductById(this.productId).subscribe({next:async (res: any) => {
      let product= res.data;
      
      if (!product || !(this.route.snapshot.paramMap.get('type')==product.action_type) ) {
        this.router.navigate(['/dashboard']); // Redirect to dashboard if product not found
        return;
      }
      console.log(product);
      this.productForm.patchValue({
        // user_id: product.user_id,
        action_id: product.action_id,
        action_type: product.action_type,
        license_type: product.license_type,
        name: product.name,
        description: product.description,
        // image_url: product.image_url,
        starting_price: product.starting_price,
        priceMax: product.priceMax,
        demo_available: product.demo_available,
        demo_person_email: product.demo_person_email,
        launch_url: product.launch_url,
        brand: product.brand,
        has_private_offer:product.has_private_offer
        // status: product.status,
        // is_publish: product.is_publish,
      });
      this.productForm.get('image_url')?.clearValidators();
    // this.productForm.get('image_url')?.setValue(product.image_url);
       this.selectedCategoryControl.setValue(product.category);  // Set the category control value
        this.customCouponImageUrl =product.image_url 
        this.productSelectData=product.bundleProducts;// Load the product data into the form
        this.loadProductForEdit(product); 
        this.image_url = await this.urlToFile(product.image_url, 'product.jpg'); // convert to file

      //  this.selectCategory(product.category); // Set the selected category
      // Patch FormArray: category
      // const categoryArray = this.productForm.get('category') as FormArray;
      // product.category?.forEach((cat: string) => {
      //   categoryArray.push(this.fb.control(cat));
      // });

      // Patch taxonomy_data (Features, Use Case, etc.)
      // this.productForm.get('taxonomy_data')?.patchValue(product.taxonomy_data || {});

      // Patch productSelectData FormArray
      const psArray = this.productForm.get('productSelectData') as FormArray;
      product.productSelectData?.forEach((item: string) => {
        psArray.push(this.fb.control(item));
      });
    }, error: (err) => {
        this.router.navigate(['/dashboard']); // Redirect to dashboard
        console.error('HTTP error:', err);
      }
    }
    );
  }


urlToFile(url: string, filename: string): Promise<File> {
  return fetch(url)
    .then(res => res.blob())
    .then(blob => new File([blob], filename, { type: blob.type }));
}



  loadProductForEdit(productData: any) {
  // this.isEditMode = true;
  this.selectedFields = [];
  this.selectedFieldSet.clear();

  const taxonomy = productData.taxonomy; // e.g., { region: 'IN', industry: 'IT' }

  // Clear form controls
  Object.keys(this.taxonomy_data.controls).forEach(key => {
    this.taxonomy_data.removeControl(key);
  });

  // Loop over each taxonomy key
  for (const slug in taxonomy) {
    const value = taxonomy[slug];

    // Find the matching field from allFields
    const field = this.allFields.find(f => f.slug === slug);
    if (!field) continue;

    // Track it as selected
    this.selectedFieldSet.add(slug);
    this.selectedFields.push(field);

    // Create form control with correct initial value
    let control: FormControl;

    switch (field.type) {
      case 'multiselect':
        // Ensure value is an array
        const multiValue = Array.isArray(value) ? value : [value];
        control = new FormControl(multiValue, Validators.required);
        break;
      case 'textarea':
      case 'input':
      case 'select':
        control = new FormControl(value, Validators.required);
        break;
      case 'file':
        control = new FormControl(null, Validators.required); // File can't be prefilled
        break;
      default:
        control = new FormControl(value);
    }

    this.taxonomy_data.addControl(slug, control);
  }
}


emailDisabled: boolean = true;
  checkDEMO() {
    this.productForm.get('demo_available')?.valueChanges.subscribe(checked => {
      const demo_person_emailControl = this.productForm.get('demo_person_email');

      if (checked) {
        this.emailDisabled = false;
        demo_person_emailControl?.setValidators([Validators.required, Validators.email]);
      } else {
                this.emailDisabled = true;
        demo_person_emailControl?.clearValidators();
      }

      demo_person_emailControl?.updateValueAndValidity();
    });
  }

  // minSelectedValidator(min: number) {
  //   return (control: AbstractControl) => {
  //     const value = control.value;
  //     return value && value.length >= min ? null : { minSelected: true };
  //   };
  // }
  // Add a dynamic field to the 'taxonomy_data' FormGroup
  addDynamicField(label: string): void {
    const group = this.productForm.get('taxonomy_data') as FormGroup;
    if (!group.get(label)) {
      group.addControl(label, new FormControl(''));
    }
  }

  categories = ['saas', 'Cloud1', 'Bank1', 'Health Care1', 'Startup', 'Cloud', 'Bank', 'Health Care'];

  // get category(): FormArray {
  //   return this.productForm.get('category') as FormArray;
  // }

  // get selectedCategories(): string[] {
  //   return this.category.value;
  // }

  // // Check if a category is selected
  // isSelected(category: string): boolean {
  //   return this.category.value.includes(category);
  // }

  // // Toggle category selection
  // toggleCategory(category: string): void {
  //   const index = this.category.value.indexOf(category);

  //   if (index === -1) {
  //     this.category.push(new FormControl(category));
  //   } else {
  //     this.category.removeAt(index);
  //   }
  // }



  get selectedCategoryControl(): FormControl {
  return this.productForm.get('category') as FormControl;
}

selectCategory(category: string): void {
  if (this.selectedCategoryControl.value === category) {
    this.selectedCategoryControl.setValue('');  // Unselect if same clicked
  } else {
    this.selectedCategoryControl.setValue(category);
  }
}

  addCouponImage(e: Event) {
    const { image, imageUrl } = this.helperService.getImageFileAndUrl(e);
    // console.log('image', image);
    this.image_url = image;
    this.customCouponImageUrl = imageUrl;
    this.productForm.get('image_url')?.setValue(image);
  }
selectedFile: File | null = null;
  onFileSelected(event: Event) {
  const fileInput = event.target as HTMLInputElement;
  if (fileInput.files && fileInput.files.length > 0) {
    this.selectedFile = fileInput.files[0];
    console.log(this.selectedFile);
    
  }
}

  // Input ****************
  dropdownOpen = false;
 
  allFields = [
    {
      "id": 3,
      "name": "Features",
      "slug": "features",
      "type": "multiselect",
      "options": ["Anti-ransomware", "Full image backup", "Real-time protection", "Granular restore", "Mailbox backup", "Cloud-to-cloud backup", "Image-based restore", "EDR", "Rollback", "Threat Intelligence", "SIEM Integration", "Malware Detection"]
    },
    {
      "id": 4,
      "name": "Use Case",
      "slug": "use_case",
      "type": "textarea",
      "options": []
    },
    {
      "id": 5,
      "name": "Industry",
      "slug": "industry",
      "type": "multiselect",
      "options": ["IT Services", "Healthcare", "Legal", "Financial Services", "Education", "SaaS", "Manufacturing", "BFSI"]
    },
    {
      "id": 6,
      "name": "CoSell With",
      "slug": "cosell_with",
      "type": "select",
      "options": ["NeoZaar"]
    },
    {
      "id": 8,
      "name": "Value Proposition",
      "slug": "value_proposition",
      "type": "textarea",
      "options": []
    },
    {
      "id": 9,
      "name": "Pain Points Solved",
      "slug": "pain_points_solved",
      "type": "textarea",
      "options": []
    },
    {
      "id": 10,
      "name": "Differentiators",
      "slug": "differentiators",
      "type": "textarea",
      "options": []
    },
    {
      "id": 11,
      "name": "Compatible Platforms",
      "slug": "compatible_platforms",
      "type": "multiselect",
      "options": ["Microsoft 365", "Google Workspace", "VMware", "Hyper-V", "Azure", "AWS", "SIEM", "SOC tools"]
    },
    {
      "id": 12,
      "name": "Deployment Type",
      "slug": "deployment_type",
      "type": "select",
      "options": ["Cloud", "On-premises", "Hybrid"]
    },
    {
      "id": 13,
      "name": "Integration Points",
      "slug": "integration_points",
      "type": "multiselect",
      "options": ["Microsoft 365", "Google Workspace", "VMware", "Hyper-V", "Azure", "AWS", "SIEM", "SOC tools"]
    },
    {
      "id": 14,
      "name": "Managed / Self-Managed",
      "slug": "managed_self_managed",
      "type": "select",
      "options": ["Managed", "Self-Managed", "Both"]
    },
    {
      "id": 15,
      "name": "Compliance Support",
      "slug": "compliance_support",
      "type": "multiselect",
      "options": ["HIPAA", "GDPR", "ISO 27001", "BRSR", "PCI-DSS"]
    },
    {
      "id": 17,
      "name": "What's Included",
      "slug": "whats_included",
      "type": "textarea",
      "options": []
    },
    // {
    //   "id": 18,
    //   "name": "Sales Enablement Collateral",
    //   "slug": "sales_enablement_collateral",
    //   "type": "file",
    //   "options": []
    // },
    {
      "id": 19,
      "name": "Category Tag",
      "slug": "category_tag",
      "type": "select",
      "options": ["Security", "Backup", "Infrastructure", "EDR"]
    },
    {
      "id": 20,
      "name": "Stage Fit (NeoZaar)",
      "slug": "stage_fit_neozaar",
      "type": "select",
      "options": ["Stage 2", "Stage 3"]
    },
    {
      "id": 21,
      "name": "Spectrum Partner Fit",
      "slug": "spectrum_partner_fit",
      "type": "multiselect",
      "options": ["MSPs", "Endpoint MSPs", "Cloud Solution Providers", "Infrastructure MSPs", "DRaaS Partners", "MDR Providers", "MSSPs"]
    }
  ]


 selectedFields: any[] = [];
selectedFieldSet: Set<string> = new Set();

formValues: { [key: string]: any } = {};

get taxonomy_data(): FormGroup {
  return this.productForm.get('taxonomy_data') as FormGroup;
}

// Check if field is selected
isSelected1(field: any): boolean {
  return this.selectedFieldSet.has(field.slug);
}

// Handle checkbox toggle in UI
onCheckboxChange(event: Event, field: any) {
  const checked = (event.target as HTMLInputElement).checked;
  if (checked) {
    this.selectedFieldSet.add(field.slug);
  } else {
    this.selectedFieldSet.delete(field.slug);
  }
}

// Add selected fields to the form
addSelectedFields() {
  const newFields = this.allFields.filter(
    field =>
      this.selectedFieldSet.has(field.slug) &&
      !this.selectedFields.find(f => f.slug === field.slug)
  );

  for (const field of newFields) {
    this.selectedFields.push(field);

    let control: FormControl;

    switch (field.type) {
      case 'textarea':
      case 'input':
        control = new FormControl('', Validators.required);
        break;
      case 'multiselect':
        control = new FormControl([], Validators.required);
        break;
      case 'file':
        control = new FormControl(null, Validators.required);
        break;
      case 'select':
        control = new FormControl('', Validators.required);
        break;
      default:
        control = new FormControl('');
    }

    this.taxonomy_data.addControl(field.slug, control);
  }

  this.dropdownOpen = false;
}

// Remove field from form
removeField(field: any) {
  this.selectedFields = this.selectedFields.filter(f => f.slug !== field.slug);
  this.selectedFieldSet.delete(field.slug);
  this.taxonomy_data.removeControl(field.slug);
}

// Store search text for each field
searchTexts: { [key: string]: string } = {};

// Toggle selected value in multiselect
toggleChip(fieldSlug: string, option: string) {
  const current = this.taxonomy_data.get(fieldSlug)?.value || [];
  const updated = current.includes(option)
    ? current.filter((val: string) => val !== option)
    : [...current, option];
  this.taxonomy_data.get(fieldSlug)?.setValue(updated);
  this.taxonomy_data.get(fieldSlug)?.markAsTouched();
}

// Remove tag from multiselect
removeTag(fieldSlug: string, tag: string) {
  const current = this.taxonomy_data.get(fieldSlug)?.value || [];
  const updated = current.filter((val: string) => val !== tag);
  this.taxonomy_data.get(fieldSlug)?.setValue(updated);
  this.taxonomy_data.get(fieldSlug)?.markAsTouched();
}

// Get options filtered by search
getFilteredOptions(fieldSlug: string): string[] {
  const field = this.selectedFields.find(f => f.slug === fieldSlug);
  if (!field || !field.options) return [];
  const searchText = this.searchTexts[fieldSlug]?.toLowerCase() || '';
  const selected: string[] = this.taxonomy_data.get(fieldSlug)?.value || [];
  return field.options.filter(
    (opt: string) =>
      opt.toLowerCase().includes(searchText) && !selected.includes(opt)
  );
}


onFileChange(event: Event, fieldSlug: string): void {
  const input = event.target as HTMLInputElement;

  if (input.files && input.files.length > 0) {
    const file = input.files[0];
    this.taxonomy_data.get(fieldSlug)?.setValue(file);
    this.taxonomy_data.get(fieldSlug)?.markAsTouched();
  } else {
    // Clear the control if no file selected
    this.taxonomy_data.get(fieldSlug)?.setValue(null);
  }
}


  onSubmit() {
    if (this.productForm.invalid) {
      this.productForm.markAllAsTouched();
      this.toasterService.setToaster('error', 'All Fields Required','');
      return;
    }
    else if (!this.customCouponImageUrl) {
      this.toasterService.setToaster('error', 'Image Required', 'Please upload an image for the product.');
      return
     }else if (this.productSelectData.length == 0 && this.route.snapshot.paramMap.get('type')=="bundle") {
      this.toasterService.setToaster('error', 'PRODUCT', 'Please adD AT least one product to the bundle.');
      return
     }
     else{

 
    this.isreqSending=true
 
// this.productSelectData
    const data = {
      ...this.productForm.value,
      // taxonomy_data: this.taxonomy_data.value,
      // productSelectData:this.productSelectData,
      // product_ids:product_ids
    };

    // const form = this.productForm.value;

  const formData = new FormData();
  formData.append('user_id', data.user_id);
  formData.append('action_id', data.action_id);
  formData.append('action_type', data.action_type);
  formData.append('license_type', data.license_type);
  formData.append('name', data.name);
  formData.append('description', data.description);
  formData.append('starting_price', data.starting_price);
  formData.append('priceMax', data.priceMax);
  formData.append('demo_available', data.demo_available);
  formData.append('demo_person_email', data.demo_person_email);
  formData.append('launch_url', data.launch_url);
  formData.append('brand', data.brand);
  formData.append('category', data.category);
  formData.append('has_private_offer', data.has_private_offer)
    if (this.selectedFile) {
  formData.append('sales_enable_collateral', this.selectedFile); 
    }// Assuming status is always true
   // TypeScript's FormData type does not have entries(), so cast to any for logging

    // const form = data.value;
    // const formData = new FormData();

    // formData.append('image_url', form.image_url ??'');

    alert('Form submitted successfully!');
    console.log('Submitted Form:', data);

    if (this.image_url) {
    formData.append('image_url', this.image_url); // 'image_url' must match the backend key
  }

  // taxonomy_data as JSON string
  formData.append('taxonomy_data', JSON.stringify(data.taxonomy_data));

  // product_ids as JSON string
if(this.route.snapshot.paramMap.get('type')=="bundle"){
 const product_ids = this.productSelectData
  .map(item => item.id);
  formData.append('product_ids', product_ids.length > 0 ? JSON.stringify(product_ids) : '[]');
}


  //    for (const [key, value] of (formData as any).entries()) {
  //   if (value instanceof File) {
  //     console.log(`${key}: [File] name=${value.name}, type=${value.type}, size=${value.size}`);
  //   } else {
  //     console.log(`${key}: ${value}`);
  //   }
  // }


    if(this.router.url.includes('/edit')){
      console.log("jbk");
      
      formData.delete("action_id")
      formData.delete("action_type");
      formData.delete("user_id");
      formData.delete("product_ids");
      this.isreqSending = true;
    this.productService.updateProduct(this.route.snapshot.paramMap.get('id'),formData).pipe(finalize(() => { this.isreqSending = false; })).subscribe({
        next: (res: any) => {
          if (res.status === 'success') {
            // this.customCouponImageUrl = '';
            // this.customCouponImage = '';
            // this.productForm.reset();
            // this.selectedFields = [];
            // this.selectedFieldSet.clear();
            this.toasterService.setToaster('success', 'Product update', res.message || 'Product update successfully');
          }
        }, error: (err: any) => {
          console.error('HTTP error:', err);
        }
      })
    }
    else{
     this.productService.createProduct(formData).pipe(finalize(() => { this.isreqSending = false; })).subscribe({
        next: (res: any) => {
          if (res.status === 'success') {
            this.customCouponImageUrl = '';
            // this.customCouponImage = '';
            this.productForm.reset();
            this.selectedFields = [];
            this.productSelectData = [];
            this.selectedFieldSet.clear();
            this.toasterService.setToaster('success', 'Product Added', res.message || 'Product added successfully');
          }
        }, error: (err: any) => {
          console.error('HTTP error:', err);
        }
      })
    }
    // Add API submission logic here
  }
      }

  // ADD PRODUCT
   removeProduct(product: any) {
    this.productSelectData = this.productSelectData.filter(p => p !== product);
  }


openAddproductModal() {
    this.isproductSelectModalOpen = true;
    // this.productSelectData = i
}


closedModal(data: any) {
  this.isproductSelectModalOpen = false; 
  if(data != null){
    this.productSelectData = data; // Get the selected data
    // Close the modal
  }
  console.log("Selected data from modal:", data);
}

}
