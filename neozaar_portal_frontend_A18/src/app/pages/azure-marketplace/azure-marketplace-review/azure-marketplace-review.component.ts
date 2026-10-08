import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AzureMarketplaceService, AzureSpecificConfig, ProductEditableField } from '../azure-marketplace.service';

interface TimelineStep {
  label: string;
  status: 'done' | 'active' | 'pending' | 'failed';
  timestamp?: string;
}

@Component({
  selector: 'app-azure-marketplace-review',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './azure-marketplace-review.component.html',
  styleUrls: ['./azure-marketplace-review.component.css']
})
export class AzureMarketplaceReviewComponent implements OnInit {
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

  // Azure Config form
  azureConfig: AzureSpecificConfig = {};
  isSavingConfig = false;
  configSaved = false;
  configError: string | null = null;

  // Update Listing (re-push to an already-published offer)
  editMode = false;
  isUpdatingListing = false;
  updateListingError: string | null = null;

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

  readonly offerTypes = ['SaaS', 'AzureApplication', 'VirtualMachine', 'Container', 'ProfessionalService'];

  /** True when the underlying NeoZaar catalog item is a service (listed as a service only). */
  get isServiceListing(): boolean {
    return this.request?.azure_payload?.listingKind === 'service';
  }

  timeline: TimelineStep[] = [];

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private svc = inject(AzureMarketplaceService);

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

  /** Populate the Azure config form from the stored payload so edits are non-destructive */
  populateConfigForm(): void {
    const az = this.request?.azure_payload?.azureSpecific || {};
    this.azureConfig = {
      offerType:            this.request?.azure_payload?.offerType  || az.offerType            || (this.isServiceListing ? 'ProfessionalService' : 'SaaS'),
      offerId:              az.offerId              || '',
      planId:               az.planId               || '',
      planName:             az.planName             || '',
      planDescription:      az.planDescription      || '',
      saasLandingPageUrl:   az.saasLandingPageUrl   || '',
      saasWebhookUrl:       az.saasWebhookUrl        || '',
      saasAadTenantId:      az.saasAadTenantId       || '',
      saasAadAppId:         az.saasAadAppId          || '',
      supportContactName:   az.supportContactName    || '',
      supportContactEmail:  az.supportContactEmail   || '',
      supportContactPhone:  az.supportContactPhone   || '',
      engineeringContactName:  az.engineeringContactName  || '',
      engineeringContactEmail: az.engineeringContactEmail || '',
      cspOptIn:             az.cspOptIn ?? false,
      previewAudience:      az.previewAudience        || [],
    };
  }

  saveConfig(): void {
    this.isSavingConfig = true;
    this.configSaved = false;
    this.configError = null;
    this.svc.saveConfig(this.requestId, this.azureConfig).subscribe({
      next: () => {
        this.isSavingConfig = false;
        this.configSaved = true;
        this.load(); // reload to get updated payload
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

  /**
   * Offer Type / Offer ID / Plan ID map to immutable external IDs in Partner
   * Center once the offer has been submitted there — they can't be changed
   * afterwards without creating a mismatched duplicate. Lock them once the
   * request has a first submission on record.
   */
  canEditIdentifiers(): boolean {
    return this.canEditConfig() && !this.request?.submitted_at;
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
      { label: 'Request Submitted',     status: 'pending', timestamp: r.created_at },
      { label: 'Admin Review',          status: 'pending', timestamp: r.reviewed_by_user_id ? r.updated_at : undefined },
      { label: 'Submitted to Azure',    status: 'pending', timestamp: r.submitted_at || undefined },
      { label: 'Validation',            status: 'pending', timestamp: r.validated_at || undefined },
      { label: 'Published',             status: 'pending', timestamp: r.published_at || undefined },
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

  goBack(): void { this.router.navigate(['/azure-marketplace']); }

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
