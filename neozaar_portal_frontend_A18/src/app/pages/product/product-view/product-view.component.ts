import { Component } from '@angular/core';
import { ProductService } from '../product-service.service';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule, KeyValuePipe } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { UserRole } from '../../../core/modal/user.modal';
import { HasRoleDirective } from '../../../shared/directives/has-role.directive';
import { FormsModule } from '@angular/forms';
import { ToasterService } from '../../../shared/providers/toaster/toaster.service';
import { RouterModule } from '@angular/router';
import { VendorFeatureComponent } from '../../../shared/components/vendor-feature/vendor-feature.component';
import { AzureMarketplaceService } from '../../azure-marketplace/azure-marketplace.service';
import { AwsMarketplaceService } from '../../aws-marketplace/aws-marketplace.service';

@Component({
  selector: 'app-product-view',
  standalone: true,
  imports: [CommonModule, KeyValuePipe, HasRoleDirective, FormsModule, RouterModule, VendorFeatureComponent],
  templateUrl: './product-view.component.html',
  styleUrls: ['./product-view.component.css']
})
export class ProductViewComponent {
  product: any;
  productId!: number;
  role = UserRole;
  cat: any;
  isModalOpen: any;
  isPublished: any;
  isRejectModalOpen = false;
  rejectRemark = '';
  isstatussubmit: any;
  remark: any;
  productPrice: any;
  loading = false;
  features: any;
  pm: any;

  // Azure Marketplace
  azureRequestStatus: any = null;
  isAzureSubmitting = false;

  // AWS Marketplace
  awsRequestStatus: any = null;
  isAwsSubmitting = false;

  constructor(
    private productService: ProductService,
    private route: ActivatedRoute,
    private router: Router,
    public authService: AuthService,
    private toasterService: ToasterService,
    private azureMarketplaceService: AzureMarketplaceService,
    private awsMarketplaceService: AwsMarketplaceService,
  ) {
    this.productId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadProduct();
    this.loadProductPrice();
    this.loadAzureRequestStatus();
    this.loadAwsRequestStatus();
  }

  goBack(): void {
    window.history.back();
  }

  loadAzureRequestStatus(): void {
    this.azureMarketplaceService.getProductRequestStatus(this.productId).subscribe({
      next: (res: any) => { this.azureRequestStatus = res.data; },
      error: () => { this.azureRequestStatus = null; }
    });
  }

  publishToAzureMarketplace(): void {
    if (this.isAzureSubmitting) return;

    if (this.azureRequestStatus && ['PENDING_REVIEW', 'APPROVED', 'SUBMITTED', 'VALIDATING'].includes(this.azureRequestStatus.status)) {
      this.toasterService.setToaster('warning', 'Azure Marketplace', `A request is already active (status: ${this.azureRequestStatus.status}).`);
      return;
    }

    this.isAzureSubmitting = true;
    this.azureMarketplaceService.createRequest(this.productId).subscribe({
      next: (res: any) => {
        this.isAzureSubmitting = false;
        this.toasterService.setToaster('success', 'Azure Marketplace', 'Publishing request submitted for admin review.');
        this.loadAzureRequestStatus();
      },
      error: (err: any) => {
        this.isAzureSubmitting = false;
        const msg = err?.error?.message || 'Failed to submit Azure Marketplace request.';
        this.toasterService.setToaster('error', 'Azure Marketplace', msg);
      }
    });
  }

  viewAzureRequest(): void {
    if (this.azureRequestStatus?.id) {
      this.router.navigate(['/azure-marketplace/review', this.azureRequestStatus.id]);
    }
  }

  loadAwsRequestStatus(): void {
    this.awsMarketplaceService.getProductRequestStatus(this.productId).subscribe({
      next: (res: any) => { this.awsRequestStatus = res.data; },
      error: () => { this.awsRequestStatus = null; }
    });
  }

  publishToAwsMarketplace(): void {
    if (this.isAwsSubmitting) return;

    if (this.awsRequestStatus && ['PENDING_REVIEW', 'APPROVED', 'SUBMITTED', 'VALIDATING'].includes(this.awsRequestStatus.status)) {
      this.toasterService.setToaster('warning', 'AWS Marketplace', `A request is already active (status: ${this.awsRequestStatus.status}).`);
      return;
    }

    this.isAwsSubmitting = true;
    this.awsMarketplaceService.createRequest(this.productId).subscribe({
      next: (_res: any) => {
        this.isAwsSubmitting = false;
        this.toasterService.setToaster('success', 'AWS Marketplace', 'Publishing request submitted for admin review.');
        this.loadAwsRequestStatus();
      },
      error: (err: any) => {
        this.isAwsSubmitting = false;
        const msg = err?.error?.message || 'Failed to submit AWS Marketplace request.';
        this.toasterService.setToaster('error', 'AWS Marketplace', msg);
      }
    });
  }

