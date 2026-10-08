import { Component, OnInit } from '@angular/core';
import { MasterService } from '../master.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';  

@Component({
  selector: 'app-targetaudiance',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './targetaudiance.component.html',
  styleUrl: './targetaudiance.component.css'
})
export class TargetaudianceComponent implements OnInit {

  targetAudiances: any[] = [];
  targetAudianceName: string = '';
  editId: number | null = null;
  isLoading: boolean = false;
  searchQuery: string = '';
  allItems: any[] = [];
  isSearchActive = false;

  get filteredAudiences() {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) return this.targetAudiances;
    return (this.isSearchActive ? this.allItems : this.targetAudiances).filter(a => a.name?.toLowerCase().includes(q));
  }

  onSearchChange() {
    if (!this.searchQuery.trim()) { this.isSearchActive = false; this.allItems = []; return; }
    if (!this.isSearchActive) {
      this.isSearchActive = true;
      this.masterService.getalltargetaudiance(1, 9999).subscribe({
        next: (res: any) => {
          if (res?.data?.audiences) this.allItems = res.data.audiences;
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

  constructor(private masterService: MasterService) {}

  ngOnInit() {
    this.getTargetAudiances();
  }

  // Fetch Target Audiances with Pagination
  getTargetAudiances() {
    this.isLoading = true;
    this.masterService.getalltargetaudiance(this.currentPage, this.itemsPerPage).subscribe({
      next: (res: any) => {
        console.log('API Response:', res);
        
        // Extract target audiances based on your API response structure
        if (res?.data?.audiences) {
          this.targetAudiances = res.data.audiences;
        } else if (res?.data && Array.isArray(res.data)) {
          this.targetAudiances = res.data;
        } else if (res?.targetSegments && Array.isArray(res.targetSegments)) {
          this.targetAudiances = res.audiences;
        } else if (Array.isArray(res)) {
          this.targetAudiances = res;
        } else {
          this.targetAudiances = [];
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
          this.totalItems = this.targetAudiances.length;
          this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
          this.hasNext = this.currentPage < this.totalPages;
          this.hasPrev = this.currentPage > 1;
        }
        
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error fetching target audiances:', err);
        this.isLoading = false;
        alert('Failed to load target audiances: ' + err.message);
      }
    });
  }

  // Save (Create or Update)
  saveTargetAudiance() {
    if (!this.targetAudianceName.trim() || this.targetAudianceName.trim().length < 2) {
      alert('Target audience name must be at least 2 characters');
      return;
    }

    const payload = { name: this.targetAudianceName.trim() };

    if (this.editId) {
      // Update Mode
      this.masterService.updatetargetaudiance(this.editId, payload).subscribe({
        next: () => {
          alert('Target audience updated successfully!');
          this.resetForm();
          this.getTargetAudiances(); // Refresh current page
        },
        error: (err) => {
          console.error('Error updating target audience:', err);
          alert('Update failed: ' + err.message);
        }
      });
      this.showForm = false;
    } else {
      // Create Mode
      this.masterService.createtargetaudiance(payload).subscribe({
        next: () => {
          alert('Target audience created successfully!');
          this.resetForm();
          // After create, go to last page to see the new item
          this.goToPage(this.totalPages + 1);
        },
        error: (err) => {
          console.error('Error creating target audience:', err);
          alert('Create failed: ' + err.message);
        }
      });
      this.showForm = false;
    }
  }

  // Prepare form for editing
  editTargetAudiance(cat: any) {
    this.targetAudianceName = cat.name;
    this.editId = cat.id;
    this.showForm = true; // Open drawer
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Delete
  deleteTargetAudiance(id: number) {
    if (confirm('Are you sure you want to delete this target audience?')) {
      this.masterService.deletetargetaudiance(id).subscribe({
        next: () => {
          alert('Target audience deleted successfully!');
          this.getTargetAudiances(); // Refresh current page
          if (this.editId === id) this.resetForm();
        },
        error: (err) => {
          console.error('Error deleting target audience:', err);
          alert('Delete failed: ' + err.message);
        }
      });
    }
  }

  // Pagination Methods
  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.getTargetAudiances(); // Fetch new page from server
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  nextPage() {
    if (this.hasNext) {
      this.currentPage++;
      this.getTargetAudiances(); // Fetch next page from server
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  prevPage() {
    if (this.hasPrev) {
      this.currentPage--;
      this.getTargetAudiances(); // Fetch previous page from server
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
    this.targetAudianceName = '';
    this.editId = null;
  }
}
