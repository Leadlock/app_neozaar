import { Component, OnInit } from '@angular/core';
import { MasterService } from '../master.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { ProductService } from '../../product/product-service.service';
import { SolutionserviceService } from '../../solution/solutionservice.service';
import { ServiceService } from '../../service/service.service';

@Component({
  selector: 'app-category',
  standalone: true,
  imports: [FormsModule, CommonModule],  
  templateUrl: './category.component.html',
  styleUrl: './category.component.css'
})
export class CategoryComponent implements OnInit {

  categories: any[] = [];
  categoryName: string = '';
  editId: number | null = null;
  isLoading: boolean = false;
  searchQuery: string = '';
  allItems: any[] = [];
  isSearchActive = false;

  get filteredCategories() {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) return this.categories;
    return (this.isSearchActive ? this.allItems : this.categories).filter(c => c.name?.toLowerCase().includes(q));
  }

  onSearchChange() {
    if (!this.searchQuery.trim()) { this.isSearchActive = false; this.allItems = []; return; }
    if (!this.isSearchActive) {
      this.isSearchActive = true;
      this.masterService.getAllCategories(1, 9999).subscribe({
        next: (res: any) => {
          if (res?.data?.categories) this.allItems = res.data.categories;
          else if (Array.isArray(res?.data)) this.allItems = res.data;
          else if (Array.isArray(res)) this.allItems = res;
          else this.allItems = [];
        }
      });
    }
  }
  
  // Pagination properties
  currentPage: number = 1;
  itemsPerPage: number = 10;
  totalItems: number = 0;
  totalPages: number = 0;
  hasNext: boolean = false;
  hasPrev: boolean = false;
  showForm: boolean = false;

  // Associated Modal
  showAssocModal = false;
  assocCategory: any = null;
  assocTab = 'subcategories';
  assocLoading = false;
  assocSubcategories: any[] = [];
  assocProducts: any[] = [];
  assocSolutions: any[] = [];
  assocServices: any[] = [];
  expandedSubcats = new Set<number>();

  constructor(
    private masterService: MasterService,
    private productService: ProductService,
    private solutionService: SolutionserviceService,
    private serviceService: ServiceService
  ) {}

  ngOnInit() {
    this.getCategories();
  }

  // Fetch Categories with Pagination
  getCategories() {
    this.isLoading = true;
    this.masterService.getAllCategories(this.currentPage, this.itemsPerPage).subscribe({
      next: (res: any) => {
        console.log('API Response:', res);
        
        // Extract categories based on your API response structure
        if (res?.data?.categories) {
          this.categories = res.data.categories;
        } else if (res?.data && Array.isArray(res.data)) {
          this.categories = res.data;
        } else if (res?.categories && Array.isArray(res.categories)) {
          this.categories = res.categories;
        } else if (Array.isArray(res)) {
          this.categories = res;
        } else {
          this.categories = [];
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
          this.totalItems = this.categories.length;
          this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
          this.hasNext = this.currentPage < this.totalPages;
          this.hasPrev = this.currentPage > 1;
        }
        
        // console.log('Current Page:', this.currentPage);
        // console.log('Total Pages:', this.totalPages);
        // console.log('Categories:', this.categories);
        
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error fetching categories:', err);
        this.isLoading = false;
        alert('Failed to load categories: ' + err.message);
      }
    });
  }

  // Save (Create or Update)
  saveCategory() {
    if (!this.categoryName.trim() || this.categoryName.trim().length < 2) {
      alert('Category name must be at least 2 characters');
      return;
    }

    const payload = { name: this.categoryName.trim() };

    if (this.editId) {
      // Update Mode
      this.masterService.updateCategory(this.editId, payload).subscribe({
        next: () => {
          this.resetForm();
          this.getCategories(); // Refresh current page
        },
        error: (err) => alert('Update failed: ' + err.message)
      });
        this.showForm = false;
    } else {
      // Create Mode
      this.masterService.createCategory(payload).subscribe({
        next: () => {
          this.resetForm();
          // After create, go to last page to see the new item
          this.goToPage(this.totalPages + 1);
        },
        error: (err) => alert('Create failed: ' + err.message)
      });
        this.showForm = false;
    }
  }

  // Prepare form for editing


  editCategory(cat: any) {
  this.categoryName = cat.name;
  this.editId = cat.id;
  this.showForm = true; // Open drawer
   window.scrollTo({ top: 0, behavior: 'smooth' });
}
  // Delete
  deleteCategory(id: number) {
    if (confirm('Are you sure you want to delete this category?')) {
      this.masterService.deleteCategory(id).subscribe({
        next: () => {
          this.getCategories(); // Refresh current page
          if (this.editId === id) this.resetForm();
        },
        error: (err) => alert('Delete failed: ' + err.message)
      });
    }
  }

  // Pagination Methods
  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.getCategories(); // Fetch new page from server
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  nextPage() {
    if (this.hasNext) {
      this.currentPage++;
      this.getCategories(); // Fetch next page from server
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  prevPage() {
    if (this.hasPrev) {
      this.currentPage--;
      this.getCategories(); // Fetch previous page from server
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  // Helper method to generate page numbers
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

  // Reset
  resetForm() {
    this.categoryName = '';
    this.editId = null;
  }

  openAssociated(cat: any) {
    this.assocCategory = cat;
    this.assocTab = 'subcategories';
    this.assocSubcategories = [];
    this.assocProducts = [];
    this.assocSolutions = [];
    this.assocServices = [];
    this.expandedSubcats = new Set<number>();
    this.showAssocModal = true;
    this.loadAssociated(cat);
  }

  loadAssociated(cat: any) {
    this.assocLoading = true;
    const extract = (res: any) =>
      res?.data?.products || res?.products || (Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []));

    const subcatsObs = this.masterService.getAllSubCategories(1, 9999).pipe(catchError(() => of(null)));
    const productsObs = this.productService.getProductList({ type: 'products', category: cat.name, limit: 200 }).pipe(catchError(() => of(null)));
    const solutionsObs = this.solutionService.getProductList({ type: 'products', category: cat.name, limit: 200 }).pipe(catchError(() => of(null)));
    const servicesObs = this.serviceService.getServiceList({ type: 'products', category: cat.name, limit: 200 }).pipe(catchError(() => of(null)));

    forkJoin([subcatsObs, productsObs, solutionsObs, servicesObs]).subscribe(([subcatRes, productRes, solutionRes, serviceRes]) => {
      const allSubcats = subcatRes?.data?.subcategories || (Array.isArray(subcatRes?.data) ? subcatRes.data : (Array.isArray(subcatRes) ? subcatRes : []));
      this.assocSubcategories = allSubcats.filter((s: any) => s.category_id === cat.id);
      this.assocProducts = extract(productRes);
      this.assocSolutions = extract(solutionRes);
      this.assocServices = extract(serviceRes);
      this.assocLoading = false;
    });
  }

  toggleSubcat(sub: any) {
    if (this.expandedSubcats.has(sub.id)) {
      this.expandedSubcats.delete(sub.id);
    } else {
      this.expandedSubcats.add(sub.id);
    }
  }

  getSubcatItems(sub: any, items: any[]): any[] {
    const subId = sub.id;
    const subName = sub.name?.toLowerCase();
    return items.filter((item: any) =>
      item.sub_category_id === subId ||
      item.subcategory_id === subId ||
      item.sub_category_name?.toLowerCase() === subName ||
      item.subcategory_name?.toLowerCase() === subName ||
      item.sub_cat?.toLowerCase() === subName ||
      (Array.isArray(item.category_subcategory) && item.category_subcategory.some((s: string) => s?.toLowerCase() === subName))
    );
  }

  getStatusClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'published':  return 'bg-green-50 text-green-700 border-green-200';
      case 'approved':   return 'bg-green-50 text-green-700 border-green-200';
      case 'draft':      return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'unpublished':return 'bg-zinc-100 text-zinc-600 border-zinc-200';
      case 'pending':    return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'rejected':   return 'bg-red-50 text-red-700 border-red-200';
      default:           return 'bg-zinc-100 text-zinc-500 border-zinc-200';
    }
  }
}
