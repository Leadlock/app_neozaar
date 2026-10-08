import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MarketingService } from '../marketing.service';
import { ToasterService } from '../../../shared/providers/toaster/toaster.service';
import { EmailBuilderComponent } from './email-builder.component';

@Component({
  selector: 'app-marketing-emails', standalone: true, imports: [CommonModule, FormsModule, EmailBuilderComponent],
  template: `<div class="p-6 max-w-6xl mx-auto"><div class="flex justify-between items-start mb-6"><div><h1 class="text-2xl font-bold">Marketing Emails</h1><p class="text-sm text-slate-500">Dynamic content, validation, version history and complete delivery performance.</p></div><button *ngIf="view==='templates'" class="px-4 py-2 rounded-lg bg-orange-500 text-white" (click)="newTemplate()">+ Template</button><button *ngIf="view==='senders'" class="px-4 py-2 rounded-lg bg-orange-500 text-white" (click)="newSender()">+ Sender</button><button *ngIf="view==='subscriptions'" class="px-4 py-2 rounded-lg bg-orange-500 text-white" (click)="newSubscriptionType()">+ Topic</button></div>

  <div class="flex gap-1 mb-5 border-b"><button class="px-4 py-2 text-sm font-medium border-b-2 -mb-px" [class.border-orange-500]="view==='templates'" [class.text-orange-600]="view==='templates'" [class.border-transparent]="view!=='templates'" [class.text-slate-500]="view!=='templates'" (click)="showTemplates()">Templates</button><button class="px-4 py-2 text-sm font-medium border-b-2 -mb-px" [class.border-orange-500]="view==='analytics'" [class.text-orange-600]="view==='analytics'" [class.border-transparent]="view!=='analytics'" [class.text-slate-500]="view!=='analytics'" (click)="showAnalytics()">Performance</button><button class="px-4 py-2 text-sm font-medium border-b-2 -mb-px" [class.border-orange-500]="view==='senders'" [class.text-orange-600]="view==='senders'" [class.border-transparent]="view!=='senders'" [class.text-slate-500]="view!=='senders'" (click)="showSenders()">Senders</button><button class="px-4 py-2 text-sm font-medium border-b-2 -mb-px" [class.border-orange-500]="view==='subscriptions'" [class.text-orange-600]="view==='subscriptions'" [class.border-transparent]="view!=='subscriptions'" [class.text-slate-500]="view!=='subscriptions'" (click)="showSubscriptionTypes()">Subscription Topics</button></div>

  <ng-container *ngIf="view==='templates'">
  <div *ngIf="!editing && !sending" class="bg-white border rounded-xl overflow-hidden"><table class="w-full text-sm"><thead class="bg-slate-50"><tr><th class="text-left p-3">Name</th><th>Category</th><th>Status</th><th>Version</th><th></th></tr></thead><tbody><tr *ngFor="let t of templates" class="border-t"><td class="p-3">{{t.name}}</td><td class="text-center">{{t.category||'—'}}</td><td class="text-center">{{t.status}}</td><td class="text-center">v{{t.current_version}}</td><td class="p-3 text-right whitespace-nowrap"><button class="text-slate-600 mr-3 disabled:opacity-40 disabled:cursor-not-allowed" [disabled]="t.status!=='published'" [title]="t.status!=='published' ? 'Publish this template before it can be sent' : 'Send or schedule this template'" (click)="openSend(t)">Send</button><button class="text-violet-600 mr-3" (click)="openTest(t)">Test</button><button class="text-slate-600 mr-3" (click)="openHistory(t)">History</button><button class="text-orange-600" (click)="edit(t)">Edit</button></td></tr><tr *ngIf="!templates.length"><td colspan="5" class="text-center text-slate-400 py-8">No templates yet.</td></tr></tbody></table></div>

  <form *ngIf="editing" (ngSubmit)="save()" class="space-y-4"><div class="bg-white border rounded-xl p-5"><div class="grid md:grid-cols-3 gap-3"><label>Name<input class="block w-full border rounded p-2" [(ngModel)]="editing.name" name="name" required></label><label>Category<input class="block w-full border rounded p-2" [(ngModel)]="editing.category" name="category"></label><label>Status<select class="block w-full border rounded p-2" [(ngModel)]="editing.status" name="status"><option>draft</option><option>published</option><option>archived</option></select></label></div><label class="block mt-3">Subject<input class="block w-full border rounded p-2" [(ngModel)]="editing.subject" name="subject" required></label></div><app-marketing-email-builder [model]="editing"></app-marketing-email-builder><div *ngIf="validationResult" class="bg-white border rounded-xl p-4 text-sm"><div class="font-bold" [class.text-green-700]="validationResult.valid" [class.text-red-700]="!validationResult.valid">{{validationResult.valid ? 'Email passed validation' : 'Email needs attention'}}</div><ul class="list-disc ml-5 mt-2 text-red-600"><li *ngFor="let issue of validationResult.errors">{{issue}}</li></ul><ul class="list-disc ml-5 mt-2 text-amber-700"><li *ngFor="let issue of validationResult.warnings">{{issue}}</li></ul><p class="text-xs text-slate-500 mt-2">{{validationResult.summary.links}} links · {{validationResult.summary.images}} images · {{validationResult.summary.personalizationTokens.length}} personalization fields</p></div><div class="flex justify-end gap-2"><button type="button" class="px-4 py-2 border border-violet-200 text-violet-700 rounded" (click)="validateCurrent()">Validate email</button><button type="button" class="px-4 py-2 border rounded" (click)="editing=null">Cancel</button><button class="px-4 py-2 bg-orange-500 text-white rounded">Save version</button></div></form>

  <form *ngIf="sending" (ngSubmit)="submitSend()" class="bg-white border rounded-xl p-5 space-y-4 max-w-xl">
    <div><h2 class="font-bold text-lg">Send "{{sending.name}}"</h2><p class="text-xs text-slate-500 mt-1">Subject: {{sending.subject || '—'}} · v{{sending.current_version}}</p></div>

    <label class="block">Audience — segment<select class="block w-full border rounded p-2 mt-1" [(ngModel)]="sendForm.segmentId" name="segmentId" required>
      <option [ngValue]="null" disabled>Choose a segment…</option>
      <option *ngFor="let s of segments" [ngValue]="s.id">{{s.name}} ({{s.member_count||0}} members)</option>
    </select></label>
    <p *ngIf="!segments.length" class="text-xs text-amber-600">No segments yet — create one under Segments first, then refresh it so it has members.</p>

    <label class="block">From — sender profile<select class="block w-full border rounded p-2 mt-1" [(ngModel)]="sendForm.senderProfileId" name="senderProfileId">
      <option [ngValue]="null">Default sender</option>
      <option *ngFor="let s of senders" [ngValue]="s.id">{{s.name}} &lt;{{s.from_email}}&gt;</option>
    </select></label>

    <label class="block">Only send to contacts subscribed to<select class="block w-full border rounded p-2 mt-1" [(ngModel)]="sendForm.subscriptionCode" name="subscriptionCode">
      <option value="">Any (just respects consent / do-not-contact)</option>
      <option *ngFor="let t of subscriptionTypes" [value]="t.code">{{t.name}}</option>
    </select></label>
    <p *ngIf="!subscriptionTypes.length" class="text-xs text-slate-400 -mt-2">No subscription topics yet — add one under the Subscription Topics tab to filter sends by topic.</p>

    <div>
      <div class="flex gap-4 text-sm">
        <label class="flex items-center gap-2"><input type="radio" name="mode" value="now" [(ngModel)]="sendForm.mode"> Send now</label>
        <label class="flex items-center gap-2"><input type="radio" name="mode" value="schedule" [(ngModel)]="sendForm.mode"> Schedule for later</label>
      </div>
      <input *ngIf="sendForm.mode==='schedule'" type="datetime-local" class="block border rounded p-2 mt-2" [(ngModel)]="sendForm.scheduledAt" name="scheduledAt" [required]="sendForm.mode==='schedule'">
    </div>

    <p class="text-xs text-slate-500">Recipients are filtered to contacts who have given email consent and are not marked do-not-contact — unsubscribes are respected automatically. A single send is capped at 2000 recipients; larger segments queue the first 2000 and can be re-run to pick up the rest.</p>
    <p *ngIf="sendError" class="text-red-600 text-sm">{{sendError}}</p>

    <div class="flex gap-2">
      <button type="submit" class="px-4 py-2 bg-orange-500 text-white rounded disabled:opacity-50" [disabled]="submitting || !sendForm.segmentId || (sendForm.mode==='schedule' && !sendForm.scheduledAt)">{{submitting ? 'Queuing…' : (sendForm.mode==='schedule' ? 'Schedule send' : 'Send now')}}</button>
      <button type="button" class="px-4 py-2 border rounded" (click)="sending=null">Cancel</button>
    </div>
  </form>
  </ng-container>

  <div *ngIf="testTemplate" class="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"><form (ngSubmit)="submitTest()" class="bg-white rounded-xl p-5 w-full max-w-lg space-y-4"><div class="flex justify-between"><div><h2 class="font-bold text-lg">Send test email</h2><p class="text-xs text-slate-500">{{testTemplate.name}} · v{{testTemplate.current_version}}</p></div><button type="button" (click)="testTemplate=null">×</button></div><label class="block text-sm">Recipient<input type="email" class="block w-full border rounded p-2 mt-1" [(ngModel)]="testForm.recipient" name="testRecipient" required placeholder="you@company.com"></label><label class="block text-sm">Sender<select class="block w-full border rounded p-2 mt-1" [(ngModel)]="testForm.senderProfileId" name="testSender"><option [ngValue]="null">Default sender</option><option *ngFor="let sender of senders" [ngValue]="sender.id">{{sender.name}} &lt;{{sender.from_email}}&gt;</option></select></label><p class="text-xs text-slate-500">Test messages use sample personalization values and are excluded from performance analytics.</p><p *ngIf="testError" class="text-sm text-red-600">{{testError}}</p><div class="flex justify-end gap-2"><button type="button" class="px-4 py-2 border rounded" (click)="testTemplate=null">Cancel</button><button class="px-4 py-2 bg-violet-600 text-white rounded disabled:opacity-50" [disabled]="testing">{{testing ? 'Queuing…' : 'Send test'}}</button></div></form></div>

  <div *ngIf="historyTemplate" class="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"><section class="bg-white rounded-xl p-5 w-full max-w-3xl max-h-[85vh] overflow-auto"><div class="flex justify-between mb-4"><div><h2 class="font-bold text-lg">Version history</h2><p class="text-xs text-slate-500">{{historyTemplate.name}}</p></div><button (click)="historyTemplate=null">×</button></div><div *ngIf="loadingHistory" class="py-8 text-center text-slate-400">Loading history…</div><table *ngIf="!loadingHistory" class="w-full text-sm"><thead class="bg-slate-50"><tr><th class="text-left p-3">Version</th><th class="text-left p-3">Subject</th><th class="text-left p-3">Created</th><th class="p-3">Status</th></tr></thead><tbody><tr *ngFor="let version of versions" class="border-t"><td class="p-3">v{{version.version}}</td><td class="p-3">{{version.subject}}</td><td class="p-3">{{version.created_at | date:'medium'}}</td><td class="p-3 text-center"><span *ngIf="version.is_current" class="px-2 py-1 rounded bg-green-100 text-green-700 text-xs">Current</span></td></tr></tbody></table></section></div>

  <ng-container *ngIf="view==='analytics'">
    <div class="flex items-center justify-between mb-4"><div><h2 class="font-bold text-lg">Email performance analytics</h2><p class="text-xs text-slate-500">Test sends are excluded. Opens and clicks count unique messages.</p></div><button class="px-3 py-2 border rounded text-sm" (click)="loadAnalytics()">Refresh</button></div>
    <div *ngIf="analyticsLoading" class="bg-white border rounded-xl p-10 text-center text-slate-400">Loading analytics…</div>
    <div *ngIf="!analyticsLoading" class="space-y-4"><div class="bg-white border rounded-xl overflow-auto"><table class="w-full text-xs"><thead class="bg-slate-50"><tr><th class="text-left p-3">Template</th><th>Sent</th><th>Delivered</th><th>Opened</th><th>Clicked</th><th>Bounced</th><th>Unsubscribed</th><th>Complaints</th><th>Failed</th><th></th></tr></thead><tbody><tr *ngFor="let row of analytics" class="border-t"><td class="p-3 font-medium">{{row.name}}</td><td class="text-center">{{row.sent}}</td><td class="text-center">{{row.delivered}}</td><td class="text-center">{{row.opened}} <small class="text-slate-400">({{rate(row.opened,row.sent)}}%)</small></td><td class="text-center">{{row.clicked}} <small class="text-slate-400">({{rate(row.clicked,row.sent)}}%)</small></td><td class="text-center">{{row.bounced}}</td><td class="text-center">{{row.unsubscribed}}</td><td class="text-center">{{row.complaints}}</td><td class="text-center">{{row.failed}}</td><td class="p-3"><button class="text-orange-600" (click)="loadCtaAnalytics(row)">CTA details</button></td></tr></tbody></table></div><div *ngIf="selectedAnalytics" class="bg-white border rounded-xl p-4"><h3 class="font-bold">CTA tracking · {{selectedAnalytics.name}}</h3><p *ngIf="!ctaAnalytics.length" class="text-sm text-slate-400 mt-3">No tracked CTA clicks yet.</p><table *ngIf="ctaAnalytics.length" class="w-full text-sm mt-3"><thead><tr><th class="text-left py-2">Destination URL</th><th>Unique clicks</th><th>Total clicks</th></tr></thead><tbody><tr *ngFor="let cta of ctaAnalytics" class="border-t"><td class="py-2 break-all">{{cta.url}}</td><td class="text-center">{{cta.unique_clicks}}</td><td class="text-center">{{cta.clicks}}</td></tr></tbody></table></div></div>
  </ng-container>

  <ng-container *ngIf="view==='senders'">
  <div *ngIf="!senderEditing" class="bg-white border rounded-xl overflow-hidden"><table class="w-full text-sm"><thead class="bg-slate-50"><tr><th class="text-left p-3">Name</th><th class="text-left p-3">From address</th><th class="text-left p-3">Reply-to</th><th class="text-center p-3">Status</th><th class="p-3"></th></tr></thead><tbody>
    <tr *ngFor="let s of senders" class="border-t"><td class="p-3">{{s.name}}</td><td class="p-3">{{s.from_email}}</td><td class="p-3">{{s.reply_to || '—'}}</td><td class="p-3 text-center"><span class="px-2 py-0.5 rounded text-xs" [class.bg-green-100]="s.is_active" [class.text-green-700]="s.is_active" [class.bg-slate-100]="!s.is_active" [class.text-slate-500]="!s.is_active">{{s.is_active ? 'Active' : 'Inactive'}}</span></td><td class="p-3 text-right whitespace-nowrap"><button class="text-slate-600 mr-3" (click)="toggleSenderActive(s)">{{s.is_active ? 'Deactivate' : 'Activate'}}</button><button class="text-orange-600 mr-3" (click)="editSender(s)">Edit</button><button class="text-red-500" (click)="deleteSender(s)">Delete</button></td></tr>
    <tr *ngIf="!senders.length"><td colspan="5" class="text-center text-slate-400 py-8">No sender profiles yet — the Emails Send panel falls back to a default sender until one exists here.</td></tr>
  </tbody></table></div>

  <form *ngIf="senderEditing" (ngSubmit)="saveSender()" class="bg-white border rounded-xl p-5 space-y-4 max-w-xl">
    <h2 class="font-bold text-lg">{{senderEditing.id ? 'Edit sender' : 'New sender'}}</h2>
    <label class="block">Display name<input class="block w-full border rounded p-2 mt-1" [(ngModel)]="senderEditing.name" name="name" required placeholder="e.g. NeoZaar Marketing"></label>
    <label class="block">From email<input type="email" class="block w-full border rounded p-2 mt-1" [(ngModel)]="senderEditing.fromEmail" name="fromEmail" required placeholder="marketing@neozaar.com"></label>
    <label class="block">Reply-to (optional)<input type="email" class="block w-full border rounded p-2 mt-1" [(ngModel)]="senderEditing.replyTo" name="replyTo" placeholder="support@neozaar.com"></label>
    <label class="flex items-center gap-2 text-sm"><input type="checkbox" [(ngModel)]="senderEditing.isActive" name="isActive"> Active — selectable when sending a campaign</label>
    <p class="text-xs text-slate-500">The from-address must be a real mailbox in the M365 tenant the app is allowed to send as — it's not verified here.</p>
    <p *ngIf="senderError" class="text-red-600 text-sm">{{senderError}}</p>
    <div class="flex gap-2">
      <button type="submit" class="px-4 py-2 bg-orange-500 text-white rounded disabled:opacity-50" [disabled]="savingSender">{{savingSender ? 'Saving…' : 'Save sender'}}</button>
      <button type="button" class="px-4 py-2 border rounded" (click)="senderEditing=null">Cancel</button>
    </div>
  </form>
  </ng-container>

  <ng-container *ngIf="view==='subscriptions'">
  <p class="text-xs text-slate-500 mb-3">Topics a contact can subscribe to individually from the preference center. Any topic created here can also be used to filter an email send, on the Templates tab's Send panel.</p>

  <div *ngIf="!subEditing" class="bg-white border rounded-xl overflow-hidden"><table class="w-full text-sm"><thead class="bg-slate-50"><tr><th class="text-left p-3">Code</th><th class="text-left p-3">Name</th><th class="p-3"></th></tr></thead><tbody>
    <tr *ngFor="let s of subscriptionTypes" class="border-t"><td class="p-3 font-mono text-xs">{{s.code}}</td><td class="p-3">{{s.name}}</td><td class="p-3 text-right"><button class="text-orange-600 mr-3" (click)="editSubscriptionType(s)">Edit</button><button class="text-red-500" (click)="deleteSubscriptionType(s)">Delete</button></td></tr>
    <tr *ngIf="!subscriptionTypes.length"><td colspan="3" class="text-center text-slate-400 py-8">No subscription topics yet.</td></tr>
  </tbody></table></div>

  <form *ngIf="subEditing" (ngSubmit)="saveSubscriptionType()" class="bg-white border rounded-xl p-5 space-y-4 max-w-xl">
    <h2 class="font-bold text-lg">{{subEditing.id ? 'Edit topic' : 'New topic'}}</h2>
    <label class="block">Code<input class="block w-full border rounded p-2 mt-1 font-mono text-sm" [(ngModel)]="subEditing.code" name="code" required pattern="^[a-z][a-z0-9_]{0,49}$" placeholder="product_updates" [disabled]="!!subEditing.id"></label>
    <p class="text-xs text-slate-500 -mt-2">Lowercase letters, numbers and underscores, starting with a letter — used in the API and in email links, can't be changed once created.</p>
    <label class="block">Display name<input class="block w-full border rounded p-2 mt-1" [(ngModel)]="subEditing.name" name="name" required placeholder="Product updates"></label>
    <p *ngIf="subError" class="text-red-600 text-sm">{{subError}}</p>
    <div class="flex gap-2">
      <button type="submit" class="px-4 py-2 bg-orange-500 text-white rounded disabled:opacity-50" [disabled]="savingSub">{{savingSub ? 'Saving…' : 'Save topic'}}</button>
      <button type="button" class="px-4 py-2 border rounded" (click)="subEditing=null">Cancel</button>
    </div>
  </form>
  </ng-container>
  </div>`
})
export class MarketingEmailsComponent implements OnInit {
  view: 'templates' | 'analytics' | 'senders' | 'subscriptions' = 'templates';

