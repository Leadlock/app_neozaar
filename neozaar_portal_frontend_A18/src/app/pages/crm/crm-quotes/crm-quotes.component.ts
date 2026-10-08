import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-crm-quotes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './crm-quotes.component.html'
})
export class CrmQuotesComponent implements OnInit {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  quotes: any[] = [];
  loading = false;
  showModal = false;
  editMode = false;
  selected: any = null;

  form: any = {
    customer_name: '', customer_email: '', subject: '',
    items: [{ description: '', quantity: 1, unit_price: 0 }],
    notes: '', valid_until: '', status: 'Draft'
  };

  readonly statuses = ['Draft', 'Sent', 'Accepted', 'Rejected', 'Expired'];

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.http.get<any>(`${this.apiUrl}internal/crm/quotes`).subscribe({
      next: (res) => { this.quotes = res.data || []; this.loading = false; },
      error: () => { this.quotes = []; this.loading = false; }
    });
  }

  openCreate() {
    this.editMode = false;
    this.form = { customer_name:'', customer_email:'', subject:'', items:[{description:'',quantity:1,unit_price:0}], notes:'', valid_until:'', status:'Draft' };
    this.showModal = true;
  }

  openEdit(q: any) {
    this.editMode = true;
    this.selected = q;
    this.form = { ...q, items: q.items ? [...q.items] : [{description:'',quantity:1,unit_price:0}] };
    this.showModal = true;
  }

  addItem() {
    this.form.items.push({ description: '', quantity: 1, unit_price: 0 });
  }

  removeItem(index: number) {
    if (this.form.items.length > 1) this.form.items.splice(index, 1);
  }

  get totalAmount(): number {
    return this.form.items.reduce((sum: number, item: any) => sum + (item.quantity * item.unit_price), 0);
  }

  getQuoteTotal(q: any): number {
    if (!q.items || !Array.isArray(q.items)) return 0;
    return q.items.reduce((sum: number, item: any) => sum + (item.quantity * item.unit_price), 0);
  }

  save() {
    const payload = { ...this.form, total: this.totalAmount };
    const obs = this.editMode
      ? this.http.put<any>(`${this.apiUrl}internal/crm/quotes/${this.selected.id}`, payload)
      : this.http.post<any>(`${this.apiUrl}internal/crm/quotes`, payload);
    obs.subscribe({ next: () => { this.showModal = false; this.load(); } });
  }

  send(q: any) {
    if (!confirm(`Send quote to ${q.customer_email}?`)) return;
    this.http.post<any>(`${this.apiUrl}internal/crm/quotes/${q.id}/send`, {}).subscribe({
      next: () => this.load()
    });
  }

  delete(id: number) {
    if (!confirm('Delete this quote?')) return;
    this.http.delete<any>(`${this.apiUrl}internal/crm/quotes/${id}`).subscribe({
      next: () => this.load()
    });
  }

  statusColor(s: string): string {
    if (s === 'Accepted') return 'neo-badge-active';
    if (s === 'Rejected' || s === 'Expired') return 'neo-badge-danger';
    if (s === 'Sent') return 'neo-badge-warning';
    return 'neo-badge-new';
  }
}
