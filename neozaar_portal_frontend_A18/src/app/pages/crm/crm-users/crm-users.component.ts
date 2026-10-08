import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-crm-users',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './crm-users.component.html'
})
export class CrmUsersComponent implements OnInit {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  users: any[] = [];
  filteredUsers: any[] = [];
  loading = false;
  searchQuery = '';
  filterRole = '';
  filterStatus = '';

  readonly roles = ['SUPER_ADMIN', 'ADMIN', 'ISV', 'SUPPORT_PARTNER', 'M_SELLER', 'SELLER', 'AGENT', 'A_MANAGER'];
  readonly displayRoles = ['SUPER_ADMIN', 'ADMIN', 'ISV', 'SUPPORT_PARTNER', 'M_SELLER', 'SELLER', 'AGENT', 'A_MANAGER'];

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.http.get<any>(`${this.apiUrl}internal/crm/users`).subscribe({
      next: (res) => { this.users = res.data || []; this.applyFilter(); this.loading = false; },
      error: () => { this.users = []; this.filteredUsers = []; this.loading = false; }
    });
  }

  applyFilter() {
    // Only show internal staff and partners — exclude customers (CLIENT, USER)
    let result = this.users.filter(u => this.displayRoles.includes(u.role_type));
    if (this.filterRole) {
      result = result.filter(u => u.role_type === this.filterRole);
    }
    if (this.filterStatus === 'active') {
      result = result.filter(u => u.is_active);
    } else if (this.filterStatus === 'inactive') {
      result = result.filter(u => !u.is_active);
    }
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      result = result.filter(u =>
        (u.name || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q)
      );
    }
    this.filteredUsers = result;
  }

  changeRole(user: any, newRole: string) {
    this.http.put<any>(`${this.apiUrl}internal/crm/users/${user.id}/role`, { role_type: newRole }).subscribe({
      next: () => { user.role_type = newRole; },
      error: () => {}
    });
  }

  getInitials(name: string): string {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  }

  get activeCount(): number { return this.users.filter(u => this.displayRoles.includes(u.role_type) && u.is_active).length; }
  get adminCount(): number { return this.users.filter(u => u.role_type === 'SUPER_ADMIN' || u.role_type === 'ADMIN').length; }
  get partnerCount(): number { return this.users.filter(u => u.role_type === 'ISV' || u.role_type === 'SUPPORT_PARTNER' || u.role_type === 'M_SELLER').length; }

  formatRole(role: string): string {
    const map: any = {
      'SUPER_ADMIN': 'Super Admin',
      'ADMIN': 'Admin',
      'ROLE_MANAGER': 'Manager',
      'ISV': 'Software Vendor',
      'SUPPORT_PARTNER': 'Service Partner',
      'M_SELLER': 'Master Seller',
      'SELLER': 'Seller',
      'AGENT': 'Affiliate',
      'A_MANAGER': 'Affiliate Manager',
      'CLIENT': 'Client',
      'USER': 'User',
    };
    return map[role] || role;
  }
}
