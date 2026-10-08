import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MasterService } from '../master.service';
import { CommonModule } from '@angular/common';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ProductService } from '../../product/product-service.service';
import { SolutionserviceService } from '../../solution/solutionservice.service';
import { ServiceService } from '../../service/service.service';

@Component({
  selector: 'app-subcategory',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './subcategory.component.html',
  styleUrl: './subcategory.component.css'
})
export class SubcategoryComponent implements OnInit {

  subcategories: any[] = [];
  categories: any[] = [];
  searchQuery: string = '';
  selectedCategory: number | null = null;
  allItems: any[] = [];
  isSearchActive = false;

  get filteredSubcategories() {
    const q = this.searchQuery.trim().toLowerCase();
    const base = (this.isSearchActive ? this.allItems : this.subcategories);
    return base.filter(s => {
      const categoryName = this.getCategoryName(s).toLowerCase();
      const matchesSearch = !q || s.name?.toLowerCase().includes(q) || categoryName.includes(q);
      const matchesCategory = this.selectedCategory === null || Number(s.category_id ?? s.category?.id) === Number(this.selectedCategory);
      return matchesSearch && matchesCategory;
    });
  }

  getCategoryName(subcategory: any): string {
    return subcategory?.category?.name || subcategory?.category_name || '';
  }

  get effectiveTotalPages(): number {
    if (this.isSearchActive) {
      return Math.ceil(this.filteredSubcategories.length / this.itemsPerPage);
    }
    return this.totalPages;
  }

  onSearchChange() {
    if (!this.searchQuery.trim()) { this.isSearchActive = false; this.allItems = []; return; }
    if (!this.isSearchActive) {
      this.isSearchActive = true;
      this.isLoading = true;
      this.masterService.getAllSubCategories(1, 9999).subscribe({
        next: (res: any) => {
          if (res?.data?.subcategories) this.allItems = res.data.subcategories;
          else if (Array.isArray(res?.data)) this.allItems = res.data;
          else if (Array.isArray(res)) this.allItems = res;
          else this.allItems = [];
          this.isLoading = false;
        },
        error: () => { this.allItems = []; this.isLoading = false; }
      });
    }
  }

  onCategoryFilterChange() {
    this.currentPage = 1;
    if (this.selectedCategory !== null && !this.isSearchActive) {
      this.isSearchActive = true;
      this.isLoading = true;
      this.masterService.getAllSubCategories(1, 9999).subscribe({
        next: (res: any) => {
          if (res?.data?.subcategories) this.allItems = res.data.subcategories;
          else if (Array.isArray(res?.data)) this.allItems = res.data;
          else if (Array.isArray(res)) this.allItems = res;
          else this.allItems = [];
          this.isLoading = false;
        },
        error: () => { this.allItems = []; this.isLoading = false; }
      });
    } else if (this.selectedCategory === null && !this.searchQuery.trim()) {
      this.isSearchActive = false;
      this.allItems = [];
    }
  }

  // Pagination States
  currentPage: number = 1;
  itemsPerPage: number = 10;
  totalItems: number = 0;
  totalPages: number = 0;
  hasNext: boolean = false;
  hasPrev: boolean = false;
  showForm: boolean = false;
  subCategoryName: string = '';
  categoryId: number | null = null;
  editId: number | null = null;
  isLoading: boolean = false;

  // Associated Modal
  showAssocModal = false;
  assocSubcat: any = null;
  assocTab = 'products';
  assocLoading = false;
  assocProducts: any[] = [];
  assocSolutions: any[] = [];
  assocServices: any[] = [];

  constructor(
    private masterService: MasterService,
    private productService: ProductService,
    private solutionService: SolutionserviceService,
    private serviceService: ServiceService
  ) {}

  ngOnInit() {
    this.getSubCategories();
    this.getCategories();
  }

  // ✅ Fetch SubCategories with Server-Side Pagination
  getSubCategories() {
    this.isLoading = true;
    this.masterService.getAllSubCategories(this.currentPage, this.itemsPerPage).subscribe({
      next: (res: any) => {
        console.log('API Response:', res);
        
        // Extract subcategories based on API response structure
        if (res?.data?.subcategories) {
          this.subcategories = res.data.subcategories;
        } else if (res?.data && Array.isArray(res.data)) {
          this.subcategories = res.data;
        } else if (res?.subcategories && Array.isArray(res.subcategories)) {
          this.subcategories = res.subcategories;
        } else if (Array.isArray(res)) {
          this.subcategories = res;
        } else {
          this.subcategories = [];
        }
        
        // Set pagination metadata
        if (res?.pagination) {
          this.currentPage = res.pagination.page;
          this.itemsPerPage = res.pagination.limit;
          this.totalItems = res.pagination.total;
          this.totalPages = res.pagination.total_pages;
          this.hasNext = res.pagination.has_next;
          this.hasPrev = res.pagination.has_prev;
        } else {
          // Calculate locally if pagination not provided
          this.totalItems = this.subcategories.length;
          this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
          this.hasNext = this.currentPage < this.totalPages;
          this.hasPrev = this.currentPage > 1;
        }
        
        console.log('Current Page:', this.currentPage);
        console.log('Total Pages:', this.totalPages);
        console.log('Subcategories:', this.subcategories);
        
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error fetching subcategories:', error);
        this.isLoading = false;
      }
    });
  }

