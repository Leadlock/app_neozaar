import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Campaign, CampaignService } from '../../campaigns/campaign.service';
import { MarketingService } from '../marketing.service';
import { ToasterService } from '../../../shared/providers/toaster/toaster.service';

type StudioBlock = {
  id: string; type: 'heading'|'text'|'image'|'button'|'divider'|'spacer'|'html';
  content?: string; align?: 'left'|'center'|'right'; url?: string; link?: string;
  alt?: string; label?: string; background?: string; height?: number; uploading?: boolean;
};

type TemplateRecommendation = {
  templateId: number;
  reason: string;
  confidence: number;
};

@Component({
  selector: 'app-campaign-studio',
  standalone: true,
  imports: [CommonModule, FormsModule, DragDropModule],
  templateUrl: './campaign-studio.component.html',
  styleUrl: './campaign-studio.component.scss',
  styles: [`
    .source-choice{display:grid;gap:8px;margin-bottom:14px}.source-choice>button{display:flex;align-items:center;gap:10px;width:100%;padding:11px;text-align:left;border:1px solid #dfe3e8;border-radius:9px;background:#fff;color:#475467;cursor:pointer}.source-choice>button.active{border-color:#fb923c;background:#fff7ed;color:#9a3412}.source-choice>button:disabled{opacity:.45;cursor:not-allowed}.source-choice i{font-size:20px}.source-choice span,.source-choice b,.source-choice small{display:block}.source-choice small{margin-top:2px;color:#98a2b3;font-weight:400}.template-select select{display:block;width:100%;box-sizing:border-box;border:1px solid #dfe3e8;border-radius:8px;padding:10px;margin-top:6px;background:#fff}.audience-add{display:flex;align-items:center;gap:10px;width:100%;padding:12px;text-align:left;border:1px dashed #f97316;border-radius:9px;background:#fff7ed;color:#9a3412;cursor:pointer}.audience-add>i:first-child{font-size:20px}.audience-add>i:last-child{margin-left:auto;font-size:18px}.audience-add span,.audience-add b,.audience-add small{display:block}.audience-add small{margin-top:2px;color:#98a2b3;font-weight:400}.audience-panel{padding:12px;border:1px solid #fed7aa;border-radius:9px;background:#fffaf5}.audience-panel select{display:block;width:100%;box-sizing:border-box;border:1px solid #dfe3e8;border-radius:8px;padding:10px;margin-top:6px;background:#fff}.audience-meta{display:flex;gap:7px;align-items:center;font-size:12px;color:#667085;margin:-3px 0 10px}.audience-meta i{color:#f97316}.audience-empty{font-size:12px;line-height:1.45;color:#b45309}.audience-remove{border:0;background:transparent;padding:2px 0;color:#d92d20;font-size:12px;cursor:pointer}.template-summary{max-width:680px;margin:auto;background:#fff;border:1px solid #d1fadf;border-radius:12px;padding:24px;display:flex;gap:14px;color:#344054}.template-summary>i{font-size:26px;color:#12b76a}.template-summary b,.template-summary span{display:block}.template-summary span{font-size:12px;color:#667085;margin-top:3px}.template-summary p{font-size:13px;line-height:1.55;color:#667085;margin:16px 0 0}
  `, `
    .ai-recommend{display:flex;align-items:center;gap:10px;width:100%;padding:11px;margin-top:8px;text-align:left;border:1px solid #c4b5fd;border-radius:9px;background:#f5f3ff;color:#5b21b6;cursor:pointer}.ai-recommend:disabled{opacity:.55;cursor:not-allowed}.ai-recommend>i{font-size:20px}.ai-recommend span,.ai-recommend b,.ai-recommend small{display:block}.ai-recommend small{margin-top:2px;color:#7c6da8;font-weight:400}.spin{animation:studio-spin .8s linear infinite}.ai-results{margin-top:10px;padding:10px;border:1px solid #ddd6fe;border-radius:10px;background:#fafaff}.ai-results-title{display:flex;align-items:center;justify-content:space-between;margin:0 2px 8px;font-size:11px;font-weight:800;color:#6d28d9;text-transform:uppercase;letter-spacing:.04em}.ai-results-title small{font-size:10px;color:#98a2b3;font-weight:600;text-transform:none;letter-spacing:0}.ai-result{display:grid;grid-template-columns:22px 1fr auto;gap:8px;align-items:start;width:100%;padding:10px 8px;border:1px solid transparent;border-top-color:#ede9fe;background:transparent;color:#344054;text-align:left;cursor:pointer}.ai-result:first-of-type{border-top-color:transparent}.ai-result:hover,.ai-result.selected{border-color:#c4b5fd;border-radius:8px;background:#fff}.ai-result.selected>i{color:#7c3aed}.ai-rank{display:grid;place-items:center;width:20px;height:20px;border-radius:50%;background:#ede9fe;color:#6d28d9;font-size:10px;font-weight:800}.ai-result-copy,.ai-result-copy b,.ai-result-copy small,.ai-result-copy em{display:block}.ai-result-copy small{margin-top:3px;color:#667085;font-size:11px;line-height:1.35}.ai-result-copy em{margin-top:5px;color:#7c3aed;font-size:10px;font-style:normal;font-weight:700}.ai-disclaimer{margin:8px 2px 0;color:#7a8496;font-size:10px;line-height:1.4}@keyframes studio-spin{to{transform:rotate(360deg)}}
  `],
})
export class CampaignStudioComponent implements OnInit {
  campaigns: Campaign[] = [];
  editing = false;
  campaignId: number | null = null;
  title = '';
  subject = '';
  preheader = '';
  editorMode: 'visual'|'html' = 'visual';
  htmlContent = '';
  blocks: StudioBlock[] = [];
  templates: any[] = [];
  segments: any[] = [];
  contentSource: 'template'|'custom' = 'template';
  selectedTemplateId: number | null = null;
  selectedSegmentId: number | null = null;
  audienceOpen = false;
  preview: SafeHtml = '';
  isLoading = false;
  isSaving = false;
  isPreviewing = false;
  isPreviewModalOpen = false;
  isTestEmailModalOpen = false;
  testEmailSubject = '';
  testEmailRecipients = '';
  isSendingTestEmail = false;
  isRecommendingTemplates = false;
  templateRecommendations: TemplateRecommendation[] = [];

