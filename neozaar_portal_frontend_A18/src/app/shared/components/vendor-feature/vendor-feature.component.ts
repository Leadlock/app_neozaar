import { Component   } from '@angular/core';
import { OnInit } from '@angular/core';
import { Input } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-vendor-feature',
  standalone: true,
  // ADD CommonModule HERE
  imports: [CommonModule], 
  templateUrl: './vendor-feature.component.html',
  styleUrl: './vendor-feature.component.css'
})
export class VendorFeatureComponent implements OnInit{
@Input() vendorId!: string | number; // Pass this from the parent view
  @Input() initialStatus: boolean = false; 
baseUrl: string = environment.apiUrl;
  isFeature: boolean = false;
  isEditing: boolean = false;
  loading: boolean = false;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.isFeature = this.initialStatus;
  }
 // Assuming you have a baseUrl in your environment
  toggleEdit() {
    this.isEditing = !this.isEditing;
  }

  updateFeature(status: boolean) {
    this.loading = true;
    const url = `${this.baseUrl}catalog/${this.vendorId}/feature`;
    
    // Body matches your requirement: "1" for true, "0" for false
    const body = {
      is_feature: status ? "1" : "0"
    };

    this.http.post(url, body).subscribe({
      next: () => {
        this.isFeature = status;
        this.isEditing = false; // Return to view mode after update
        this.loading = false;
      },
      error: (err) => {
        console.error('Update failed', err);
        this.loading = false;
      }
    });
  }
}
