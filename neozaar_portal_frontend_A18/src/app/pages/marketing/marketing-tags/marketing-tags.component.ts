import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MarketingService, MarketingTag } from '../marketing.service';
import { ToasterService } from '../../../shared/providers/toaster/toaster.service';

@Component({
  selector: 'app-marketing-tags',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="p-6 max-w-[1000px] mx-auto">
    <div class="mb-5">
      <h1 class="text-2xl font-bold text-slate-900">Marketing Tags</h1>
      <p class="text-sm text-slate-500 mt-1">Label contacts for use in segments, campaigns and journeys.</p>
    </div>

    <!-- Create -->
    <div class="bg-white border border-slate-100 rounded-xl p-4 mb-5 flex flex-wrap items-end gap-3">
      <div>
        <label class="block text-xs text-slate-500 mb-1">Tag name</label>
        <input [(ngModel)]="newName" placeholder="e.g. Microsoft-Interested"
               class="px-3 py-2 border border-slate-200 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-orange-400" />
      </div>
      <div>
        <label class="block text-xs text-slate-500 mb-1">Color</label>
        <input type="color" [(ngModel)]="newColor" class="h-9 w-14 border border-slate-200 rounded-lg" />
      </div>
      <button (click)="create()" [disabled]="creating"
              class="px-4 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 text-white text-sm font-medium disabled:opacity-50">
        + Add Tag
      </button>
    </div>

    <div class="bg-white border border-slate-100 rounded-xl overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
          <tr>
            <th class="text-left px-4 py-3">Tag</th>
            <th class="text-right px-4 py-3">Contacts</th>
            <th class="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody>
          <tr *ngIf="isLoading"><td colspan="3" class="px-4 py-10 text-center text-slate-400">Loading…</td></tr>
          <tr *ngIf="!isLoading && !tags.length"><td colspan="3" class="px-4 py-10 text-center text-slate-400">No tags yet.</td></tr>
          <tr *ngFor="let t of tags" class="border-t border-slate-50 hover:bg-slate-50/60">
            <td class="px-4 py-3">
              <span class="inline-flex items-center gap-2">
                <span class="w-3 h-3 rounded-full" [style.background]="t.color || '#f97316'"></span>
                <span class="font-medium text-slate-900">{{ t.name }}</span>
              </span>
            </td>
            <td class="px-4 py-3 text-right text-slate-600">{{ t.contact_count }}</td>
            <td class="px-4 py-3 text-right">
              <button (click)="remove(t)" class="text-xs text-red-500 hover:text-red-700">Delete</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="mt-6 bg-white border border-slate-100 rounded-xl p-4">
      <h2 class="font-semibold text-slate-900 mb-3">Automatic tagging rules</h2>
      <div class="flex flex-wrap gap-2 mb-4"><input [(ngModel)]="ruleName" placeholder="Rule name" class="border rounded px-3 py-2 text-sm"/><select [(ngModel)]="ruleTagId" class="border rounded px-3 py-2 text-sm"><option [ngValue]="null">Tag</option><option *ngFor="let t of tags" [ngValue]="t.id">{{t.name}}</option></select><select [(ngModel)]="ruleTrigger" class="border rounded px-3 py-2 text-sm"><option value="event">Event</option><option value="score">Score</option><option value="lifecycle">Lifecycle</option><option value="segment">Segment</option></select><input [(ngModel)]="ruleValue" [placeholder]="ruleTrigger==='event'?'EVENT_TYPE':ruleTrigger==='score'?'Minimum score':ruleTrigger==='segment'?'Segment ID':'Lifecycle stage'" class="border rounded px-3 py-2 text-sm"/><button (click)="createRule()" class="bg-orange-500 text-white rounded px-3 py-2 text-sm">Add rule</button></div>
      <div *ngFor="let rule of tagRules" class="flex justify-between border-t py-2 text-sm"><span>{{rule.name}} → {{rule.tag_name}} ({{rule.trigger_type}})</span><button (click)="removeRule(rule.id)" class="text-red-500 text-xs">Delete</button></div>
    </div>
  </div>
  `,
})
export class MarketingTagsComponent implements OnInit {
  tags: MarketingTag[] = [];
  isLoading = false;
  creating = false;
  newName = '';
  newColor = '#f97316';
  tagRules:any[]=[];ruleName='';ruleTagId:number|null=null;ruleTrigger='event';ruleValue='';

  constructor(private svc: MarketingService, private toaster: ToasterService) {}

  ngOnInit(): void {
    this.load();
    this.loadRules();
  }
  loadRules():void{this.svc.getTagRules().subscribe((res:any)=>this.tagRules=res?.data||[]);}
  createRule():void{if(!this.ruleName.trim()||!this.ruleTagId||!this.ruleValue)return;const conditions:any=this.ruleTrigger==='event'?{eventType:this.ruleValue.toUpperCase()}:this.ruleTrigger==='score'?{minimum:Number(this.ruleValue)}:this.ruleTrigger==='segment'?{segmentId:Number(this.ruleValue)}:{stage:this.ruleValue};this.svc.createTagRule({name:this.ruleName,tagId:this.ruleTagId,triggerType:this.ruleTrigger,conditions,isActive:true}).subscribe({next:()=>{this.ruleName='';this.ruleValue='';this.loadRules();},error:(err)=>this.toaster.setToaster('error','Rule failed',err?.error?.message||'Could not create rule.')});}
  removeRule(id:number):void{this.svc.deleteTagRule(id).subscribe(()=>this.loadRules());}

  load(): void {
    this.isLoading = true;
    this.svc.getTags().subscribe({
      next: (res: any) => {
        this.isLoading = false;
        if (res.status === 'success') this.tags = res.data || [];
        else this.toaster.setToaster('error', 'Error', res.message || 'Failed to load tags');
      },
      error: () => { this.isLoading = false; this.toaster.setToaster('error', 'Error', 'Failed to load tags.'); },
    });
  }

  create(): void {
    if (!this.newName.trim()) { this.toaster.setToaster('warning', 'Missing name', 'Enter a tag name.'); return; }
    this.creating = true;
    this.svc.createTag({ name: this.newName.trim(), color: this.newColor }).subscribe({
      next: (res: any) => {
        this.creating = false;
        if (res.status === 'success') {
          this.toaster.setToaster('success', 'Added', 'Tag created.');
          this.newName = '';
          this.load();
        } else {
          this.toaster.setToaster('error', 'Error', res.message || 'Failed to create tag');
        }
      },
      error: (err) => {
        this.creating = false;
        this.toaster.setToaster('error', 'Error', err?.error?.message || 'Failed to create tag.');
      },
    });
  }

  remove(t: MarketingTag): void {
    if (!confirm(`Delete tag "${t.name}"?`)) return;
    this.svc.deleteTag(t.id).subscribe({
      next: (res: any) => {
        if (res.status === 'success') { this.toaster.setToaster('success', 'Deleted', 'Tag deleted.'); this.load(); }
        else this.toaster.setToaster('error', 'Error', res.message || 'Failed to delete tag');
      },
      error: () => this.toaster.setToaster('error', 'Error', 'Failed to delete tag.'),
    });
  }
}
