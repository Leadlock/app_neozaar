import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ListingZohoService } from './listing-zoho.service';
import { ToasterService } from '../../../shared/providers/toaster/toaster.service';

// Row-level "share this listing" action for the product / service / solution list pages.
// One icon button that opens a two-step modal: choose "Send as Email" (subject +
// recipients form) or "Push to Zoho Campaigns" (the existing draft push). `item` needs
// id, name, zoho_campaign_key, zoho_campaign_pushed_at. Emits `changed` after a push so
// the parent list can refresh.
@Component({
  selector: 'app-listing-zoho-actions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './listing-zoho-actions.component.html',
})
export class ListingZohoActionsComponent {
  @Input() item: any;
  @Output() changed = new EventEmitter<void>();

  open = false;
  mode: 'choice' | 'email' = 'choice';
  emailSubject = '';
  emailRecipients = '';
  busy = false;

  constructor(
    private svc: ListingZohoService,
    private toasterService: ToasterService
  ) {}

  get alreadyPushed(): boolean {
    return !!this.item?.zoho_campaign_key;
  }

  openModal(): void {
    if (!this.item?.id) {
      this.toasterService.setToaster('error', 'Error', 'Invalid listing.');
      return;
    }
    this.mode = 'choice';
    this.emailSubject = (this.item?.name || '').trim();
    this.emailRecipients = '';
    this.open = true;
  }

  close(): void {
    if (this.busy) return;
    this.open = false;
  }

  chooseEmail(): void {
    this.mode = 'email';
  }

  backToChoice(): void {
    if (this.busy) return;
    this.mode = 'choice';
  }

  pushZoho(): void {
    if (!this.item?.id || this.busy) return;

    this.busy = true;
    this.svc.pushToZoho(this.item.id, this.alreadyPushed).subscribe({
      next: (res: any) => {
        this.busy = false;
        if (res.status !== 'success') {
          this.toasterService.setToaster('error', 'Error', res.message || 'Failed to push to Zoho');
          return;
        }
        const stillAlready = res.data?.alreadyPushed;
        this.toasterService.setToaster(
          'success',
          stillAlready ? 'Already pushed' : 'Pushed to Zoho',
          stillAlready
            ? 'No new draft created — try again if you meant to push again.'
            : 'Draft created in Zoho Campaigns.'
        );
        this.open = false;
        this.changed.emit();
      },
      error: (err) => {
        this.busy = false;
        console.error('push to zoho error:', err);
        this.toasterService.setToaster('error', 'Error', 'Failed to push to Zoho. Please try again.');
      }
    });
  }

  private parseRecipients(): string[] {
    return Array.from(new Set(
      this.emailRecipients
        .split(/[\s,;]+/)
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
    ));
  }

  sendEmail(): void {
    if (!this.item?.id || this.busy) return;

    const subject = this.emailSubject.trim();
    const recipients = this.parseRecipients();
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

    this.busy = true;
    this.svc.sendEmail(this.item.id, { subject, recipients }).subscribe({
      next: (res: any) => {
        this.busy = false;
        if (res.status !== 'success') {
          this.toasterService.setToaster('error', 'Error', res.message || 'Failed to send email');
          return;
        }
        this.toasterService.setToaster('success', 'Sent', res.message || 'Listing emailed.');
        this.open = false;
      },
      error: (err) => {
        this.busy = false;
        console.error('send listing email error:', err);
        this.toasterService.setToaster('error', 'Error', err?.error?.message || 'Failed to send email. Please try again.');
      }
    });
  }
}
