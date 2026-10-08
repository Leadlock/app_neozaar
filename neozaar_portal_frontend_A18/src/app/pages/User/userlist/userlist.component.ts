import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClientService } from '../client.service';
import { ToasterService } from '../../../shared/providers/toaster/toaster.service';

@Component({
  selector: 'app-userlist',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './userlist.component.html',
  styleUrls: ['./userlist.component.css']
})
export class UserlistComponent implements OnInit {

  users: any[] = [];

  pagination: any = {
    total: 0,
    page: 1,
    limit: 10,
    pages: [],
    next_page: null,
    prev_page: null
  };

  loading = false;

  constructor(private clientService: ClientService,private ToasterService:ToasterService) {}

  ngOnInit(): void {
    this.getUsers();
  }

  getUsers(page: number = 1) {

    this.loading = true;

    this.clientService.getUsers(page, this.pagination.limit).subscribe({
      next: (res: any) => {

        this.users = res.data;
        this.pagination = res.pagination;

        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
      }
    });
  }

  changePage(page: number) {
    if (page) {
      this.getUsers(page);
    }
  }

    deleteUser(productId: number): void {
    if (!confirm('Are you sure you want to delete this Customer')) return;

    this.clientService.deleteuser(productId).subscribe({
      next: (res: any) => {
        if (res.status === 'success' || res.success) {
          this.ToasterService.setToaster(
            'success',
            'Deleted',
            'Customer deleted successfully'
          );
           this.getUsers();
        } else {
          this.ToasterService.setToaster(
            'error',
            'Error',
            res.message || 'Failed to delete Customer'
          );
        }
      },
      error: (err) => {
        // console.error('Delete error:', err);
        this.ToasterService.setToaster(
          'error',
          'Error',
          'Failed to delete Service. Please try again.'
        );
      }
    });
  }
}
