import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormsModule, ReactiveFormsModule, AbstractControl } from '@angular/forms';
// import { CommonModule } from '@angular/common';
import { CommonModule } from '@angular/common';
import { SeoServiveService } from '../seo-servive.service';
import { ToasterService } from '../../../shared/providers/toaster/toaster.service';
import { ActivatedRoute, Router } from '@angular/router';
import { ProductService } from '../../product/product-service.service';

@Component({
  selector: 'app-seoform',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
  ],
  templateUrl: './seoform.component.html',
  styleUrl: './seoform.component.css'
})
export class SeoformComponent implements OnInit {

  seoForm!: FormGroup;
  loading = false;
  param: any;
  isEditMode = false;
  seoId: number | null = null;
  routeId: number | null = null;
  header:any;
isNumberint:any;
  constructor(
    private fb: FormBuilder,
    private seoservice: SeoServiveService,
    private productservice: ProductService,
    private toasterservice: ToasterService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.setupFormSubscriptions();
    this.checkRouteParams();
    const idid = this.route.snapshot.paramMap.get('id');
  this.isNumberint = !isNaN(Number(idid)); //
 const currentUrl = this.router.url;

if (currentUrl.includes('create')) {
  this.seoForm.get('page_name')?.enable();  
} else {
  this.seoForm.get('page_name')?.disable();
}
}

  private initializeForm(): void {
    this.seoForm = this.fb.group({
      id: [null],
      page_name: ['', Validators.required],
      page_url: ['', Validators.required],
      page_id: [0],  // Default to 0 for slugs

      meta_title: ['', [
        Validators.required,
        Validators.minLength(30),
        Validators.maxLength(60)
      ]],

      meta_description: ['', [
        Validators.required,
        Validators.minLength(50),
        Validators.maxLength(160)
      ]],

      meta_keywords: ['', [
        Validators.required,
        Validators.pattern(/^([^,]+,){1,}[^,]+$/)
      ]],

      h1_title: ['', [
        Validators.required,
        Validators.maxLength(70)
      ]],

      canonical_url: ['', Validators.required,
       ],

      schema_markup: [''],

      og_title: [''],

      og_description: [''],

      og_image: [''],

      linkedIn_title: [''],

    linkedIn_description: [''],

     linkedIn_image: [''],

      is_index: [1, Validators.required],
      is_follow: [1, Validators.required],
      status: ['active', Validators.required]
    });
  }

  private setupFormSubscriptions(): void {
    // Auto-create slug from page_name
    this.seoForm.get('page_name')?.valueChanges.subscribe(value => {
      const slug = this.slugify(value);
      this.seoForm.get('page_url')?.setValue(slug, { emitEvent: false });
    });

    // Auto-extract page_id from page_name (only if route doesn't have numeric ID)
    this.seoForm.get('page_name')?.valueChanges.subscribe(value => {
      if (!this.routeId) { // Only auto-extract if route doesn't have numeric ID
        const id = this.extractIdFromUserInput(value);
        this.seoForm.get('page_id')?.setValue(id, { emitEvent: false });
      }
    });
  }

  pageHeader:any;
  private checkRouteParams(): void {
    this.param = this.route.snapshot.paramMap.get('id') ?? '';
    if (this.param !== '') {
      if (this.isNumber(this.param)) {
       
        this.routeId = Number(this.param);
        this.isEditMode = true;
        this.seoForm.get('page_id')?.setValue(this.routeId); 
        this.fetchById(this.routeId);
         
      } else {
     
        this.routeId = null;
        this.isEditMode = true;
        this.seoForm.get('page_id')?.setValue(0); 
         this.setPageHeader(`Updating SEO for Page:`);
        this.fetchBySlug(this.param);
      }
    } else {

      // No parameter - new form, set default page_id to 0
      this.seoForm.get('page_id')?.setValue(0);
        this.setPageHeader('Create New SEO Page');
    }
  }
  private setPageHeader(header: string): void {
  // You can use this in multiple ways:

  // Option 1: Set a property for the template
  this.pageHeader = header;
  
  // Option 2: Update browser tab title
  document.title = `${header} - SEO Management`;
  
  // Option 3: Log for debugging
  console.log('Page Header:', header);
  
  // Option 4: Show toast notification (optional)
  // this.toasterservice.setToaster('info', 'Page Info', header);
}

  private extractIdFromUserInput(value: string): number {
    if (!value) return 0;
    const match = value.match(/(\d+)$/);
    return match ? Number(match[1]) : 0;
  }

  private isNumber(value: string): boolean {
    return /^\d+$/.test(value);
  }

