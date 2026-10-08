import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription, debounceTime, distinctUntilChanged } from 'rxjs';
import { AzureMarketplaceService, AzureMarketplaceRequest, AzureRequestStatus, ListRequestsParams } from './azure-marketplace.service';

type FilterTab = {
  label: string;
  value: AzureRequestStatus;
  count?: number;
};

@Component({
  selector: 'app-azure-marketplace',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './azure-marketplace.component.html',
  styleUrls: ['./azure-marketplace.component.css']
})
export class AzureMarketplaceComponent implements OnInit, OnDestroy {
  requests: AzureMarketplaceRequest[] = [];
  isFetching = false;
  searchStr = '';
  currentPage = 1;
  limit = 20;
  total = 0;
  totalPages = 0;

  activeStatus: AzureRequestStatus = 'ALL';

  tabs: FilterTab[] = [
    { label: 'All',           value: 'ALL' },
    { label: 'Pending Review', value: 'PENDING_REVIEW' },
    { label: 'Approved',      value: 'APPROVED' },
    { label: 'Submitted',     value: 'SUBMITTED' },
    { label: 'Validating',    value: 'VALIDATING' },
    { label: 'Published',     value: 'PUBLISHED' },
    { label: 'Failed',        value: 'FAILED' },
    { label: 'Rejected',      value: 'REJECTED' },
  ];

  private searchSubject = new Subject<string>();
  private searchSub!: Subscription;

  private svc = inject(AzureMarketplaceService);
  constructor() {}

  ngOnInit(): void {
    this.searchSub = this.searchSubject.pipe(
      debounceTime(400),
      distinctUntilChanged()
    ).subscribe(() => {
      this.currentPage = 1;
      this.load();
    });

    this.load();
  }

  ngOnDestroy(): void {
    this.searchSub?.unsubscribe();
  }

  load(): void {
    this.isFetching = true;
    const params: ListRequestsParams = {
      status: this.activeStatus,
      search: this.searchStr || undefined,
      page: this.currentPage,
      limit: this.limit,
    };

    this.svc.listRequests(params).subscribe({
      next: (res: any) => {
        this.requests = res.data;
        this.total = res.total;
        this.totalPages = res.total_pages;
        this.isFetching = false;
      },
      error: () => { this.isFetching = false; }
    });
  }

  setTab(status: AzureRequestStatus): void {
    this.activeStatus = status;
    this.currentPage = 1;
    this.load();
  }

  onSearch(): void {
    this.searchSubject.next(this.searchStr);
  }

  prevPage(): void {
    if (this.currentPage > 1) { this.currentPage--; this.load(); }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) { this.currentPage++; this.load(); }
  }

  statusClass(status: string): string {
    const map: Record<string, string> = {
      PENDING_REVIEW: 'bg-yellow-100 text-yellow-800',
      APPROVED:       'bg-blue-100 text-blue-800',
      SUBMITTED:      'bg-indigo-100 text-indigo-800',
      VALIDATING:     'bg-purple-100 text-purple-800',
      PUBLISHED:      'bg-green-100 text-green-800',
      FAILED:         'bg-red-100 text-red-800',
      REJECTED:       'bg-slate-100 text-slate-600',
    };
    return map[status] || 'bg-slate-100 text-slate-700';
  }

  trackById(_: number, r: AzureMarketplaceRequest): number { return r.id; }
}
