import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MasterService } from '../master.service';

@Component({
  selector: 'app-instruction',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './instruction.component.html',
  styleUrls: ['./instruction.component.css'],
})
export class InstructionComponent implements OnInit {
  instructionsList: any[] = [];
  system_prompt: string = '';
  instruction: string = '';
  isFeatures: boolean = false;
  editId: number | null = null;
  isLoading: boolean = false;
  searchQuery: string = '';
  allItems: any[] = [];
  isSearchActive = false;

  get filteredInstructions() {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) return this.instructionsList;
    return (this.isSearchActive ? this.allItems : this.instructionsList).filter(i => i.system_prompt?.toLowerCase().includes(q) || i.instruction?.toLowerCase().includes(q));
  }

  onSearchChange() {
    if (!this.searchQuery.trim()) { this.isSearchActive = false; this.allItems = []; return; }
    if (!this.isSearchActive) {
      this.isSearchActive = true;
      this.masterService.getInstructions(1, 9999).subscribe({
        next: (res: any) => {
          if (res?.data?.instructions) this.allItems = res.data.instructions;
          else if (Array.isArray(res?.data)) this.allItems = res.data;
          else if (Array.isArray(res)) this.allItems = res;
          else this.allItems = [];
        }
      });
    }
  }

  // Pagination
  currentPage: number = 1;
  itemsPerPage: number = 10;
  totalItems: number = 0;
  totalPages: number = 0;
  hasNext: boolean = false;
  hasPrev: boolean = false;
  showForm: boolean = false;

  constructor(private masterService: MasterService) {}

  ngOnInit(): void {
    this.fetchInstructions();
  }

  fetchInstructions(): void {
    this.isLoading = true;
    this.masterService
      .getInstructions(this.currentPage, this.itemsPerPage)
      .subscribe({
        next: (res: any) => {
          // Adapt to your API response structure
          if (res?.data?.instructions) {
            this.instructionsList = res.data.instructions;
          } else if (res?.data && Array.isArray(res.data)) {
            this.instructionsList = res.data;
          } else if (Array.isArray(res)) {
            this.instructionsList = res;
          } else {
            this.instructionsList = [];
          }

          // Pagination metadata
          if (res?.pagination) {
            this.currentPage = res.pagination.page;
            this.itemsPerPage = res.pagination.limit;
            this.totalItems = res.pagination.total;
            this.totalPages = res.pagination.total_pages;
            this.hasNext = res.pagination.has_next;
            this.hasPrev = res.pagination.has_prev;
          } else {
            this.totalItems = this.instructionsList.length;
            this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);
            this.hasNext = this.currentPage < this.totalPages;
            this.hasPrev = this.currentPage > 1;
          }
          this.isLoading = false;
        },
        error: (err) => {
          console.error('Error fetching instructions:', err);
          this.isLoading = false;
          alert('Failed to load instructions: ' + err.message);
        },
      });
  }

  saveInstruction(): void {
    if (!this.system_prompt.trim() || !this.instruction.trim()) {
      alert('System Prompt and Instructions are required.');
      return;
    }

    const payload = {
      system_prompt: this.system_prompt.trim(),
      instruction: this.instruction.trim(),
      is_featured: this.isFeatures,
    };

    if (this.editId) {
      // UPDATE
      this.masterService.updateInstructions(this.editId, payload).subscribe({
        next: () => {
          alert('Instruction updated successfully!');
          this.resetPageAndRefresh();   // Reset and go to page 1 after update
        },
        error: (err) => {
          console.error('Update error:', err);
          alert('Update failed: ' + err.message);
        },
      });
    } else {
      // CREATE
      this.masterService.createInstructions(payload).subscribe({
        next: () => {
          alert('Instruction created successfully!');
          this.resetPageAndRefresh();   // Reset and go to page 1 after create
        },
        error: (err) => {
          console.error('Create error:', err);
          alert('Create failed: ' + err.message);
        },
      });
    }
    // Close the form immediately (it will reopen only on error, but we want it closed on success)
    // The actual closing is done inside resetPageAndRefresh() after refresh, but we can close optimistically.
    this.closeForm();
  }

  deleteInstruction(id: number): void {
    if (confirm('Are you sure you want to delete this instruction?')) {
      this.masterService.deleteInstructions(id).subscribe({
        next: () => {
          alert('Instruction deleted successfully!');
          this.resetPageAndRefresh();   // Reset and go to page 1 after delete
          if (this.editId === id) this.resetForm();
        },
        error: (err) => {
          console.error('Delete error:', err);
          alert('Delete failed: ' + err.message);
        },
      });
    }
  }

  /**
   * Reset the entire page state:
   * - Close the form
   * - Reset pagination to page 1
   * - Refresh the list from page 1
   */
  private resetPageAndRefresh(): void {
    this.closeForm();               // hide drawer
    this.resetForm();              // clear editing state
    if (this.currentPage !== 1) {
      this.currentPage = 1;        // go to first page
    }
    this.fetchInstructions();      // reload list from page 1
  }

  editInstruction(instruction: any): void {
    this.system_prompt = instruction.system_prompt;
    this.instruction = instruction.instruction;   // note: field name is 'instruction' not 'Instructions'
    this.isFeatures = instruction.is_featured;
    this.editId = instruction.id;
    this.showForm = true;
  }

  // Pagination methods – these stay mostly the same, but we don't reset page on manual navigation
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.fetchInstructions();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  nextPage(): void {
    if (this.hasNext) {
      this.currentPage++;
      this.fetchInstructions();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  prevPage(): void {
    if (this.hasPrev) {
      this.currentPage--;
      this.fetchInstructions();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  getPageNumbers(): (number | string)[] {
    const pages: (number | string)[] = [];
    const maxVisible = 5;
    if (this.totalPages <= maxVisible) {
      for (let i = 1; i <= this.totalPages; i++) pages.push(i);
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

  openCreate(): void {
    this.resetForm();
    this.showForm = true;
  }

  closeForm(): void {
    this.showForm = false;
  }

  resetForm(): void {
    this.system_prompt = '';
    this.instruction = '';
    this.isFeatures = false;
    this.editId = null;
  }
}
