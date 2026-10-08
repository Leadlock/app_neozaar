import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { MasterService } from '../master.service';

const CATALOG_TYPES = ['product', 'service', 'solution'] as const;

@Component({
  selector: 'app-catalog-hero-banner',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './catalog-hero-banner.component.html',
  styleUrl: './catalog-hero-banner.component.css'
})
export class CatalogHeroBannerComponent implements OnInit {

  catalogTypes = CATALOG_TYPES;
  activeTab: 'product' | 'service' | 'solution' = 'product';

  bannerList: any[] = [];
  isLoading = false;
  showForm = false;
  isEditMode = false;
  searchQuery: string = '';

  get filteredList() {
    const q = this.searchQuery.trim().toLowerCase();
    return q ? this.bannerList.filter(a => a.title?.toLowerCase().includes(q) || a.label?.toLowerCase().includes(q)) : this.bannerList;
  }
  paginationData: any = null;
  currentPage: number = 1;

  formData: any = {
    id: null,
    title: '',
    link: '',
    catalog_type: 'product',
    is_feature: false
  };

  selectedFile: File | null = null;
  imagePreview: string | null = null;

  selectedMobileFile: File | null = null;
  mobileImagePreview: string | null = null;

  editId: number | null = null;

  constructor(private masterService: MasterService) {}

  ngOnInit(): void {
    this.getAllData(1);
  }

  switchTab(tab: 'product' | 'service' | 'solution'): void {
    if (this.activeTab === tab) return;
    this.activeTab = tab;
    this.currentPage = 1;
    this.getAllData(1);
  }

  getAllData(page: number): void {
    this.isLoading = true;
    this.currentPage = page;
    this.masterService.getAllCatalogHeroBanner(this.activeTab, page).subscribe({
      next: (res: any) => {
        this.bannerList = res.data || res;
        this.paginationData = res.pagination;
        this.isLoading = false;
      },
      error: (err) => {
        console.error(err);
        this.isLoading = false;
      }
    });
  }

  openCreate(): void {
    this.resetForm();
    this.formData.catalog_type = this.activeTab;
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
      link: item.link,
      catalog_type: item.catalog_type,
      is_feature: item.is_feature
    };
    this.imagePreview = item.banner || null;
    this.mobileImagePreview = item.mobile_banner || null;
    this.selectedFile = null;
    this.selectedMobileFile = null;
    this.showForm = true;
  }

  toggleFeature(item: any): void {
    const newStatus = !item.is_feature;
    this.masterService.toggleCatalogHeroBannerFeature(item.id, newStatus).subscribe({
      next: () => { item.is_feature = newStatus; },
      error: (err) => console.error(err)
    });
  }

  saveData(): void {
    const formDataToSend = new FormData();
    formDataToSend.append('title', this.formData.title);
    formDataToSend.append('link', this.formData.link);
    formDataToSend.append('catalog_type', this.formData.catalog_type);
    formDataToSend.append('is_feature', this.formData.is_feature ? '1' : '0');

    if (this.selectedFile) {
      formDataToSend.append('banner', this.selectedFile, this.selectedFile.name);
    }
    if (this.selectedMobileFile) {
      formDataToSend.append('mobile_banner', this.selectedMobileFile, this.selectedMobileFile.name);
    }

    if (this.editId) {
      this.masterService.updateCatalogHeroBanner(this.editId, formDataToSend).subscribe({
        next: () => {
          alert('Updated Successfully');
          this.resetForm();
          this.getAllData(this.currentPage);
        },
        error: (err) => console.error(err)
      });
    } else {
      this.masterService.createCatalogHeroBanner(formDataToSend).subscribe({
        next: () => {
          alert('Created Successfully');
          this.resetForm();
          this.currentPage = 1;
          // Show the tab the new banner was created for.
          this.activeTab = formDataToSend.get('catalog_type') as any;
          this.getAllData(this.currentPage);
        },
        error: (err) => console.error(err)
      });
    }
  }

  deleteData(id: number): void {
    if (confirm('Are you sure you want to delete?')) {
      this.masterService.deleteCatalogHeroBanner(id).subscribe({
        next: () => {
          alert('Deleted Successfully');
          if (this.bannerList.length === 1 && this.currentPage > 1) {
            this.currentPage--;
          }
          this.getAllData(this.currentPage);
        },
        error: (err) => console.error(err)
      });
    }
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      const reader = new FileReader();
      reader.onload = (e: any) => this.imagePreview = e.target.result;
      reader.readAsDataURL(file);
    }
  }

  onMobileFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedMobileFile = file;
      const reader = new FileReader();
      reader.onload = (e: any) => this.mobileImagePreview = e.target.result;
      reader.readAsDataURL(file);
    }
  }

  resetForm(): void {
    this.formData = {
      id: null,
      title: '',
      link: '',
      catalog_type: this.activeTab,
      is_feature: false
    };
    this.selectedFile = null;
    this.imagePreview = null;
    this.selectedMobileFile = null;
    this.mobileImagePreview = null;
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