  getCategories() {
    this.masterService.getAllCategories().subscribe({
      next: (res: any) => {
        this.categories = res?.data?.categories || [];
      },
      error: (error) => {
        console.error('Error fetching categories:', error);
      }
    });
  }

  saveSubCategory() {
    if (!this.categoryId || !this.subCategoryName.trim()) {
      alert('Please select a category and enter sub-category name');
      return;
    }

    const data = { category_id: Number(this.categoryId), name: this.subCategoryName.trim() };
    
    if (this.editId) {
      // Update Mode
      this.masterService.updateSubCategory(this.editId, data).subscribe({
        next: () => {
          this.resetForm();
          this.getSubCategories(); // Refresh current page
        },
        error: (error) => {
          console.error('Error updating subcategory:', error);
          alert('Failed to update subcategory');
        }
      });
        this.showForm = false;
    } else {
      // Create Mode
      this.masterService.createSubCategory(data).subscribe({
        next: () => {
          this.resetForm();
          // After create, go to last page to see the new item
          this.goToPage(this.totalPages + 1);
        },
        error: (error) => {
          console.error('Error creating subcategory:', error);
          alert('Failed to create subcategory');
        }
      });
      this.showForm = false;
    }
  }

  

  editSubCategory(sub: any) {
  this.editId = sub.id;
  this.categoryId = sub.category_id; // Check if your API uses category_id or similar
  this.subCategoryName = sub.name;
  this.showForm = true;
   window.scrollTo({ top: 0, behavior: 'smooth' });
}

  deleteSubCategory(id: number) {
    if (confirm('Delete this subcategory?')) {
      this.masterService.deleteSubCategory(id).subscribe({
        next: () => {
          this.getSubCategories(); // Refresh current page
          if (this.editId === id) this.resetForm();
        },
        error: (error) => {
          console.error('Error deleting subcategory:', error);
          alert('Failed to delete subcategory');
        }
      });
    }
  }

  resetForm() {
    this.subCategoryName = '';
    this.categoryId = null;
    this.editId = null;
  }

  // ✅ Pagination Methods
  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.getSubCategories(); // Fetch new page from server
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  nextPage() {
    if (this.hasNext) {
      this.currentPage++;
      this.getSubCategories(); // Fetch next page from server
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  prevPage() {
    if (this.hasPrev) {
      this.currentPage--;
      this.getSubCategories(); // Fetch previous page from server
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  // Helper method to generate page numbers
  getPageNumbers(): (number | string)[] {
    const pages: (number | string)[] = [];
    const maxVisible = 5;
    const total = this.effectiveTotalPages;

    if (total <= maxVisible) {
      for (let i = 1; i <= total; i++) pages.push(i);
    } else {
      if (this.currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(total);
      } else if (this.currentPage >= total - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = total - 3; i <= total; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = this.currentPage - 1; i <= this.currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(total);
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

  openAssociated(sub: any) {
    this.assocSubcat = sub;
    this.assocTab = 'products';
    this.assocProducts = [];
    this.assocSolutions = [];
    this.assocServices = [];
    this.showAssocModal = true;
    this.loadAssociated(sub);
  }

  loadAssociated(sub: any) {
    this.assocLoading = true;
    const catName = this.getCategoryName(sub);
    const productsObs = this.productService.getProductList({ type: 'products', category: catName, limit: 200 }).pipe(catchError(() => of(null)));
    const solutionsObs = this.solutionService.getProductList({ type: 'products', category: catName, limit: 200 }).pipe(catchError(() => of(null)));
    const servicesObs = this.serviceService.getServiceList({ type: 'products', category: catName, limit: 200 }).pipe(catchError(() => of(null)));

    forkJoin([productsObs, solutionsObs, servicesObs]).subscribe(([productRes, solutionRes, serviceRes]) => {
      const extract = (res: any) => res?.data?.products || res?.products || (Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []));
      const filterBySub = (items: any[]) => {
        const subName = sub.name?.toLowerCase();
        const subId = sub.id;
        const filtered = items.filter((i: any) =>
          i.sub_category_name?.toLowerCase() === subName ||
          i.sub_category_id === subId ||
          i.subcategory_name?.toLowerCase() === subName ||
          i.subcategory_id === subId ||
          (Array.isArray(i.category_subcategory) && i.category_subcategory.some((s: string) => s?.toLowerCase() === subName))
        );
        return filtered.length > 0 ? filtered : items;
      };
      this.assocProducts = filterBySub(extract(productRes));
      this.assocSolutions = filterBySub(extract(solutionRes));
      this.assocServices = filterBySub(extract(serviceRes));
      this.assocLoading = false;
    });
  }

  getStatusClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'published':   return 'bg-green-50 text-green-700 border-green-200';
      case 'approved':    return 'bg-green-50 text-green-700 border-green-200';
      case 'draft':       return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'unpublished': return 'bg-zinc-100 text-zinc-600 border-zinc-200';
      case 'pending':     return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'rejected':    return 'bg-red-50 text-red-700 border-red-200';
      default:            return 'bg-zinc-100 text-zinc-500 border-zinc-200';
    }
  }
}