  readonly blockChoices = [
    ['heading', 'ri-heading', 'Heading'], ['text', 'ri-text', 'Text'],
    ['image', 'ri-image-line', 'Image'], ['button', 'ri-cursor-line', 'Button'],
    ['divider', 'ri-separator', 'Divider'], ['spacer', 'ri-space', 'Spacer'],
    ['html', 'ri-code-s-slash-line', 'HTML block'],
  ];

  constructor(
    private campaignsService: CampaignService,
    private marketingService: MarketingService,
    private toaster: ToasterService,
    private sanitizer: DomSanitizer,
  ) {}

  ngOnInit(): void {
    this.load();
    this.marketingService.getEmailTemplates().subscribe({
      next: (response: any) => {
        this.templates = (response?.data || []).filter((template: any) => template.status === 'published');
        if (!this.campaignId && !this.templates.length) this.contentSource = 'custom';
        if (this.editing && this.contentSource === 'template') this.applySelectedTemplate(false);
      },
      error: () => this.toaster.setToaster('error', 'Templates unavailable', 'Existing email templates could not be loaded.'),
    });
    this.marketingService.getSegments().subscribe({
      next: (response: any) => this.segments = response?.data || [],
      error: () => this.toaster.setToaster('error', 'Segments unavailable', 'Marketing audiences could not be loaded.'),
    });
  }

  load(): void {
    this.isLoading = true;
    this.campaignsService.getCampaigns().subscribe({
      next: (response: any) => {
        this.campaigns = (response?.data || []).filter((item: Campaign) => item.campaign_type === 'studio');
        this.isLoading = false;
      },
      error: () => { this.isLoading = false; this.toaster.setToaster('error', 'Unable to load', 'Campaign Studio could not be loaded.'); }
    });
  }

  newCampaign(): void {
    this.campaignId = null; this.title = ''; this.subject = ''; this.preheader = '';
    this.editorMode = 'visual'; this.htmlContent = ''; this.blocks = [];
    this.contentSource = this.templates.length ? 'template' : 'custom';
    this.selectedTemplateId = null;
    this.selectedSegmentId = null;
    this.audienceOpen = false;
    this.templateRecommendations = [];
    this.preview = ''; this.editing = true;
  }