  templates: any[] = [];
  editing: any = null;
  validationResult: any = null;
  testTemplate: any = null;
  testForm: any = { recipient: '', senderProfileId: null };
  testError = '';
  testing = false;
  historyTemplate: any = null;
  versions: any[] = [];
  loadingHistory = false;
  analytics: any[] = [];
  analyticsLoading = false;
  selectedAnalytics: any = null;
  ctaAnalytics: any[] = [];

  sending: any = null;
  segments: any[] = [];
  senders: any[] = [];
  sendForm: any = { segmentId: null, senderProfileId: null, subscriptionCode: '', mode: 'now', scheduledAt: '' };
  sendError = '';
  submitting = false;

  senderEditing: any = null;
  senderError = '';
  savingSender = false;

  subscriptionTypes: any[] = [];
  subEditing: any = null;
  subError = '';
  savingSub = false;

  constructor(private svc: MarketingService, private toast: ToasterService) {}

  ngOnInit() { this.load(); }
  load() { this.svc.getEmailTemplates().subscribe((r: any) => this.templates = r?.data || []); }

  showTemplates() { this.view = 'templates'; this.senderEditing = null; this.subEditing = null; }
  showAnalytics() { this.view = 'analytics'; this.editing = null; this.sending = null; this.loadAnalytics(); }
  showSenders() { this.view = 'senders'; this.editing = null; this.sending = null; this.subEditing = null; this.loadSenders(); }
  loadSenders() { this.svc.getSenderProfiles().subscribe((r: any) => this.senders = r?.data || []); }

