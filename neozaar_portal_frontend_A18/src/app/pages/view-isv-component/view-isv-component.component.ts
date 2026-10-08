import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { UserserviceService } from '../../core/services/userservice.service';
import { CommonModule } from '@angular/common';
import { ToasterService } from '../../shared/providers/toaster/toaster.service';
import { PhoneFormatPipe } from '../../shared/pipes/phone-format.pipe';
import { FormBuilder, FormGroup, FormArray, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface Pagination {
  total: number;
  page: number;
  limit: number;
  current_page: number;
  next_page: number | null;
  prev_page: number | null;
  pages: number[];
  totalpages?: number;
}

@Component({
  selector: 'app-view-isv-component',
  standalone: true,
  imports: [RouterModule, CommonModule, PhoneFormatPipe, ReactiveFormsModule, FormsModule],
  templateUrl: './view-isv-component.component.html',
  styleUrls: ['./view-isv-component.component.css']
})
export class ViewIsvComponentComponent implements OnInit {
  isvlist: any;
  limit: number = 10;
  currentPage: number = 1;
  totalPages: number = 0;
  pagination?: Pagination;
  visiblePages: number[] = [];
  statusForm!: FormGroup;
  priceForm!: FormGroup;
  singleLeadData: any;
  isLeadModalOpen = false;
  status: string = 'all'; // Default status

  constructor(
    private userservice: UserserviceService,
    private toasterService: ToasterService,
    private fb: FormBuilder,
    private authService: AuthService,
    private http: HttpClient,
  ) {}
  private apiUrl = environment.apiUrl;

  get isAdmin(): boolean {
    return ['SUPER_ADMIN', 'ADMIN'].includes(this.authService.user?.role_type as string);
  }

  get isMSeller(): boolean {
    return this.authService.user?.role_type === 'M_SELLER';
  }

  get isAManager(): boolean {
    return this.authService.user?.role_type === 'A_MANAGER';
  }

  get canAssignIsv(): boolean {
    return this.isAdmin || this.isMSeller || this.isAManager;
  }

  // ISV → Seller assignment
  showAssignIsvModal = false;
  assignIsvTarget: any = null;
  sellers: any[] = [];
  selectedSellerForIsv: number | null = null;
  assignIsvLoading = false;

  ngOnInit(): void {
    this.getisv(this.currentPage, this.status);
  }

  onStatusChange(): void {
    this.currentPage = 1; // Reset to first page when status changes
    this.getisv(this.currentPage, this.status);
  }

  /** ✅ Approve or handle ISV action */
  handleUserAction(userId: number) {
    if (!userId) {
      this.toasterService.setToaster('error', 'Error', 'Invalid user id');
      return;
    }

    this.userservice.approveuser(userId).subscribe({
      next: (res) => {
        console.log('API response:', res);
        this.toasterService.setToaster('success', 'Success', 'Action completed successfully');
        this.getisv(this.currentPage, this.status); // ✅ refresh list after action
      },
      error: (err) => {
        console.error(err);
        this.toasterService.setToaster('error', 'Error', 'Action failed. Please try again.');
      }
    });
  }

  getisv(page: number = 1, status: string = 'all'): void {
    const params: any = { page, limit: this.limit };
    if (status && status !== 'all') params.status = status;

    this.userservice.getisv(params).subscribe({
      next: (res: any) => {
        if (res.status === 'success') {
          this.isvlist = res.data;
          this.pagination = res.pagination;

          // Convert to numbers to ensure proper comparison
          this.currentPage = Number(res.pagination?.current_page) || 1;
          this.totalPages = Number(res.pagination?.totalpages) || 
                           (res.pagination?.pages?.length || 0);

          // Ensure visiblePages contains numbers
          if (res.pagination?.pages && Array.isArray(res.pagination.pages)) {
            this.visiblePages = res.pagination.pages.map((p:any) => Number(p));
          } else {
            // Fallback: generate pages array if not provided
            this.generateVisiblePages();
          }
          
          console.log('Pagination:', {
            currentPage: this.currentPage,
            visiblePages: this.visiblePages,
            totalPages: this.totalPages
          });
        }
      },
      error: (err) => {
        console.error('HTTP error:', err);
        this.toasterService.setToaster('error', 'Error', 'Failed to load ISV data');
      }
    });
  }

  // Helper method to generate visible pages if not provided by API
  private generateVisiblePages(): void {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(this.totalPages, start + maxVisible - 1);
    
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    this.visiblePages = pages;
  }

  /** ✅ Pagination Controls */
  goToPage(page: number): void {
    if (page > 0 && page <= this.totalPages && page !== this.currentPage) {
      this.getisv(page, this.status);
    }
  }

  nextPage(): void {
    if (this.pagination?.next_page) {
      this.getisv(this.pagination.next_page, this.status);
    }
  }

  prevPage(): void {
    if (this.pagination?.prev_page) {
      this.getisv(this.pagination.prev_page, this.status);
    }
  }

  // User Actions
  deleteIsv(id: number) {
    if (confirm('Are you sure you want to delete this ISV?')) {
      const payload = { userId: id, is_approved: false };

      this.userservice.deleteIsv(payload).subscribe({
        next: (res) => {
          this.toasterService.setToaster('success', 'Deleted successfully', 'ISV deleted');
          this.getisv(this.currentPage, this.status); // Refresh list
        },
        error: (err) => {
          this.toasterService.setToaster('error', 'Something went wrong', err?.message || 'Error');
        }
      });
    }
  }

  inactiveIsv(userid: number) {
    if (confirm('Are you sure you want to deactivate this ISV?')) {
      const payload = { userid };

      this.userservice.inactiveIsv(payload).subscribe({
        next: (res) => {
          this.toasterService.setToaster('success', 'Success', 'Inactivated successfully');
          this.getisv(this.currentPage, this.status); // Refresh list
        },
        error: (err) => {
          this.toasterService.setToaster('error', 'Something went wrong', err?.message || 'Error');
        }
      });
    }
  }

  // openLeadModal(product: any): void {
  //   this.isLeadModalOpen = true;
  //   this.singleLeadData = product;

  //   // Optional: Fetch ISV user data if needed
  //   this.userservice.getisv(this.singleLeadData.id).subscribe({
  //     next: (res: any) => {
  //       this.userid = res.data?.id || res.data;
  //       console.log('User ID:', this.userid);
  //     },
  //     error: (err) => console.error('Error fetching ISV:', err)
  //   });
  // }

  /** 🟠 Submit the commission percentage */
  submitPricing(): void {
    if (this.priceForm.invalid) {
      this.toasterService.setToaster('error', 'Invalid', 'Please enter a valid percentage');
      return;
    }
    // Your submit logic here
  }

  // Helper method for better template tracking
  trackByPage(index: number, page: number): number {
    return page;
  }

  // ─── ISV → Seller Assignment (M_SELLER) ───
  openAssignIsvModal(isv: any): void {
    this.assignIsvTarget = isv;
    this.selectedSellerForIsv = null;
    this.showAssignIsvModal = true;
    // Load sellers list
    if (!this.sellers.length) {
      this.http.get<any>(`${this.apiUrl}internal/crm/opportunities/0/available-sellers`).subscribe({
        next: (res) => { this.sellers = res.data || []; },
        error: () => {}
      });
    }
  }

  assignIsvToSeller(): void {
    if (!this.selectedSellerForIsv || !this.assignIsvTarget) return;
    this.assignIsvLoading = true;
    this.http.post<any>(`${this.apiUrl}seller/assign-isv`, {
      seller_id: this.selectedSellerForIsv,
      isv_id: this.assignIsvTarget.id
    }).subscribe({
      next: (res) => {
        this.assignIsvLoading = false;
        this.showAssignIsvModal = false;
        this.toasterService.setToaster('success', 'Assigned', res.message || 'ISV assigned to seller');
      },
      error: (err) => {
        this.assignIsvLoading = false;
        this.toasterService.setToaster('error', 'Error', err.error?.message || 'Failed to assign');
      }
    });
  }
}
