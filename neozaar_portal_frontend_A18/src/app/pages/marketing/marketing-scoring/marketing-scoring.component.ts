import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MarketingScoringRule, MarketingService } from '../marketing.service';
import { ToasterService } from '../../../shared/providers/toaster/toaster.service';

type RuleEditor = {
  id?: number;
  eventType: string;
  scoreDelta: number;
  description: string;
  isActive: boolean;
  priority: number;
  modelId: number;
};

@Component({
  selector: 'app-marketing-scoring',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="p-6 max-w-[1100px] mx-auto">
    <div class="flex items-center justify-between mb-5">
      <div>
        <h1 class="text-2xl font-bold text-slate-900">Marketing Scoring</h1>
        <p class="text-sm text-slate-500 mt-1">Manage engagement scores independently from CRM lead scoring.</p>
      </div>
      <button (click)="openCreate()" class="px-4 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 text-white text-sm font-medium">+ New Rule</button>
    </div>

    <div class="bg-white border border-slate-100 rounded-xl overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
          <tr><th class="text-left px-4 py-3">Event</th><th class="text-left px-4 py-3">Description</th><th class="text-right px-4 py-3">Score</th><th class="text-center px-4 py-3">Status</th><th class="px-4 py-3"></th></tr>
        </thead>
        <tbody>
          <tr *ngIf="loading"><td colspan="5" class="px-4 py-10 text-center text-slate-400">Loading…</td></tr>
          <tr *ngIf="!loading && !rules.length"><td colspan="5" class="px-4 py-10 text-center text-slate-400">No scoring rules.</td></tr>
          <tr *ngFor="let rule of rules" class="border-t border-slate-50">
            <td class="px-4 py-3 font-medium text-slate-900">{{ rule.event_type }}</td>
            <td class="px-4 py-3 text-slate-500">{{ rule.description || '—' }}</td>
            <td class="px-4 py-3 text-right font-semibold" [class.text-emerald-600]="rule.score_delta >= 0" [class.text-red-600]="rule.score_delta < 0">{{ rule.score_delta > 0 ? '+' : '' }}{{ rule.score_delta }}</td>
            <td class="px-4 py-3 text-center"><span class="px-2 py-1 rounded-full text-xs" [class.bg-emerald-50]="rule.is_active" [class.text-emerald-700]="rule.is_active" [class.bg-slate-100]="!rule.is_active">{{ rule.is_active ? 'Active' : 'Inactive' }}</span></td>
            <td class="px-4 py-3 text-right"><button (click)="edit(rule)" class="text-xs text-slate-600 mr-3">Edit</button><button (click)="remove(rule)" class="text-xs text-red-500">Delete</button></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div *ngIf="editing" class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-2xl w-full max-w-lg p-6">
        <h2 class="text-lg font-bold mb-4">{{ editing.id ? 'Edit' : 'New' }} scoring rule</h2>
        <label class="block text-xs text-slate-500 mb-1">Event type</label>
        <input [(ngModel)]="editing.eventType" placeholder="PRODUCT_VIEW" class="w-full px-3 py-2 border rounded-lg text-sm mb-3 uppercase" />
        <label class="block text-xs text-slate-500 mb-1">Score delta</label>
        <input type="number" [(ngModel)]="editing.scoreDelta" class="w-full px-3 py-2 border rounded-lg text-sm mb-3" />
        <label class="block text-xs text-slate-500 mb-1">Scoring model</label>
        <select [(ngModel)]="editing.modelId" class="w-full px-3 py-2 border rounded-lg text-sm mb-3"><option *ngFor="let model of models" [ngValue]="model.id">{{ model.name }}</option></select>
        <label class="block text-xs text-slate-500 mb-1">Description</label>
        <input [(ngModel)]="editing.description" class="w-full px-3 py-2 border rounded-lg text-sm mb-3" />
        <label class="block text-xs text-slate-500 mb-1">Priority</label>
        <input type="number" [(ngModel)]="editing.priority" class="w-full px-3 py-2 border rounded-lg text-sm mb-3" />
        <label class="flex items-center gap-2 text-sm mb-5"><input type="checkbox" [(ngModel)]="editing.isActive" /> Active</label>
        <div class="flex justify-end gap-3 border-t pt-4"><button (click)="editing=null" class="px-4 py-2 text-sm">Cancel</button><button (click)="save()" [disabled]="saving" class="px-4 py-2 rounded-lg bg-orange-500 text-white text-sm disabled:opacity-50">Save</button></div>
      </div>
    </div>
  </div>`,
})
export class MarketingScoringComponent implements OnInit {
  rules: MarketingScoringRule[] = [];
  loading = false;
  saving = false;
  editing: RuleEditor | null = null;
  models: any[] = [];

  constructor(private svc: MarketingService, private toaster: ToasterService) {}
  ngOnInit(): void { this.svc.getScoringModels().subscribe((res:any)=>this.models=res?.data||[]); this.load(); }
  load(): void {
    this.loading = true;
    this.svc.getScoringRules().subscribe({
      next: (res: any) => { this.loading = false; this.rules = res?.data || []; },
      error: () => { this.loading = false; this.toaster.setToaster('error', 'Error', 'Failed to load scoring rules.'); },
    });
  }
  openCreate(): void { this.editing = { eventType: '', scoreDelta: 0, description: '', isActive: true, priority: 0, modelId: this.models[0]?.id }; }
  edit(rule: MarketingScoringRule): void {
    this.editing = { id: rule.id, eventType: rule.event_type, scoreDelta: rule.score_delta,
      description: rule.description || '', isActive: rule.is_active, priority: rule.priority || 0, modelId: (rule as any).model_id };
  }
  save(): void {
    if (!this.editing) return;
    this.editing.eventType = this.editing.eventType.trim().toUpperCase();
    if (!this.editing.eventType) { this.toaster.setToaster('warning', 'Missing event', 'Enter an event type.'); return; }
    this.saving = true;
    const payload = { eventType: this.editing.eventType, scoreDelta: this.editing.scoreDelta,
      description: this.editing.description, isActive: this.editing.isActive, priority: this.editing.priority, modelId: this.editing.modelId, conditions: {} };
    const call = this.editing.id ? this.svc.updateScoringRule(this.editing.id, payload) : this.svc.createScoringRule(payload);
    call.subscribe({
      next: () => { this.saving = false; this.editing = null; this.toaster.setToaster('success', 'Saved', 'Scoring rule saved.'); this.load(); },
      error: (err) => { this.saving = false; this.toaster.setToaster('error', 'Save failed', err?.error?.message || 'Could not save scoring rule.'); },
    });
  }
  remove(rule: MarketingScoringRule): void {
    if (!confirm(`Delete scoring rule "${rule.event_type}"?`)) return;
    this.svc.deleteScoringRule(rule.id).subscribe({
      next: () => { this.toaster.setToaster('success', 'Deleted', 'Scoring rule deleted.'); this.load(); },
      error: (err) => this.toaster.setToaster('error', 'Delete failed', err?.error?.message || 'Could not delete scoring rule.'),
    });
  }
}