  showSubscriptionTypes() { this.view = 'subscriptions'; this.editing = null; this.sending = null; this.senderEditing = null; this.loadSubscriptionTypes(); }
  loadSubscriptionTypes() { this.svc.getSubscriptionTypes().subscribe((r: any) => this.subscriptionTypes = r?.data || []); }

  newTemplate() { this.sending = null; this.validationResult = null; this.editing = { name: '', category: '', status: 'draft', subject: '', html: '', text: '' }; }
  edit(t: any) { this.sending = null; this.validationResult = null; this.editing = { ...t, subject: t.subject || '', html: t.html_content || '', text: t.text_content || '' }; }
  save() {
    const request = this.editing.id ? this.svc.updateEmailTemplate(this.editing.id, this.editing) : this.svc.createEmailTemplate(this.editing);
    request.subscribe({
      next: () => { this.toast.setToaster('success', 'Saved', 'Email template version saved.'); this.editing = null; this.load(); },
      error: (e) => this.toast.setToaster('error', 'Save failed', e?.error?.message || 'Unable to save template.'),
    });
  }

  validateCurrent() {
    this.svc.validateEmailTemplate({ subject: this.editing.subject || '', html: this.editing.html || '', text: this.editing.text || '' }).subscribe({
      next: (response: any) => this.validationResult = response.data,
      error: (error) => this.toast.setToaster('error', 'Validation failed', error?.error?.message || 'Unable to validate this email.'),
    });
  }

