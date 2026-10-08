import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AwsMarketplaceService, AwsSpecificConfig, AwsDimension, ProductEditableField } from '../aws-marketplace.service';
import { AWS_MARKETPLACE_CATEGORIES, MAX_AWS_CATEGORIES, AwsCategoryGroup } from '../aws-marketplace.categories';

interface TimelineStep {
  label: string;
  status: 'done' | 'active' | 'pending' | 'failed';
  timestamp?: string;
}

@Component({
  selector: 'app-aws-marketplace-review',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './aws-marketplace-review.component.html',
  styleUrls: ['./aws-marketplace-review.component.css']
})
export class AwsMarketplaceReviewComponent implements OnInit {
  requestId!: number;
  request: any = null;
  isFetching = false;
  isSubmitting = false;

  // Reject modal
  showRejectModal = false;
  rejectionReason = '';

  // Confirm submit modal
  showSubmitConfirm = false;
  submitError: { message: string; missingFields?: string[] } | null = null;
  submitSuccess = false;

  // Poll
  isPolling = false;

  // AWS Config form
  awsConfig: AwsSpecificConfig = {};
  isSavingConfig = false;
  configSaved = false;
  configError: string | null = null;

  // Logo upload
  isUploadingLogo = false;
  logoUploadError: string | null = null;
  showManualLogoUrl = false;

  // Update Listing (re-push to an already-published listing)
  editMode = false;
  isUpdatingListing = false;
  updateListingError: string | null = null;

  // AWS category picker
  showCategoryModal = false;
  categorySearch = '';
  // Inline editing of NeoZaar product fields (privacy URL, descriptions...)
  editingField: ProductEditableField | null = null;
  editValue = '';
  isSavingField = false;
  fieldError: string | null = null;

  /** Product data can be fixed until the request is in flight at Microsoft. */
  get canEditProductFields(): boolean {
    return !!this.request && !['SUBMITTED', 'VALIDATING', 'REJECTED'].includes(this.request.status);
  }

  startEditField(field: ProductEditableField): void {
    this.editingField = field;
    this.editValue = this.request?.[field] || '';
    this.fieldError = null;
  }

  cancelEditField(): void {
    this.editingField = null;
    this.fieldError = null;
  }

  saveField(): void {
    if (!this.editingField) return;
    this.isSavingField = true;
    this.fieldError = null;
    this.svc.updateProductFields(this.requestId, { [this.editingField]: this.editValue }).subscribe({
      next: () => {
        this.isSavingField = false;
        this.editingField = null;
        this.load();
      },
      error: (err: any) => {
        this.isSavingField = false;
        this.fieldError = err?.error?.message || 'Failed to save.';
      }
    });
  }

  readonly maxCategories = MAX_AWS_CATEGORIES;
  readonly allCategoryGroups: AwsCategoryGroup[] = AWS_MARKETPLACE_CATEGORIES;

  readonly productTypes = ['SaaSProduct', 'ProfessionalServicesProduct']; // v1: SaaS + professional services

  /** True when the underlying NeoZaar catalog item is a service (listed as a service only). */
  get isServiceListing(): boolean {
    return this.request?.aws_payload?.listingKind === 'service';
  }
  readonly eulaTypes = ['StandardEula', 'CustomEula'];
  readonly pricingModels: Array<'usage' | 'contract'> = ['usage', 'contract'];

  timeline: TimelineStep[] = [];

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private svc = inject(AwsMarketplaceService);

  constructor() {}

  ngOnInit(): void {
    this.requestId = Number(this.route.snapshot.paramMap.get('id'));
    this.load();
  }

  load(): void {
    this.isFetching = true;
    this.svc.getRequestById(this.requestId).subscribe({
      next: (res: any) => {
        this.request = res.data;
        this.buildTimeline();
        this.populateConfigForm();
        this.isFetching = false;
      },
      error: () => { this.isFetching = false; }
    });
  }

  /** Populate the AWS config form from the stored payload so edits are non-destructive */
  populateConfigForm(): void {
    const aws = this.request?.aws_payload?.awsSpecific || {};
    this.awsConfig = {
      productType:        aws.productType        || (this.isServiceListing ? 'ProfessionalServicesProduct' : 'SaaSProduct'),
      logoUrl:            aws.logoUrl            || '',
      fulfillmentUrl:     aws.fulfillmentUrl     || '',
      supportDescription: aws.supportDescription || '',
      categories:         aws.categories         || [],
      highlights:         aws.highlights         || [],
      searchKeywords:     aws.searchKeywords     || [],
      dimensions:         (aws.dimensions && aws.dimensions.length ? aws.dimensions : []) as AwsDimension[],
      pricingModel:       aws.pricingModel       || 'usage',
      currencyCode:       aws.currencyCode       || 'USD',
      rateCards:          aws.rateCards          || [],
      freeTrial:          aws.freeTrial ?? false,
      eulaType:           aws.eulaType           || 'StandardEula',
      eulaUrl:            aws.eulaUrl            || '',
      refundPolicy:       aws.refundPolicy       || 'NA',
    };
  }

