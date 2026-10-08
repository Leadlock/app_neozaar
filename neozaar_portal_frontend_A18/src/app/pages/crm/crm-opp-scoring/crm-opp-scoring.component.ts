import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CrmService } from '../../../core/services/crm/crm.service';

@Component({
  selector: 'app-crm-opp-scoring',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './crm-opp-scoring.component.html'
})
export class CrmOppScoringComponent implements OnInit {
  private crmService = inject(CrmService);
  opportunities: any[] = [];
  loading = false;
  Math = Math;

  readonly scoreTiers = [
    { score: 10,  label: 'Discovery',       stages: ['Discovery'],                                                  color: '#ef4444' },
    { score: 20,  label: 'Qualification',   stages: ['Qualification'],                                              color: '#dc2626' },
    { score: 30,  label: 'Evaluation',      stages: ['Assessment','Demo','Trial','Scoping','Technical Validation'], color: '#f97316' },
    { score: 40,  label: 'Proposal',        stages: ['Proposal Shared','Negotiation','Private Offer'],              color: '#f59e0b' },
    { score: 60,  label: 'Procurement',     stages: ['Procurement','PO Received'],                                  color: '#10b981' },
    { score: 80,  label: 'Delivered',       stages: ['Delivered'],                                                  color: '#047857' },
    { score: 90,  label: 'Payment Pending', stages: ['Payment Pending'],                                            color: '#065f46' },
    { score: 100, label: 'Closed',          stages: ['Payment Received','Closed Won'],                              color: '#3b82f6' },
  ];

  readonly stageScores: Record<string, number> = {
    'Discovery':10,'Qualification':20,
    'Assessment':30,'Demo':30,'Trial':30,'Scoping':30,'Technical Validation':30,
    'Proposal Shared':40,'Negotiation':40,'Private Offer':40,
    'Procurement':60,'PO Received':60,
    'Delivered':80,'Payment Pending':90,
    'Payment Received':100,'Closed Won':100,
  };

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.crmService.getOpportunities({ limit: 200 }).subscribe({
      next: (res: any) => { this.opportunities = res.data || []; this.loading = false; },
      error: () => { this.loading = false; }
    });
  }

  getOppsByTier(tier: any): any[] {
    return this.opportunities.filter(o => tier.stages.includes(o.stage));
  }

  getTierValue(tier: any): number {
    return this.getOppsByTier(tier).reduce((s: number, o: any) => s + (+o.deal_value || 0), 0);
  }

  getTotalPipeline(): number {
    return this.opportunities.reduce((s: number, o: any) => s + (+o.deal_value || 0), 0);
  }

  getWeightedPipeline(): number {
    return this.opportunities.reduce((s: number, o: any) => {
      const score = this.stageScores[o.stage] || 0;
      return s + ((+o.deal_value || 0) * score / 100);
    }, 0);
  }
}
