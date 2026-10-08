import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; 
import { RouterModule } from '@angular/router';
import { Action } from 'rxjs/internal/scheduler/Action';
import { UserRole } from '../../../core/modal/user.modal';
import { HasRoleDirective } from '../../../shared/directives/has-role.directive';
import { BundleService } from '../bundle.service';
import { ProductService } from '../../product/product-service.service';
import { Observable, take } from 'rxjs';
import { Store } from '@ngrx/store';
import { selectProducts } from '../../../shared/store/selector/product.selectors';
import {  loadProductsSuccess} from '../../../shared/store/action/product.action';
import { ToasterService } from '../../../shared/providers/toaster/toaster.service';

@Component({
  selector: 'app-view-bundle-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule,HasRoleDirective,],
  templateUrl: './view-bundle-list.component.html',
  styleUrl: './view-bundle-list.component.css'
})
export class BundleListComponent {
  // store: any;

  constructor(private bundleService: BundleService, private productService:ProductService  ,private store: Store,    private toasterService: ToasterService) {
  //  this.getData();
       this.productList$ = this.store.select(selectProducts);

  }

 currentPage = 1;
  totalPages = 0;
pagedList: any[] = [];

productList: any[] = [];
pagination:any[]=[];
visiblePages: (number | string)[] = [];

  UserRole = UserRole
  profileUrl = 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'



academicEntities = {
  departments_data: [
    { id: 0, department_name: 'Computer Science' },
    { id: 1, department_name: 'Mechanical Engineering' },
    { id: 2, department_name: 'Electrical Engineering' },
    { id: 3, department_name: 'Civil Engineering' }
  ],
  classes_data: [
    { id: 1, class_name: 'Class 1' },     
    { id: 2, class_name: 'Class 2' },
    { id: 3, class_name: 'Class 3' },
    { id: 4, class_name: 'Class 4' }
  ],
  groups_data: [
    { id: 1, group_name: 'Group A' },
    { id: 2, group_name: 'Group B' },
    { id: 3, group_name: 'Group C' },
    { id: 4, group_name: 'Group D' }    
  ],

};

productList$!: Observable<any>;

// productList: any[] = [];


 ngOnInit(): void {
        this.getData();
        this.getfilter();
  }
cat:any;
aws:any;
azure:any;
status: string = '';
category: string = '';
cloud_provider: string = '';
aws_services: string = '';
azure_services: string = '';
limit: number = 10;
searchTerm: string = '';
    
 getData(page: number = 1) {
    this.productService.getProductList({
      type: 'bundles',
      page: page,
      limit: this.limit,
      search: this.searchTerm,
      status: this.status,
      category: this.category,
      cloud_provider: this.cloud_provider,
   
    }).subscribe({
      next: (res: any) => {
        if (res.status === 'success') {
          this.productList = res.data;

          // ✅ assign pagination object
          this.pagination = res.pagination;
          this.currentPage = res.pagination.page;
          this.totalPages = res.pagination.total_pages;
          this.visiblePages = res.pagination.pages; // already provided by API
        }
      },
      error: (err) => {
        console.error('HTTP error:', err);
      }
    });
  }
  goToPage(page: any) {
    if (page !== this.currentPage) {
      this.getData(page);
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.getData(this.currentPage + 1);
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.getData(this.currentPage - 1);
    }
  }
  getfilter(){
  this.productService.getcategory().subscribe({
    next:(res:any) =>{
      this.cat = res.data;
    }
  });
  this.productService.getaws().subscribe({
    next:(res:any) =>{
      this.aws = res.data;
    }
  });
  this.productService.getazure().subscribe({
    next:(res:any) =>{
      this.azure = res.data;
    }
  });
  }


  approveBundle(id: number): void {
    this.bundleService.approveBundle(id).subscribe({
      next: (res: any) => {
        if (res.status === 'success' || res.success) {
          this.toasterService.setToaster('success', 'Approved', 'Bundle approved successfully');
          this.getData();
        } else {
          this.toasterService.setToaster('error', 'Error', res.message || 'Failed to approve bundle');
        }
      },
      error: (err) => {
        console.error('Approve error:', err);
        this.toasterService.setToaster('error', 'Error', 'Failed to approve bundle. Please try again.');
      }
    });
  }

  deleteBundle(Id: number): void {

    this.bundleService.deleteBundle(Id).subscribe({
      next: (res: any) => {
        if (res.status === 'success' || res.success) {
          this.toasterService.setToaster('success', 'Deleted', 'Bundle deleted successfully');
          this.getData();
        } else {
          this.toasterService.setToaster('error', 'Error', res.message || 'Failed to delete Bundle');
        }
      },
      error: (err) => {
        console.error('Delete error:', err);
        this.toasterService.setToaster('error', 'Error', 'Failed to delete product. Please try again.');
      }
    });
  }

// get pageCount(): number[] {
//   const totalPages = Math.ceil(this.productList.length / this.pageSize);
//   return Array.from({ length: totalPages }, (_, i) => i + 1);
// }


}


