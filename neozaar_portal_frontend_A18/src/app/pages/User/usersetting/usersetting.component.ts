import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClientService } from '../client.service';

@Component({
  selector: 'app-usersetting',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './usersetting.component.html',
  styleUrls: ['./usersetting.component.css']
})
export class UsersettingComponent implements OnInit {
  usersList: any[] = [];
  roles: any[] = [];

  paginationData = {
    page: 1,
    limit: 10,
    total: 0,
    total_pages: 0,
    has_prev: false,
    has_next: false,
    pages: [] as number[]
  };

  showForm = false;
  isEditMode = false;
  changePassword = false;
  
  // Validation flags
  nameError = false;
  mobileError = false;
  emailError = false;
  roleError = false;
  passwordError = false;
  confirmPasswordError = false;

  // Show/hide password toggles
  showPassword = false;
  showConfirmPassword = false;

  userForm: any = {
    name: '',
    mobile: '',
    email: '',
    role_id: null,
    is_active: true,
    password: '',
    confirm_password: ''
  };

  // Regex patterns
  private namePattern = /^[A-Za-z\s]{3,}$/;
  private mobilePattern = /^[0-9]{10}$/;
  private emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  private strongPasswordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

  constructor(private clientService: ClientService) {}

  ngOnInit(): void {
    this.loadUsers();
    this.loadRoles();
  }

  loadUsers(): void {
    this.clientService.getAllUsers().subscribe({
      next: (response: any) => {
        let users = response?.data || response || [];
        this.usersList = users.map((user: any) => {
          if (user.role && typeof user.role === 'object' && user.role.role_id) {
            user.role_id = user.role.role_id;
          }
          return user;
        });
        this.updatePagination(response);
      },
      error: (err) => console.error('Failed to load users', err)
    });
  }

  loadRoles(): void {
    this.clientService.getroles().subscribe({
      next: (res: any) => {
        const rolesData = res?.data || res || [];
        this.roles = rolesData.map((r: any) => ({
          id: r.role_id,
          role_type: r.role_type
        }));
      },
      error: (err) => console.error('Failed to load roles', err)
    });
  }

