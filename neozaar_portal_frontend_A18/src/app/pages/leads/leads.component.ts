import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { finalize, Subject, Subscription, debounceTime, distinctUntilChanged } from 'rxjs';
import { LeadApiService, LeadParams, LeadResponse } from './lead-api.service';
import { environment } from '../../../environments/environment';
import { LoaderComponent } from "../../shared/providers/loader.component";
import { AuthService } from '../../core/services/auth.service';
import { UserRole } from '../../core/modal/user.modal';

type LeadTab = 'direct' | 'affiliate' | 'whatsapp';

interface Pagination {
  total: number;
  total_pages: number;
  page: number;
  limit: number;
  current_page: number;
  next_page: number | null;
  prev_page: number | null;
  pages: number[];
}

interface User {
  id: number;
  name: string;
}

@Component({
  selector: 'app-leads',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, LoaderComponent],
  templateUrl: './leads.component.html',
  styleUrls: ['./leads.component.css']
})
export class LeadsComponent implements OnInit, OnDestroy {
  baseUrl = environment.frontendUrl;
  leads: any[] = [];
  isAssignModalOpen = false;
  currentPage: number = 1;
  searchStr: string = '';
  isFetching: boolean = false;
  isLeadModalOpen: boolean = false;
  isReqSend: boolean = false;
  singleLeadData: any = null;
  selectedUser: any = null;
  statusForm!: FormGroup;
  assignForm!: FormGroup;

  // Pagination properties
  totalPages: number = 0;
  pagination?: Pagination;
  total: number = 0;
  limit: number = 10;
  pages: number = 0;
  visiblePages: number[] = [];

  // Debounced search
  private searchSubject = new Subject<string>();
  private searchSubscription!: Subscription;
  private minSearchChars: number = 3;

  // Mock users - replace with API call
  users: User[] = [
    { id: 1, name: 'John Doe' },
    { id: 2, name: 'Jane Smith' },
    { id: 3, name: 'Alex Johnson' },
  ];

  constructor(
    private fb: FormBuilder,
    private leadApi: LeadApiService,
    private route: ActivatedRoute,
    private router: Router,
    private auth: AuthService
  ) {
    this.initForms();
  }

  leadSource: string = ''; // 'direct' | 'affiliate' | '' (all)
  pageTitle: string = 'Leads';

  // Tab selection inside the merged Leads page
  activeTab: LeadTab = 'direct';
  showTabs = false;
  canViewDirect = false;
  canViewAffiliate = false;
  canViewWhatsapp = false;

  ngOnInit() {
    const role = this.auth.user?.role_type;
    this.canViewDirect = this.hasRole(role, [
      UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.M_SELLER, UserRole.A_MANAGER
    ]);
    this.canViewAffiliate = this.hasRole(role, [
      UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.AGENT, UserRole.M_SELLER, UserRole.A_MANAGER
    ]);
    this.canViewWhatsapp = this.hasRole(role, [
      UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.M_SELLER, UserRole.A_MANAGER
    ]);

    this.setupSearchDebounce();
    this.loadUsers();

    this.route.data.subscribe((data: any) => {
      this.leadSource = data.source || '';
      this.activeTab =
        this.leadSource === 'affiliate' ? 'affiliate'
        : this.leadSource === 'whatsapp' ? 'whatsapp'
        : 'direct';
      // Show the Direct/Affiliate tabs on the merged Leads page (not on the "All Leads" route)
      this.showTabs = !!this.leadSource;
      this.pageTitle = 'Leads';

      // Reset paging/search when the source changes, then (re)load
      this.currentPage = 1;
      this.searchStr = '';
      this.getData();
    });
  }

  private hasRole(role: UserRole | undefined, allowed: UserRole[]): boolean {
    return !!role && allowed.includes(role);
  }

  switchTab(tab: LeadTab) {
    if (tab === this.activeTab) return;
    const path =
      tab === 'affiliate' ? 'leads-affiliate'
      : tab === 'whatsapp' ? 'leads-whatsapp'
      : 'leads-direct';
    this.router.navigate(['/', path]);
  }

  ngOnDestroy() {
    if (this.searchSubscription) {
      this.searchSubscription.unsubscribe();
    }
  }

  private initForms() {
    this.statusForm = this.fb.group({
      status: ['', Validators.required],
      remark: ['']
    });

    this.assignForm = this.fb.group({
      role: ['user', Validators.required],
      user: ['', Validators.required],
    });
  }

getActionRoute(lead: any): string[] | null {
  const id = lead?.action_detail?.id;
  const type = lead?.action_type;

  if (!id || !type) return null;

  switch (type) {
    case 'product':
      return ['/products/view', id];
    case 'service':
      return ['/service/view', id];
    case 'solution':
      return ['/solution/view', id];
    default:
      return null;
  }
}

  
  private setupSearchDebounce() {
    this.searchSubscription = this.searchSubject
      .pipe(
        debounceTime(1000), // Wait 500ms after user stops typing
        distinctUntilChanged() // Only emit if value changed
      )
      .subscribe((searchTerm: string) => {
        this.performSearch(searchTerm);
      });
  }

  private loadUsers() {
    // Implement API call to fetch users
    // this.leadApi.getUsers().subscribe(users => this.users = users);
  }

