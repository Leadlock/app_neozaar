import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { CampaignService, CampaignBlock } from '../campaign.service';
import { CampaignListingPickerComponent, PickedListing } from '../campaign-listing-picker/campaign-listing-picker.component';
import { ProductService } from '../../product/product-service.service';
import { ToasterService } from '../../../shared/providers/toaster/toaster.service';
import { MarketingService } from '../../marketing/marketing.service';

// The block shape used while composing — CampaignBlock plus display-only name/screenshots
// the picker (or, in edit mode, a fresh fetch per listing) provides, purely so the admin
// can recognize which listing a block is in this list — never sent to the backend. The
// backend only ever stores listingId/actionType/image, and always re-reads the live
// listing at preview/push time rather than trusting a snapshot. `uploading` is local
// UI state for the image upload button, also never sent.
interface ComposerBlock extends CampaignBlock {
  name: string;
  screenshots: string[];
  uploading?: boolean;
}

@Component({
  selector: 'app-campaign-create',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, DragDropModule, CampaignListingPickerComponent],
  templateUrl: './campaign-create.component.html',
})
export class CampaignCreateComponent implements OnInit {
  campaignId: number | null = null;
  isEditMode = false;

  // Zoho Campaigns flags any image over 1 MB in the content warnings — enforce it here so
  // the draft is clean before it's ever pushed. Applies to both the header banner and
  // each listing block image.
  readonly MAX_IMAGE_BYTES = 1024 * 1024;

  title = '';
  description = '';
  // Optional campaign banner — shown below title/description, above the listings, same
  // style as the single-listing gallery image. targetUrl only applies when an image is set.
  headerImage = '';
  headerLink = '';
  headerImageUploading = false;
  blocks: ComposerBlock[] = [];
  status: 'draft' | 'pushed' = 'draft';
  zohoCampaignPushedAt: string | null = null;
  segments:any[]=[]; emailTemplates:any[]=[]; automations:any[]=[];
  segmentId:number|null=null; emailTemplateId:number|null=null; automationId:number|null=null;
  scheduledAt=''; goalEvent='';

  isPickerOpen = false;
  isLoading = false;
  isSaving = false;
  isPreviewing = false;
  isPushing = false;

  campaignNameForPush = '';
  subjectForPush = '';

  // "For which list?" push modal — the answer is mandatory, gets stored on the
  // campaign, and is emailed to tech-support@neozaar.com for tracking.
  isPushModalOpen = false;
  pushListLabel = '';

  // "Send as Email" modal — renders the saved campaign and emails it straight to the
  // given addresses with a custom subject, bypassing Zoho.
  isEmailModalOpen = false;
  emailSubject = '';
  emailRecipients = '';
  isSendingEmail = false;

  constructor(
    private campaignService: CampaignService,
    private productService: ProductService,
    private toasterService: ToasterService,
    private router: Router,
    private route: ActivatedRoute,
    private marketingService: MarketingService
  ) {}

  ngOnInit(): void {
    this.marketingService.getSegments().subscribe((r:any)=>this.segments=r?.data||[]);
    this.marketingService.getEmailTemplates().subscribe((r:any)=>this.emailTemplates=(r?.data||[]).filter((x:any)=>x.status==='published'));
    this.marketingService.getAutomations().subscribe((r:any)=>this.automations=(r?.data||[]).filter((x:any)=>x.status==='active'));
    const idParam = this.route.snapshot.paramMap.get('id');
    if (this.router.url.includes('/edit') && idParam) {
      this.isEditMode = true;
      this.campaignId = Number(idParam);
      this.loadCampaign(this.campaignId);
    }
  }

  get excludeIds(): number[] {
    return this.blocks.map((b) => b.listingId);
  }

  openPicker(): void {
    this.isPickerOpen = true;
  }

