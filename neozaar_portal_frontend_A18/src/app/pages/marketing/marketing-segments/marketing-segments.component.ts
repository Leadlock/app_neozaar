import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MarketingService, MarketingSegment, SegmentRule } from '../marketing.service';
import { ToasterService } from '../../../shared/providers/toaster/toaster.service';

@Component({
  selector: 'app-marketing-segments',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="p-6 max-w-[1200px] mx-auto">
    <div class="flex items-center justify-between mb-5">
      <div>
        <h1 class="text-2xl font-bold text-slate-900">Segments</h1>
        <p class="text-sm text-slate-500 mt-1">Rule-based groups of contacts. Segments power targeting for campaigns and journeys.</p>
        <p class="text-xs text-slate-400 mt-0.5">Every segment refreshes automatically overnight (02:00 server time) — use Refresh below to see a change right away instead of waiting.</p>
      </div>
      <button (click)="openCreate()"
              class="px-4 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 text-white text-sm font-medium">+ New Segment</button>
    </div>

    <div class="bg-white border border-slate-100 rounded-xl overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
          <tr>
            <th class="text-left px-4 py-3">Segment</th>
            <th class="text-left px-4 py-3">Rules</th>
            <th class="text-right px-4 py-3">Members</th>
            <th class="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody>
          <tr *ngIf="isLoading"><td colspan="4" class="px-4 py-10 text-center text-slate-400">Loading…</td></tr>
          <tr *ngIf="!isLoading && !segments.length"><td colspan="4" class="px-4 py-10 text-center text-slate-400">No segments yet.</td></tr>
          <tr *ngFor="let s of segments" class="border-t border-slate-50 hover:bg-slate-50/60">
            <td class="px-4 py-3">
              <div class="font-medium text-slate-900">{{ s.name }}</div>
              <div class="text-xs text-slate-400">{{ s.description || '—' }}</div>
            </td>
            <td class="px-4 py-3 text-slate-500 text-xs">
              {{ (s.rules && s.rules.rules ? s.rules.rules.length : 0) }} rule(s), match {{ (s.rules && s.rules.match) || 'all' }}
            </td>
            <td class="px-4 py-3 text-right text-slate-600">
              {{ s.member_count || 0 }}
              <div class="text-[11px] font-normal mt-0.5" [class.text-red-500]="s.evaluation_status === 'failed'" [class.text-slate-400]="s.evaluation_status !== 'failed'" [title]="s.evaluation_status === 'failed' ? s.evaluation_error : ''">
                <span *ngIf="s.evaluation_status === 'failed'">Last refresh failed</span>
                <span *ngIf="s.evaluation_status !== 'failed' && s.last_evaluated_at">Updated {{ s.last_evaluated_at | date:'MMM d, h:mm a' }}</span>
                <span *ngIf="s.evaluation_status !== 'failed' && !s.last_evaluated_at">Not yet evaluated</span>
              </div>
            </td>
            <td class="px-4 py-3 text-right whitespace-nowrap">
              <button (click)="refresh(s)" [disabled]="refreshingId === s.id" class="text-xs text-orange-600 hover:text-orange-800 mr-3 disabled:opacity-50">{{ refreshingId === s.id ? 'Refreshing…' : 'Refresh' }}</button>
              <button (click)="edit(s)" class="text-xs text-slate-600 hover:text-slate-900 mr-3">Edit</button>
              <button (click)="remove(s)" class="text-xs text-red-500 hover:text-red-700">Delete</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Editor modal -->
    <div *ngIf="editing" class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
        <h2 class="text-lg font-bold text-slate-900 mb-4">{{ editing.id ? 'Edit' : 'New' }} Segment</h2>

        <label class="block text-xs text-slate-500 mb-1">Name</label>
        <input [(ngModel)]="editing.name" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-orange-400" />

        <label class="block text-xs text-slate-500 mb-1">Description</label>
        <input [(ngModel)]="editing.description" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-orange-400" />

        <div class="flex items-center gap-2 mb-3">
          <span class="text-xs text-slate-500">Match</span>
          <select [(ngModel)]="editing.rules.match" class="px-2 py-1 border border-slate-200 rounded-lg text-sm">
            <option value="all">ALL rules (AND)</option>
            <option value="any">ANY rule (OR)</option>
          </select>
        </div>

        <div class="space-y-2 mb-3">
          <div *ngFor="let r of editing.rules.rules; let i = index" class="flex items-center gap-2">
            <select [(ngModel)]="r.field" class="px-2 py-1.5 border border-slate-200 rounded-lg text-sm flex-1">
              <option value="lifecycle_stage">Lifecycle stage</option>
              <option value="marketing_score">Marketing score</option>
              <option value="industry">Industry</option>
              <option value="last_source">Last source</option>
              <option value="company">Company</option>
              <option value="utm_source">UTM source</option><option value="utm_campaign">UTM campaign</option>
              <option value="tag">Tag</option><option value="product_viewed">Product viewed</option>
              <option value="category_viewed">Category viewed</option><option value="page_visited">Page visited</option>
              <option value="form_submitted">Form submitted</option><option value="asset_downloaded">Asset downloaded</option>
              <option value="email_opened">Email opened</option><option value="email_clicked">Email clicked</option>
              <option value="last_activity_at">Last activity</option>
            </select>
            <select [(ngModel)]="r.op" class="px-2 py-1.5 border border-slate-200 rounded-lg text-sm">
              <option value="eq">=</option>
              <option value="neq">≠</option>
              <option value="gt">&gt;</option>
              <option value="lt">&lt;</option>
              <option value="contains">contains</option>
              <option value="not_contains">does not contain</option><option value="gte">≥</option><option value="lte">≤</option>
              <option value="exists">exists</option><option value="not_exists">does not exist</option>
              <option value="before">before</option><option value="after">after</option>
              <option value="within_days">within X days</option><option value="within_hours">within X hours</option>
            </select>
            <input [(ngModel)]="r.value" placeholder="value" class="px-2 py-1.5 border border-slate-200 rounded-lg text-sm flex-1" />
            <button (click)="removeRule(i)" class="text-red-500 text-lg leading-none px-1">×</button>
          </div>
        </div>
        <button (click)="addRule()" class="text-xs text-orange-600 hover:underline mb-5">+ Add rule</button>

        <div class="mb-4">
          <button (click)="preview()" [disabled]="previewing" class="text-xs px-3 py-1.5 rounded-lg border border-orange-200 text-orange-700 disabled:opacity-50">Preview audience</button>
          <span *ngIf="previewCount !== null" class="ml-3 text-sm text-slate-600">{{ previewCount }} matching contact(s)</span>
        </div>

        <div class="flex justify-end gap-3 pt-2 border-t border-slate-100">
          <button (click)="editing = null" class="px-4 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-100">Cancel</button>
          <button (click)="save()" [disabled]="saving"
                  class="px-4 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 text-white text-sm font-medium disabled:opacity-50">Save</button>
        </div>
      </div>
    </div>
  </div>
  `,
})
export class MarketingSegmentsComponent implements OnInit {
  segments: MarketingSegment[] = [];
  isLoading = false;
  saving = false;
  editing: MarketingSegment | null = null;
  previewing = false;
  previewCount: number | null = null;
  refreshingId: number | null = null;

  constructor(private svc: MarketingService, private toaster: ToasterService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.isLoading = true;
    this.svc.getSegments().subscribe({
      next: (res: any) => {
        this.isLoading = false;
        if (res.status === 'success') this.segments = res.data || [];
        else this.toaster.setToaster('error', 'Error', res.message || 'Failed to load segments');
      },
      error: () => { this.isLoading = false; this.toaster.setToaster('error', 'Error', 'Failed to load segments.'); },
    });
  }

  openCreate(): void {
    this.editing = { name: '', description: '', rules: { match: 'all', rules: [] } };
    this.previewCount = null;
  }

  edit(s: MarketingSegment): void {
    // Clone so cancel doesn't mutate the row; ensure rules shape exists.
    this.editing = JSON.parse(JSON.stringify({ ...s, rules: s.rules || { match: 'all', rules: [] } }));
    this.previewCount = null;
  }

  addRule(): void {
    if (!this.editing) return;
    const rule: SegmentRule = { field: 'lifecycle_stage', op: 'eq', value: '' };
    this.editing.rules.rules.push(rule);
  }

  removeRule(i: number): void {
    this.editing?.rules.rules.splice(i, 1);
  }

  preview(): void {
    if (!this.editing) return;
    this.previewing = true;
    this.svc.previewSegmentRules(this.editing.rules).subscribe({
      next: (res: any) => { this.previewing = false; this.previewCount = res?.data?.count ?? 0; },
      error: (err) => { this.previewing = false; this.toaster.setToaster('error', 'Preview failed', err?.error?.message || 'Could not preview segment.'); },
    });
  }

  refresh(s: MarketingSegment): void {
    if (!s.id) return;
    this.refreshingId = s.id;
    this.svc.refreshSegment(s.id).subscribe({
      next: (res: any) => {
        this.refreshingId = null;
        this.toaster.setToaster('success', 'Segment refreshed', `${res?.data?.memberCount ?? 0} contacts matched.`);
        this.load();
      },
      error: (err) => { this.refreshingId = null; this.toaster.setToaster('error', 'Refresh failed', err?.error?.message || 'Could not refresh segment.'); },
    });
  }

  save(): void {
    if (!this.editing) return;
    if (!this.editing.name.trim()) { this.toaster.setToaster('warning', 'Missing name', 'Enter a segment name.'); return; }
    this.saving = true;
    const payload = { name: this.editing.name, description: this.editing.description, rules: this.editing.rules };
    const req$ = this.editing.id
      ? this.svc.updateSegment(this.editing.id, payload)
      : this.svc.createSegment(payload);
    req$.subscribe({
      next: (res: any) => {
        this.saving = false;
        if (res.status === 'success') {
          this.toaster.setToaster('success', 'Saved', 'Segment saved.');
          this.editing = null;
          this.load();
        } else {
          this.toaster.setToaster('error', 'Error', res.message || 'Failed to save segment');
        }
      },
      error: (err) => { this.saving = false; this.toaster.setToaster('error', 'Error', err?.error?.message || 'Failed to save segment.'); },
    });
  }

  remove(s: MarketingSegment): void {
    if (!s.id || !confirm(`Delete segment "${s.name}"?`)) return;
    this.svc.deleteSegment(s.id).subscribe({
      next: (res: any) => {
        if (res.status === 'success') { this.toaster.setToaster('success', 'Deleted', 'Segment deleted.'); this.load(); }
        else this.toaster.setToaster('error', 'Error', res.message || 'Failed to delete segment');
      },
      error: () => this.toaster.setToaster('error', 'Error', 'Failed to delete segment.'),
    });
  }
}