  openTest(template: any) {
    this.testTemplate = template; this.testForm = { recipient: '', senderProfileId: null }; this.testError = '';
    if (!this.senders.length) this.loadSenders();
  }
  submitTest() {
    if (!this.testTemplate || !this.testForm.recipient) return;
    this.testing = true; this.testError = '';
    this.svc.sendTestEmail(this.testTemplate.id, this.testForm).subscribe({
      next: () => { this.testing = false; this.testTemplate = null; this.toast.setToaster('success', 'Test queued', 'The test email has been queued for delivery.'); },
      error: (error) => { this.testing = false; this.testError = error?.error?.message || 'Unable to queue the test email.'; },
    });
  }
  openHistory(template: any) {
    this.historyTemplate = template; this.versions = []; this.loadingHistory = true;
    this.svc.getEmailTemplateVersions(template.id).subscribe({ next: (response: any) => { this.loadingHistory = false; this.versions = response.data || []; }, error: () => { this.loadingHistory = false; } });
  }
  loadAnalytics() {
    this.analyticsLoading = true;
    this.svc.getEmailAnalytics().subscribe({ next: (response: any) => { this.analyticsLoading = false; this.analytics = response?.data?.metrics || []; }, error: () => { this.analyticsLoading = false; this.toast.setToaster('error', 'Analytics unavailable', 'Email performance could not be loaded.'); } });
  }
  loadCtaAnalytics(row: any) {
    this.selectedAnalytics = row; this.ctaAnalytics = [];
    this.svc.getEmailAnalytics(row.template_id).subscribe({ next: (response: any) => this.ctaAnalytics = response?.data?.ctas || [] });
  }
  rate(value: any, total: any): string { return Number(total) ? (100 * Number(value || 0) / Number(total)).toFixed(1) : '0.0'; }

