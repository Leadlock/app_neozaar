import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { CrmService } from '../../../core/services/crm/crm.service';

const EVENT_META: Record<string, { label: string; icon: string; color: string }> = {
  customer_registration: { label: 'Registration',          icon: '👤', color: '#6366f1' },
  product_page_visit:    { label: 'Product Page Visit',     icon: '📄', color: '#3b82f6' },
  brochure_download:     { label: 'Brochure Download',      icon: '📥', color: '#f59e0b' },
  use_case_download:     { label: 'Use Case Download',      icon: '📋', color: '#8b5cf6' },
  score_change:          { label: 'Score Update',           icon: '📊', color: '#94a3b8' },
};

@Component({
  selector: 'app-crm-customer-scoring',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './crm-customer-scoring.component.html'
})
export class CrmCustomerScoringComponent implements OnInit {
  private http = inject(HttpClient);
  private crmService = inject(CrmService);
  private apiUrl = environment.apiUrl;

  leads: any[] = [];
  loading = false;
  expandedLeadId: number | null = null;
  scoreHistories: Record<number, any[]> = {};
  Math = Math;
  eventMeta = EVENT_META;

  page = 1;
  readonly pageSize = 10;

  // ── Date-range & owner filters ──────────────────────────────────
  dateRange = '';
  filterOwner = '';

  readonly dateRanges = [
    { label: 'All Time',    value: ''   },
    { label: 'Last 7 Days', value: '7'  },
    { label: '15 Days',     value: '15' },
    { label: '1 Month',     value: '30' },
  ];

  get ownerOptions(): string[] {
    return [...new Set(this.leads.map((l: any) => l.owner_name).filter(Boolean))].sort() as string[];
  }

  private dateCutoff(days: number): Date {
    const d = new Date();
    d.setDate(d.getDate() - days);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  get filteredLeads(): any[] {
    const cutoff = this.dateRange ? this.dateCutoff(+this.dateRange) : null;
    return this.leads.filter(l => {
      if (this.filterOwner && l.owner_name !== this.filterOwner) return false;
      if (cutoff && new Date(l.created_at) < cutoff) return false;
      return true;
    });
  }

  get pagedLeads(): any[] {
    const start = (this.page - 1) * this.pageSize;
    return this.filteredLeads.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredLeads.length / this.pageSize));
  }

  prevPage() { if (this.page > 1) { this.page--; this.expandedLeadId = null; } }
  nextPage() { if (this.page < this.totalPages) { this.page++; this.expandedLeadId = null; } }

  onFilterChange() { this.page = 1; this.expandedLeadId = null; }

  readonly scoreEvents = [
    { key: 'customer_registration', label: 'Customer Registration', points: 1,  icon: '👤' },
    { key: 'product_page_visit',    label: 'Product Page Visit',    points: 5,  icon: '📄' },
    { key: 'brochure_download',     label: 'Brochure Download',     points: 5,  icon: '📥' },
    { key: 'use_case_download',     label: 'Use Case Download',     points: 5,  icon: '📋' },
  ];

  // Conversion threshold — must match backend CUSTOMER_SCORE_CONVERSION_THRESHOLD
  readonly CONVERSION_THRESHOLD = 30;

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    // Show ALL leads including converted — converted ones show their opportunity link
    this.http.get<any>(`${this.apiUrl}internal/crm/leads?limit=200`).subscribe({
      next: (res) => {
        this.leads = res.data || [];
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  toggleLead(lead: any) {
    if (this.expandedLeadId === lead.id) { this.expandedLeadId = null; return; }
    this.expandedLeadId = lead.id;
    if (!this.scoreHistories[lead.id]) {
      this.crmService.getScoringHistory(lead.id).subscribe({
        next: (res: any) => { this.scoreHistories[lead.id] = res.data || []; },
        error: () => { this.scoreHistories[lead.id] = []; }
      });
    }
  }

  getHistory(leadId: number): any[] { return this.scoreHistories[leadId] || []; }

  getEventMeta(reason: string) {
    return EVENT_META[reason] || { label: reason, icon: '•', color: '#94a3b8' };
  }

  getScoreLabel(score: number): string {
    if (score >= 30) return 'Opportunity Ready';
    if (score >= 20) return 'Engaged';
    if (score >= 10) return 'Interested';
    if (score >= 1)  return 'Registered';
    return 'Not Scored';
  }

  getScoreColor(score: number): string {
    if (score >= 30) return '#059669';
    if (score >= 20) return '#f59e0b';
    if (score >= 10) return '#3b82f6';
    return '#94a3b8';
  }

  // KPI buckets using new thresholds
  get opportunityReady(): any[] { return this.leads.filter(l => (l.score || 0) >= 30 && !l.converted_to_opportunity_id); }
  get engaged():          any[] { return this.leads.filter(l => (l.score || 0) >= 20 && (l.score || 0) < 30); }
  get interested():       any[] { return this.leads.filter(l => (l.score || 0) >= 10 && (l.score || 0) < 20); }
  get registered():       any[] { return this.leads.filter(l => (l.score || 0) >= 1  && (l.score || 0) < 10); }
  get converted():        any[] { return this.leads.filter(l => !!l.converted_to_opportunity_id); }
}
