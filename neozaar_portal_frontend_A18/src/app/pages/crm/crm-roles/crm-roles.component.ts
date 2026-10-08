import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-crm-roles',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './crm-roles.component.html'
})
export class CrmRolesComponent implements OnInit {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  roles: any[] = [];
  allUsers: any[] = [];
  loading = false;

  // Create/Edit role modal
  showRoleModal = false;
  editMode = false;
  selectedRole: any = null;
  roleForm = { name: '', description: '', permissions: [] as string[] };

  // Assign user modal
  showAssignModal = false;
  assignRoleId: number | null = null;
  assignUserId: number | null = null;
  roleUsers: any[] = [];

  readonly availablePermissions = [
    { group: 'Dashboard', perms: [{ key: 'crm.dashboard.view', label: 'View Dashboard' }] },
    { group: 'Leads', perms: [
      { key: 'crm.leads.view', label: 'View' },
      { key: 'crm.leads.create', label: 'Create' },
      { key: 'crm.leads.edit', label: 'Edit' },
      { key: 'crm.leads.delete', label: 'Delete' },
      { key: 'crm.leads.assign', label: 'Assign' },
      { key: 'crm.leads.convert', label: 'Convert' },
    ]},
    { group: 'Contacts', perms: [
      { key: 'crm.contacts.view', label: 'View' },
      { key: 'crm.contacts.create', label: 'Create' },
      { key: 'crm.contacts.edit', label: 'Edit' },
      { key: 'crm.contacts.delete', label: 'Delete' },
    ]},
    { group: 'Opportunities', perms: [
      { key: 'crm.opportunities.view', label: 'View' },
      { key: 'crm.opportunities.create', label: 'Create' },
      { key: 'crm.opportunities.edit', label: 'Edit' },
      { key: 'crm.opportunities.delete', label: 'Delete' },
    ]},
    { group: 'Activities', perms: [
      { key: 'crm.activities.view', label: 'View' },
      { key: 'crm.activities.create', label: 'Create' },
      { key: 'crm.activities.delete', label: 'Delete' },
    ]},
    { group: 'Products', perms: [
      { key: 'crm.products.view', label: 'View' },
      { key: 'crm.products.manage', label: 'Manage' },
      { key: 'crm.products.copy_link', label: 'Copy UTM Link' },
    ]},
    { group: 'Quotes', perms: [
      { key: 'crm.quotes.view', label: 'View' },
      { key: 'crm.quotes.create', label: 'Create' },
      { key: 'crm.quotes.edit', label: 'Edit' },
      { key: 'crm.quotes.delete', label: 'Delete' },
      { key: 'crm.quotes.send', label: 'Send to Customer' },
    ]},
    { group: 'Sales Orders', perms: [
      { key: 'crm.orders.view', label: 'View' },
      { key: 'crm.orders.create', label: 'Create' },
      { key: 'crm.orders.edit', label: 'Edit' },
      { key: 'crm.orders.delete', label: 'Delete' },
    ]},
    { group: 'Invoices', perms: [
      { key: 'crm.invoices.view', label: 'View' },
      { key: 'crm.invoices.create', label: 'Create' },
      { key: 'crm.invoices.edit', label: 'Edit' },
      { key: 'crm.invoices.delete', label: 'Delete' },
      { key: 'crm.invoices.send', label: 'Send to Customer' },
    ]},
    { group: 'Support Cases', perms: [
      { key: 'crm.cases.view', label: 'View' },
      { key: 'crm.cases.create', label: 'Create' },
      { key: 'crm.cases.edit', label: 'Edit' },
      { key: 'crm.cases.delete', label: 'Delete' },
      { key: 'crm.cases.assign', label: 'Assign' },
    ]},
    { group: 'Documents', perms: [
      { key: 'crm.documents.view', label: 'View' },
      { key: 'crm.documents.upload', label: 'Upload' },
      { key: 'crm.documents.delete', label: 'Delete' },
    ]},
    { group: 'Audit Logs', perms: [
      { key: 'crm.audit.view', label: 'View Logs' },
    ]},
    { group: 'User Management', perms: [
      { key: 'crm.users.view', label: 'View Users' },
      { key: 'crm.users.edit', label: 'Edit Users' },
      { key: 'crm.roles.view', label: 'View Roles' },
      { key: 'crm.roles.manage', label: 'Manage Roles' },
      { key: 'crm.permissions.manage', label: 'Manage Permissions' },
    ]},
  ];

  ngOnInit() { this.load(); this.loadUsers(); }

  load() {
    this.loading = true;
    this.http.get<any>(`${this.apiUrl}internal/crm/roles`).subscribe({
      next: (res) => { this.roles = res.data || []; this.loading = false; },
      error: () => { this.roles = []; this.loading = false; }
    });
  }

  loadUsers() {
    this.http.get<any>(`${this.apiUrl}internal/crm/users`).subscribe({
      next: (res) => { this.allUsers = res.data || []; },
      error: () => {}
    });
  }

  // --- Role CRUD ---
  openCreateRole() {
    this.editMode = false;
    this.roleForm = { name: '', description: '', permissions: [] };
    this.showRoleModal = true;
  }

  openEditRole(role: any) {
    this.editMode = true;
    this.selectedRole = role;
    this.roleForm = {
      name: role.name,
      description: role.description || '',
      permissions: Array.isArray(role.permissions) ? [...role.permissions] : []
    };
    this.showRoleModal = true;
  }

  togglePerm(key: string) {
    const idx = this.roleForm.permissions.indexOf(key);
    if (idx >= 0) { this.roleForm.permissions.splice(idx, 1); }
    else { this.roleForm.permissions.push(key); }
  }

  hasPerm(key: string): boolean {
    return this.roleForm.permissions.includes(key);
  }

  saveRole() {
    const obs = this.editMode
      ? this.http.put<any>(`${this.apiUrl}internal/crm/roles/${this.selectedRole.id}`, this.roleForm)
      : this.http.post<any>(`${this.apiUrl}internal/crm/roles`, this.roleForm);
    obs.subscribe({ next: () => { this.showRoleModal = false; this.load(); } });
  }

  deleteRole(id: number) {
    if (!confirm('Delete this role? All users will be unassigned from it.')) return;
    this.http.delete<any>(`${this.apiUrl}internal/crm/roles/${id}`).subscribe({ next: () => this.load() });
  }

  // --- Assign Users ---
  openAssignUsers(role: any) {
    this.assignRoleId = role.id;
    this.showAssignModal = true;
    this.assignUserId = null;
    this.loadRoleUsers(role.id);
  }

  loadRoleUsers(roleId: number) {
    this.http.get<any>(`${this.apiUrl}internal/crm/roles/${roleId}/users`).subscribe({
      next: (res) => { this.roleUsers = res.data || []; },
      error: () => { this.roleUsers = []; }
    });
  }

  addUser() {
    if (!this.assignUserId || !this.assignRoleId) return;
    this.http.post<any>(`${this.apiUrl}internal/crm/roles/${this.assignRoleId}/users`, { user_id: this.assignUserId }).subscribe({
      next: () => { this.loadRoleUsers(this.assignRoleId!); this.load(); this.assignUserId = null; }
    });
  }

  removeUser(userId: number) {
    if (!this.assignRoleId) return;
    this.http.delete<any>(`${this.apiUrl}internal/crm/roles/${this.assignRoleId}/users/${userId}`).subscribe({
      next: () => { this.loadRoleUsers(this.assignRoleId!); this.load(); }
    });
  }
}
