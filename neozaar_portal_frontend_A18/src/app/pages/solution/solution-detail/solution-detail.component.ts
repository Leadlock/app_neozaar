import { Component } from '@angular/core';
import { SolutionserviceService } from '../solutionservice.service';
import { ActivatedRoute } from '@angular/router';
import { CommonModule, KeyValuePipe } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { UserRole } from '../../../core/modal/user.modal';
import { HasRoleDirective } from '../../../shared/directives/has-role.directive';
import { FormsModule } from '@angular/forms';
import { ToasterService } from '../../../shared/providers/toaster/toaster.service';
import { RouterModule } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { VendorFeatureComponent } from '../../../shared/components/vendor-feature/vendor-feature.component';

@Component({
  selector: 'app-solution-detail',
  standalone: true,
  imports: [CommonModule, KeyValuePipe, HasRoleDirective, FormsModule,RouterModule, VendorFeatureComponent],
  templateUrl: './solution-detail.component.html',
  styleUrl: './solution-detail.component.css'
})
export class SolutionDetailComponent {
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
features:any;
pm:any;
linkedProductsByBrand: { brand: string; logo: string | null; items: any[] }[] = [];
linkedServicesByBrand: { brand: string; logo: string | null; items: any[] }[] = [];

 constructor(
    private SolutionserviceService: SolutionserviceService,
    private route: ActivatedRoute,
    public authService: AuthService,
    private toasterService: ToasterService,
  ) {
    this.productId = Number(this.route.snapshot.paramMap.get('id'));
    this.loadProduct();
    this.loadProductPrice()
  }
  vendorData = {
    id: 929,
    is_feature: true
  };
 loadProduct(): void {
this.SolutionserviceService.getProductById(this.productId).subscribe({
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

      // Decode primary_business_outcome
      const decodeArray = (raw: any): string[] => {
        if (!raw) return [];
        if (Array.isArray(raw)) return raw;
        if (typeof raw === 'string') {
          if (raw.startsWith('{') && raw.endsWith('}')) {
            return raw.slice(1, -1).split(',').map((x: string) => x.trim().replace(/^"|"$/g, ''));
          }
          try { const p = JSON.parse(raw); return Array.isArray(p) ? p : []; } catch { return []; }
        }
        return [];
      };

      this.product.customer_challenges = decodeArray(this.product.customer_challenges);
      this.product.primary_business_outcome = decodeArray(this.product.primary_business_outcome);
      this.product.use_cases = decodeArray(this.product.use_cases);

      // Load linked products and services
      this.loadLinkedItems(
        this.product.select_isv_products || [],
        this.product.select_spectrum_partner_services || []
      );

      // -------- DECODE pricing_model ----------
      try {
        this.pm = JSON.parse(this.product.pricing_model);
      } catch {
        this.pm = [];
      }

    } else {
      console.error("Solution data not found");
      this.toasterService.setToaster('error', 'Load Solution', 'Solution data not found');
    }
  },

  error: (err: any) => {
    console.error("Error fetching Solution data:", err);
    this.toasterService.setToaster('error', 'Load Solution', 'Failed to load Solution');
  }
});



  }

  openModal(): void {
    this.isModalOpen = true;
  }
  goBack(): void {
    window.history.back();
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

    this.SolutionserviceService.updateProductStatus(this.productId, payload).subscribe({
      next: (response) => {
        this.toasterService.setToaster('success', 'Solution Update', response.message || 'Solution unpublished successfully');
        console.log('API Response:', response);
        this.isstatussubmit = false;
        this.remark = '';
        this.closeModal();
      },
      error: (error) => {
        console.error('Error:', error);
        this.toasterService.setToaster('error', 'Solution Update', 'Failed to unpublish Solution');
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

    this.SolutionserviceService.updateRejectStatus(this.productId, payload).subscribe({
      next: (response) => {
        this.toasterService.setToaster('success', 'Solution Rejected', response.message || 'Solution rejected successfully');
        console.log('Reject API Response:', response);
        this.isstatussubmit = false;
        this.rejectRemark = '';
        this.closeRejectModal();
      },
      error: (error) => {
        console.error('Reject API Error:', error);
        this.toasterService.setToaster('error', 'Solution Rejected', 'Failed to reject Solution');
        this.isstatussubmit = false;
      },
    });
  }

  publishProduct(publish: boolean): void {
    this.SolutionserviceService.publishItem(this.productId, this.product.type || 'product', publish).subscribe({
      next: (res) => {
        this.toasterService.setToaster('success', 'Solution Update', res.message || (publish ? 'Solution published successfully' : 'Solution unpublished successfully'));
        console.log(publish ? 'Published:' : 'Unpublished:', res);
        this.isPublished = publish;
        this.loadProduct();
      },
      error: (err) => {
        console.error(publish ? 'Error publishing:' : 'Error unpublishing:', err);
        this.toasterService.setToaster('error', 'Solution Update', publish ? 'Failed to publish Solution' : 'Failed to unpublish Solution');
      }
    });
  }

  draftProduct(): void {
    this.SolutionserviceService.draftItem(this.productId, this.product.type || 'product').subscribe({
      next: (res) => {
        this.toasterService.setToaster('success', 'Draft Solution', res.message || 'Solution drafted successfully');
        console.log('Drafted:', res);
        this.loadProduct();
      },
      error: (err) => {
        console.error('Error drafting:', err);
        this.toasterService.setToaster('error', 'Draft Solution', 'Failed to draft Solution');
      }
    });
  }

  acceptProduct(approve: boolean, remark: string = ''): void {
    this.SolutionserviceService.acceptItem(this.productId, this.product.type || 'product', approve, remark).subscribe({
      next: (res) => {
        this.toasterService.setToaster('success', 'Solution Status', (approve ? 'Solution approved successfully' : 'Solution rejected successfully'));
        console.log(approve ? 'Approved:' : 'Rejected:', res);
        this.loadProduct();
      },
      error: (err) => {
        console.error('Error updating status:', err);
        this.toasterService.setToaster('error', 'Solution Status', approve ? 'Failed to approve Solution' : 'Failed to reject Solution');
      }
    });
  }
  // Add these methods to your component
selectedImage: string | null = null;
// isModalOpen = false;
// remark = '';

openLightbox(image: string): void {
  this.selectedImage = image;
}

closeLightbox(): void {
  this.selectedImage = null;
}

// openModal(): void {
//   this.isModalOpen = true;
// }

// closeModal(): void {
//   this.isModalOpen = false;
//   this.remark = '';
// }

requestDemo(): void {
  // Implement demo request logic
  window.open('https://demo.visitorcheck.in', '_blank');
}

cleanString(value: string): string {
  if (!value) return '';
  return value.replace(/^"|"$/g, '');
}

parseJsonArray(value: string): any[] {
  try {
    if (value === 'undefined' || !value) return [];
    return JSON.parse(value);
  } catch (e) {
    return [];
  }
}
  private loadLinkedItems(productIds: number[], serviceIds: number[]): void {
    const groupByBrand = (items: any[]): { brand: string; logo: string | null; items: any[] }[] => {
      const map = new Map<string, { brand: string; logo: string | null; items: any[] }>();
      items.forEach(item => {
        const brand = item.brand_name || 'Unknown';
        if (!map.has(brand)) {
          map.set(brand, { brand, logo: item.product_logo || null, items: [] });
        }
        map.get(brand)!.items.push(item);
      });
      return Array.from(map.values());
    };

    const fetchAll = (ids: number[]) =>
      ids.length === 0
        ? of([])
        : forkJoin(ids.map(id =>
            this.SolutionserviceService.getProductById(id).pipe(
              catchError(() => of(null))
            )
          ));

    fetchAll(productIds).subscribe((results: any[]) => {
      const items = results.filter(r => r?.data).map((r: any) => r.data);
      this.linkedProductsByBrand = groupByBrand(items);
    });

    fetchAll(serviceIds).subscribe((results: any[]) => {
      const items = results.filter(r => r?.data).map((r: any) => r.data);
      this.linkedServicesByBrand = groupByBrand(items);
    });
  }

  loadProductPrice(): void {
    this.loading = true;
    this.SolutionserviceService.getProductPrice(this.productId).subscribe({
      next: (response) => {
        this.productPrice = response;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error fetching Solution price:', error);
        this.loading = false;
      }
    });
  }

  stripHtml(html: string): string {
    if (!html) return '';
    const temp = document.createElement('div');
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || '';
  }

}
