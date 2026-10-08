import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MasterService } from '../master.service';

@Component({
  selector: 'app-brandname',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './brandname.component.html',
  styleUrls: ['./brandname.component.css']
})
export class BrandnameComponent implements OnInit {
  // Data State
  brands: any[] = [];
  brandName: string = '';
  editId: number | null = null;
  searchQuery: string = '';
  allItems: any[] = [];
  isSearchActive = false;

  get filteredBrands() {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) return this.brands;
    return (this.isSearchActive ? this.allItems : this.brands).filter(b => b.name?.toLowerCase().includes(q));
  }

  onSearchChange() {
    if (!this.searchQuery.trim()) { this.isSearchActive = false; this.allItems = []; return; }
    if (!this.isSearchActive) {
      this.isSearchActive = true;
      this.masterService.getallbrands(1, 9999).subscribe({
        next: (res: any) => {
          if (res.data?.brands) this.allItems = res.data.brands;
          else if (res.brands) this.allItems = res.brands;
          else if (Array.isArray(res.data)) this.allItems = res.data;
          else if (Array.isArray(res)) this.allItems = res;
          else this.allItems = [];
        }
      });
    }
  }

  // File Upload State
  selectedFile: File | null = null;
  brandIconPreview: string | null = null;

  // UI State
  isLoading: boolean = false;
  currentPage: number = 1;
  itemsPerPage: number = 10;
  totalItems: number = 0;
  totalPages: number = 0;
  hasNext: boolean = false;
  hasPrev: boolean = false;
  showForm: boolean = false;

  constructor(private masterService: MasterService) {}

  ngOnInit() {
    this.getBrands();
  }

  // ---------- CRUD ----------
  getBrands() {
    this.isLoading = true;
    this.masterService.getallbrands(this.currentPage, this.itemsPerPage).subscribe({
      next: (res: any) => {
        if (res.data && res.data.brands) {
          this.brands = res.data.brands;
        } else if (res.data && Array.isArray(res.data)) {
          this.brands = res.data;
        } else if (res.brands && Array.isArray(res.brands)) {
          this.brands = res.brands;
        } else if (Array.isArray(res)) {
          this.brands = res;
        } else {
          this.brands = [];
        }

        if (res.pagination) {
          this.currentPage = res.pagination.page;
          this.itemsPerPage = res.pagination.limit;
          this.totalItems = res.pagination.total;
          this.totalPages = res.pagination.total_pages;
          this.hasNext = res.pagination.has_next;
          this.hasPrev = res.pagination.has_prev;
        } else {
          this.totalItems = this.brands.length;
          this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
          this.hasNext = this.currentPage < this.totalPages;
          this.hasPrev = this.currentPage > 1;
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error fetching brands:', error);
        this.isLoading = false;
      }
    });
  }

  // File selection handler
  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      const reader = new FileReader();
      reader.onload = (e) => {
        this.brandIconPreview = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    } else {
      this.selectedFile = null;
      this.brandIconPreview = null;
    }
  }

  // Remove selected file and reset preview
  removeIcon() {
    this.selectedFile = null;
    if (this.editId) {
      // Revert to existing icon if editing
      const brand = this.brands.find(b => b.id === this.editId);
      this.brandIconPreview = brand?.icon || null;
    } else {
      this.brandIconPreview = null;
    }
  }

  saveBrand() {
    if (!this.brandName.trim()) return;

    const formData = new FormData();
    formData.append('name', this.brandName.trim());
    if (this.selectedFile) {
      formData.append('icon', this.selectedFile, this.selectedFile.name);
    }

    if (this.editId) {
      this.masterService.updatebrand(this.editId, formData).subscribe({
        next: () => {
          this.resetForm();
          this.getBrands();
        },
        error: (error) => console.error('Error updating brand:', error)
      });
    } else {
      this.masterService.createbrand(formData).subscribe({
        next: () => {
          this.resetForm();
          this.goToPage(this.totalPages + 1);
        },
        error: (error) => console.error('Error creating brand:', error)
      });
    }
    this.showForm = false;
  }

  deleteBrand(id: number) {
    if (confirm('Are you sure you want to delete this brand?')) {
      this.masterService.deletebrand(id).subscribe({
        next: () => this.getBrands(),
        error: (error) => console.error('Error deleting brand:', error)
      });
    }
  }

  editBrand(brand: any) {
    this.brandName = brand.name;
    this.editId = brand.id;
    this.brandIconPreview = brand.icon || null;
    this.selectedFile = null;
    this.showForm = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ---------- Pagination ----------
  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.getBrands();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  nextPage() {
    if (this.hasNext) {
      this.currentPage++;
      this.getBrands();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  prevPage() {
    if (this.hasPrev) {
      this.currentPage--;
      this.getBrands();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  resetForm() {
    this.brandName = '';
    this.editId = null;
    this.selectedFile = null;
    this.brandIconPreview = null;
  }

  // ---------- Helpers ----------
  getPageNumbers(): (number | string)[] {
    const pages: (number | string)[] = [];
    const maxVisible = 5;
    if (this.totalPages <= maxVisible) {
      for (let i = 1; i <= this.totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (this.currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(this.totalPages);
      } else if (this.currentPage >= this.totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = this.totalPages - 3; i <= this.totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = this.currentPage - 1; i <= this.currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(this.totalPages);
      }
    }
    return pages;
  }

  isCurrentPage(page: number): boolean {
    return this.currentPage === page;
  }

  openCreate() {
    this.resetForm();
    this.showForm = true;
  }

  closeForm() {
    this.showForm = false;
    this.resetForm();
  }
}
