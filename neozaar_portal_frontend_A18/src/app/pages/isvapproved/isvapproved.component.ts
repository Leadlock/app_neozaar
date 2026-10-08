import { Component, OnInit} from '@angular/core';
import { ToasterService } from '../../shared/providers/toaster/toaster.service';
import { UserserviceService } from '../../core/services/userservice.service';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';


interface Pagination {
  total: number;
  page: number;
  limit: number;
  current_page: number;
  next_page: number | null;
  prev_page: number | null;
  pages: number[];
}



@Component({
  selector: 'app-isvapproved',
  standalone: true,
  imports: [RouterModule,CommonModule,ReactiveFormsModule,FormsModule],
  templateUrl: './isvapproved.component.html',
  styles: ``
})
export class IsvapprovedComponent implements OnInit {
  isvlist:any;
  limit: number = 10;
  currentPage: number = 1;
  totalPages: number = 0;
  pagination!: Pagination;
  visiblePages: number[] = [];
   statusForm!: FormGroup;
    priceForm!: FormGroup;
     singleLeadData: any;
  isLeadModalOpen = false;

  status:string = '';
  constructor(
  
    private route:ActivatedRoute,
    private toasterService: ToasterService,
      private userservice: UserserviceService,

  
     private fb: FormBuilder,
  ){}
  ngOnInit(): void {
    this.getisv()
   

 

  }
  get pricing(): FormArray {
    return this.priceForm.get('pricing') as FormArray;
  }
    getisv(page: number = 1, status?: string): void {
    const params: any = { page, limit: this.limit };

    if (status) params.status = status; // Add status if selected

    this.userservice.getisvapproved(params).subscribe({
      next: (res: any) => {
        if (res.status === 'success') {
          this.isvlist = res.data ;
          this.pagination = res.pagination;

          this.currentPage = this.pagination.current_page;
          this.totalPages = this.pagination.pages.length;
          this.visiblePages = this.pagination.pages;
        }
      },
      error: (err) => {
        console.error('HTTP error:', err);
      }
    });
  }



deleteIsv(id: number) {
  const payload = { id };

  this.userservice.deleteIsv(payload).subscribe({
    next: (res) => {
      console.log('Deleted successfully', res);
    },
    error: (err) => {
      console.error('Delete failed', err);
    }
  });
}

inactiveIsv(id: number) {
  const payload = { id };

  this.userservice.inactiveIsv(payload).subscribe({
    next: (res) => {
      console.log('Inactivated successfully');
    },
    error: (err) => {
      console.error('Update failed');
    }
  });
}


  /** ✅ Pagination Controls */
  goToPage(page: number): void {
    if (page > 0 && page <= this.totalPages && page !== this.currentPage) {
      this.getisv(page);
    }
  }

  nextPage(): void {
    if (this.pagination?.next_page) {
      this.getisv(this.pagination.next_page,);
    }
  }

  prevPage(): void {
    if (this.pagination?.prev_page) {
      this.getisv(this.pagination.prev_page);
    }
  }
userid: any;
openLeadModal(product: any): void {
  this.isLeadModalOpen = true;
  this.singleLeadData = product;

  // Reset the form whenever modal opens
  this.priceForm.reset();

  // Optional: Fetch ISV user data if needed
  console.log(this.singleLeadData.id);
  this.userservice.getisv(this.singleLeadData.id).subscribe({
    next: (res: any) => {
      this.userid = res.data?.id || res.data;
      console.log('🟢 User ID:', this.userid);
    },
    error: (err) => console.error('❌ Error fetching ISV:', err)
  });
}



/** 🟠 Submit the commission percentage */
submitPricing(): void {
  if (this.priceForm.invalid) {
    this.toasterService.setToaster('error', 'Invalid', 'Please enter a valid percentage');
    return;
  }



}

/** 🔴 Close modal and reset state */
closeLeadModal(): void {
  this.isLeadModalOpen = false;
  this.singleLeadData = null;
  this.priceForm.reset();
}

 



blockInvalidInput(event: KeyboardEvent) {
  // Prevent entering e, E, +, - (these are invalid for price input)
  if (['e', 'E', '+', '-'].includes(event.key)) {
    event.preventDefault();
  }
}

 

}
