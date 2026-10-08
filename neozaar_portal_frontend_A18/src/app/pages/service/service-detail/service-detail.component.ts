import { Component } from '@angular/core';
import { ServiceService } from '../service.service';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule, KeyValuePipe } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { UserRole } from '../../../core/modal/user.modal';
import { HasRoleDirective } from '../../../shared/directives/has-role.directive';
import { FormsModule } from '@angular/forms';
import { ToasterService } from '../../../shared/providers/toaster/toaster.service';
import { RouterModule } from '@angular/router';
import { JsonParsePipe } from '../../../json-parse.pipe';
import { VendorFeatureComponent } from '../../../shared/components/vendor-feature/vendor-feature.component';
import { AzureMarketplaceService } from '../../azure-marketplace/azure-marketplace.service';
import { AwsMarketplaceService } from '../../aws-marketplace/aws-marketplace.service';


@Component({
  selector: 'app-service-detail',
  standalone: true,
  imports: [CommonModule, KeyValuePipe, HasRoleDirective, FormsModule,RouterModule,JsonParsePipe, VendorFeatureComponent],
  templateUrl: './service-detail.component.html',
  styleUrl: './service-detail.component.css'
})

export class ServiceDetailComponent {
 // Initialise to an empty object so template bindings (e.g. product.product_logo)
 // don't throw while the service is still loading or if the fetch fails.
 product: any = {};
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
features:any;
pm:any;

  // Azure Marketplace (services are listed as services only)
  azureRequestStatus: any = null;
  isAzureSubmitting = false;

  // AWS Marketplace (services are listed as services only)
  awsRequestStatus: any = null;
  isAwsSubmitting = false;

 constructor(
    private serviceservice: ServiceService,
    private route: ActivatedRoute,
    private router: Router,
    public authService: AuthService,
    private toasterService: ToasterService,
    private azureMarketplaceService: AzureMarketplaceService,
    private awsMarketplaceService: AwsMarketplaceService,
  ) {
    this.productId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadProduct();
    this.loadServivePrice();
    this.loadAzureRequestStatus();
    this.loadAwsRequestStatus();
  }

  // -------- Azure Marketplace --------
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
      next: () => {
        this.isAzureSubmitting = false;
        this.toasterService.setToaster('success', 'Azure Marketplace', 'Service publishing request submitted for admin review.');
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

  // -------- AWS Marketplace --------
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
      next: () => {
        this.isAwsSubmitting = false;
        this.toasterService.setToaster('success', 'AWS Marketplace', 'Service publishing request submitted for admin review.');
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
this.serviceservice.getServiceById(this.productId).subscribe({
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
        this.features = raw.split(",").map((x:any) => x.trim());
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
      console.error("Service data not found");
      this.toasterService.setToaster('error', 'Load Service', 'Service data not found');
    }
  },

  error: (err: any) => {
    console.error("Error fetching Service data:", err);
    this.toasterService.setToaster('error', 'Load Service', 'Failed to load Service');
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

    this.serviceservice.updateService(this.productId, payload).subscribe({
      next: (response) => {
        this.toasterService.setToaster('success', 'Service Update', response.message || 'Service unpublished successfully');
        console.log('API Response:', response);
        this.isstatussubmit = false;
        this.remark = '';
        this.closeModal();
      },
      error: (error) => {
        console.error('Error:', error);
        this.toasterService.setToaster('error', 'Service Update', 'Failed to unpublish Service');
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

    this.serviceservice.updateRejectStatus(this.productId, payload).subscribe({
      next: (response) => {
        this.toasterService.setToaster('success', 'Service Rejected', response.message || 'Service rejected successfully');
        console.log('Reject API Response:', response);
        this.isstatussubmit = false;
        this.rejectRemark = '';
        this.closeRejectModal();
      },
      error: (error) => {
        console.error('Reject API Error:', error);
        this.toasterService.setToaster('error', 'Service Rejected', 'Failed to reject Service');
        this.isstatussubmit = false;
      },
    });
  }

  publishProduct(publish: boolean): void {
    this.serviceservice.publishItem(this.productId, this.product.type || 'product', publish).subscribe({
      next: (res) => {
        this.toasterService.setToaster('success', 'Service Update', res.message || (publish ? 'Service published successfully' : 'Service unpublished successfully'));
        console.log(publish ? 'Published:' : 'Unpublished:', res);
        this.isPublished = publish;
      this.loadProduct();
      },
      error: (err) => {
        console.error(publish ? 'Error publishing:' : 'Error unpublishing:', err);
        this.toasterService.setToaster('error', 'Service Update', publish ? 'Failed to publish Service' : 'Failed to unpublish Service');
      }
   
    });
  }

  draftProduct(): void {
    this.serviceservice.draftItem(this.productId, this.product.type || 'service').subscribe({
      next: (res) => {
        this.toasterService.setToaster('success', 'Draft Service', res.message || 'Service drafted successfully');
        console.log('Drafted:', res);
        this.loadProduct();
      },
      error: (err) => {
        console.error('Error drafting:', err);
        this.toasterService.setToaster('error', 'Draft Service', 'Failed to draft Service');
      }
    });
  }

  acceptProduct(approve: boolean, remark: string = ''): void {
    this.serviceservice.acceptItem(this.productId, this.product.type || 'product', approve, remark).subscribe({
      next: (res) => {
        this.toasterService.setToaster('success', 'Service Status', (approve ? 'Service approved successfully' : 'Service rejected successfully'));
        console.log(approve ? 'Approved:' : 'Rejected:', res);
        this.loadProduct();
      },
      error: (err) => {
        console.error('Error updating status:', err);
        this.toasterService.setToaster('error', 'Service Status', approve ? 'Failed to approve Service' : 'Failed to reject Service');
      }
    });
  }
 loadServivePrice(): void {
    this.loading = true;
    this.serviceservice.getServicePrice(this.productId).subscribe({
      next: (response) => {
        this.productPrice = response;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error fetching Service price:', error);
        this.loading = false;
      }
    });
  }
  
  isOutcomeArray(outcome: any): boolean {
    return typeof outcome === 'string' && outcome.startsWith('[') && outcome.endsWith(']');
  }

parseOutcomeArray(outcome: string): string[] {
  try {
    return JSON.parse(outcome);
  } catch (e) {
    return [outcome];
  }
}
 selectedImage: string | null = null;


  goBack(): void {
    window.history.back();
  }

  openLightbox(imageUrl: string) {
    this.selectedImage = imageUrl;
    // Optional: prevent scrolling when lightbox is open
    document.body.style.overflow = 'hidden';
  }
isDefaultHtml(html: string): boolean {
  if (!html) return true;
  // Check if it's the default "challengesaddressed" HTML
  return html.includes('challengesaddressed') && html.includes('<span') && html.includes('<p');
}
hasValidContent(data: any): boolean {
  if (!data) return false;
  
  const fields = ['overview', 'scope', 'approach', 'challenges_addressed'];
  return fields.some(field => 
    data[field] && !this.isDefaultHtml(data[field])
  );
}
  closeLightbox() {
    this.selectedImage = null;
    document.body.style.overflow = 'auto';
  }

  cleanString(value: string): string {
  if (!value) return '';
  return value.replace(/^"|"$/g, ''); // remove leading & trailing quotes
}
  // Helper to clean HTML if needed
  stripHtml(html: string): string {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || '';
  }
}
