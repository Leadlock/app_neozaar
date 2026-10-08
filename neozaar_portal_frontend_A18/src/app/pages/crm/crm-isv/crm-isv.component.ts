import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { UserserviceService } from '../../../core/services/userservice.service';
import { ToasterService } from '../../../shared/providers/toaster/toaster.service';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';

interface Pagination {
  total: number; page: number; limit: number;
  current_page: number; next_page: number | null;
  prev_page: number | null; pages: number[]; totalpages?: number;
}

@Component({
  selector: 'app-crm-isv',
  standalone: true,
  imports: [RouterModule, CommonModule, FormsModule],
  templateUrl: './crm-isv.component.html',
})
export class CrmIsvComponent implements OnInit {
  isvlist: any[] = [];
  limit = 10;
  currentPage = 1;
  totalPages = 0;
  pagination?: Pagination;
  visiblePages: number[] = [];
  status = 'all';

  showAssignIsvModal = false;
  assignIsvTarget: any = null;
  sellers: any[] = [];
  selectedSellerForIsv: number | null = null;
  assignIsvLoading = false;

  private apiUrl = environment.apiUrl;

  constructor(
    private userservice: UserserviceService,
    private toasterService: ToasterService,
    private authService: AuthService,
    private http: HttpClient,
  ) {}

  get isAdmin(): boolean {
    return ['SUPER_ADMIN', 'ADMIN'].includes(this.authService.user?.role_type as string);
  }

  get isMSeller(): boolean {
    return this.authService.user?.role_type === 'M_SELLER';
  }

  get canAssignIsv(): boolean {
    return this.isAdmin || this.isMSeller;
  }

  ngOnInit(): void {
    this.getisv(this.currentPage, this.status);
  }

  onStatusChange(): void {
    this.currentPage = 1;
    this.getisv(this.currentPage, this.status);
  }

  getisv(page = 1, status = 'all'): void {
    const params: any = { page, limit: this.limit };
    if (status && status !== 'all') params.status = status;
    this.userservice.getisv(params).subscribe({
      next: (res: any) => {
        if (res.status === 'success') {
          this.isvlist = res.data;
          this.pagination = res.pagination;
          this.currentPage = Number(res.pagination?.current_page) || 1;
          this.totalPages = Number(res.pagination?.totalpages) || (res.pagination?.pages?.length || 0);
          this.visiblePages = Array.isArray(res.pagination?.pages)
            ? res.pagination.pages.map((p: any) => Number(p))
            : this.generatePages();
        }
      },
      error: () => this.toasterService.setToaster('error', 'Error', 'Failed to load ISV data')
    });
  }

  private generatePages(): number[] {
    const pages = [];
    const max = 5;
    let start = Math.max(1, this.currentPage - Math.floor(max / 2));
    const end = Math.min(this.totalPages, start + max - 1);
    if (end - start + 1 < max) start = Math.max(1, end - max + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }

  goToPage(page: number): void {
    if (page > 0 && page <= this.totalPages && page !== this.currentPage)
      this.getisv(page, this.status);
  }

  nextPage(): void { if (this.pagination?.next_page) this.getisv(this.pagination.next_page, this.status); }
  prevPage(): void { if (this.pagination?.prev_page) this.getisv(this.pagination.prev_page, this.status); }

  deleteIsv(id: number): void {
    if (!confirm('Are you sure you want to delete this ISV?')) return;
    this.userservice.deleteIsv({ userId: id, is_approved: false }).subscribe({
      next: () => { this.toasterService.setToaster('success', 'Deleted', 'ISV deleted'); this.getisv(this.currentPage, this.status); },
      error: (err) => this.toasterService.setToaster('error', 'Error', err?.message || 'Error')
    });
  }

  inactiveIsv(userid: number): void {
    if (!confirm('Are you sure you want to deactivate this ISV?')) return;
    this.userservice.inactiveIsv({ userid }).subscribe({
      next: () => { this.toasterService.setToaster('success', 'Success', 'Inactivated successfully'); this.getisv(this.currentPage, this.status); },
      error: (err) => this.toasterService.setToaster('error', 'Error', err?.message || 'Error')
    });
  }

  openAssignIsvModal(isv: any): void {
    this.assignIsvTarget = isv;
    this.selectedSellerForIsv = null;
    this.showAssignIsvModal = true;
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
