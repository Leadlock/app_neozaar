import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-crm-permissions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './crm-permissions.component.html'
})
export class CrmPermissionsComponent implements OnInit {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private apiUrl = environment.apiUrl;

  userId: number | null = null;
  user: any = null;
  loading = false;
  saving = false;
  userPermissions: string[] = [];

  readonly permissionGroups = [
    {
      label: 'Dashboard',
      permissions: ['crm.dashboard.view']
    },
    {
      label: 'Leads',
      permissions: ['crm.leads.view', 'crm.leads.create', 'crm.leads.edit', 'crm.leads.delete', 'crm.leads.assign', 'crm.leads.convert']
    },
    {
      label: 'Contacts',
      permissions: ['crm.contacts.view', 'crm.contacts.create', 'crm.contacts.edit', 'crm.contacts.delete']
    },
    {
      label: 'Opportunities',
      permissions: ['crm.opportunities.view', 'crm.opportunities.create', 'crm.opportunities.edit', 'crm.opportunities.delete']
    },
    {
      label: 'Activities',
      permissions: ['crm.activities.view', 'crm.activities.create', 'crm.activities.delete']
    },
    {
      label: 'Sales',
      permissions: ['crm.sales.products.view', 'crm.sales.products.manage', 'crm.sales.quotes.view', 'crm.sales.quotes.manage', 'crm.sales.orders.view', 'crm.sales.orders.manage', 'crm.sales.invoices.view', 'crm.sales.invoices.manage']
    },
    {
      label: 'Support',
      permissions: ['crm.support.cases.view', 'crm.support.cases.manage', 'crm.support.documents.view', 'crm.support.documents.manage', 'crm.support.logs.view']
    },
    {
      label: 'User Management',
      permissions: ['crm.users.view', 'crm.users.edit', 'crm.roles.view', 'crm.permissions.manage']
    },
  ];

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['user_id']) {
        this.userId = +params['user_id'];
        this.loadUser();
      }
    });
  }

  loadUser() {
    if (!this.userId) return;
    this.loading = true;
    this.http.get<any>(`${this.apiUrl}internal/crm/users/${this.userId}/permissions`).subscribe({
      next: (res) => {
        this.user = res.data?.user || null;
        this.userPermissions = res.data?.permissions || [];
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  hasPermission(perm: string): boolean {
    return this.userPermissions.includes(perm);
  }

  togglePermission(perm: string) {
    if (this.hasPermission(perm)) {
      this.userPermissions = this.userPermissions.filter(p => p !== perm);
    } else {
      this.userPermissions.push(perm);
    }
  }

  toggleGroup(group: any) {
    const allChecked = group.permissions.every((p: string) => this.hasPermission(p));
    if (allChecked) {
      this.userPermissions = this.userPermissions.filter(p => !group.permissions.includes(p));
    } else {
      group.permissions.forEach((p: string) => {
        if (!this.hasPermission(p)) this.userPermissions.push(p);
      });
    }
  }

  isGroupFullyChecked(group: any): boolean {
    return group.permissions.every((p: string) => this.hasPermission(p));
  }

  save() {
    if (!this.userId) return;
    this.saving = true;
    this.http.put<any>(`${this.apiUrl}internal/crm/users/${this.userId}/permissions`, {
      permissions: this.userPermissions
    }).subscribe({
      next: () => { this.saving = false; },
      error: () => { this.saving = false; }
    });
  }

  formatPerm(perm: string): string {
    return perm.split('.').pop()?.replace(/_/g, ' ') || perm;
  }
}
