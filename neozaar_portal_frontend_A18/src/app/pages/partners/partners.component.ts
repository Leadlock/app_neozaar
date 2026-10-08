import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ToasterService } from '../../shared/providers/toaster/toaster.service';

@Component({
  selector: 'app-partners',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, DatePipe],
  templateUrl: './partners.component.html'
})
export class PartnersComponent implements OnInit {
  private http = inject(HttpClient);
  private toaster = inject(ToasterService);
  private apiUrl = environment.apiUrl;

  partners: any[] = [];
  filteredPartners: any[] = [];
  loading = false;
  searchQuery = '';
  selectedPartner: any = null;

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading = true;
    this.http.get<any>(`${this.apiUrl}internal/partners?type=service`).subscribe({
      next: (res) => {
        this.partners = res.data || [];
        this.applyFilter();
        this.loading = false;
      },
      error: () => {
        this.partners = [];
        this.filteredPartners = [];
        this.loading = false;
      }
    });
  }

  applyFilter() {
    if (!this.searchQuery.trim()) {
      this.filteredPartners = [...this.partners];
    } else {
      const q = this.searchQuery.toLowerCase();
      this.filteredPartners = this.partners.filter(p =>
        (p.name || '').toLowerCase().includes(q) ||
        (p.company || '').toLowerCase().includes(q) ||
        (p.email || '').toLowerCase().includes(q)
      );
    }
  }

  openDetail(partner: any) {
    this.selectedPartner = partner;
  }

  closeDetail() {
    this.selectedPartner = null;
  }

  verifyPartnerFromPanel() {
    if (!this.selectedPartner) return;
    this.verifyPartner(this.selectedPartner);
    this.selectedPartner = { ...this.selectedPartner, status: 'active', is_active: true };
  }

  deletePartnerFromPanel() {
    if (!this.selectedPartner) return;
    this.deletePartner(this.selectedPartner);
    this.selectedPartner = null;
  }

  toggleStatusFromPanel() {
    if (!this.selectedPartner) return;
    this.toggleStatus(this.selectedPartner);
    const newStatus = !this.selectedPartner.is_active;
    this.selectedPartner = { ...this.selectedPartner, is_active: newStatus, status: newStatus ? 'active' : 'pending' };
  }

  getSubOptionKeys(partner: any): string[] {
    const sub = partner?.service_sub_options;
    if (!sub || typeof sub !== 'object') return [];
    return Object.keys(sub).filter(k => Array.isArray(sub[k]) && sub[k].length > 0);
  }

  formatKey(key: string): string {
    return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  toggleStatus(partner: any) {
    const newStatus = !partner.is_active;
    this.http.put<any>(`${this.apiUrl}internal/partners/${partner.id}/status`, { is_active: newStatus }).subscribe({
      next: () => {
        partner.is_active = newStatus;
        partner.status = newStatus ? 'active' : 'pending';
        this.toaster.setToaster('success', 'Updated', `Partner ${newStatus ? 'activated' : 'deactivated'}`);
      },
      error: () => this.toaster.setToaster('error', 'Error', 'Failed to update status')
    });
  }

  deletePartner(partner: any) {
    if (!confirm(`Are you sure you want to delete ${partner.name}?`)) return;
    this.http.delete<any>(`${this.apiUrl}internal/partners/${partner.id}`).subscribe({
      next: () => {
        this.toaster.setToaster('success', 'Deleted', 'Partner removed');
        this.load();
      },
      error: () => this.toaster.setToaster('error', 'Error', 'Failed to delete partner')
    });
  }

  verifyPartner(partner: any) {
    this.http.put<any>(`${this.apiUrl}internal/partners/${partner.id}/verify`, {}).subscribe({
      next: () => {
        partner.is_active = true;
        partner.status = 'active';
        this.toaster.setToaster('success', 'Approved', 'Solution Partner approved successfully');
        this.load();
      },
      error: () => this.toaster.setToaster('error', 'Error', 'Failed to approve')
    });
  }

  getPendingCount(): number {
    return this.filteredPartners.filter(p => p.status !== 'active').length;
  }

  getApprovedCount(): number {
    return this.filteredPartners.filter(p => p.status === 'active').length;
  }
}