  // --- comma-separated <-> array helpers for the form ---
  get categoriesText(): string { return (this.awsConfig.categories || []).join(', '); }
  set categoriesText(v: string) { this.awsConfig.categories = this.splitList(v); }

  get highlightsText(): string { return (this.awsConfig.highlights || []).join('\n'); }
  set highlightsText(v: string) { this.awsConfig.highlights = this.splitLines(v).slice(0, 3); }

  get keywordsText(): string { return (this.awsConfig.searchKeywords || []).join(', '); }
  set keywordsText(v: string) { this.awsConfig.searchKeywords = this.splitList(v); }

  private splitList(v: string): string[] {
    return (v || '').split(',').map(s => s.trim()).filter(Boolean);
  }
  private splitLines(v: string): string[] {
    return (v || '').split('\n').map(s => s.trim()).filter(Boolean);
  }

  // --- AWS category picker ---
  get selectedCategories(): string[] {
    return this.awsConfig.categories || [];
  }

  openCategoryModal(): void {
    if (!this.canEditConfig()) return;
    this.categorySearch = '';
    this.showCategoryModal = true;
  }
  closeCategoryModal(): void { this.showCategoryModal = false; }

  isCategorySelected(name: string): boolean {
    return this.selectedCategories.includes(name);
  }

  toggleCategory(name: string): void {
    const cur = [...this.selectedCategories];
    const i = cur.indexOf(name);
    if (i >= 0) {
      cur.splice(i, 1);
    } else if (cur.length < this.maxCategories) {
      cur.push(name);
    }
    this.awsConfig.categories = cur;
  }

  removeCategory(name: string): void {
    this.awsConfig.categories = this.selectedCategories.filter(c => c !== name);
  }

  /** Groups filtered by the search box (keeps groups that have any match). */
  get filteredCategoryGroups(): AwsCategoryGroup[] {
    const q = this.categorySearch.trim().toLowerCase();
    if (!q) return this.allCategoryGroups;
    return this.allCategoryGroups
      .map(g => ({ group: g.group, items: g.items.filter(i => i.toLowerCase().includes(q)) }))
      .filter(g => g.items.length > 0);
  }

  // --- dimensions editor ---
  addDimension(): void {
    if (!this.awsConfig.dimensions) this.awsConfig.dimensions = [];
    this.awsConfig.dimensions.push({ name: '', description: '', key: '', unit: 'Units', types: ['ExternallyMetered'] });
  }
  removeDimension(i: number): void {
    this.awsConfig.dimensions?.splice(i, 1);
  }

  onLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files && input.files[0];
    if (!file) return;

    this.logoUploadError = null;
    if (!/^image\/(png|jpe?g|webp|gif)$/.test(file.type)) {
      this.logoUploadError = 'Please choose a PNG, JPG, WebP or GIF image.';
      input.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.logoUploadError = 'Image must be 5 MB or smaller.';
      input.value = '';
      return;
    }