  edit(campaign: Campaign): void {
    if (!campaign.id) return;
    this.campaignsService.getCampaignById(campaign.id).subscribe((response: any) => {
      const value = response.data;
      this.campaignId = value.id; this.title = value.title || ''; this.subject = value.subject || value.title || '';
      this.preheader = value.preheader || ''; this.htmlContent = value.html_content || '';
      this.selectedTemplateId = value.email_template_id || null;
      this.selectedSegmentId = value.segment_id || null;
      this.audienceOpen = Boolean(this.selectedSegmentId);
      this.contentSource = this.selectedTemplateId ? 'template' : 'custom';
      this.templateRecommendations = [];
      this.editorMode = this.htmlContent ? 'html' : 'visual';
      this.blocks = (value.content_blocks || []).map((block: StudioBlock) => ({ ...block, id: block.id || this.uid() }));
      this.preview = ''; this.editing = true; this.updateLivePreview();
    });
  }

  addBlock(type: string): void {
    const defaults: Record<string, Partial<StudioBlock>> = {
      heading: { content: 'A clear campaign headline', align: 'left' },
      text: { content: '<p>Tell your audience why this message matters.</p>', align: 'left' },
      image: { url: '', link: '', alt: '', align: 'center' },
      button: { label: 'Learn more', url: 'https://', background: '#ea580c', align: 'center' },
      divider: {}, spacer: { height: 24 },
      html: { content: '<div style="padding:16px;background:#f8fafc">Custom email HTML</div>' },
    };
    this.blocks.push({ id: this.uid(), type: type as StudioBlock['type'], ...defaults[type] });
    this.updateLivePreview();
  }

  remove(index: number): void { this.blocks.splice(index, 1); this.updateLivePreview(); }
  duplicate(index: number): void { this.blocks.splice(index + 1, 0, { ...this.blocks[index], id: this.uid() }); this.updateLivePreview(); }
  drop(event: CdkDragDrop<StudioBlock[]>): void { moveItemInArray(this.blocks, event.previousIndex, event.currentIndex); this.updateLivePreview(); }

