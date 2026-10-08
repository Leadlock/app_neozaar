import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { MasterService } from '../master.service';

@Component({
  selector: 'app-hompage-banner',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './hompage-banner.component.html',
  styleUrl: './hompage-banner.component.css'
})
export class HompageBannerComponent implements OnInit {
  banners: any[] = [];
  isLoading = false;
  showForm = false;
  isEditMode = false;
  searchQuery: string = '';
  allItems: any[] = [];
  isSearchActive = false;

  get filteredBanners() {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) return this.banners;
    return (this.isSearchActive ? this.allItems : this.banners).filter(b => b.title?.toLowerCase().includes(q));
  }

  onSearchChange() {
    if (!this.searchQuery.trim()) { this.isSearchActive = false; this.allItems = []; return; }
    if (!this.isSearchActive) {
      this.isSearchActive = true;
      this.masterService.gethomebanner(1, 9999).subscribe({
        next: (res: any) => { this.allItems = res.data || (Array.isArray(res) ? res : []); }
      });
    }
  }
  paginationData: any = null;
  currentPage: number = 1;
  limit: number = 10;

  formData: any = {
    id: null,
    title: '',
    color_title: '',
    subtitle: '',
    title_color_type: 'solid',
    title_color: '#ffffff',
    title_color_end: '#ffffff',
    title_color_direction: 'to right',
    color_title_color_type: 'solid',
    color_title_color: '#F97316',
    color_title_color_end: '#F97316',
    color_title_color_direction: 'to right',
    subtitle_color_type: 'solid',
    subtitle_color: '#d1d5db',
    subtitle_color_end: '#d1d5db',
    subtitle_color_direction: 'to right',
  };

  editId: number | null = null;

  constructor(private masterService: MasterService) {}

  getTextStyle(type: string, color: string, colorEnd: string, direction: string): { [key: string]: string } {
    if (type === 'gradient' && color && colorEnd) {
      return {
        'background-image': `linear-gradient(${direction || 'to right'}, ${color}, ${colorEnd})`,
        '-webkit-background-clip': 'text',
        '-webkit-text-fill-color': 'transparent',
        'background-clip': 'text',
      };
    }
    return { color: color || 'inherit' };
  }

  ngOnInit(): void {
    this.getAllData(1);
  }

  getAllData(page: number): void {
    this.isLoading = true;
    this.masterService.gethomebanner(page, this.limit).subscribe({
      next: (res: any) => {
        this.banners = res.data || res;
        this.paginationData = res.pagination;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error fetching banners:', err);
        this.isLoading = false;
      }
    });
  }

  openCreate(): void {
    this.resetForm();
    this.isEditMode = false;
    this.editId = null;
    this.showForm = true;
  }

  openEdit(item: any): void {
    this.editId = item.id;
    this.isEditMode = true;
    this.formData = {
      id: item.id,
      title: item.title,
      color_title: item.color_title,
      subtitle: item.subtitle,
      title_color_type: item.title_color_type || 'solid',
      title_color: item.title_color || '#ffffff',
      title_color_end: item.title_color_end || '#ffffff',
      title_color_direction: item.title_color_direction || 'to right',
      color_title_color_type: item.color_title_color_type || 'solid',
      color_title_color: item.color_title_color || '#F97316',
      color_title_color_end: item.color_title_color_end || '#F97316',
      color_title_color_direction: item.color_title_color_direction || 'to right',
      subtitle_color_type: item.subtitle_color_type || 'solid',
      subtitle_color: item.subtitle_color || '#d1d5db',
      subtitle_color_end: item.subtitle_color_end || '#d1d5db',
      subtitle_color_direction: item.subtitle_color_direction || 'to right',
    };
    this.showForm = true;
  }

  saveData(): void {
    const formDataToSend = new FormData();
    formDataToSend.append('title', this.formData.title);
    formDataToSend.append('color_title', this.formData.color_title || '');
    formDataToSend.append('subtitle', this.formData.subtitle || '');
    formDataToSend.append('title_color_type', this.formData.title_color_type);
    formDataToSend.append('title_color', this.formData.title_color);
    formDataToSend.append('title_color_end', this.formData.title_color_end || '');
    formDataToSend.append('title_color_direction', this.formData.title_color_direction);
    formDataToSend.append('color_title_color_type', this.formData.color_title_color_type);
    formDataToSend.append('color_title_color', this.formData.color_title_color);
    formDataToSend.append('color_title_color_end', this.formData.color_title_color_end || '');
    formDataToSend.append('color_title_color_direction', this.formData.color_title_color_direction);
    formDataToSend.append('subtitle_color_type', this.formData.subtitle_color_type);
    formDataToSend.append('subtitle_color', this.formData.subtitle_color);
    formDataToSend.append('subtitle_color_end', this.formData.subtitle_color_end || '');
    formDataToSend.append('subtitle_color_direction', this.formData.subtitle_color_direction);

    if (this.editId) {
      this.masterService.updatehomebanner(this.editId, formDataToSend).subscribe({
        next: () => {
          alert('Updated successfully');
          this.resetForm();
          this.getAllData(this.currentPage);
        },
        error: (err) => console.error('Update error:', err)
      });
    } else {
      this.masterService.createhomebanner(formDataToSend).subscribe({
        next: () => {
          alert('Created successfully');
          this.resetForm();
          this.currentPage = 1;
          this.getAllData(this.currentPage);
        },
        error: (err) => console.error('Create error:', err)
      });
    }
  }

  deleteData(id: number): void {
    if (confirm('Are you sure you want to delete this banner?')) {
      this.masterService.deletehomebanner(id).subscribe({
        next: () => {
          alert('Deleted successfully');
          if (this.banners.length === 1 && this.currentPage > 1) {
            this.currentPage--;
          }
          this.getAllData(this.currentPage);
        },
        error: (err) => console.error('Delete error:', err)
      });
    }
  }

  resetForm(): void {
    this.formData = {
      id: null,
      title: '',
      color_title: '',
      subtitle: '',
      title_color_type: 'solid',
      title_color: '#ffffff',
      title_color_end: '#ffffff',
      title_color_direction: 'to right',
      color_title_color_type: 'solid',
      color_title_color: '#F97316',
      color_title_color_end: '#F97316',
      color_title_color_direction: 'to right',
      subtitle_color_type: 'solid',
      subtitle_color: '#d1d5db',
      subtitle_color_end: '#d1d5db',
      subtitle_color_direction: 'to right',
    };
    this.editId = null;
    this.isEditMode = false;
    this.showForm = false;
  }

  changePage(page: number): void {
    if (page >= 1 && this.paginationData && page <= this.paginationData.total_pages) {
      this.currentPage = page;
      this.getAllData(page);
    }
  }
}
