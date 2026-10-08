import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { environment } from '../../../../environments/environment';
import { MarketingService } from '../marketing.service';
import { ToasterService } from '../../../shared/providers/toaster/toaster.service';

@Component({
  selector: 'app-marketing-content',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule],
  templateUrl: './marketing-content.component.html',
  styleUrl: './marketing-content.component.scss',
})
export class MarketingContentComponent implements OnInit {
  tab: 'pages'|'assets' = 'pages';
  pages: any[] = [];
  assets: any[] = [];
  segments: any[] = [];
  forms: any[] = [];
  page: any = null;
  asset: any = null;
  previewDevice: 'desktop'|'tablet'|'mobile' = 'desktop';
  readonly lifecycleStages = ['visitor', 'subscriber', 'lead', 'mql', 'sql', 'customer'];

  constructor(private svc: MarketingService, private toast: ToasterService) {}
  ngOnInit(): void { this.load(); }

  load(): void {
    this.svc.getLandingPages().subscribe((response: any) => this.pages = response.data || []);
    this.svc.getAssets().subscribe((response: any) => this.assets = response.data || []);
    this.svc.getSegments().subscribe((response: any) => this.segments = response.data || []);
    this.svc.getForms().subscribe((response: any) => this.forms = (response.data || []).filter((form: any) => form.status === 'published'));
  }

  newAsset(): void { this.asset = { name: '', description: '', category: '', assetType: 'document', fileUrl: '', isPublished: false }; }
  editAsset(asset: any): void { this.asset = { id: asset.id, name: asset.name, description: asset.description, category: asset.category, assetType: asset.asset_type, fileUrl: asset.file_url, isPublished: asset.is_published }; }
  saveAsset(): void { this.svc.saveAsset(this.asset, this.asset.id).subscribe({ next: () => { this.asset = null; this.load(); }, error: error => this.toast.setToaster('error', 'Save failed', error.error?.message || 'Could not save asset') }); }
  removeAsset(asset: any): void { if (confirm(`Delete ${asset.name}?`)) this.svc.deleteAsset(asset.id).subscribe(() => this.load()); }

  newPage(): void { this.previewDevice = 'desktop'; this.page = { name: '', slug: '', title: '', status: 'draft', seo: { description: '' }, blocks: [] }; }
  editPage(page: any): void { this.previewDevice = 'desktop'; this.page = JSON.parse(JSON.stringify({ ...page, formId: page.form_id })); this.page.blocks = (this.page.blocks || []).map((block: any) => ({ ...block, id: block.id || this.uid() })); }
  addBlock(type: string): void {
    const defaults: any = {
      hero: { type, heading: 'Your headline', text: 'Explain the value of your offer.', buttonLabel: 'Learn more', buttonUrl: '' },
      text: { type, heading: 'Section title', html: 'Add your content.' }, image: { type, url: '', alt: '' },
      asset: { type, assetId: null, label: 'Download now' }, form: { type, formSlug: this.forms[0]?.slug || '' },
      cta: { type, heading: 'Ready to get started?', text: 'Take the next step today.', buttonLabel: 'Get started', buttonUrl: '' },
    };
    this.page.blocks.push({ id: this.uid(), ...defaults[type] });
  }

  dropBlock(event: CdkDragDrop<any[]>): void { moveItemInArray(this.page.blocks, event.previousIndex, event.currentIndex); }
  trackBlock(_: number, block: any): string { return block.id; }
  formName(slug: string): string { return this.forms.find(form => form.slug === slug)?.name || slug || 'Form'; }

  addExperience(block: any): void {
    block.personalization ||= { variants: [] };
    block.personalization.variants.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, name: `Experience ${block.personalization.variants.length + 1}`, condition: { type: 'segment', segmentId: null, lifecycleStage: null }, content: this.copyContent(block) });
  }
  removeExperience(block: any, index: number): void { block.personalization.variants.splice(index, 1); if (!block.personalization.variants.length) delete block.personalization; }
  experienceConditionChanged(experience: any): void { experience.condition.segmentId = null; experience.condition.lifecycleStage = experience.condition.type === 'lifecycle' ? 'lead' : null; }
  conditionLabel(experience: any): string {
    const condition = experience.condition || {};
    if (condition.type === 'anonymous') return 'Anonymous visitor';
    if (condition.type === 'known') return 'Known contact';
    if (condition.type === 'lifecycle') return `Lifecycle: ${condition.lifecycleStage || 'not selected'}`;
    return `Segment: ${this.segments.find(segment => Number(segment.id) === Number(condition.segmentId))?.name || 'not selected'}`;
  }
  private copyContent(block: any): any {
    const fields: Record<string, string[]> = { hero: ['heading', 'text', 'buttonLabel', 'buttonUrl'], text: ['heading', 'html'], image: ['url', 'alt'], asset: ['assetId', 'label'], form: ['formSlug'], cta: ['heading', 'text', 'buttonLabel', 'buttonUrl'] };
    return Object.fromEntries((fields[block.type] || []).map(key => [key, block[key] ?? '']));
  }

  savePage(): void {
    const invalid = this.page.blocks.flatMap((block: any) => block.personalization?.variants || []).find((experience: any) => experience.condition?.type === 'segment' && !experience.condition.segmentId);
    if (invalid) { this.toast.setToaster('error', 'Condition required', 'Select a segment for every segment-based experience.'); return; }
    const missingForm = this.page.blocks.find((block: any) => block.type === 'form' && !block.formSlug)
      || this.page.blocks.flatMap((block: any) => block.personalization?.variants || []).find((experience: any) => experience.content && 'formSlug' in experience.content && !experience.content.formSlug);
    if (missingForm) { this.toast.setToaster('error', 'Form required', 'Select a published form for every Form block and personalized Form experience.'); return; }
    this.svc.saveLandingPage(this.page, this.page.id).subscribe({ next: () => { this.page = null; this.load(); }, error: error => this.toast.setToaster('error', 'Save failed', error.error?.message || 'Could not save page') });
  }
  removePage(page: any): void { if (confirm(`Delete ${page.name}?`)) this.svc.deleteLandingPage(page.id).subscribe(() => this.load()); }
  publicUrl(page: any): string { return `${environment.apiUrl}marketing/content/pages/public/${page.slug}`; }
  private uid(): string { return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; }
}
