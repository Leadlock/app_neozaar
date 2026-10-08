import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-crm-invoices',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './crm-invoices.component.html'
})
export class CrmInvoicesComponent implements OnInit {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  invoices: any[] = [];
  loading = false;
  showModal = false;
  editMode = false;
  selected: any = null;

  filters = { search: '', status: '' };

  form: any = {
    invoice_number: '', status: 'Draft',
    items: [{ description: '', quantity: 1, unit_price: 0 }],
    notes: '', due_date: '', discount: 0, tax: 0, amount_paid: 0,
  };

  readonly statuses = ['Draft', 'Sent', 'Paid', 'Partial', 'Overdue', 'Cancelled'];

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.http.get<any>(`${this.apiUrl}internal/crm/invoices`, { params: this.filters }).subscribe({
      next: (res) => { this.invoices = res.data || []; this.loading = false; },
      error: () => { this.invoices = []; this.loading = false; }
    });
  }

  get filteredInvoices(): any[] {
    const q = this.filters.search.toLowerCase();
    return this.invoices.filter(inv => {
      if (this.filters.status && inv.status !== this.filters.status) return false;
      if (q && !(inv.invoice_number || '').toLowerCase().includes(q) &&
               !(inv.contact_name || '').toLowerCase().includes(q) &&
               !(inv.contact_company || '').toLowerCase().includes(q)) return false;
      return true;
    });
  }

  openCreate() {
    this.editMode = false;
    this.form = { invoice_number: '', status: 'Draft', items: [{ description: '', quantity: 1, unit_price: 0 }], notes: '', due_date: '', discount: 0, tax: 0, amount_paid: 0 };
    this.showModal = true;
  }

  openEdit(inv: any) {
    this.editMode = true;
    this.selected = inv;
    this.form = { ...inv, items: inv.items?.length ? [...inv.items] : [{ description: '', quantity: 1, unit_price: 0 }] };
    this.showModal = true;
  }

  addItem() { this.form.items.push({ description: '', quantity: 1, unit_price: 0 }); }
  removeItem(i: number) { if (this.form.items.length > 1) this.form.items.splice(i, 1); }

  get subtotal(): number {
    return this.form.items.reduce((s: number, i: any) => s + (+(i.quantity || 0) * +(i.unit_price || 0)), 0);
  }
  get total(): number    { return this.subtotal - +(this.form.discount || 0) + +(this.form.tax || 0); }
  get amountDue(): number { return this.total - +(this.form.amount_paid || 0); }

  getInvoiceTotal(inv: any): number { return +(inv.total || 0); }
  getAmountDue(inv: any): number    { return +(inv.amount_due ?? (+(inv.total||0) - +(inv.amount_paid||0))); }

  save() {
    const payload = { ...this.form, subtotal: this.subtotal, total: this.total, amount_due: this.amountDue };
    const obs = this.editMode
      ? this.http.put<any>(`${this.apiUrl}internal/crm/invoices/${this.selected.id}`, payload)
      : this.http.post<any>(`${this.apiUrl}internal/crm/invoices`, payload);
    obs.subscribe({ next: () => { this.showModal = false; this.load(); } });
  }

  delete(id: number) {
    if (!confirm('Delete this invoice?')) return;
    this.http.delete<any>(`${this.apiUrl}internal/crm/invoices/${id}`).subscribe({
      next: () => this.load()
    });
  }

  statusColor(s: string): string {
    if (s === 'Paid')      return 'neo-badge-active';
    if (s === 'Overdue' || s === 'Cancelled') return 'neo-badge-danger';
    if (s === 'Sent' || s === 'Partial')      return 'neo-badge-warning';
    return 'neo-badge-new';
  }

  isOverdue(inv: any): boolean {
    if (!inv.due_date || inv.status === 'Paid' || inv.status === 'Cancelled') return false;
    return new Date(inv.due_date) < new Date();
  }
}
