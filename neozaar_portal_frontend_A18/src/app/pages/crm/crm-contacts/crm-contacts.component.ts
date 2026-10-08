import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CrmService } from '../../../core/services/crm/crm.service';

@Component({
  selector: 'app-crm-contacts',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './crm-contacts.component.html'
})
export class CrmContactsComponent implements OnInit {
  private crmService: CrmService = inject(CrmService);
  contacts: any[] = [];
  accounts: any[] = [];
  total = 0; page = 1; limit = 20; loading = false;
  filters = { search: '' };
  showModal = false; editMode = false; selectedContact: any = null;
  form: any = { name:'',company:'',email:'',phone:'',whatsapp:'',designation:'',role:'',country:'',account_id:null,notes:'' };
  readonly roles = ['DecisionMaker','TechnicalBuyer','EconomicBuyer','Procurement','Finance','Champion','Influencer','Legal','Security'];

  ngOnInit() { this.load(); this.loadAccounts(); }
  load() {
    this.loading = true;
    this.crmService.getContacts({ page: this.page, limit: this.limit, ...this.filters }).subscribe({
      next: (res: any) => { this.contacts = res.data; this.total = res.total; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }
  loadAccounts() {
    this.crmService.getAccounts({ limit: 200 }).subscribe({ next: (res: any) => { this.accounts = res.data || []; } });
  }
  openCreate() { this.editMode = false; this.form = { name:'',company:'',email:'',phone:'',whatsapp:'',designation:'',role:'',country:'',account_id:null,notes:'' }; this.showModal = true; }
  openEdit(c: any) { this.editMode = true; this.selectedContact = c; this.form = { ...c }; this.showModal = true; }
  save() {
    const obs = this.editMode ? this.crmService.updateContact(this.selectedContact.id, this.form) : this.crmService.createContact(this.form);
    obs.subscribe({ next: () => { this.showModal = false; this.load(); } });
  }
  delete(id: number) { if (!confirm('Delete contact?')) return; this.crmService.deleteContact(id).subscribe({ next: () => this.load() }); }
  get pages() { return Math.ceil(this.total / this.limit); }
  prevPage() { if (this.page > 1) { this.page--; this.load(); } }
  nextPage() { if (this.page < this.pages) { this.page++; this.load(); } }
}
