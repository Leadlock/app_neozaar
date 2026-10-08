import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CrmService } from '../../../core/services/crm/crm.service';
import { AuthService } from '../../../core/services/auth.service';
import { UserRole } from '../../../core/modal/user.modal';

@Component({
  selector: 'app-crm-leads',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './crm-leads.component.html'
})
export class CrmLeadsComponent implements OnInit {
  private crmService: CrmService = inject(CrmService);
  private authService: AuthService = inject(AuthService);

  leads: any[] = [];
  total = 0;
  page = 1;
  limit = 20;
  loading = false;

  filters = { status: '', priority: '', search: '', dateRange: '' };
  showModal = false;
  editMode = false;
  selectedLead: any = null;

  form: any = {
    name: '', email: '', phone: '', whatsapp: '', company: '', designation: '',
    country: '', industry: '', lead_source: '', cloud_preference: '', budget: '',
    timeline: '', requirement: '', status: 'New', priority: 'Medium',
    score: 0, notes: '', consent_status: false, lead_stage: 'New Inquiry'
  };

  readonly statuses = ['New','Contacted','Qualified','Converted','Disqualified','Nurturing'];
  readonly priorities = ['Low','Medium','High','Urgent'];
  readonly clouds = ['AWS','Azure','Both','None'];
  readonly leadStages = [
    'New Inquiry',
    'Contacted',
    'Interested',
    'Demo Scheduled',
    'Demo Completed',
    'Qualified',
    'Budget Assigned',
    'Converted to Opportunity',
    'Not Interested',
    'On Hold',
  ];

  get isSeller(): boolean {
    return this.authService.user?.role_type === 'SELLER';
  }

  get canManage(): boolean {
    const role = this.authService.user?.role_type;
    return [UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.MANAGER].includes(role as UserRole);
  }

  get isAffiliate(): boolean {
    return this.authService.user?.role_type === UserRole.AGENT;
  }

  readonly dateRanges = [
    { label: 'All Time',    value: ''   },
    { label: 'Last 7 Days', value: '7'  },
    { label: '15 Days',     value: '15' },
    { label: '1 Month',     value: '30' },
  ];

  get ownerOptions(): string[] {
    return [...new Set(this.leads.map((l: any) => l.owner_name).filter(Boolean))].sort() as string[];
  }

  filterOwner = '';

  get filteredLeads(): any[] {
    if (!this.filterOwner) return this.leads;
    return this.leads.filter((l: any) => l.owner_name === this.filterOwner);
  }

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    const params: any = { page: this.page, limit: this.limit, ...this.filters };
    if (this.filters.dateRange) { params.date_range = this.filters.dateRange; }
    this.crmService.getLeads(params).subscribe({
      next: (res: any) => { this.leads = res.data; this.total = res.total; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  openCreate() {
    this.editMode = false;
    this.form = { name:'',email:'',phone:'',whatsapp:'',company:'',designation:'',country:'',industry:'',lead_source:'',cloud_preference:'',budget:'',timeline:'',requirement:'',status:'New',priority:'Medium',score:0,notes:'',consent_status:false,lead_stage:'New Inquiry' };
    this.showModal = true;
  }

  openEdit(lead: any) {
    this.editMode = true;
    this.selectedLead = lead;
    this.form = { ...lead };
    this.showModal = true;
  }

  save() {
    const obs = this.editMode
      ? this.crmService.updateLead(this.selectedLead.id, this.form)
      : this.crmService.createLead(this.form);
    obs.subscribe({ next: () => { this.showModal = false; this.load(); }, error: () => {} });
  }

  delete(id: number) {
    if (!confirm('Delete this lead?')) return;
    this.crmService.deleteLead(id).subscribe({ next: () => this.load() });
  }

  convert(id: number) {
    if (!confirm('Convert this lead to Account, Contact & Opportunity?')) return;
    this.crmService.convertLead(id).subscribe({ next: () => this.load() });
  }

  scoreLabel(score: number): string {
    if (score <= 10) return 'Unqualified';
    if (score <= 20) return 'MQL';
    if (score <= 40) return 'SQL';
    if (score <= 60) return 'Proposal';
    if (score <= 80) return 'PO Received';
    if (score < 100) return 'Delivered';
    return 'Payment Received';
  }

  nextStepSuggestion(lead: any): string {
    const score = lead.score || 0;
    const status = lead.status;
    const stage = lead.lead_stage || '';
    if (stage === 'New Inquiry' || status === 'New') return 'Reach out via email or call';
    if (stage === 'Contacted') return 'Qualify interest, schedule demo';
    if (stage === 'Interested') return 'Schedule a product demo';
    if (stage === 'Demo Scheduled') return 'Prepare demo, confirm timing';
    if (stage === 'Demo Completed') return 'Follow up, qualify budget';
    if (stage === 'Qualified') return 'Assign budget → convert to opportunity';
    if (stage === 'Budget Assigned') return 'Create opportunity now';
    if (stage === 'Converted to Opportunity') return 'Track in Opportunities';
    if (stage === 'Not Interested') return 'Nurture for future';
    if (status === 'Nurturing') return 'Follow up in 2 weeks';
    return 'Update lead stage';
  }

  transferToSeller(leadId: number) {
    if (!confirm('Transfer this lead to a seller? You will no longer manage it.')) return;
    this.crmService.assignLead(leadId, { owner_id: null, transfer_to_seller: true }).subscribe({
      next: () => this.load()
    });
  }

  get pages(): number { return Math.ceil((this.filterOwner ? this.filteredLeads.length : this.total) / this.limit); }
  prevPage() { if (this.page > 1) { this.page--; this.load(); } }
  nextPage() { if (this.page < this.pages) { this.page++; this.load(); } }
}
