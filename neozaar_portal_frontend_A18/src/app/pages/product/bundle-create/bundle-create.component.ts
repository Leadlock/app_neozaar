import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { finalize } from 'rxjs';
import { BundleService } from '../../bundle/bundle.service';
import { ToasterService } from '../../../shared/providers/toaster/toaster.service';
import { HelperServiceService } from '../../../utils/helper-service.service';
import { SelectableProductListModalComponent } from '../../../shared/components/products/selectable-product-list-modal/selectable-product-list-modal.component';

@Component({
  selector: 'app-bundle-create',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, SelectableProductListModalComponent],
  templateUrl: './bundle-create.component.html',
  styleUrl: './bundle-create.component.css'
})
export class BundleCreateComponent implements OnInit {
  form!: FormGroup;
  isSubmitting = false;
  isEditMode = false;
  bundleId: number | null = null;

  imageFile: File | null = null;
  imagePreview: string | null = null;

  selectedProducts: any[] = [];
  selectedServices: any[] = [];

  isModalOpen = false;
  modalType: 'products' | 'services' = 'products';

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private bundleService: BundleService,
    private toaster: ToasterService,
    private helperService: HelperServiceService
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      name: ['', Validators.required],
      short_description: ['', Validators.required],
      image_url: [null]
    });

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.bundleId = Number(id);
      this.loadBundle(this.bundleId);
    }
  }

  loadBundle(id: number): void {
    this.bundleService.getBundleById(id).subscribe({
      next: (res: any) => {
        const b = res.data;
        this.form.patchValue({
          name: b.name,
          short_description: b.short_description,
        });
        this.imagePreview = b.bundle_logo || null;
        this.selectedProducts = b.isv_products_details || [];
        this.selectedServices = b.select_spectrum_partner_services || [];
      },
      error: () => this.router.navigate(['/bundles'])
    });
  }

  onImageChange(event: Event): void {
    const { image, imageUrl } = this.helperService.getImageFileAndUrl(event);
    this.imageFile = image;
    this.imagePreview = imageUrl;
    this.form.get('image_url')?.setValue(image);
  }

  openModal(type: 'products' | 'services'): void {
    this.modalType = type;
    this.isModalOpen = true;
  }

  onModalClose(items: any[] | null): void {
    this.isModalOpen = false;
    if (items) {
      if (this.modalType === 'products') this.selectedProducts = items;
      else this.selectedServices = items;
    }
  }

  removeProduct(id: number): void {
    this.selectedProducts = this.selectedProducts.filter(p => p.id !== id);
  }

  removeService(id: number): void {
    this.selectedServices = this.selectedServices.filter(s => s.id !== id);
  }

  getModalSelections(): any[] {
    return this.modalType === 'products' ? this.selectedProducts : this.selectedServices;
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toaster.setToaster('error', 'Required Fields', 'Please fill all required fields.');
      return;
    }
    if (this.selectedProducts.length === 0) {
      this.toaster.setToaster('error', 'Products Required', 'Please select at least one product.');
      return;
    }

    const fd = new FormData();
    fd.append('name', this.form.value.name);
    fd.append('short_description', this.form.value.short_description);
    fd.append('select_isv_products', JSON.stringify(this.selectedProducts.map(p => p.id)));
    fd.append('select_spectrum_partner_services', JSON.stringify(this.selectedServices.map(s => s.id)));
    if (this.imageFile) fd.append('bundle_logo', this.imageFile);

    this.isSubmitting = true;

    const call = this.isEditMode
      ? this.bundleService.updatBundle(this.bundleId, fd)
      : this.bundleService.createbundle(fd);

    call.pipe(finalize(() => (this.isSubmitting = false))).subscribe({
      next: (res: any) => {
        if (res.status === 'success') {
          this.toaster.setToaster('success', this.isEditMode ? 'Bundle Updated' : 'Bundle Created', res.message || '');
          this.router.navigate(['/bundles']);
        }
      },
      error: () => this.toaster.setToaster('error', 'Error', 'Something went wrong.')
    });
  }
}
