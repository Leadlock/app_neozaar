// targetsegment.component.ts
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MasterService } from '../master.service';

@Component({
  selector: 'app-targetsegment',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './targetsegment.component.html',
  styleUrl: './targetsegment.component.css'
})
export class TargetsegmentComponent implements OnInit {

  segments: any[] = [];
  searchQuery: string = '';
  allItems: any[] = [];
  isSearchActive = false;

  get filteredSegments() {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) return this.segments;
    return (this.isSearchActive ? this.allItems : this.segments).filter(s => s.name?.toLowerCase().includes(q));
  }

  onSearchChange() {
    if (!this.searchQuery.trim()) { this.isSearchActive = false; this.allItems = []; return; }
    if (!this.isSearchActive) {
      this.isSearchActive = true;
      this.masterService.getAllTargetSegmentspage(1, 9999).subscribe({
        next: (res: any) => {
          if (res?.data?.target_segments) this.allItems = res.data.target_segments;
          else if (Array.isArray(res?.data)) this.allItems = res.data;
          else if (Array.isArray(res)) this.allItems = res;
          else this.allItems = [];
        }
      });
    }
  }

  name: string = '';
  icon: File | null = null;
  logo: File | null = null;
  
  iconPreview: string | null = null;
  logoPreview: string | null = null;

  editId: number | null = null;
  
  // Pagination Properties
  currentPage: number = 1;
  itemsPerPage: number = 10;
  totalItems: number = 0;
  totalPages: number = 0;
  hasNext: boolean = false;
  hasPrev: boolean = false;
  isLoading: boolean = false;
  showForm: boolean = false;
  constructor(private masterService: MasterService) {}

  ngOnInit() {
    this.getSegments();
  }

  // ✅ GET ALL with Pagination
  getSegments() {
    this.isLoading = true;
    this.masterService.getAllTargetSegmentspage(this.currentPage, this.itemsPerPage).subscribe({
      next: (res: any) => {
        console.log('API Response:', res);
        
        // Extract segments based on API response structure
        if (res?.data?.target_segments) {
          this.segments = res.data.target_segments;
        } else if (res?.data && Array.isArray(res.data)) {
          this.segments = res.data;
        } else if (res?.segments && Array.isArray(res.segments)) {
          this.segments = res.segments;
        } else if (Array.isArray(res)) {
          this.segments = res;
        } else {
          this.segments = [];
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
          this.totalItems = this.segments.length;
          this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
          this.hasNext = this.currentPage < this.totalPages;
          this.hasPrev = this.currentPage > 1;
        }
        
        console.log('Current Page:', this.currentPage);
        console.log('Total Pages:', this.totalPages);
        console.log('Segments:', this.segments);
        
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error fetching segments:', error);
        this.isLoading = false;
      }
    });
  }


  onIconSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.icon = file;

      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.iconPreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }


  onLogoSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.logo = file;

      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.logoPreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }


  saveSegment() {
    if (!this.name.trim()) {
      alert('Please enter segment name');
      return;
    }

    const formData = new FormData();
    formData.append('name', this.name);
    
    if (this.icon) {
      formData.append('icon', this.icon);
    }
    if (this.logo) {
      formData.append('logo', this.logo);
    }

    if (this.editId) {

      this.masterService.updateTargetSegment(this.editId, formData).subscribe({
        next: () => {
          this.resetForm();
          this.getSegments();
        },
        error: (error) => {
          console.error('Error updating segment:', error);
          alert('Failed to update segment');
        }
      });
        this.showForm = false;
    } else {
     
      this.masterService.createTargetSegment(formData).subscribe({
        next: () => {
          this.resetForm();
          // After create, go to last page to see the new item
          this.goToPage(this.totalPages + 1);
        },
        error: (error) => {
          console.error('Error creating segment:', error);
          alert('Failed to create segment');
        }
      });
        this.showForm = false;
    }
  }

  // ✅ EDIT


  // ❌ DELETE
  deleteSegment(id: number) {
    if (confirm('Delete this segment?')) {
      this.masterService.deletetargetsegement(id).subscribe({
        next: () => {
          this.getSegments(); // Refresh current page
          if (this.editId === id) this.resetForm();
        },
        error: (error) => {
          console.error('Error deleting segment:', error);
          alert('Failed to delete segment');
        }
      });
    }
  }

  // 🔄 RESET
  resetForm() {
    this.name = '';
    this.icon = null;
    this.logo = null;
    this.iconPreview = null;
    this.logoPreview = null;
    this.editId = null;
  }

  // ✅ Pagination Methods
  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.getSegments(); // Fetch new page from server
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  nextPage() {
    if (this.hasNext) {
      this.currentPage++;
      this.getSegments(); // Fetch next page from server
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  prevPage() {
    if (this.hasPrev) {
      this.currentPage--;
      this.getSegments(); // Fetch previous page from server
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

editSegment(segment: any) {
  // 1. Assign the ID so the system knows we are in 'Edit Mode'
  this.editId = segment.id;
  
  // 2. Map the table data back to the form variables
  this.name = segment.name;
  this.iconPreview = segment.icon; // So the image shows up in the drawer
  this.logoPreview = segment.logo;
  
  // 3. CRITICAL: Open the drawer
  this.showForm = true; 

  // Optional: Scroll to top if the drawer is long
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

closeForm() {
  this.showForm = false;
  this.resetForm();
}
}