  updatePagination(response: any): void {
    this.paginationData.total = response?.total || this.usersList.length;
    this.paginationData.total_pages = response?.last_page || Math.ceil(this.paginationData.total / this.paginationData.limit);
    this.paginationData.has_prev = this.paginationData.page > 1;
    this.paginationData.has_next = this.paginationData.page < this.paginationData.total_pages;
    let total = this.paginationData.total_pages;
    let current = this.paginationData.page;
    let start = Math.max(1, current - 2);
    let end = Math.min(total, start + 4);
    start = Math.max(1, end - 4);
    this.paginationData.pages = Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.paginationData.total_pages) return;
    this.paginationData.page = page;
    this.loadUsers();
  }

  openCreate(): void {
    this.isEditMode = false;
    this.changePassword = false;
    this.userForm = {
      name: '',
      mobile: '',
      email: '',
      role_id: null,
      is_active: true,
      password: '',
      confirm_password: ''
    };
    this.clearErrors();
    this.showForm = true;
  }

  openEdit(user: any): void {
    this.isEditMode = true;
    this.changePassword = false;
    this.userForm = {
      id: user.id,
      name: user.name,
      mobile: user.mobile,
      email: user.email,
      role_id: user.role_id ?? null,
      is_active: user.is_active,
      password: '',
      confirm_password: ''
    };
    this.clearErrors();
    this.showForm = true;
  }

  clearErrors(): void {
    this.nameError = false;
    this.mobileError = false;
    this.emailError = false;
    this.roleError = false;
    this.passwordError = false;
    this.confirmPasswordError = false;
  }

  togglePasswordVisibility(field: 'password' | 'confirm'): void {
    if (field === 'password') {
      this.showPassword = !this.showPassword;
    } else {
      this.showConfirmPassword = !this.showConfirmPassword;
    }
  }

  // Real-time validation methods
  validateName(): void {
    this.nameError = !this.userForm.name || !this.namePattern.test(this.userForm.name);
  }

  validateMobile(): void {
    this.mobileError = !this.userForm.mobile || !this.mobilePattern.test(this.userForm.mobile);
  }

  validateEmail(): void {
    this.emailError = !this.userForm.email || !this.emailPattern.test(this.userForm.email);
  }

  validateRole(): void {
    this.roleError = !this.userForm.role_id && this.userForm.role_id !== 0;
  }

  validatePassword(): void {
    if (!this.isEditMode || (this.isEditMode && this.changePassword)) {
      this.passwordError = !this.userForm.password || !this.strongPasswordPattern.test(this.userForm.password);
    } else {
      this.passwordError = false;
    }
  }

  validateConfirmPassword(): void {
    if (!this.isEditMode || (this.isEditMode && this.changePassword)) {
      this.confirmPasswordError = this.userForm.password !== this.userForm.confirm_password;
    } else {
      this.confirmPasswordError = false;
    }
  }

  onChangePasswordToggle(): void {
    if (!this.changePassword) {
      // Clear password fields and errors when checkbox is unchecked
      this.userForm.password = '';
      this.userForm.confirm_password = '';
      this.passwordError = false;
      this.confirmPasswordError = false;
    }
  }

  validateForm(): boolean {
    // Call all validations to ensure errors are up-to-date
    this.validateName();
    this.validateMobile();
    this.validateEmail();
    this.validateRole();
    this.validatePassword();
    this.validateConfirmPassword();
    
    return !(this.nameError || this.mobileError || this.emailError || this.roleError || 
             this.passwordError || this.confirmPasswordError);
  }

  saveUser(): void {
    if (!this.validateForm()) {
      return;
    }

    const payload: any = {
      name: this.userForm.name,
      mobile: this.userForm.mobile,
      email: this.userForm.email,
      role_id: this.userForm.role_id,
      is_active: this.userForm.is_active
    };

    if (!this.isEditMode) {
      payload.password = this.userForm.password;
      payload.confirm_password = this.userForm.confirm_password;
    } else if (this.changePassword) {
      payload.password = this.userForm.password;
      payload.confirm_password = this.userForm.confirm_password;
    }

    if (this.isEditMode) {
      this.clientService.updateallUsers(this.userForm.id, payload).subscribe({
        next: () => {
          this.loadUsers();
          this.showForm = false;
        },
        error: (err) => console.error('Update failed', err)
      });
    } else {
      this.clientService.createUsers(payload).subscribe({
        next: () => {
          this.loadUsers();
          this.showForm = false;
        },
        error: (err) => console.error('Create failed', err)
      });
    }
  }

  deleteUser(id: number): void {
    if (confirm('Are you sure you want to delete this user?')) {
      this.clientService.deleteallUsers(id).subscribe({
        next: () => this.loadUsers(),
        error: (err) => console.error('Delete failed', err)
      });
    }
  }

  toggleUserStatus(user: any): void {
    const updatedStatus = !user.is_active;
    this.clientService.updateallUsers(user.id, { is_active: updatedStatus }).subscribe({
      next: () => user.is_active = updatedStatus,
      error: (err) => console.error('Status update failed', err)
    });
  }

  getRoleType(roleId: number): string {
    const role = this.roles.find(r => r.id === roleId);
    if (!role) return '—';
    return this.friendlyRoleName(role.role_type);
  }

  friendlyRoleName(roleType: string): string {
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
      'SUPPORT_PARTNER': 'Solution Partner',
      'CLIENT': 'Customer',
      'MARKETING': 'Marketing',
    };
    return map[roleType] || roleType;
  }

  getRoleTypeById(roleId: number): string {
    const role = this.roles.find(r => r.id === roleId);
    return role ? role.role_type : '';
  }
}