  // A template can only be sent once it's published — the backend rejects a
  // send whose current version isn't in 'published' status. The Send button
  // is already disabled for anything else, but openSend double-checks so a
  // stale row (edited in another tab) can't slip through.
  openSend(t: any) {
    if (t.status !== 'published') {
      this.toast.setToaster('error', 'Not published', 'Publish this template (Edit → Status → published) before sending it.');
      return;
    }
    this.editing = null;
    this.sending = t;
    this.sendForm = { segmentId: null, senderProfileId: null, subscriptionCode: '', mode: 'now', scheduledAt: '' };
    this.sendError = '';
    if (!this.segments.length) this.svc.getSegments().subscribe((r: any) => this.segments = r?.data || []);
    if (!this.senders.length) this.svc.getSenderProfiles().subscribe({ next: (r: any) => this.senders = r?.data || [], error: () => {} });
    if (!this.subscriptionTypes.length) this.svc.getSubscriptionTypes().subscribe({ next: (r: any) => this.subscriptionTypes = r?.data || [], error: () => {} });
  }

  submitSend() {
    if (!this.sendForm.segmentId) return;
    this.submitting = true;
    this.sendError = '';
    const payload: any = {
      templateId: this.sending.id,
      segmentId: this.sendForm.segmentId,
      senderProfileId: this.sendForm.senderProfileId || null,
      subscriptionCode: this.sendForm.subscriptionCode || null,
      sendType: this.sendForm.mode === 'schedule' ? 'scheduled' : 'campaign',
      scheduledAt: this.sendForm.mode === 'schedule' && this.sendForm.scheduledAt ? new Date(this.sendForm.scheduledAt).toISOString() : null,
    };
    this.svc.queueEmail(payload).subscribe({
      next: (r: any) => {
        this.submitting = false;
        const queued = r?.data?.queued ?? 0;
        const capped = r?.data?.capped;
        const when = this.sendForm.mode === 'schedule' ? `scheduled for ${new Date(this.sendForm.scheduledAt).toLocaleString()}` : 'queued to send now';
        this.toast.setToaster('success', 'Send queued', `${queued} email${queued === 1 ? '' : 's'} ${when}.${capped ? ' Segment is larger than the 2000-recipient cap — re-run to pick up the rest.' : ''}`);
        this.sending = null;
      },
      error: (e) => { this.submitting = false; this.sendError = e?.error?.message || 'Unable to queue this send.'; },
    });
  }

