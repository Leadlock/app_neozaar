import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { MasterService } from '../master.service';

@Component({
  selector: 'app-askthechamp',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './askthechamp.component.html',
  styleUrl: './askthechamp.component.css'
})
export class AskthechampComponent implements OnInit {

  askTheChampList: any[] = [];
  isLoading = false;
  showForm = false;
  isEditMode = false;
  searchQuery: string = '';

  get filteredChampList() {
    const q = this.searchQuery.trim().toLowerCase();
    return q ? this.askTheChampList.filter(a => a.title?.toLowerCase().includes(q) || a.label?.toLowerCase().includes(q)) : this.askTheChampList;
  }
  paginationData: any = null;
  currentPage: number = 1;

  formData: any = {
    id: null,
    title: '',
    link: '',
    is_feature: false
  };

  // Banner files and previews
  selectedFile: File | null = null;
  imagePreview: string | null = null;

  selectedMobileFile: File | null = null;
  mobileImagePreview: string | null = null;

  editId: number | null = null;

  constructor(private masterService: MasterService) {}

  ngOnInit(): void {
    this.getAllData(1);
  }

  // Get All Data
  getAllData(page: number): void {
    this.isLoading = true;
    this.masterService.getAllAskTheChamp().subscribe({
      next: (res: any) => {
        this.askTheChampList = res.data || res;
        this.paginationData = res.pagination;
        this.isLoading = false;
      },
      error: (err) => {
        console.error(err);
        this.isLoading = false;
      }
    });
  }

  // Open create form
  openCreate(): void {
    this.resetForm();
    this.isEditMode = false;
    this.editId = null;
    this.showForm = true;
  }

  // Open edit form
  openEdit(item: any): void {
    this.editId = item.id;
    this.isEditMode = true;
    this.formData = {
      id: item.id,
      title: item.title,
      link: item.link,
      is_feature: item.is_feature
    };
    this.imagePreview = item.banner || null;
    this.mobileImagePreview = item.mobile_banner || null;
    this.selectedFile = null;
    this.selectedMobileFile = null;
    this.showForm = true;
  }

  toggleFeature(ad: any): void {
    const newStatus = !ad.is_feature;
    this.masterService.toggleAskTheChampFeature(ad.id, newStatus).subscribe({
      next: () => {
        ad.is_feature = newStatus;
      },
      error: (err) => console.error(err)
    });
  }

  // Save or update
  saveData(): void {
    const formDataToSend = new FormData();
    formDataToSend.append('title', this.formData.title);
    formDataToSend.append('link', this.formData.link);
    formDataToSend.append('is_feature', this.formData.is_feature ? '1' : '0');

    if (this.selectedFile) {
      formDataToSend.append('banner', this.selectedFile, this.selectedFile.name);
    }
    if (this.selectedMobileFile) {
      formDataToSend.append('mobile_banner', this.selectedMobileFile, this.selectedMobileFile.name);
    }

    if (this.editId) {
      this.masterService.updateAskTheChamp(this.editId, formDataToSend).subscribe({
        next: () => {
          alert('Updated Successfully');
          this.resetForm();
          this.getAllData(this.currentPage);
        },
        error: (err) => console.error(err)
      });
    } else {
      this.masterService.createAskTheChamp(formDataToSend).subscribe({
        next: () => {
          alert('Created Successfully');
          this.resetForm();
          this.currentPage = 1;
          this.getAllData(this.currentPage);
        },
        error: (err) => console.error(err)
      });
    }
  }

  // Delete
  deleteData(id: number): void {
    if (confirm('Are you sure you want to delete?')) {
      this.masterService.deleteAskTheChamp(id).subscribe({
        next: () => {
          alert('Deleted Successfully');
          if (this.askTheChampList.length === 1 && this.currentPage > 1) {
            this.currentPage--;
          }
          this.getAllData(this.currentPage);
        },
        error: (err) => console.error(err)
      });
    }
  }

  // Handle file selection for desktop banner
  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      const reader = new FileReader();
      reader.onload = (e: any) => this.imagePreview = e.target.result;
      reader.readAsDataURL(file);
    }
  }

  // Handle file selection for mobile banner
  onMobileFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedMobileFile = file;
      const reader = new FileReader();
      reader.onload = (e: any) => this.mobileImagePreview = e.target.result;
      reader.readAsDataURL(file);
    }
  }

  // Reset form
  resetForm(): void {
    this.formData = {
      id: null,
      title: '',
      link: '',
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

  // Page change
  changePage(page: number): void {
    if (page >= 1 && this.paginationData && page <= this.paginationData.total_pages) {
      this.currentPage = page;
      this.getAllData(page);
    }
  }
}
