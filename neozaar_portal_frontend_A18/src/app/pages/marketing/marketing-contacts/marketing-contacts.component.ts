import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MarketingService, MarketingContact, MarketingEvent, MarketingTag } from '../marketing.service';
import { ToasterService } from '../../../shared/providers/toaster/toaster.service';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-marketing-contacts',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="p-6 max-w-[1400px] mx-auto">
    <div class="flex items-center justify-between mb-5">
      <div>
        <h1 class="text-2xl font-bold text-slate-900">Marketing Contacts</h1>
        <p class="text-sm text-slate-500 mt-1">Marketing profiles layered on your CRM contacts — engagement score, lifecycle stage and consent.</p>
      </div>
      <div class="flex gap-2"><label class="px-3 py-2 border rounded-lg text-sm cursor-pointer">Import CSV/Excel<input type="file" accept=".csv,.xlsx,.xls" class="hidden" (change)="importFile($event)"></label><button (click)="exportFile()" class="px-3 py-2 border rounded-lg text-sm">Export</button><button (click)="fieldModal=true" class="px-3 py-2 bg-orange-500 text-white rounded-lg text-sm">Custom fields</button></div>
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap gap-3 mb-4">
      <input [(ngModel)]="search" (keyup.enter)="load()" placeholder="Search name or email…"
             class="px-3 py-2 border border-slate-200 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-orange-400" />
      <select [(ngModel)]="stage" (change)="load()"
              class="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
        <option value="">All lifecycle stages</option>
        <option value="visitor">Visitor</option>
        <option value="subscriber">Subscriber</option>
        <option value="lead">Lead</option>
        <option value="mql">MQL</option>
        <option value="sql">SQL</option>
        <option value="customer">Customer</option>
      </select>
      <button (click)="load()" class="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm hover:bg-slate-800">Apply</button>
      <select [(ngModel)]="bulkTagId" class="px-3 py-2 border rounded-lg text-sm"><option [ngValue]="null">Choose tag</option><option *ngFor="let t of tags" [ngValue]="t.id">{{t.name}}</option></select>
      <button (click)="bulk('add')" [disabled]="!selected.size || !bulkTagId" class="px-3 py-2 rounded-lg bg-orange-500 text-white text-sm disabled:opacity-40">Add tag</button>
      <button (click)="bulk('remove')" [disabled]="!selected.size || !bulkTagId" class="px-3 py-2 rounded-lg border text-red-600 text-sm disabled:opacity-40">Remove tag</button>
    </div>

    <div class="bg-white border border-slate-100 rounded-xl overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
          <tr>
            <th class="px-4 py-3"><input type="checkbox" (change)="toggleAll($any($event.target).checked)" /></th>
            <th class="text-left px-4 py-3">Contact</th>
            <th class="text-left px-4 py-3">Company</th>
            <th class="text-left px-4 py-3">Stage</th>
            <th class="text-right px-4 py-3">Score</th>
            <th class="text-left px-4 py-3">Source</th>
            <th class="text-left px-4 py-3">Consent</th>
            <th class="text-left px-4 py-3">Last Activity</th>
            <th class="px-4 py-3"></th>
          </tr>
        </thead>
        <tbody>
          <tr *ngIf="isLoading">
            <td colspan="9" class="px-4 py-10 text-center text-slate-400">Loading…</td>
          </tr>
          <tr *ngIf="!isLoading && !contacts.length">
            <td colspan="9" class="px-4 py-10 text-center text-slate-400">
              No marketing contacts yet. Contacts are created as visitors are tracked or CRM contacts opt in.
            </td>
          </tr>
          <tr *ngFor="let c of contacts" class="border-t border-slate-50 hover:bg-slate-50/60">
            <td class="px-4 py-3"><input type="checkbox" [checked]="selected.has(c.id)" (change)="toggle(c.id)" /></td>
            <td class="px-4 py-3">
              <div class="font-medium text-slate-900">{{ c.contact_name || '(anonymous)' }}</div>
              <div class="text-xs text-slate-400">{{ c.contact_email || c.mkt_email || '—' }}</div>
            </td>
            <td class="px-4 py-3 text-slate-600">{{ c.company || '—' }}</td>
            <td class="px-4 py-3">
              <span class="text-xs font-medium px-2 py-1 rounded bg-slate-100 text-slate-700 capitalize">{{ c.lifecycle_stage }}</span>
            </td>
            <td class="px-4 py-3 text-right font-semibold text-orange-600">{{ c.marketing_score }}</td>
            <td class="px-4 py-3 text-slate-600">{{ c.last_source || '—' }}</td>
            <td class="px-4 py-3">
              <span *ngIf="c.do_not_contact" class="text-xs text-red-600">Do not contact</span>
              <span *ngIf="!c.do_not_contact && c.email_consent" class="text-xs text-emerald-600">Email opted-in</span>
              <span *ngIf="!c.do_not_contact && !c.email_consent" class="text-xs text-slate-400">No consent</span>
            </td>
            <td class="px-4 py-3 text-xs text-slate-400">{{ c.last_activity_at ? (c.last_activity_at | date:'short') : '—' }}</td>
            <td class="px-4 py-3"><button (click)="openTimeline(c)" class="text-xs text-orange-600">Profile & timeline</button></td>
          </tr>
        </tbody>
      </table>
    </div>
    <p class="text-xs text-slate-400 mt-2" *ngIf="total">{{ contacts.length }} of {{ total }} contacts</p>
    <div *ngIf="timelineContact" class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-2xl w-full max-w-3xl p-6 max-h-[90vh] overflow-y-auto">
        <div class="flex justify-between mb-4"><h2 class="font-bold">Contact timeline</h2><button (click)="timelineContact=null">×</button></div>
        <div class="grid grid-cols-2 gap-3 bg-slate-50 rounded-xl p-3 mb-4"><label class="text-xs">Lifecycle stage<select [(ngModel)]="timelineContact.lifecycle_stage" class="block w-full border rounded p-2 mt-1"><option *ngFor="let x of stages" [value]="x">{{x}}</option></select></label><label class="text-xs flex items-center gap-2 mt-5"><input type="checkbox" [(ngModel)]="timelineContact.do_not_contact"> Do not contact</label><button (click)="saveContact()" class="px-3 py-2 bg-orange-500 text-white rounded text-sm col-span-2">Save contact profile</button></div>
        <div class="border rounded-xl p-3 mb-4"><h3 class="font-semibold text-sm mb-2">Internal notes</h3><div class="flex gap-2"><input [(ngModel)]="newNote" placeholder="Add a note…" class="border rounded px-2 py-1 text-sm flex-1"><button (click)="addNote()" class="px-3 py-1 bg-slate-900 text-white rounded text-sm">Add</button></div><div *ngFor="let n of notes" class="border-t mt-2 pt-2 text-sm">{{n.note}}<div class="text-xs text-slate-400">{{n.created_by_name||'Team'}} · {{n.created_at|date:'short'}}</div></div></div>
        <div class="flex gap-2 mb-4"><input [(ngModel)]="timelineType" placeholder="Event type" class="border rounded px-2 py-1 text-sm"/><input type="date" [(ngModel)]="timelineFrom" class="border rounded px-2 py-1 text-sm"/><input type="date" [(ngModel)]="timelineTo" class="border rounded px-2 py-1 text-sm"/><button (click)="loadTimeline(0)" class="px-3 py-1 bg-slate-900 text-white rounded text-sm">Filter</button></div>
        <div *ngFor="let event of timeline" class="border-t py-3"><div class="font-medium text-sm">{{event.event_type}}</div><div class="text-xs text-slate-400">{{event.occurred_at|date:'medium'}} · score {{event.score_delta||0}}</div></div>
        <div class="flex justify-between mt-4"><button (click)="loadTimeline(Math.max(0,timelineOffset-25))" [disabled]="!timelineOffset" class="text-sm">Previous</button><span class="text-xs text-slate-400">{{timelineOffset+1}}–{{Math.min(timelineOffset+timeline.length,timelineTotal)}} of {{timelineTotal}}</span><button (click)="loadTimeline(timelineOffset+25)" [disabled]="timelineOffset+timeline.length>=timelineTotal" class="text-sm">Next</button></div>
      </div>
    </div>
    <div *ngIf="fieldModal" class="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"><div class="bg-white rounded-2xl w-full max-w-lg p-6"><div class="flex justify-between"><h2 class="font-bold">Custom contact fields</h2><button (click)="fieldModal=false">×</button></div><div *ngFor="let f of customFields" class="border-b py-2 text-sm"><b>{{f.label}}</b> <span class="text-slate-400">{{f.field_key}} · {{f.field_type}}</span></div><div class="grid grid-cols-3 gap-2 mt-4"><input [(ngModel)]="newField.label" placeholder="Label" class="border rounded p-2"><input [(ngModel)]="newField.fieldKey" placeholder="field_key" class="border rounded p-2"><select [(ngModel)]="newField.fieldType" class="border rounded p-2"><option>text</option><option>number</option><option>date</option><option>boolean</option><option>select</option></select></div><button (click)="createField()" class="mt-3 px-3 py-2 bg-orange-500 text-white rounded">Add field</button></div></div>
  </div>
  `,
})
export class MarketingContactsComponent implements OnInit {
  Math = Math;
  contacts: MarketingContact[] = [];
  total = 0;
  isLoading = false;
  search = '';
  stage = '';
  tags: MarketingTag[]=[]; selected=new Set<number>(); bulkTagId:number|null=null;
  timelineContact:MarketingContact|null=null;timeline:MarketingEvent[]=[];timelineTotal=0;timelineOffset=0;timelineType='';timelineFrom='';timelineTo='';
  stages=['visitor','subscriber','lead','mql','sql','customer'];notes:any[]=[];newNote='';fieldModal=false;customFields:any[]=[];newField:any={label:'',fieldKey:'',fieldType:'text'};

  constructor(private svc: MarketingService, private toaster: ToasterService) {}

  ngOnInit(): void {
    this.load();
    this.svc.getTags().subscribe((res:any)=>this.tags=res?.data||[]);
    this.svc.getCustomFields().subscribe((res:any)=>this.customFields=res?.data||[]);
  }

  load(): void {
    this.isLoading = true;
    this.svc.getContacts({ search: this.search || undefined, stage: this.stage || undefined, limit: 100 }).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        if (res.status === 'success') {
          this.contacts = res.data || [];
          this.total = res.total || this.contacts.length;
        } else {
          this.toaster.setToaster('error', 'Error', res.message || 'Failed to load contacts');
        }
      },
      error: () => {
        this.isLoading = false;
        this.toaster.setToaster('error', 'Error', 'Failed to load marketing contacts.');
      },
    });
  }
  toggle(id:number):void{this.selected.has(id)?this.selected.delete(id):this.selected.add(id);}
  toggleAll(checked:boolean):void{this.selected.clear();if(checked)this.contacts.forEach(c=>this.selected.add(c.id));}
  bulk(action:'add'|'remove'):void{if(!this.bulkTagId||!this.selected.size)return;if(action==='remove'&&!confirm(`Remove this tag from ${this.selected.size} contacts?`))return;this.svc.bulkTag({contactIds:[...this.selected],tagId:this.bulkTagId,action}).subscribe({next:(res:any)=>{this.toaster.setToaster('success','Tags updated',`${res?.data?.changed||0} contacts changed.`);this.selected.clear();},error:(err)=>this.toaster.setToaster('error','Bulk tagging failed',err?.error?.message||'Could not update tags.')});}
  openTimeline(c:MarketingContact):void{this.timelineContact={...c};this.timelineType='';this.timelineFrom='';this.timelineTo='';this.loadTimeline(0);this.svc.getContactNotes(c.id).subscribe((r:any)=>this.notes=r.data||[]);}
  loadTimeline(offset:number):void{if(!this.timelineContact)return;this.timelineOffset=offset;this.svc.getContactTimeline(this.timelineContact.id,{eventType:this.timelineType||undefined,dateFrom:this.timelineFrom||undefined,dateTo:this.timelineTo||undefined,limit:25,offset}).subscribe({next:(res:any)=>{this.timeline=res?.data||[];this.timelineTotal=res?.total||0;},error:()=>this.toaster.setToaster('error','Timeline failed','Could not load the timeline.')});}
  saveContact(){if(!this.timelineContact)return;this.svc.updateMarketingContact(this.timelineContact.id,{lifecycleStage:this.timelineContact.lifecycle_stage,doNotContact:this.timelineContact.do_not_contact}).subscribe(()=>{this.toaster.setToaster('success','Saved','Contact profile updated.');this.load();});}
  addNote(){if(!this.timelineContact||!this.newNote.trim())return;this.svc.addContactNote(this.timelineContact.id,this.newNote).subscribe(()=>{this.newNote='';this.svc.getContactNotes(this.timelineContact!.id).subscribe((r:any)=>this.notes=r.data||[]);});}
  createField(){if(!this.newField.label||!this.newField.fieldKey)return;this.svc.saveCustomField(this.newField).subscribe({next:()=>{this.newField={label:'',fieldKey:'',fieldType:'text'};this.svc.getCustomFields().subscribe((r:any)=>this.customFields=r.data||[]);},error:e=>this.toaster.setToaster('error','Field failed',e.error?.message||'Could not add field')});}
  importFile(event:Event){const input=event.target as HTMLInputElement,file=input.files?.[0];input.value='';if(!file)return;const reader=new FileReader();reader.onload=()=>{const wb=XLSX.read(reader.result,{type:'array'}),rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:''});this.svc.importContacts(rows).subscribe({next:(r:any)=>{const x=r.data;this.toaster.setToaster('success','Import complete',`${x.created} created, ${x.updated} updated, ${x.skipped} skipped.`);this.load();},error:e=>this.toaster.setToaster('error','Import failed',e.error?.message||'Could not import contacts')});};reader.readAsArrayBuffer(file);}
  exportFile(){this.svc.exportContacts().subscribe((r:any)=>{const ws=XLSX.utils.json_to_sheet(r.data||[]),wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Contacts');XLSX.writeFile(wb,'neozaar-marketing-contacts.xlsx');});}
}
