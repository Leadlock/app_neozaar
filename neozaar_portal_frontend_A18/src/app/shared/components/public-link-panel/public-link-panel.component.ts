import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  PublicLinkService,
  PublicLink,
  PublicLinkAnalytics,
  PublicLinkTargetType,
} from './public-link.service';
import { ToasterService } from '../../../shared/providers/toaster/toaster.service';

// Row-level "public link" action for the campaigns list and the product / service /
// solution list pages. One icon button opens a modal that lists the labelled public
// links for this target, lets you create / copy / deactivate them, and shows
// baseline engagement analytics per link.
@Component({
  selector: 'app-public-link-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './public-link-panel.component.html',
})
export class PublicLinkPanelComponent {
  @Input() targetType!: PublicLinkTargetType;
  @Input() targetId!: number;
  @Input() targetTitle = '';

  open = false;
  loading = false;
  busy = false;
  links: PublicLink[] = [];

  // create form
  showCreate = false;
  newLabel = '';
  newSlug = '';
  slugTouched = false;
  newUnlisted = false;
  newExpiry = ''; // yyyy-mm-dd from <input type="date">

  // analytics sub-view
  analyticsFor: PublicLink | null = null;
  analytics: PublicLinkAnalytics | null = null;
  analyticsLoading = false;

  constructor(private svc: PublicLinkService, private toaster: ToasterService) {}

  openModal(): void {
    if (!this.targetId) {
      this.toaster.setToaster('error', 'Error', 'Invalid target.');
      return;
    }
    this.open = true;
    this.resetCreate();
    this.analyticsFor = null;
    this.analytics = null;
    this.loadLinks();
  }

  close(): void {
    if (this.busy) return;
    this.open = false;
  }

  loadLinks(): void {
    this.loading = true;
    this.svc.list(this.targetType, this.targetId).subscribe({
      next: (res: any) => {
        this.loading = false;
        this.links = res?.status === 'success' ? res.data || [] : [];
        if (res?.status !== 'success') {
          this.toaster.setToaster('error', 'Error', res?.message || 'Failed to load links');
        }
      },
      error: () => {
        this.loading = false;
        this.toaster.setToaster('error', 'Error', 'Failed to load links.');
      },
    });
  }

  // ── create ────────────────────────────────────────────────────────────────

  private slugify(s: string): string {
    return (s || '')
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '') // strip combining accents, keep the base letter
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60)
      .replace(/-+$/g, '');
  }

  get slugPreview(): string {
    const base = [this.slugify(this.targetTitle), this.slugify(this.newLabel)].filter(Boolean).join('-');
    return base || 'link';
  }

  onLabelInput(): void {
    if (!this.slugTouched) this.newSlug = this.slugPreview;
  }

  onSlugInput(): void {
    this.slugTouched = true;
  }

  toggleCreate(): void {
    this.showCreate = !this.showCreate;
    if (this.showCreate) {
      this.clearCreateFields();
      this.newSlug = this.slugPreview;
    }
  }

  // Only clears the form fields — callers decide whether to also close the form.
  private clearCreateFields(): void {
    this.newLabel = '';
    this.newSlug = '';
    this.slugTouched = false;
    this.newUnlisted = false;
    this.newExpiry = '';
  }

  private resetCreate(): void {
    this.showCreate = false;
    this.clearCreateFields();
  }

  createLink(): void {
    if (this.busy) return;
    this.busy = true;
    this.svc
      .create({
        targetType: this.targetType,
        targetId: this.targetId,
        label: this.newLabel.trim() || undefined,
        slug: this.newSlug.trim() || undefined,
        unlisted: this.newUnlisted || undefined,
        expiresAt: this.newExpiry ? new Date(this.newExpiry + 'T23:59:59').toISOString() : undefined,
      })
      .subscribe({
        next: (res: any) => {
          this.busy = false;
          if (res?.status !== 'success') {
            this.toaster.setToaster('error', 'Error', res?.message || 'Failed to create link');
            return;
          }
          this.toaster.setToaster('success', 'Created', 'Public link created.');
          this.resetCreate();
          this.loadLinks();
          this.copy(res.data?.url);
        },
        error: (err) => {
          this.busy = false;
          this.toaster.setToaster('error', 'Error', err?.error?.message || 'Failed to create link.');
        },
      });
  }

  // ── row actions ───────────────────────────────────────────────────────────

  setActive(link: PublicLink, isActive: boolean): void {
    if (this.busy) return;
    this.busy = true;
    this.svc.update(link.id, { isActive }).subscribe({
      next: (res: any) => {
        this.busy = false;
        if (res?.status !== 'success') {
          this.toaster.setToaster('error', 'Error', res?.message || 'Update failed');
          return;
        }
        this.toaster.setToaster('success', isActive ? 'Reactivated' : 'Deactivated', `Link ${isActive ? 'is live again' : 'is now off'}.`);
        this.loadLinks();
      },
      error: () => {
        this.busy = false;
        this.toaster.setToaster('error', 'Error', 'Update failed.');
      },
    });
  }

  deleteLink(link: PublicLink): void {
    if (this.busy) return;
    if (!confirm(`Delete the "${link.label || link.slug}" link permanently? Its analytics go with it.`)) return;
    this.busy = true;
    this.svc.remove(link.id).subscribe({
      next: (res: any) => {
        this.busy = false;
        if (res?.status !== 'success') {
          this.toaster.setToaster('error', 'Error', res?.message || 'Delete failed');
          return;
        }
        this.toaster.setToaster('success', 'Deleted', 'Link removed.');
        if (this.analyticsFor?.id === link.id) this.analyticsFor = null;
        this.loadLinks();
      },
      error: () => {
        this.busy = false;
        this.toaster.setToaster('error', 'Error', 'Delete failed.');
      },
    });
  }

  copy(url?: string): void {
    if (!url) return;
    navigator.clipboard?.writeText(url).then(
      () => this.toaster.setToaster('success', 'Copied', 'Link copied to clipboard.'),
      () => this.toaster.setToaster('error', 'Error', 'Could not copy — select and copy manually.'),
    );
  }

  statusLabel(link: PublicLink): { text: string; cls: string } {
    if (link.live) return { text: 'Active', cls: 'bg-green-50 text-green-700' };
    if (!link.is_active) return { text: 'Inactive', cls: 'bg-gray-100 text-gray-600' };
    return { text: 'Expired', cls: 'bg-amber-50 text-amber-700' };
  }

  // ── analytics ─────────────────────────────────────────────────────────────

  openAnalytics(link: PublicLink): void {
    this.analyticsFor = link;
    this.analytics = null;
    this.analyticsLoading = true;
    this.svc.analytics(link.id, '30d').subscribe({
      next: (res: any) => {
        this.analyticsLoading = false;
        if (res?.status === 'success') this.analytics = res.data;
        else this.toaster.setToaster('error', 'Error', res?.message || 'Failed to load analytics');
      },
      error: () => {
        this.analyticsLoading = false;
        this.toaster.setToaster('error', 'Error', 'Failed to load analytics.');
      },
    });
  }

  closeAnalytics(): void {
    this.analyticsFor = null;
    this.analytics = null;
  }

  get maxDayViews(): number {
    return Math.max(1, ...(this.analytics?.by_day || []).map((d) => d.views));
  }

  pct(v: number): string {
    return (v * 100).toFixed(1) + '%';
  }
}
