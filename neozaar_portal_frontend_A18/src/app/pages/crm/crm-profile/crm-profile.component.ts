import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';
import { ToasterService } from '../../../shared/providers/toaster/toaster.service';

@Component({
  selector: 'app-crm-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './crm-profile.component.html',
  styleUrls: ['./crm-profile.component.css'],
})
export class CrmProfileComponent implements OnInit {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private toaster = inject(ToasterService);
  private apiUrl = environment.apiUrl;

  user: any = null;
  loading = true;
  editing = false;

  editForm = {
    name: '',
    mobile: '',
    designation: '',
  };

  ngOnInit() {
    this.loadProfile();
  }

  loadProfile() {
    this.loading = true;
    const userId = this.auth.user?.id;
    if (!userId) {
      this.loading = false;
      return;
    }

    this.http.get<any>(`${this.apiUrl}get_token-user`).subscribe({
      next: (res) => {
        this.user = res?.data || null;
        if (this.user) {
          this.editForm.name = this.user.name || '';
          this.editForm.mobile = this.user.mobile || '';
          this.editForm.designation = this.user.designation || '';
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.toaster.setToaster('error', 'Error', 'Failed to load profile');
      }
    });
  }

  startEditing() {
    this.editing = true;
  }

  cancelEditing() {
    this.editing = false;
    if (this.user) {
      this.editForm.name = this.user.name || '';
      this.editForm.mobile = this.user.mobile || '';
      this.editForm.designation = this.user.designation || '';
    }
  }

  saveProfile() {
    const userId = this.auth.user?.id;
    this.http.put<any>(`${this.apiUrl}user/update/${userId}`, this.editForm).subscribe({
      next: () => {
        this.toaster.setToaster('success', 'Updated', 'Profile updated successfully');
        this.editing = false;
        this.loadProfile();
      },
      error: () => {
        this.toaster.setToaster('error', 'Error', 'Failed to update profile');
      }
    });
  }

  get roleName(): string {
    const map: Record<string, string> = {
      'SUPER_ADMIN': 'Super Admin',
      'ADMIN': 'Admin',
      'ROLE_MANAGER': 'Manager',
      'M_SELLER': 'Master Seller',
      'ISV_SELLER': 'ISV Seller',
      'SELLER': 'Seller',
      'AGENT': 'Affiliate',
      'A_MANAGER': 'Affiliate Manager',
      'ISV': 'Software Vendor',
      'SUPPORT_PARTNER': 'Service Partner',
    };
    return map[this.user?.role_type] || this.user?.role_type || '—';
  }
}
