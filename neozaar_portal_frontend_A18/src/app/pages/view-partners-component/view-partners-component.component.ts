import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { UserserviceService } from '../../core/services/userservice.service';
import { CommonModule } from '@angular/common'; 

interface Pagination {
  total: number;              // total number of items
  page: number;               // current page
  limit: number;               // items per page
  current_page: number;
  next_page: number | null;
  prev_page: number | null;
  pages: number[];  
             // available page numbers
}


interface Partner {
  id: number;
  name: string;
  product_logo?: string;
  designation?: string;
  mobile?: string;
  primary_cloud_alignment:string;
  
}


@Component({
  selector: 'app-view-partners-component',
  standalone: true,
  imports: [RouterModule,  CommonModule,  ],
  templateUrl: './view-partners-component.component.html',
  styleUrl: './view-partners-component.component.css'
})
export class ViewPartnersComponentComponent {


partnerlist: Partner[] = [];
  limit: number = 10;
  currentPage: number = 1;
  totalPages: number = 0;
  pagination!: Pagination;
  visiblePages: number[] = [];

  constructor(private userservice: UserserviceService) {}

  ngOnInit(): void {
    this.getpartner(this.currentPage);
  }

  /** Fetch ISV list with pagination */
 getpartner(page: number = 1): void {
    this.userservice.getpartners(
      // { page, limit: this.limit }
    ).subscribe({
      next: (res: any) => {
        if (res.status === 'success') {
          this.partnerlist = res.data ;
          this.pagination = res.pagination as Pagination;

          this.currentPage = this.pagination.current_page;
          this.totalPages = this.pagination.pages.length;
          this.visiblePages = this.pagination.pages;
          console.log("lets check " +res.data);
        }
      },
      error: (err) => {
        console.error('HTTP error:', err);
      }
    });
  }

  /** Go to specific page */
  goToPage(page: number): void {
    if (page > 0 && page <= this.totalPages && page !== this.currentPage) {
      this.getpartner(page);
    }
  }

  /** Go to next page */
  nextPage(): void {
    if (this.currentPage < this.totalPages) {
     this.getpartner(this.currentPage + 1);
    }
  }

  /** Go to previous page */
  prevPage(): void {
    if (this.currentPage > 1) {
      this.getpartner(this.currentPage - 1);
    }
  }

}