  getData(page: number = 1, search: string = '') {
    this.isFetching = true;
    
    const params: LeadParams = { 
      page, 
      limit: this.limit 
    };
    
    // Only add search if it's 3+ characters
    if (search && search.length >= this.minSearchChars) {
      params.search = search;
    }

    // Add source filter from route
    if (this.leadSource) {
      params.source = this.leadSource;
    }
    
    this.leadApi.getLeads(params)
      .pipe(
        finalize(() => {
          this.isFetching = false;
        })
      )
      .subscribe({
        next: (res: LeadResponse) => {
          this.handleResponse(res);
        },
        error: (error) => {
          console.error('Error fetching leads:', error);
          this.leads = [];
          this.pagination = undefined;
        }
      });
  }

  private handleResponse(res: LeadResponse) {
    const data = res.leads;
    this.leads = data.data || [];
    this.pagination = data.pagination;
    
    if (this.pagination) {
      this.currentPage = this.pagination.page;
      this.totalPages = this.pagination.total_pages;
      this.visiblePages = this.pagination.pages || [];
      this.limit = this.pagination.limit;
    }
  }

  // Called on every keystroke
  search() {
    this.searchSubject.next(this.searchStr);
  }

  // Performs the actual search
  private performSearch(searchTerm: string) {
    // Reset to page 1 when searching
    this.currentPage = 1;
    this.getData(1, searchTerm);
  }

  clearSearch() {
    this.searchStr = '';
    this.searchSubject.next('');
  }

  // Pagination methods
  goToPage(page: number): void {
    if (page !== this.currentPage) {
      this.getData(page, this.searchStr);
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.getData(this.currentPage + 1, this.searchStr);
    }
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.getData(this.currentPage - 1, this.searchStr);
    }
  }

  // Lead status modal methods
  openLeadModal(lead: any) {
    this.isLeadModalOpen = true;
    this.singleLeadData = lead;
    
    this.statusForm.patchValue({
      status: lead.status || '',
      remark: lead.remark || ''
    });
  }

  closeLeadModal() {
    this.isLeadModalOpen = false;
    this.singleLeadData = null;
    this.statusForm.reset();
  }

  updateStatus() {
    if (this.statusForm.invalid || !this.singleLeadData) return;
    
    this.isReqSend = true;
    this.leadApi.updateStatus(this.statusForm.value, this.singleLeadData.id)
      .pipe(
        finalize(() => {
          this.isReqSend = false;
        })
      )
      .subscribe({
        next: (res: any) => {
          this.closeLeadModal();
          // Refresh current page with current search
          this.getData(this.currentPage, this.searchStr);
        },
        error: (error) => {
          console.error('Error updating status:', error);
        }
      });
  }

  // Assign modal methods
  openAssignModal(lead: any) {
    this.selectedUser = lead;
    this.isAssignModalOpen = true;
    // Reset form with default values
    this.assignForm.reset({
      role: 'user',
      user: ''
    });
  }

  closeAssignModal() {
    this.isAssignModalOpen = false;
    this.selectedUser = null;
  }

  submitAssign() {
    if (this.assignForm.invalid || !this.selectedUser) return;

    const payload = {
      ...this.assignForm.value,
      leadId: this.selectedUser.id
    };

    // Call your assign API here
    // this.leadApi.assignLead(payload).subscribe({
    //   next: (res) => {
    //     console.log('Lead assigned successfully:', res);
    //     this.closeAssignModal();
    //     this.getData(this.currentPage, this.searchStr);
    //   },
    //   error: (error) => {
    //     console.error('Error assigning lead:', error);
    //   }
    // });

    console.log('Assign Data:', payload);
    this.closeAssignModal();
    // Optionally refresh the list
    this.getData(this.currentPage, this.searchStr);
  }

  // Helper method to check if we should show search hint
  get showSearchHint(): boolean {
    return this.searchStr.length > 0 && this.searchStr.length < this.minSearchChars;
  }

  get remainingChars(): number {
    return this.minSearchChars - this.searchStr.length;
  }

  // Send lead to CRM
  sendToCrm(lead: any) {
    if (!confirm('Send this lead to CRM? It will appear in the CRM Leads section.')) return;
    const crmLead = {
      name: lead?.user?.name || lead?.name || '',
      email: lead?.user?.email || lead?.email || '',
      phone: lead?.user?.mobile || lead?.phone || '',
      company: lead?.user?.company || lead?.action_detail?.brand_name || '',
      designation: lead?.user?.designation || '',
      country: lead?.user?.country || lead?.demoLead?.country || '',
      industry: lead?.action_detail?.category_name || lead?.action_detail?.industry || '',
      lead_source: lead?.action_type === 'product' ? 'Product Inquiry'
        : lead?.action_type === 'service' ? 'Service Inquiry'
        : lead?.action_type === 'solution' ? 'Solution Inquiry'
        : lead?.action_for || 'Marketplace',
      product_interest: lead?.action_detail?.name || '',
      cloud_preference: lead?.action_detail?.cloud || '',
      requirement: lead?.message || lead?.demoLead?.message || '',
      status: 'New',
      priority: 'Medium',
      lead_stage: 'New Inquiry',
      score: 15,
      original_lead_id: lead?.id,
      notes: [
        `Product/Service: ${lead?.action_detail?.name || 'N/A'}`,
        `Type: ${lead?.action_type || 'N/A'}`,
        `Lead For: ${lead?.action_for || 'N/A'}`,
        `Original Lead ID: ${lead?.id}`,
        lead?.remark ? `Remark: ${lead.remark}` : '',
        lead?.demoLead?.message ? `Demo Message: ${lead.demoLead.message}` : '',
      ].filter(Boolean).join('\n'),
    };
    this.leadApi.sendToCrm(crmLead).subscribe({
      next: () => { alert('Lead sent to CRM successfully!'); },
      error: (err: any) => { alert('Failed to send to CRM: ' + (err?.error?.message || 'Unknown error')); }
    });
  }
}