  private fetchById(id: number): void {
    this.loading = true;
 
    // this.seoservice.getSeoById(id).subscribe({
    //   next: (res: any) => {
    //     if (res && res.data) {
    //       // Found SEO data → patch form
    //       this.seoForm.patchValue(res.data);
    //       this.isEditMode = true;
    //     } else {
    //       // No SEO record → fallback to product
       
    //     }
    //     this.loading = false;
    //   },
    //   error: (error) => {
    //     console.error('Error fetching SEO data:', error);
    //     // SEO API failed → fallback to product
    //     this.fetchProductDetails(id);
    //     this.loading = false;
    //   }
    // });
  
     this.fetchProductDetails(id);
  }
productnametitle:any;
private fetchProductDetails(id: number): void {
  if (!id) {
    console.warn('⚠ Invalid product ID:', id);
    return;
  }
  this.loading = true;


  // Step 1: Fetch Product Details
  this.productservice.getProductById(id).subscribe({
    next: (product: any) => {
      if (!product || !product.data) {
        console.warn('⚠ No product data found for ID:', id);
        //  this.productnametitle = product.data.name;
        //  alert(this.productnametitle);
        this.toasterservice.setToaster('warning', 'Not Found', 'No product data found for the provided ID.');
        this.loading = false;
        return;
      }

      const p = product.data;
      
      // Always set page_name from product

      this.seoForm.patchValue({ page_name: p.name });
      const pn = p.name;
      this.productnametitle = p.name;
      //  alert(this.productnametitle);
      if (!p.name) {
        this.loading = false;
        return;
      }

      // Step 2: Check if SEO exists using product name
      this.seoservice.getSeoById(p.name).subscribe({
        next: (seoRes: any) => {
          if (seoRes && seoRes.data) {
            // SEO found → fill SEO form
            this.seoForm.patchValue(seoRes.data);
            //  this.productnametitle = seoRes.data.name;
            //  alert(this.productnametitle);
            this.isEditMode = true;
          }
          // If not found → keep only product name (already set)
          this.loading = false;
        },
        error: (seoError) => {
          console.error('Error fetching SEO data:', seoError);
          // SEO failed → keep only product data
          this.loading = false;
        }
      });
    },

    error: (err) => {
      console.error('❌ Error fetching product data:', err);
      this.toasterservice.setToaster('error', 'Error', 'Failed to fetch product details.');
      this.loading = false;
    }
  });
}


  private fetchBySlug(slug:any): void {
    this.loading = true;
    this.seoservice.getSeoBySlug(slug).subscribe({
      next: (res: any) => {
        if (res && res.data) {
          this.seoForm.patchValue(res.data);
          this.isEditMode = true;
        } else {
          this.toasterservice.setToaster('warning', 'Not Found', 'No SEO data found for the provided slug.');
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error fetching SEO by slug:', error);
        this.toasterservice.setToaster('error', 'Error', 'Failed to fetch SEO data.');
        this.loading = false;
      }
    });
  }

  // Convert text to URL-safe slug
  private slugify(text: string): string {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  // Shortcut to access form controls
  f(field: string): AbstractControl {
    return this.seoForm.get(field)!;
  }

  // Check if field has error
  hasError(field: string, errorType: string): boolean {
    const control = this.seoForm.get(field);
    return control ? control.hasError(errorType) && (control.dirty || control.touched) : false;
  }
  pageOptions = ['Home','About us'];

isInputDisabled = false;
  onSelectPage(event: any) {
  const selected = event.target.value;

  if (selected === 'custom') {
   
    this.seoForm.get('page_name')?.reset();
  } else {
 
    this.seoForm.get('page_name')?.setValue(selected);
  }
}

  submitSEO(): void {
    if (this.seoForm.invalid) {
      this.seoForm.markAllAsTouched();
      this.toasterservice.setToaster('warning', 'Validation Error', 'Please fill all required fields correctly.');
      return;
    }

    this.loading = true;
    const payload = this.seoForm.value;

    // Ensure page_id is properly set based on route
    if (this.routeId) {
      payload.page_id = this.routeId; // Use numeric ID from route
    } else {
      payload.page_id = payload.page_id || 0; // Use extracted ID or 0 for slugs
    }

    if (this.isEditMode && payload.id) {
      // UPDATE existing SEO
      // alert(payload);
      this.seoservice.updeteseo(payload.id, payload).subscribe({
        next: (response: any) => {
          console.log('✅ UPDATE Success:', response);
          this.toasterservice.setToaster('success', 'Success', 'SEO updated successfully!');
          this.loading = false;
          this.router.navigate(['/seo']);
        },
        error: (error) => {
          console.error('❌ UPDATE Error:', error);
          this.toasterservice.setToaster('error', 'Error', 'Failed to update SEO.');
          this.loading = false;
        }
      });
    } else {
      // CREATE new SEO
      this.seoservice.createseo(payload).subscribe({
        next: (response: any) => {
          console.log('✅ CREATE Success:', response);
          this.toasterservice.setToaster('success', 'Success', 'SEO created successfully!');
          this.loading = false;
          this.router.navigate(['/seo']);
        },
        error: (error) => {
          console.error('❌ CREATE Error:', error);
          this.toasterservice.setToaster('error', 'Error', 'Failed to create SEO.');
          this.loading = false;
        }
      });
    }
  }

  resetForm(): void {
    this.seoForm.reset({
      page_id: this.routeId || 0, // Preserve route ID or set to 0
      is_index: 1,
      is_follow: 1,
      status: 'active'
    });
    this.isEditMode = false;
    this.seoId = null;
  }

  goBack(): void {
    this.router.navigate(['/seo-list']);
  }
}
