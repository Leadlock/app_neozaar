import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MarketingService } from '../marketing.service';
import { ToasterService } from '../../../shared/providers/toaster/toaster.service';

type FormField = {
  name: string;
  label: string;
  type: 'text'|'email'|'phone'|'textarea'|'select'|'checkbox'|'hidden';
  required?: boolean;
  options?: string[];
};

@Component({
  selector: 'app-marketing-forms',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
  <div class="p-6 max-w-6xl mx-auto">
    <div class="flex justify-between mb-6">
      <div><h1 class="text-2xl font-bold">Marketing Forms</h1><p class="text-sm text-slate-500">Published submissions use Marketing identity stitching and event ingestion.</p></div>
      <button class="px-4 py-2 bg-orange-500 text-white rounded-lg" (click)="create()">+ Form</button>
    </div>

    <div *ngIf="!editing" class="bg-white border rounded-xl">
      <div *ngFor="let f of forms" class="p-4 border-b flex justify-between">
        <div><b>{{f.name}}</b><div class="text-xs text-slate-500">/{{f.slug}} · {{f.form_type}} · v{{f.current_version}} · {{f.status}}</div></div>
        <button class="text-orange-600" (click)="edit(f)">Edit</button>
      </div>
    </div>

    <form *ngIf="editing" (ngSubmit)="save()" class="space-y-4">
      <section class="bg-white border rounded-xl p-5">
        <div class="grid md:grid-cols-3 gap-3">
          <label>Name<input class="block w-full border rounded p-2" [(ngModel)]="editing.name" name="name" required></label>
          <label>Slug<input class="block w-full border rounded p-2" [(ngModel)]="editing.slug" name="slug" required></label>
          <label>Type<select class="block w-full border rounded p-2" [(ngModel)]="editing.formType" name="formType"><option *ngFor="let t of types">{{t}}</option></select></label>
        </div>
        <label class="block mt-3">Status<select class="block border rounded p-2" [(ngModel)]="editing.status" name="status"><option>draft</option><option>published</option><option>archived</option></select></label>
      </section>

      <section class="bg-white border rounded-xl p-5">
        <div class="flex items-start justify-between gap-4 mb-4">
          <div><h2 class="font-bold text-lg">Form fields</h2><p class="text-xs text-slate-500 mt-1">Add common contact fields, then configure which ones are required.</p></div>
          <button type="button" class="px-3 py-2 border border-orange-200 text-orange-700 rounded-lg text-sm" (click)="addCustomField()">+ Custom field</button>
        </div>

        <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 mb-5">
          <button *ngFor="let preset of commonFields" type="button" (click)="addPreset(preset)" [disabled]="hasField(preset.name)"
            class="flex items-center gap-3 text-left border rounded-lg p-3 disabled:opacity-45 disabled:bg-slate-50 hover:border-orange-300">
            <span class="w-8 h-8 rounded-full bg-orange-50 text-orange-600 grid place-items-center"><i [class]="preset.icon"></i></span>
            <span><b class="block text-sm">{{preset.label}}</b><small class="text-slate-400">{{hasField(preset.name) ? 'Added' : 'Add field'}}</small></span>
          </button>
        </div>

        <div class="space-y-3" *ngIf="editing.fields.length; else noFields">
          <div *ngFor="let field of editing.fields; let i=index" class="grid md:grid-cols-[36px_1fr_1fr_150px_auto] gap-3 items-end border rounded-lg p-3 bg-slate-50">
            <div class="flex md:flex-col gap-1 self-center">
              <button type="button" title="Move up" [disabled]="i===0" (click)="moveField(i,-1)" class="text-slate-500 disabled:opacity-20">↑</button>
              <button type="button" title="Move down" [disabled]="i===editing.fields.length-1" (click)="moveField(i,1)" class="text-slate-500 disabled:opacity-20">↓</button>
            </div>
            <label class="text-xs text-slate-600">Label<input class="block w-full border rounded p-2 mt-1 bg-white" [(ngModel)]="field.label" [name]="'fieldLabel'+i" required></label>
            <label class="text-xs text-slate-600">Field key<input class="block w-full border rounded p-2 mt-1 bg-white font-mono text-xs" [(ngModel)]="field.name" [name]="'fieldName'+i" required pattern="^[a-z][a-z0-9_]{0,49}$"></label>
            <label class="text-xs text-slate-600">Input type<select class="block w-full border rounded p-2 mt-1 bg-white" [(ngModel)]="field.type" [name]="'fieldType'+i"><option *ngFor="let t of fieldTypes" [value]="t">{{t}}</option></select></label>
            <div class="flex items-center gap-3 pb-2 whitespace-nowrap"><label class="flex items-center gap-1 text-xs"><input type="checkbox" [(ngModel)]="field.required" [name]="'fieldRequired'+i"> Required</label><button type="button" class="text-red-500" title="Remove field" (click)="removeField(i)">×</button></div>
          </div>
        </div>
        <ng-template #noFields><div class="border border-dashed rounded-lg py-8 text-center text-sm text-slate-400">Choose a common field above or add a custom field.</div></ng-template>
      </section>

      <section class="bg-white border rounded-xl p-5 space-y-4">
        <label class="flex gap-2"><input type="checkbox" [(ngModel)]="editing.consentRequired" name="consent"> Require consent</label>
        <label>Success message<input class="block w-full border rounded p-2" [(ngModel)]="editing.successMessage" name="success"></label>
        <label>Redirect URL<input class="block w-full border rounded p-2" [(ngModel)]="editing.redirectUrl" name="redirect"></label>
      </section>

      <p *ngIf="error" class="text-red-600 text-sm">{{error}}</p>
      <div class="flex gap-2 justify-end"><button class="px-4 py-2 bg-orange-500 text-white rounded">Save version</button><button type="button" class="px-4 py-2 border rounded" (click)="editing=null">Cancel</button></div>
    </form>
  </div>`,
})
export class MarketingFormsComponent implements OnInit {
  forms: any[] = [];
  editing: any = null;
  error = '';
  types = ['contact','demo','trial','assessment','newsletter','custom'];
  fieldTypes: FormField['type'][] = ['text','email','phone','textarea','select','checkbox','hidden'];
  commonFields = [
    { name: 'first_name', label: 'First Name', type: 'text', required: true, icon: 'ri-user-line' },
    { name: 'last_name', label: 'Last Name', type: 'text', required: true, icon: 'ri-user-line' },
    { name: 'business_email', label: 'Business Email', type: 'email', required: true, icon: 'ri-building-line' },
    { name: 'email', label: 'Email', type: 'email', required: true, icon: 'ri-mail-line' },
    { name: 'job_title', label: 'Job Title', type: 'text', required: false, icon: 'ri-briefcase-line' },
    { name: 'industry', label: 'Industry', type: 'text', required: false, icon: 'ri-building-4-line' },
  ];

  constructor(private svc: MarketingService, private toast: ToasterService) {}

  ngOnInit() { this.load(); }
  load() { this.svc.getForms().subscribe((response: any) => this.forms = response?.data || []); }

  create() {
    this.error = '';
    this.editing = { name: '', slug: '', formType: 'contact', status: 'draft', fields: [], consentRequired: true, successMessage: 'Thank you', redirectUrl: '' };
  }

  edit(form: any) {
    this.error = '';
    this.editing = {
      ...form,
      formType: form.form_type,
      fields: JSON.parse(JSON.stringify(form.field_schema || [])),
      consentRequired: Boolean(form.consent_config?.required),
      successMessage: form.success_message || '',
      redirectUrl: form.redirect_url || '',
    };
  }

  hasField(name: string): boolean { return Boolean(this.editing?.fields?.some((field: FormField) => field.name === name)); }

  addPreset(preset: any) {
    if (this.hasField(preset.name)) return;
    this.editing.fields.push({ name: preset.name, label: preset.label, type: preset.type, required: preset.required });
  }

  addCustomField() {
    let suffix = this.editing.fields.length + 1;
    while (this.hasField(`custom_field_${suffix}`)) suffix++;
    this.editing.fields.push({ name: `custom_field_${suffix}`, label: 'Custom field', type: 'text', required: false });
  }

  removeField(index: number) { this.editing.fields.splice(index, 1); }

  moveField(index: number, direction: number) {
    const target = index + direction;
    if (target < 0 || target >= this.editing.fields.length) return;
    const [field] = this.editing.fields.splice(index, 1);
    this.editing.fields.splice(target, 0, field);
  }

  save() {
    this.error = '';
    const names = this.editing.fields.map((field: FormField) => field.name);
    if (new Set(names).size !== names.length) { this.error = 'Every field key must be unique.'; return; }
    if (this.editing.fields.some((field: FormField) => !/^[a-z][a-z0-9_]{0,49}$/.test(field.name))) { this.error = 'Field keys must use lowercase letters, numbers, and underscores.'; return; }
    const payload = { ...this.editing, fields: this.editing.fields, consent: { required: this.editing.consentRequired } };
    const request = this.editing.id ? this.svc.updateForm(this.editing.id, payload) : this.svc.createForm(payload);
    request.subscribe({
      next: () => { this.toast.setToaster('success', 'Saved', 'Marketing form version saved.'); this.editing = null; this.load(); },
      error: (response) => this.error = response?.error?.message || 'Unable to save form.',
    });
  }
}
