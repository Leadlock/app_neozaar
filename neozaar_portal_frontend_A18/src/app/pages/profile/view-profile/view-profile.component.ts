import { Component , OnInit } from '@angular/core';
import { ProfileserviceService } from '../profileservice.service';
import { UserRole } from '../../../core/modal/user.modal';
import { RouterModule, RouterLink } from '@angular/router';
import { CommonModule, KeyValuePipe } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ToasterService } from '../../../shared/providers/toaster/toaster.service';

@Component({
  selector: 'app-view-profile',
  standalone: true,
  imports: [CommonModule, KeyValuePipe, RouterLink],
  templateUrl: './view-profile.component.html',
  styleUrl: './view-profile.component.css'
})
export class ViewProfileComponent implements OnInit  {
profile:any;
profileId!:number;

get companyInfo(): any {
  return this.profile?.user?.isv_detail?.company_detail 
    || this.profile?.user?.company_details 
    || {};
}

get partnerInfo(): any {
  return this.profile?.user?.isv_detail || {};
}

constructor(
  private profileservice:ProfileserviceService,
 private route: ActivatedRoute,
   private toasterService: ToasterService,
){
    this.profileId = Number(this.route.snapshot.paramMap.get('id'));
}
  ngOnInit(): void {
    this.loadprofile();
  }

loadprofile():void{
  this.profileservice.getProfileById(this.profileId).subscribe({
  next: (res: any) => {
    if (res && res.data) {
      this.profile = res.data;

      // -------- DEEP JSON DECODE FUNCTION ----------
      const deepDecode = (input: any): any => {
        let value = input;

        // 1. Keep decoding if the value is a JSON string
        while (typeof value === "string") {
          try {
            value = JSON.parse(value);
          } catch {
            break;
          }
        }

      
        if (Array.isArray(value)) {
          return value
            .map(item => deepDecode(item)) // decode each element
            .flat();                       // flatten nested arrays
        }

        return value; // final primitive/string
      };


      // -------- DECODE pricing_model ----------
    

    } else {
      // console.error("Product data not found");
      this.toasterService.setToaster('error', 'Load Profile', 'Profile data not found');
    }
  },

  error: (err: any) => {
    console.error("Error fetching product data:", err);
    this.toasterService.setToaster('error', 'Load Product', 'Failed to load product');
  }
});
}

openWebsite(url: string | null | undefined): void {
  if (!url) {
    alert('No found');
    return;
  }
  url = url.trim();
  if (!/^https?:\/\//i.test(url)) {
    url = 'https://' + url;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}

getServiceSubOptionKeys(): string[] {
  const subOptions = this.partnerInfo?.service_sub_options;
  if (!subOptions || typeof subOptions !== 'object') return [];
  return Object.keys(subOptions).filter(key => 
    Array.isArray(subOptions[key]) && subOptions[key].length > 0
  );
}

formatServiceKey(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}
}
