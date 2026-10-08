import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-crm-sales-orders',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './crm-sales-orders.component.html'
})
export class CrmSalesOrdersComponent implements OnInit {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  orders: any[] = [];
  loading = false;
  showModal = false;
  editMode = false;
  selected: any = null;

  filters = { search: '', status: '' };

  form: any = {
    order_number: '', status: 'Pending',
    items: [{ description: '', quantity: 1, unit_price: 0 }],
    notes: '', delivery_date: '', discount: 0, tax: 0
  };

  readonly statuses = ['Pending', 'Processing', 'Completed', 'Cancelled'];

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.http.get<any>(`${this.apiUrl}internal/crm/sales-orders`, { params: this.filters }).subscribe({
      next: (res) => { this.orders = res.data || []; this.loading = false; },
      error: () => { this.orders = []; this.loading = false; }
    });
  }

  get filteredOrders(): any[] {
    const q = this.filters.search.toLowerCase();
    return this.orders.filter(o => {
      if (this.filters.status && o.status !== this.filters.status) return false;
      if (q && !(o.order_number || '').toLowerCase().includes(q) &&
               !(o.contact_name || '').toLowerCase().includes(q) &&
               !(o.contact_company || '').toLowerCase().includes(q)) return false;
      return true;
    });
  }

  openCreate() {
    this.editMode = false;
    this.form = { order_number: '', status: 'Pending', items: [{ description: '', quantity: 1, unit_price: 0 }], notes: '', delivery_date: '', discount: 0, tax: 0 };
    this.showModal = true;
  }

  openEdit(o: any) {
    this.editMode = true;
    this.selected = o;
    this.form = { ...o, items: o.items?.length ? [...o.items] : [{ description: '', quantity: 1, unit_price: 0 }] };
    this.showModal = true;
  }

  addItem() { this.form.items.push({ description: '', quantity: 1, unit_price: 0 }); }
  removeItem(i: number) { if (this.form.items.length > 1) this.form.items.splice(i, 1); }

  get subtotal(): number {
    return this.form.items.reduce((s: number, i: any) => s + (+(i.quantity || 0) * +(i.unit_price || 0)), 0);
  }
  get total(): number { return this.subtotal - +(this.form.discount || 0) + +(this.form.tax || 0); }

  getOrderTotal(o: any): number {
    if (o.total) return +o.total;
    if (!o.items?.length) return 0;
    return o.items.reduce((s: number, i: any) => s + (+(i.quantity || 0) * +(i.unit_price || 0)), 0);
  }

  save() {
    const payload = { ...this.form, subtotal: this.subtotal, total: this.total };
    const obs = this.editMode
      ? this.http.put<any>(`${this.apiUrl}internal/crm/sales-orders/${this.selected.id}`, payload)
      : this.http.post<any>(`${this.apiUrl}internal/crm/sales-orders`, payload);
    obs.subscribe({ next: () => { this.showModal = false; this.load(); } });
  }

  delete(id: number) {
    if (!confirm('Delete this sales order?')) return;
    this.http.delete<any>(`${this.apiUrl}internal/crm/sales-orders/${id}`).subscribe({
      next: () => this.load()
    });
  }

  statusColor(s: string): string {
    if (s === 'Completed')  return 'neo-badge-active';
    if (s === 'Cancelled')  return 'neo-badge-danger';
    if (s === 'Processing') return 'neo-badge-warning';
    return 'neo-badge-new';
  }
}
