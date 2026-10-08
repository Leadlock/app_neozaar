import { Component, OnInit } from '@angular/core';
import { SeoServiveService } from '../seo-servive.service';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ToasterService } from '../../../shared/providers/toaster/toaster.service';
import { debounceTime, distinctUntilChanged, Subject, filter } from 'rxjs';

interface Pagination {
  total: number;
  page: number;
  limit: number;
  current_page: number;
  next_page: number | null;
  prev_page: number | null;
  pages: number[];
}

@Component({
  selector: 'app-seo-list',
  standalone: true,
  imports: [RouterModule, CommonModule, FormsModule],
  templateUrl: './seo-list.component.html',
  styleUrl: './seo-list.component.css'
})
export class SeoListComponent implements OnInit {

  seolist: any[] = [];
  limit = 10;
  currentPage = 1;
  totalPages = 0;

  // ✅ FIX: explicitly nullable
  pagination: Pagination | null = null;

  visiblePages: number[] = [];
  searchQuery = '';
  searchSubject = new Subject<string>();
  loading = false;
  isTyping = false;
  minSearchChars = 3;

  constructor(
    private seoservice: SeoServiveService,
    private toasterService: ToasterService
  ) {}

  ngOnInit(): void {
    this.gitseodetail(this.currentPage);

    this.searchSubject.pipe(
      debounceTime(1000),
      distinctUntilChanged(),
      filter(term => term === '' || term.length >= this.minSearchChars)
    ).subscribe(term => {
      this.isTyping = false;
      this.performSearch(term);
    });
  }

  onSearch(): void {
    this.isTyping = true;
    this.searchSubject.next(this.searchQuery);
  }

  private performSearch(searchTerm: string): void {
    if (searchTerm.length > 0 && searchTerm.length < this.minSearchChars) {
      this.isTyping = false;
      return;
    }
    this.currentPage = 1;
    this.gitseodetail(1);
  }

  gitseodetail(page: number = 1): void {
    this.loading = true;

    const params: any = { page, limit: this.limit };

    if (this.searchQuery.trim().length >= this.minSearchChars) {
      params.search = this.searchQuery.trim();
    }

    this.seoservice.getSeoList(params).subscribe({
      next: (res: any) => {
        this.loading = false;

        if (res.status === 'success') {
          this.seolist = res.data.data;
          this.pagination = res.data.pagination;
          this.currentPage = res.data.pagination.current_page;
          this.totalPages = res.data.pagination.total_pages;
          this.visiblePages = res.data.pagination.pages;
        }
      },
      error: (err) => {
        this.loading = false;
        console.error(err);
        this.toasterService.setToaster('error', 'Error', 'Failed to load SEO data');
      }
    });
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.currentPage = 1;
    this.gitseodetail(1);
  }

  goToPage(page: number): void {
    if (page !== this.currentPage) {
      this.gitseodetail(page);
    }
  }

  nextPage(): void {
    if (this.pagination?.next_page) {
      this.gitseodetail(this.pagination.next_page);
    }
  }

  prevPage(): void {
    if (this.pagination?.prev_page) {
      this.gitseodetail(this.pagination.prev_page);
    }
  }

  deleteSeo(seoid: number): void {
    if (!confirm('Are you sure you want to delete this seo?')) return;

    this.seoservice.deleteSeo(seoid).subscribe({
      next: (res: any) => {
        if (res.status === 'success' || res.success) {
          this.toasterService.setToaster('success', 'Deleted', 'Seo deleted successfully');
          this.gitseodetail(this.currentPage);
        } else {
          this.toasterService.setToaster('error', 'Error', res.message || 'Delete failed');
        }
      },
      error: () => {
        this.toasterService.setToaster('error', 'Error', 'Delete failed');
      }
    });
  }

  getShowingRange(): string {
    if (!this.pagination || this.seolist.length === 0) return '';

    const start = ((this.currentPage - 1) * this.limit) + 1;
    const end = Math.min(this.currentPage * this.limit, this.pagination.total);

    return `Showing ${start} to ${end} of ${this.pagination.total} entries`;
  }
}