  upload(block: StudioBlock, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0]; input.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/') || file.size > 1024 * 1024) {
      this.toaster.setToaster('error', 'Invalid image', 'Choose an image no larger than 1 MB.'); return;
    }
    block.uploading = true;
    this.campaignsService.uploadImage(file).subscribe({
      next: (response: any) => { block.url = response?.data?.url || ''; block.uploading = false; this.updateLivePreview(); },
      error: () => { block.uploading = false; this.toaster.setToaster('error', 'Upload failed', 'The image could not be uploaded.'); }
    });
  }

  save(): void {
    if (!this.title.trim() || !this.subject.trim()) {
      this.toaster.setToaster('error', 'Required fields', 'Campaign name and email subject are required.'); return;
    }
    if (this.contentSource === 'template' && !this.selectedTemplateId) {
      this.toaster.setToaster('error', 'Select a template', 'Choose an existing published template or use campaign-specific content.'); return;
    }
    if (this.contentSource === 'custom' && this.editorMode === 'visual' && !this.blocks.length) {
      this.toaster.setToaster('error', 'Add content', 'Add at least one content block.'); return;
    }
    if (this.contentSource === 'custom' && this.editorMode === 'html' && !this.htmlContent.trim()) {
      this.toaster.setToaster('error', 'Add HTML', 'Paste or write the campaign HTML.'); return;
    }
    const payload: any = {
      title: this.title.trim(), subject: this.subject.trim(), preheader: this.preheader.trim(),
      campaignType: 'studio', blocks: [],
      segmentId: this.selectedSegmentId,
      emailTemplateId: this.contentSource === 'template' ? this.selectedTemplateId : null,
      contentBlocks: this.contentSource === 'custom' && this.editorMode === 'visual' ? this.blocks.map(({uploading, ...block}) => block) : [],
      htmlContent: this.contentSource === 'custom' && this.editorMode === 'html' ? this.htmlContent : null,
    };
    this.isSaving = true;
    const request = this.campaignId
      ? this.campaignsService.updateCampaign(this.campaignId, payload)
      : this.campaignsService.createCampaign(payload);
    request.subscribe({
      next: (response: any) => {
        this.isSaving = false; this.campaignId = response.data.id;
        this.toaster.setToaster('success', 'Saved', 'Campaign saved in Campaign Studio.'); this.load();
      },
      error: (error) => { this.isSaving = false; this.toaster.setToaster('error', 'Save failed', error?.error?.message || 'The campaign could not be saved.'); }
    });
  }

  previewCampaign(): void {
    if (!this.campaignId) { this.updateLivePreview(); return; }
    this.isPreviewing = true;
    this.campaignsService.previewCampaign(this.campaignId).subscribe({
      next: html => { this.preview = this.sanitizer.bypassSecurityTrustHtml(html); this.isPreviewing = false; },
      error: () => { this.isPreviewing = false; this.toaster.setToaster('error', 'Preview failed', 'The preview could not be rendered.'); }
    });
  }

  openPreviewModal(): void {
    if (!this.campaignId) {
      this.updateLivePreview();
      if (!this.preview) {
        this.toaster.setToaster('error', 'Nothing to preview', 'Add campaign content first.');
        return;
      }
      this.isPreviewModalOpen = true;
      return;
    }
    this.isPreviewing = true;
    this.campaignsService.previewCampaign(this.campaignId).subscribe({
      next: html => {
        this.preview = this.sanitizer.bypassSecurityTrustHtml(html);
        this.isPreviewing = false;
        this.isPreviewModalOpen = true;
      },
      error: () => {
        this.isPreviewing = false;
        this.toaster.setToaster('error', 'Preview failed', 'The preview could not be rendered.');
      }
    });
  }

  closePreviewModal(): void { this.isPreviewModalOpen = false; }

  openTestEmailModal(): void {
    if (!this.campaignId) {
      this.toaster.setToaster('error', 'Save first', 'Save the campaign before sending a test email.');
      return;
    }
    this.testEmailSubject = (this.subject || this.title || '').trim();
    this.testEmailRecipients = '';
    this.isTestEmailModalOpen = true;
  }

  closeTestEmailModal(): void {
    if (this.isSendingTestEmail) return;
    this.isTestEmailModalOpen = false;
  }

  private parseTestRecipients(): string[] {
    return Array.from(new Set(
      this.testEmailRecipients.split(/[\s,;]+/).map(value => value.trim().toLowerCase()).filter(Boolean)
    ));
  }

  sendTestEmail(): void {
    if (!this.campaignId || this.isSendingTestEmail) return;
    const subject = this.testEmailSubject.trim();
    const recipients = this.parseTestRecipients();
    if (!subject) {
      this.toaster.setToaster('error', 'Subject required', 'Enter a subject for the test email.');
      return;
    }
    if (!recipients.length) {
      this.toaster.setToaster('error', 'Recipient required', 'Add at least one test recipient.');
      return;
    }
    const invalid = recipients.filter(email => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
    if (invalid.length) {
      this.toaster.setToaster('error', 'Invalid email', `Check: ${invalid.join(', ')}`);
      return;
    }
    if (recipients.length > 25) {
      this.toaster.setToaster('error', 'Too many recipients', 'A test send supports up to 25 recipients.');
      return;
    }

    this.isSendingTestEmail = true;
    this.campaignsService.sendCampaignEmail(this.campaignId, { subject, recipients }).subscribe({
      next: (response: any) => {
        this.isSendingTestEmail = false;
        this.isTestEmailModalOpen = false;
        this.testEmailRecipients = '';
        this.toaster.setToaster('success', 'Test email sent', response?.message || 'The saved campaign was sent successfully.');
      },
      error: (error) => {
        this.isSendingTestEmail = false;
        this.toaster.setToaster('error', 'Test send failed', error?.error?.message || 'The test email could not be sent.');
      },
    });
  }

  setEditorMode(mode: 'visual'|'html'): void {
    this.editorMode = mode;
    this.updateLivePreview();
  }

  setContentSource(source: 'template'|'custom'): void {
    this.contentSource = source;
    if (source === 'template') {
      if (!this.selectedTemplateId && this.templates.length === 1) this.selectedTemplateId = this.templates[0].id;
      this.applySelectedTemplate(false);
    } else {
      this.updateLivePreview();
    }
  }

  applySelectedTemplate(fillSubject = true): void {
    const template = this.selectedTemplate;
    if (!template) {
      this.preview = '';
      return;
    }
    if (fillSubject && !this.subject.trim()) this.subject = template.subject || '';
    this.preview = template.html_content
      ? this.sanitizer.bypassSecurityTrustHtml(template.html_content)
      : '';
  }

  recommendTemplates(): void {
    if (this.isRecommendingTemplates || !this.templates.length) return;
    if (!this.title.trim() && !this.subject.trim() && !this.preheader.trim() && !this.selectedSegmentId) {
      this.toaster.setToaster('error', 'Add campaign context', 'Enter a campaign name, subject, preheader, or audience before asking AI.');
      return;
    }

    this.isRecommendingTemplates = true;
    this.templateRecommendations = [];
    this.campaignsService.getTemplateRecommendations({
      title: this.title.trim(),
      subject: this.subject.trim(),
      preheader: this.preheader.trim(),
      segmentId: this.selectedSegmentId,
    }).subscribe({
      next: (response: any) => {
        this.isRecommendingTemplates = false;
        this.templateRecommendations = response?.data || [];
      },
      error: (error) => {
        this.isRecommendingTemplates = false;
        this.toaster.setToaster('error', 'Recommendations unavailable', error?.error?.message || 'AI template recommendations could not be generated.');
      },
    });
  }

  useRecommendedTemplate(recommendation: TemplateRecommendation): void {
    if (!this.templates.some(template => Number(template.id) === Number(recommendation.templateId))) return;
    this.contentSource = 'template';
    this.selectedTemplateId = recommendation.templateId;
    this.applySelectedTemplate();
  }

  recommendationTemplate(recommendation: TemplateRecommendation): any | null {
    return this.templates.find(template => Number(template.id) === Number(recommendation.templateId)) || null;
  }

  recommendationConfidence(recommendation: TemplateRecommendation): number {
    return Math.round(Math.max(0, Math.min(1, Number(recommendation.confidence) || 0)) * 100);
  }

  get selectedTemplate(): any | null {
    return this.templates.find(template => Number(template.id) === Number(this.selectedTemplateId)) || null;
  }

  templateName(id?: number | null): string {
    return this.templates.find(template => Number(template.id) === Number(id))?.name || 'Existing template';
  }

  get selectedSegment(): any | null {
    return this.segments.find(segment => Number(segment.id) === Number(this.selectedSegmentId)) || null;
  }

  openAudience(): void {
    this.audienceOpen = true;
  }

  removeAudience(): void {
    this.selectedSegmentId = null;
    this.audienceOpen = false;
  }

  updateLivePreview(): void {
    if (this.contentSource === 'template') {
      this.applySelectedTemplate(false);
      return;
    }
    const document = this.editorMode === 'html'
      ? this.htmlContent
      : this.renderVisualPreview();
    this.preview = document.trim()
      ? this.sanitizer.bypassSecurityTrustHtml(document)
      : '';
  }

  private renderVisualPreview(): string {
    const escape = (value: any) => String(value ?? '').replace(/[&<>"']/g, character => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    }[character] || character));
    const rows = this.blocks.map(block => {
      const align = block.align || 'left';
      if (block.type === 'heading') return `<tr><td style="padding:18px 32px 8px;text-align:${align}"><h1 style="margin:0;font:700 28px Arial;color:#111827">${escape(block.content)}</h1></td></tr>`;
      if (block.type === 'text') return `<tr><td style="padding:10px 32px;text-align:${align};font:15px/1.65 Arial;color:#374151">${block.content || ''}</td></tr>`;
      if (block.type === 'image') return `<tr><td style="padding:14px 32px;text-align:${align}">${block.url ? `<img src="${escape(block.url)}" alt="${escape(block.alt)}" style="max-width:100%;height:auto;border-radius:8px">` : '<div style="padding:45px;background:#f3f4f6;color:#9ca3af">Image placeholder</div>'}</td></tr>`;
      if (block.type === 'button') return `<tr><td style="padding:16px 32px;text-align:${align}"><a href="${escape(block.url)}" style="display:inline-block;padding:12px 24px;border-radius:6px;background:${escape(block.background || '#ea580c')};color:#fff;font:700 14px Arial;text-decoration:none">${escape(block.label)}</a></td></tr>`;
      if (block.type === 'divider') return '<tr><td style="padding:14px 32px"><hr style="border:0;border-top:1px solid #e5e7eb"></td></tr>';
      if (block.type === 'spacer') return `<tr><td height="${block.height || 24}">&nbsp;</td></tr>`;
      if (block.type === 'html') return `<tr><td>${block.content || ''}</td></tr>`;
      return '';
    }).join('');
    return `<!doctype html><html><body style="margin:0;background:#f3f4f6"><table role="presentation" width="100%"><tr><td align="center" style="padding:24px"><table role="presentation" width="100%" style="max-width:680px;background:#fff;border-collapse:collapse">${rows}</table></td></tr></table></body></html>`;
  }

  delete(campaign: Campaign): void {
    if (!campaign.id || !confirm(`Delete "${campaign.title}"?`)) return;
    this.campaignsService.deleteCampaign(campaign.id).subscribe(() => this.load());
  }

  back(): void { this.editing = false; this.preview = ''; this.load(); }
  trackBlock(_: number, block: StudioBlock): string { return block.id; }
  private uid(): string { return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; }
}