  newSender() { this.senderEditing = { name: '', fromEmail: '', replyTo: '', isActive: true }; this.senderError = ''; }
  editSender(s: any) { this.senderEditing = { id: s.id, name: s.name, fromEmail: s.from_email, replyTo: s.reply_to || '', isActive: s.is_active }; this.senderError = ''; }

  saveSender() {
    if (!this.senderEditing?.name || !this.senderEditing?.fromEmail) return;
    this.savingSender = true;
    this.senderError = '';
    const payload = { name: this.senderEditing.name, fromEmail: this.senderEditing.fromEmail, replyTo: this.senderEditing.replyTo || null, isActive: this.senderEditing.isActive !== false };
    const request = this.senderEditing.id ? this.svc.updateSenderProfile(this.senderEditing.id, payload) : this.svc.createSenderProfile(payload);
    request.subscribe({
      next: () => {
        this.savingSender = false;
        this.toast.setToaster('success', 'Saved', 'Sender profile saved.');
        this.senderEditing = null;
        this.loadSenders(); // same `senders` array backs the Send panel's dropdown, so it stays in sync too
      },
      error: (e) => { this.savingSender = false; this.senderError = e?.error?.message || 'Unable to save this sender profile.'; },
    });
  }

  // Flip active/inactive without opening the form — PUT overwrites the whole
  // row, so the rest of the current values are resent unchanged.
  toggleSenderActive(s: any) {
    this.svc.updateSenderProfile(s.id, { name: s.name, fromEmail: s.from_email, replyTo: s.reply_to || null, isActive: !s.is_active }).subscribe({
      next: () => this.loadSenders(),
      error: (e) => this.toast.setToaster('error', 'Update failed', e?.error?.message || 'Unable to update this sender profile.'),
    });
  }

