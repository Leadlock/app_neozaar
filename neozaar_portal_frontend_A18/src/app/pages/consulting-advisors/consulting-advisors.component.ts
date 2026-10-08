import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ToasterService } from '../../shared/providers/toaster/toaster.service';

@Component({
  selector: 'app-consulting-advisors',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, DatePipe],
  templateUrl: './consulting-advisors.component.html'
})
export class ConsultingAdvisorsComponent implements OnInit {
  private http = inject(HttpClient);
  private toaster = inject(ToasterService);
  private apiUrl = environment.apiUrl;

  advisors: any[] = [];
  filtered: any[] = [];
  loading = false;
  searchQuery = '';
  statusFilter: 'all' | 'pending' | 'approved' = 'all';

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.http.get<any>(`${this.apiUrl}internal/partners?type=revshare`).subscribe({
      next: (res) => {
        this.advisors = res.data || [];
        this.applyFilter();
        this.loading = false;
      },
      error: () => { this.advisors = []; this.filtered = []; this.loading = false; }
    });
  }

  applyFilter() {
    let list = [...this.advisors];
    if (this.statusFilter === 'pending') list = list.filter(a => a.status !== 'active');
    else if (this.statusFilter === 'approved') list = list.filter(a => a.status === 'active');
    if (this.searchQuery.trim()) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(a =>
        (a.name || '').toLowerCase().includes(q) ||
        (a.email || '').toLowerCase().includes(q) ||
        (a.company || '').toLowerCase().includes(q) ||
        (a.advisor_type || '').toLowerCase().includes(q)
      );
    }
    this.filtered = list;
  }

  get pendingCount() { return this.advisors.filter(a => a.status !== 'active').length; }
  get approvedCount() { return this.advisors.filter(a => a.status === 'active').length; }

  approve(advisor: any) {
    this.http.put<any>(`${this.apiUrl}internal/partners/${advisor.id}/verify`, {}).subscribe({
      next: () => {
        advisor.is_active = true;
        advisor.status = 'active';
        this.applyFilter();
        this.toaster.setToaster('success', 'Approved', `${advisor.name} is now a Consulting Advisor`);
      },
      error: () => this.toaster.setToaster('error', 'Error', 'Failed to approve')
    });
  }

  remove(advisor: any) {
    if (!confirm(`Delete ${advisor.name}?`)) return;
    this.http.delete<any>(`${this.apiUrl}internal/partners/${advisor.id}`).subscribe({
      next: () => { this.toaster.setToaster('success', 'Deleted', 'Advisor removed'); this.load(); },
      error: () => this.toaster.setToaster('error', 'Error', 'Failed to delete')
    });
  }
}
