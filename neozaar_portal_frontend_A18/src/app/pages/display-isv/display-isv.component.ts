import { Component, OnInit } from '@angular/core';
import { ToasterService } from '../../shared/providers/toaster/toaster.service';
import { UserserviceService } from '../../core/services/userservice.service';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
// import { FormBuilder } from '@angular/forms';
import { FormBuilder, FormGroup, FormArray, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';


@Component({
  selector: 'app-display-isv',
  standalone: true,
  imports: [RouterModule, CommonModule,FormsModule,ReactiveFormsModule,],
  templateUrl: './display-isv.component.html',
  styleUrls: ['./display-isv.component.css'] // ✅ fixed "styleUrl" → "styleUrls"
})
export class DisplayIsvComponent implements OnInit {
 priceForm!: FormGroup;
  isvid!: number;
  isvdata: any;
   singleLeadData: any;
  isLeadModalOpen = false;
   statusForm!: FormGroup;
  showCurrencySelector = false; 

  constructor(
    private userservice: UserserviceService,
    private route: ActivatedRoute,
    private  toasterService: ToasterService,
     private fb: FormBuilder,
  ) {}

  ngOnInit(): void {
    this.isvid = Number(this.route.snapshot.paramMap.get('id'));
    if (this.isvid) {
      this.getIsvDetail();
    }
    

 
  }
get pricing(): FormArray {
    return this.priceForm.get('pricing') as FormArray;
  }
openWebsite(url: string | null | undefined): void {
  if (!url) {
    alert('No website URL found!');
    return;
  }
  url = url.trim();
  if (!/^https?:\/\//i.test(url)) {
    url = 'https://' + url;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}



getIsvDetail(): void {
  this.userservice.getisvdetail(this.isvid).subscribe({
    next: (res: any) => {
      // Ensure res.data exists
      this.isvdata = res.data || {};

      // Ensure productInfo is always an array
      this.isvdata.productInfo = Array.isArray(this.isvdata.productInfo)
        ? this.isvdata.productInfo
        : [];

      // Ensure nested category_subcategory arrays
      this.isvdata.productInfo.forEach((product:any) => {
        product.category_subcategory = Array.isArray(product.category_subcategory)
          ? product.category_subcategory
          : [];
      });

      // Success toaster
      this.toasterService.setToaster('success', 'Success', 'Action completed successfully');
    },
    error: (err) => {
      console.error('Error loading ISV details:', err);
      this.toasterService.setToaster('error', 'Error', 'Action completed successfully');
    }
  });
}



}
