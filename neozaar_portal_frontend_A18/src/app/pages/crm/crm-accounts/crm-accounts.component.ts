import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CrmService } from '../../../core/services/crm/crm.service';

@Component({
  selector: 'app-crm-accounts',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './crm-accounts.component.html'
})
export class CrmAccountsComponent implements OnInit {
  private crmService: CrmService = inject(CrmService);
  accounts: any[] = [];
  total = 0; page = 1; limit = 20; loading = false;
  filters = { type: '', search: '' };
  showModal = false; editMode = false; selectedAccount: any = null;
  form: any = { name:'',type:'',industry:'',country:'',website:'',phone:'',email:'',address:'',cloud_preference:'',edp_eligible:false,macc_eligible:false,notes:'' };
  readonly types = ['Enterprise','Prospect','ISV','CloudPartner','Distributor','Reseller','ServicePartner','TechPartner'];

  ngOnInit() { this.load(); }
  load() {
    this.loading = true;
    this.crmService.getAccounts({ page: this.page, limit: this.limit, ...this.filters }).subscribe({
      next: (res: any) => { this.accounts = res.data; this.total = res.total; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }
  openCreate() { this.editMode = false; this.form = { name:'',type:'',industry:'',country:'',website:'',phone:'',email:'',address:'',cloud_preference:'',edp_eligible:false,macc_eligible:false,notes:'' }; this.showModal = true; }
  openEdit(a: any) { this.editMode = true; this.selectedAccount = a; this.form = { ...a }; this.showModal = true; }
  save() {
    const obs = this.editMode ? this.crmService.updateAccount(this.selectedAccount.id, this.form) : this.crmService.createAccount(this.form);
    obs.subscribe({ next: () => { this.showModal = false; this.load(); } });
  }
  delete(id: number) { if (!confirm('Delete account?')) return; this.crmService.deleteAccount(id).subscribe({ next: () => this.load() }); }
  get pages() { return Math.ceil(this.total / this.limit); }
  prevPage() { if (this.page > 1) { this.page--; this.load(); } }
  nextPage() { if (this.page < this.pages) { this.page++; this.load(); } }
}