  deleteSender(s: any) {
    if (!confirm(`Delete sender "${s.name}"? Past sent emails keep their history either way.`)) return;
    this.svc.deleteSenderProfile(s.id).subscribe({
      next: () => this.loadSenders(),
      error: (e) => this.toast.setToaster('error', 'Delete failed', e?.error?.message || 'Unable to delete this sender profile.'),
    });
  }

  newSubscriptionType() { this.subEditing = { code: '', name: '' }; this.subError = ''; }
  editSubscriptionType(s: any) { this.subEditing = { id: s.id, code: s.code, name: s.name }; this.subError = ''; }

  saveSubscriptionType() {
    if (!this.subEditing?.name || !this.subEditing?.code) return;
    this.savingSub = true;
    this.subError = '';
    // code is immutable once created — the backend's update endpoint only
    // accepts `name`, so only send code on create.
    const request = this.subEditing.id
      ? this.svc.updateSubscriptionType(this.subEditing.id, { name: this.subEditing.name })
      : this.svc.createSubscriptionType({ code: this.subEditing.code, name: this.subEditing.name });
    request.subscribe({
      next: () => {
        this.savingSub = false;
        this.toast.setToaster('success', 'Saved', 'Subscription topic saved.');
        this.subEditing = null;
        this.loadSubscriptionTypes();
      },
      error: (e) => { this.savingSub = false; this.subError = e?.error?.message || 'Unable to save this topic — codes must be unique.'; },
    });
  }

  deleteSubscriptionType(s: any) {
    if (!confirm(`Delete topic "${s.name}"? This also removes everyone's subscription record for this topic.`)) return;
    this.svc.deleteSubscriptionType(s.id).subscribe({
      next: () => this.loadSubscriptionTypes(),
      error: (e) => this.toast.setToaster('error', 'Delete failed', e?.error?.message || 'Unable to delete this topic.'),
    });
  }
}