    this.isUploadingLogo = true;
    this.svc.uploadLogo(this.requestId, file).subscribe({
      next: (res: any) => {
        this.isUploadingLogo = false;
        this.awsConfig.logoUrl = res?.data?.logoUrl || this.awsConfig.logoUrl;
        this.load(); // refresh payload + warnings
      },
      error: (err: any) => {
        this.isUploadingLogo = false;
        this.logoUploadError = err?.error?.message || 'Logo upload failed.';
      },
      complete: () => { input.value = ''; },
    });
  }

  saveConfig(): void {
    this.isSavingConfig = true;
    this.configSaved = false;
    this.configError = null;
    this.svc.saveConfig(this.requestId, this.awsConfig).subscribe({
      next: () => {
        this.isSavingConfig = false;
        this.configSaved = true;
        this.load();
        setTimeout(() => this.configSaved = false, 3000);
      },
      error: (err: any) => {
        this.isSavingConfig = false;
        this.configError = err?.error?.message || 'Failed to save configuration.';
      }
    });
  }

  canEditConfig(): boolean {
    const st = this.request?.status;
    if (['SUBMITTED', 'VALIDATING'].includes(st)) return false;
    if (st === 'PUBLISHED') return this.editMode;
    return true;
  }

  startEditListing(): void {
    this.editMode = true;
    this.updateListingError = null;
  }

  submitListingUpdate(): void {
    if (this.isUpdatingListing) return;
    this.isUpdatingListing = true;
    this.updateListingError = null;
    this.svc.updateListing(this.requestId).subscribe({
      next: () => {
        this.isUpdatingListing = false;
        this.editMode = false;
        this.load();
      },
      error: (err: any) => {
        this.isUpdatingListing = false;
        this.updateListingError = err?.error?.message
          || (err?.error?.missingFields?.length ? 'Missing: ' + err.error.missingFields.join(', ') : 'Listing update failed.');
      }
    });
  }

  buildTimeline(): void {
    if (!this.request) return;
    const r = this.request;
    const statusOrder = ['PENDING_REVIEW', 'APPROVED', 'SUBMITTED', 'VALIDATING', 'PUBLISHED'];
    const currentIdx = statusOrder.indexOf(r.status);
    const isFailed = r.status === 'FAILED';
    const isRejected = r.status === 'REJECTED';

    const steps: TimelineStep[] = [
      { label: 'Request Submitted',      status: 'pending', timestamp: r.created_at },
      { label: 'Admin Review',           status: 'pending', timestamp: r.reviewed_by_user_id ? r.updated_at : undefined },
      { label: 'Submitted to AWS',       status: 'pending', timestamp: r.submitted_at || undefined },
      { label: 'Change Set Applying',    status: 'pending', timestamp: r.validated_at || undefined },
      { label: 'Published',              status: 'pending', timestamp: r.published_at || undefined },
    ];

    if (isRejected) {
      steps[1].status = 'failed';
      steps[1].label = 'Rejected by Admin';
    } else if (isFailed) {
      const failedAt = currentIdx;
      steps.forEach((s, i) => {
        if (i < failedAt) s.status = 'done';
        else if (i === failedAt) s.status = 'failed';
      });
    } else {
      steps.forEach((s, i) => {
        if (i < currentIdx) s.status = 'done';
        else if (i === currentIdx) s.status = 'active';
      });
    }

    this.timeline = steps;
  }

  // --- Reject flow ---
  openRejectModal(): void { this.showRejectModal = true; this.rejectionReason = ''; }
  closeRejectModal(): void { this.showRejectModal = false; }

  confirmReject(): void {
    this.isSubmitting = true;
    this.svc.rejectRequest(this.requestId, this.rejectionReason).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.showRejectModal = false;
        this.load();
      },
      error: (err: any) => {
        this.isSubmitting = false;
        alert('Rejection failed: ' + (err?.error?.message || err.message));
      }
    });
  }

  // --- Approve & Submit flow ---
  openSubmitConfirm(): void {
    this.submitError = null;
    this.showSubmitConfirm = true;
  }
  closeSubmitConfirm(): void { this.showSubmitConfirm = false; }

  confirmApproveSubmit(): void {
    this.isSubmitting = true;
    this.submitError = null;
    this.svc.approveAndSubmit(this.requestId).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.showSubmitConfirm = false;
        this.submitSuccess = true;
        this.load();
      },
      error: (err: any) => {
        this.isSubmitting = false;
        this.submitError = {
          message: err?.error?.message || 'Submission failed.',
          missingFields: err?.error?.missingFields,
        };
      }
    });
  }

  // --- Poll ---
  pollStatus(): void {
    this.isPolling = true;
    this.svc.pollJobStatus(this.requestId).subscribe({
      next: () => { this.isPolling = false; this.load(); },
      error: (_err: any) => { this.isPolling = false; }
    });
  }

  // --- Retry ---
  retry(): void {
    if (!confirm('Retry this failed submission?')) return;
    this.isSubmitting = true;
    this.svc.retryRequest(this.requestId).subscribe({
      next: () => { this.isSubmitting = false; this.load(); },
      error: (err: any) => {
        this.isSubmitting = false;
        alert('Retry failed: ' + (err?.error?.message || err.message));
      }
    });
  }

  goBack(): void { this.router.navigate(['/aws-marketplace']); }

  statusClass(status: string): string {
    const map: Record<string, string> = {
      PENDING_REVIEW: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      APPROVED:       'bg-blue-100 text-blue-800 border-blue-200',
      SUBMITTED:      'bg-indigo-100 text-indigo-800 border-indigo-200',
      VALIDATING:     'bg-purple-100 text-purple-800 border-purple-200',
      PUBLISHED:      'bg-green-100 text-green-800 border-green-200',
      FAILED:         'bg-red-100 text-red-800 border-red-200',
      REJECTED:       'bg-slate-100 text-slate-600 border-slate-200',
    };
    return map[status] || 'bg-slate-100 text-slate-700';
  }

  isArray(val: any): boolean { return Array.isArray(val); }
  jsonStr(val: any): string { return JSON.stringify(val, null, 2); }
}