  viewAwsRequest(): void {
    if (this.awsRequestStatus?.id) {
      this.router.navigate(['/aws-marketplace/review', this.awsRequestStatus.id]);
    }
  }
vendorData = {
    id: 929,
    is_feature: true
  };
  loadProduct(): void {
    this.productService.getProductById(this.productId).subscribe({
      next: (res: any) => {
        if (res && res.data) {
          this.product = res.data;

          // -------- DEEP JSON DECODE FUNCTION ----------
          const deepDecode = (input: any): any => {
            let value = input;

            // 1. Keep decoding if the value is a JSON string
            while (typeof value === "string") {
              try {
                value = JSON.parse(value);
              } catch {
                break;
              }
            }

            // 2. If it becomes an array, recursively decode each item
            if (Array.isArray(value)) {
              return value
                .map(item => deepDecode(item)) // decode each element
                .flat();                       // flatten nested arrays
            }

            return value; // final primitive/string
          };

          // -------- DECODE key_features ----------
          let raw = res.data.key_features;

          // Case 1: Format "{a,b,c}"
          if (typeof raw === "string" && raw.startsWith("{") && raw.endsWith("}")) {
            raw = raw.slice(1, -1); // remove {}
            this.features = raw.split(",").map((x: any) => x.trim());
          }
          // Case 2: JSON string ["a","b","c"]
          else if (typeof raw === "string" && raw.startsWith("[")) {
            this.features = deepDecode(raw);
          }
          // Case 3: Already an array
          else if (Array.isArray(raw)) {
            this.features = raw;
          }
          // Fallback
          else {
            this.features = [];
          }

          console.log("FINAL CLEAN FEATURES:", this.features);

          // -------- DECODE pricing_model ----------
          try {
            this.pm = JSON.parse(this.product.pricing_model);
          } catch {
            this.pm = [];
          }

        } else {
          console.error("Product data not found");
          this.toasterService.setToaster('error', 'Load Product', 'Product data not found');
        }
      },

      error: (err: any) => {
        console.error("Error fetching product data:", err);
        this.toasterService.setToaster('error', 'Load Product', 'Failed to load product');
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
      type: 'product',
      publish: false,
      status: 'Unpublished',
      remark: this.remark,
    };

    this.productService.updateProductStatus(this.productId, payload).subscribe({
      next: (response) => {
        this.toasterService.setToaster('success', 'Product Update', response.message || 'Product unpublished successfully');
        console.log('API Response:', response);
        this.isstatussubmit = false;
        this.remark = '';
        this.closeModal();
        this.loadProduct();
      },
      error: (error) => {
        console.error('Error:', error);
        this.toasterService.setToaster('error', 'Product Update', 'Failed to unpublish product');
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
      type: 'product',
      approve: false,
      status: 'Rejected',
      remark: this.rejectRemark,
    };

    this.productService.updateRejectStatus(this.productId, payload).subscribe({
      next: (response) => {
        this.toasterService.setToaster('success', 'Product Rejected', response.message || 'Product rejected successfully');
        console.log('Reject API Response:', response);
        this.isstatussubmit = false;
        this.rejectRemark = '';
        this.closeRejectModal();
        this.loadProduct();
      },
      error: (error) => {
        console.error('Reject API Error:', error);
        this.toasterService.setToaster('error', 'Product Rejected', 'Failed to reject product');
        this.isstatussubmit = false;
      },
    });
  }

  publishProduct(publish: boolean): void {
    this.productService.publishItem(this.productId, this.product.type || 'product', publish).subscribe({
      next: (res) => {
        this.toasterService.setToaster('success', 'Product Update', res.message || (publish ? 'Product published successfully' : 'Product unpublished successfully'));
        console.log(publish ? 'Published:' : 'Unpublished:', res);
        this.isPublished = publish;
        this.loadProduct();
      },
      error: (err) => {
        console.error(publish ? 'Error publishing:' : 'Error unpublishing:', err);
        this.toasterService.setToaster('error', 'Product Update', publish ? 'Failed to publish product' : 'Failed to unpublish product');
      }
    });
  }

  draftProduct(): void {
    this.productService.draftItem(this.productId, this.product.type || 'product').subscribe({
      next: (res) => {
        this.toasterService.setToaster('success', 'Draft Product', res.message || 'Product drafted successfully');
        console.log('Drafted:', res);
        this.loadProduct();
      },
      error: (err) => {
        console.error('Error drafting:', err);
        this.toasterService.setToaster('error', 'Draft Product', 'Failed to draft product');
      }
    });
  }

  acceptProduct(approve: boolean, remark: string = ''): void {
    this.productService.acceptItem(this.productId, this.product.type || 'product', approve, remark).subscribe({
      next: (res) => {
        this.toasterService.setToaster('success', 'Product Status', res.message || (approve ? 'Product approved successfully' : 'Product rejected successfully'));
        console.log(approve ? 'Approved:' : 'Rejected:', res);
        this.loadProduct();
      },
      error: (err) => {
        console.error('Error updating status:', err);
        this.toasterService.setToaster('error', 'Product Status', approve ? 'Failed to approve product' : 'Failed to reject product');
      }
    });
  }
  loadProductPrice(): void {
    this.loading = true;
    this.productService.getProductPrice(this.productId).subscribe({
      next: (response) => {
        this.productPrice = response;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error fetching product price:', error);
        this.loading = false;
      }
    });
  }

  // ... your existing variables ...
  selectedImage: string | null = null;

  openLightbox(imageUrl: string) {
    this.selectedImage = imageUrl;
    // Optional: prevent scrolling when lightbox is open
    document.body.style.overflow = 'hidden';
  }

  closeLightbox() {
    this.selectedImage = null;
    document.body.style.overflow = 'auto';
  }

}