  onPickerClosed(picked: PickedListing[] | null): void {
    this.isPickerOpen = false;
    if (!picked) return;
    picked.forEach((item) => {
      this.blocks.push({
        listingId: item.id,
        actionType: item.action_type,
        // Empty until uploaded — see onImageSelected. Renders the "upload a square
        // photo" placeholder until then.
        image: '',
        name: item.name,
        screenshots: item.screenshots || [],
      });
    });
  }

  removeBlock(index: number): void {
    this.blocks.splice(index, 1);
  }

  drop(event: CdkDragDrop<ComposerBlock[]>): void {
    moveItemInArray(this.blocks, event.previousIndex, event.currentIndex);
  }

  onImageSelected(block: ComposerBlock, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = ''; // allow re-selecting the same file later (change event won't fire on an unchanged value otherwise)
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.toasterService.setToaster('error', 'Error', 'Please select an image file.');
      return;
    }
    if (file.size > this.MAX_IMAGE_BYTES) {
      this.toasterService.setToaster('error', 'Error', 'Image must be 1 MB or smaller — Zoho flags anything larger.');
      return;
    }

    block.uploading = true;
    this.campaignService.uploadImage(file).subscribe({
      next: (res: any) => {
        block.uploading = false;
        if (res.status !== 'success') {
          this.toasterService.setToaster('error', 'Error', res.message || 'Failed to upload image');
          return;
        }
        block.image = res.data.url;
      },
      error: (err) => {
        block.uploading = false;
        console.error('uploadImage error:', err);
        this.toasterService.setToaster('error', 'Error', 'Failed to upload image. Please try again.');
      }
    });
  }

  removeImage(block: ComposerBlock): void {
    block.image = '';
  }

  loadCampaign(id: number): void {
    this.isLoading = true;
    this.campaignService.getCampaignById(id).subscribe({
      next: (res: any) => {
        if (res.status !== 'success') {
          this.isLoading = false;
          this.toasterService.setToaster('error', 'Error', res.message || 'Failed to load campaign');
          return;
        }
        const campaign = res.data;
        this.title = campaign.title;
        this.description = campaign.description || '';
        this.headerImage = campaign.header_image || '';
        this.headerLink = campaign.header_link || '';
        this.status = campaign.status;
        this.zohoCampaignPushedAt = campaign.zoho_campaign_pushed_at;
        this.segmentId=campaign.segment_id||null;this.emailTemplateId=campaign.email_template_id||null;this.automationId=campaign.automation_id||null;
        this.scheduledAt=campaign.scheduled_at?new Date(campaign.scheduled_at).toISOString().slice(0,16):'';this.goalEvent=campaign.goal_event||'';
        this.campaignNameForPush = `Neozaar ${campaign.title}`;
        this.subjectForPush = campaign.title;

        const savedBlocks: CampaignBlock[] = campaign.blocks || [];
        if (!savedBlocks.length) {
          this.blocks = [];
          this.isLoading = false;
          return;
        }

        // The saved record only has listingId/config — name/screenshots for display
        // need a fresh fetch per listing. catalog/product/:id works for any action_type
        // (service/solution rows included — the backend's own routing already treats
        // "product" as the generic type param regardless of the row's actual type).
        forkJoin(
          savedBlocks.map((block) =>
            this.productService.getProductById(block.listingId).pipe(catchError(() => of(null)))
          )
        ).subscribe((results) => {
          this.blocks = savedBlocks.map((block, i) => {
            const listing = results[i]?.data;
            return {
              ...block,
              name: listing?.name || `Listing #${block.listingId}`,
              screenshots: listing?.screenshots || [],
            };
          });
          this.isLoading = false;
        });
      },
      error: (err) => {
        this.isLoading = false;
        console.error('loadCampaign error:', err);
        this.toasterService.setToaster('error', 'Error', 'Failed to load campaign. Please try again.');
      }
    });
  }

  private buildPayload() {
    return {
      title: this.title.trim(),
      description: this.description.trim() || undefined,
      headerImage: this.headerImage || undefined,
      // Only send the link when there's an image for it to belong to — the backend
      // drops it anyway, this just keeps the payload honest.
      headerLink: (this.headerImage && this.headerLink.trim()) || undefined,
      blocks: this.blocks.map((b) => ({
        listingId: b.listingId,
        actionType: b.actionType,
        image: b.image,
      })),
      segmentId:this.segmentId,emailTemplateId:this.emailTemplateId,automationId:this.automationId,
      scheduledAt:this.scheduledAt?new Date(this.scheduledAt).toISOString():null,goalEvent:this.goalEvent||null,
    };
  }

  onHeaderImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = ''; // allow re-selecting the same file later
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.toasterService.setToaster('error', 'Error', 'Please select an image file.');
      return;
    }
    if (file.size > this.MAX_IMAGE_BYTES) {
      this.toasterService.setToaster('error', 'Error', 'Image must be 1 MB or smaller — Zoho flags anything larger.');
      return;
    }

    this.headerImageUploading = true;
    this.campaignService.uploadImage(file).subscribe({
      next: (res: any) => {
        this.headerImageUploading = false;
        if (res.status !== 'success') {
          this.toasterService.setToaster('error', 'Error', res.message || 'Failed to upload image');
          return;
        }
        this.headerImage = res.data.url;
      },
      error: (err) => {
        this.headerImageUploading = false;
        console.error('header image upload error:', err);
        this.toasterService.setToaster('error', 'Error', 'Failed to upload image. Please try again.');
      }
    });
  }

  removeHeaderImage(): void {
    this.headerImage = '';
    this.headerLink = '';
  }

  save(): void {
    if (!this.title.trim()) {
      this.toasterService.setToaster('error', 'Error', 'Title is required');
      return;
    }
    if (!this.blocks.length) {
      this.toasterService.setToaster('error', 'Error', 'Add at least one listing before saving');
      return;
    }

    this.isSaving = true;
    const payload = this.buildPayload();
    const request$ = this.isEditMode && this.campaignId
      ? this.campaignService.updateCampaign(this.campaignId, payload)
      : this.campaignService.createCampaign(payload);

    request$.subscribe({
      next: (res: any) => {
        this.isSaving = false;
        if (res.status !== 'success') {
          this.toasterService.setToaster('error', 'Error', res.message || 'Failed to save campaign');
          return;
        }
        this.toasterService.setToaster('success', 'Saved', 'Campaign saved.');
        if (!this.isEditMode) {
          // Land in edit mode on the new record so Preview/Push (which need a saved id)
          // become available immediately, without a separate "now go find it" step.
          this.campaignNameForPush = `Neozaar ${res.data.title}`;
          this.subjectForPush = res.data.title;
          this.router.navigate(['/campaigns/edit', res.data.id]);
        }
      },
      error: (err) => {
        this.isSaving = false;
        console.error('save campaign error:', err);
        this.toasterService.setToaster('error', 'Error', 'Failed to save campaign. Please try again.');
      }
    });
  }

  preview(): void {
    if (!this.campaignId) {
      this.toasterService.setToaster('error', 'Save first', 'Save the campaign before previewing it.');
      return;
    }
    this.isPreviewing = true;
    this.campaignService.previewCampaign(this.campaignId).subscribe({
      next: (html: string) => {
        this.isPreviewing = false;
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
      },
      error: (err) => {
        this.isPreviewing = false;
        console.error('preview error:', err);
        this.toasterService.setToaster('error', 'Error', 'Failed to render preview.');
      }
    });
  }

  // Opens the "For which list?" modal — the mandatory answer is collected there and
  // the actual push happens in confirmPush().
  pushToZoho(): void {
    if (!this.campaignId) {
      this.toasterService.setToaster('error', 'Save first', 'Save the campaign before pushing it to Zoho.');
      return;
    }
    if (!this.campaignNameForPush.trim() || !this.subjectForPush.trim()) {
      this.toasterService.setToaster('error', 'Error', 'Campaign name and subject are required to push.');
      return;
    }
    this.pushListLabel = '';
    this.isPushModalOpen = true;
  }

  closePushModal(): void {
    if (this.isPushing) return;
    this.isPushModalOpen = false;
    this.pushListLabel = '';
  }

  confirmPush(): void {
    if (!this.campaignId || this.isPushing) return;
    if (!this.pushListLabel.trim()) {
      this.toasterService.setToaster('error', 'Error', 'Please answer "For which list?" before sending.');
      return;
    }

    const alreadyPushed = this.status === 'pushed';

    this.isPushing = true;
    this.campaignService.pushCampaign(this.campaignId, {
      campaignName: this.campaignNameForPush.trim(),
      subject: this.subjectForPush.trim(),
      whichList: this.pushListLabel.trim(),
      force: alreadyPushed,
    }).subscribe({
      next: (res: any) => {
        this.isPushing = false;
        if (res.status !== 'success') {
          this.toasterService.setToaster('error', 'Error', res.message || 'Failed to push to Zoho');
          return;
        }
        this.isPushModalOpen = false;
        this.pushListLabel = '';
        const stillAlready = res.data?.alreadyPushed;
        this.toasterService.setToaster(
          'success',
          stillAlready ? 'Already pushed' : 'Pushed to Zoho',
          stillAlready ? 'No new draft created — try again if you meant to push again.' : 'Draft created in Zoho Campaigns.'
        );
        this.status = 'pushed';
      },
      error: (err) => {
        this.isPushing = false;
        console.error('push campaign error:', err);
        this.toasterService.setToaster('error', 'Error', 'Failed to push to Zoho. Please try again.');
      }
    });
  }

  // ── "Send as Email" ────────────────────────────────────────────────────────
  openEmailModal(): void {
    if (!this.campaignId) {
      this.toasterService.setToaster('error', 'Save first', 'Save the campaign before sending it as an email.');
      return;
    }
    this.emailSubject = (this.subjectForPush || this.title || '').trim();
    this.emailRecipients = '';
    this.isEmailModalOpen = true;
  }

  closeEmailModal(): void {
    if (this.isSendingEmail) return;
    this.isEmailModalOpen = false;
  }

  private parseEmailRecipients(): string[] {
    return Array.from(new Set(
      this.emailRecipients
        .split(/[\s,;]+/)
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
    ));
  }

  confirmSendEmail(): void {
    if (!this.campaignId || this.isSendingEmail) return;

    const subject = this.emailSubject.trim();
    const recipients = this.parseEmailRecipients();
    if (!subject) {
      this.toasterService.setToaster('error', 'Error', 'Subject is required.');
      return;
    }
    if (!recipients.length) {
      this.toasterService.setToaster('error', 'Error', 'Add at least one recipient email.');
      return;
    }
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalid = recipients.filter((e) => !emailRe.test(e));
    if (invalid.length) {
      this.toasterService.setToaster('error', 'Error', `Invalid email address(es): ${invalid.join(', ')}`);
      return;
    }

    this.isSendingEmail = true;
    this.campaignService.sendCampaignEmail(this.campaignId, { subject, recipients }).subscribe({
      next: (res: any) => {
        this.isSendingEmail = false;
        if (res.status !== 'success') {
          this.toasterService.setToaster('error', 'Error', res.message || 'Failed to send email');
          return;
        }
        this.isEmailModalOpen = false;
        this.emailRecipients = '';
        this.toasterService.setToaster('success', 'Sent', res.message || 'Campaign emailed.');
      },
      error: (err) => {
        this.isSendingEmail = false;
        console.error('send campaign email error:', err);
        this.toasterService.setToaster('error', 'Error', err?.error?.message || 'Failed to send email. Please try again.');
      }
    });
  }
}
