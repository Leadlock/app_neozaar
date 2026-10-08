import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule, KeyValuePipe } from '@angular/common';
import { BundleService } from '../bundle.service';
import { ProductService } from '../../product/product-service.service';
import { HasRoleDirective } from '../../../shared/directives/has-role.directive';
import { UserRole } from '../../../core/modal/user.modal';
import { RouterModule } from '@angular/router';
import { ToasterService } from '../../../shared/providers/toaster/toaster.service';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Component({
  selector: 'app-view-bundle',
  standalone: true,
  imports: [CommonModule, KeyValuePipe, HasRoleDirective ,FormsModule,RouterModule],
  templateUrl: './view-bundle.component.html',
  styleUrls: ['./view-bundle.component.css']   // ✅ plural
})
export class ViewBundleComponent implements OnInit {
  UserRole = UserRole;
isPublished : any;
  product: any;
  productId!: number;   // ✅ class property
   isModalOpen: any;
 
  isRejectModalOpen = false;
  rejectRemark = '';
  isstatussubmit: any;
  remark: any;

  constructor(
    private bundleService: BundleService,
    private productService: ProductService,
    private route: ActivatedRoute,
    private toasterService: ToasterService,
    private sanitizer: DomSanitizer,
  ) {}

  sanitize(html: string): SafeHtml {
    if (!html) return '';
    // decode HTML entities first
    const decoded = html
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
    return this.sanitizer.bypassSecurityTrustHtml(decoded);
  }

  ngOnInit(): void {
    this.productId = Number(this.route.snapshot.paramMap.get('id'));

    if (!this.productId) {
      console.error('Invalid product ID');
      return;
    }

    this.bundleService.getBundleById(this.productId).subscribe({
      next: (res: any) => {
        if (res && res.data) {
          this.product = res.data;
        } else {
          console.error('Product data not found');
        }
      },
      error: (err: any) => {
        console.error('Error fetching product data:', err);
      }
    });
  }

  // ✅ Action APIs
  // () {
  //   this.productService.publishItem(this.productId, this.product?.type || 'product').subscribe({
  //     next: (res) => console.log('Unpublished:', res),
  //     error: (err) => console.error('Error unpublishing:', err)
  //   });
  // }

  publishBundle(publish: boolean): void {
    this.productService.publishItem(this.productId, 'bundle', publish)
      .subscribe({
        next: (res: any) => {
          this.toasterService.setToaster('success', publish ? 'Published' : 'Unpublished', res.message || 'Bundle updated successfully');
          this.product.is_publish = publish;
          this.product.status = publish ? 'Published' : 'Unpublished';
        },
        error: (err: any) => {
          console.error(err);
          this.toasterService.setToaster('error', 'Error', err?.error?.message || 'Failed to update bundle');
        }
      });
  }


  draftBundle() {
    this.productService.draftItem(this.productId, this.product?.type || 'product').subscribe({
      next: (res) => console.log('Drafted:', res),
      error: (err) => console.error('Error drafting:', err)
    });
  }

  acceptBundle(approve: boolean, remark: string = '') {
    this.productService.acceptItem(this.productId, 'bundle', approve, remark).subscribe({
      next: (res: any) => {
        this.toasterService.setToaster('success', approve ? 'Approved' : 'Rejected', res.message || 'Bundle updated');
        this.product.is_approved = approve;
        this.product.status = approve ? 'Approved' : 'Rejected';
      },
      error: (err: any) => {
        this.toasterService.setToaster('error', 'Error', err?.error?.message || 'Failed to update bundle');
      }
    });
  }
  openModal(): void {
    this.isModalOpen = true;
  }

  closeModal(): void {
    this.isModalOpen = false;
  }

  openRejectModal() {
    this.isRejectModalOpen = true;
  }

  closeRejectModal() {
    this.isRejectModalOpen = false;
    this.rejectRemark = '';
  }
    onSubmit(): void {
    if (!this.remark || !this.productId) {
      this.toasterService.setToaster('warning', 'Validation', 'Please enter a remark before submitting.');
      return;
    }

    this.isstatussubmit = true;

    const payload = {
      type: 'bundle',
      publish: false,
      status: 'Unpublished',
      remark: this.remark,
    };

    this.productService.updateProductStatus(this.productId, payload).subscribe({
      next: (response: any) => {
        this.toasterService.setToaster('success', 'Bundle Update', response.message || 'Bundle unpublished successfully');
        this.product.is_publish = false;
        this.product.status = 'Unpublished';
        this.isstatussubmit = false;
        this.remark = '';
        this.closeModal();
      },
      error: (error) => {
        console.error('Error:', error);
        this.toasterService.setToaster('error', 'Bundle Update', 'Failed to unpublish product');
        this.isstatussubmit = false;
      },
    });
  }

  onRejectSubmit(): void {
    if (!this.rejectRemark || !this.productId) {
      this.toasterService.setToaster('warning', 'Validation', 'Please enter a remark before submitting.');
      return;
    }

    this.isstatussubmit = true;

    const payload = {
      type: 'bundle',
      approve: false,
      status: 'Rejected',
      remark: this.rejectRemark,
    };

    this.productService.updateRejectStatus(this.productId, payload).subscribe({
      next: (response) => {
        this.toasterService.setToaster('success', 'Bundle Rejected', response.message || 'Product rejected successfully');
        console.log('Reject API Response:', response);
        this.isstatussubmit = false;
        this.rejectRemark = '';
        this.closeRejectModal();
      },
      error: (error) => {
        console.error('Reject API Error:', error);
        this.toasterService.setToaster('error', 'Bundle Rejected', 'Failed to reject product');
        this.isstatussubmit = false;
      },
    });
  }
}
