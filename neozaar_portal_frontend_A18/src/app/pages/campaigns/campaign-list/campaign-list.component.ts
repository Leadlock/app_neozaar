import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { CampaignService, Campaign } from '../campaign.service';
import { ToasterService } from '../../../shared/providers/toaster/toaster.service';
import { PublicLinkPanelComponent } from '../../../shared/components/public-link-panel/public-link-panel.component';
import { PublicLinkService } from '../../../shared/components/public-link-panel/public-link.service';

@Component({
  selector: 'app-campaign-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, PublicLinkPanelComponent],
  templateUrl: './campaign-list.component.html',
})
export class CampaignListComponent implements OnInit {
  campaigns: Campaign[] = [];
  isLoading = false;

  // Per-campaign public-link summary (total views/clicks across every public
  // link made for that campaign), keyed by campaign id. undefined = not
  // fetched yet, null = fetched, no public link exists for this campaign.
  linkStats: Record<number, { views: number; ctaClicks: number; linkCount: number } | null> = {};

  // "For which list?" push modal — mandatory answer, stored on the campaign and
  // emailed to tech-support for tracking.
  pushTarget: Campaign | null = null;
  pushListLabel = '';
  isPushing = false;

  constructor(
    private campaignService: CampaignService,
    private toasterService: ToasterService,
    private publicLinkService: PublicLinkService
  ) {}

  ngOnInit(): void {
    this.getData();
  }

  getData(): void {
    this.isLoading = true;
    this.campaignService.getCampaigns().subscribe({
      next: (res: any) => {
        this.isLoading = false;
        if (res.status === 'success') {
          this.campaigns = (res.data || []).filter((campaign: Campaign) => campaign.campaign_type !== 'studio');
          this.loadLinkStats();
        } else {
          this.toasterService.setToaster('error', 'Error', res.message || 'Failed to load campaigns');
        }
      },
      error: (err) => {
        this.isLoading = false;
        console.error('getCampaigns error:', err);
        this.toasterService.setToaster('error', 'Error', 'Failed to load campaigns. Please try again.');
      }
    });
  }

  // There's no bulk "public links for these N campaigns" endpoint today —
  // /api/public-links only takes one targetId at a time — so this fires one
  // request per campaign row. Fine for the campaign list's usual size; would
  // need a real bulk endpoint if this list ever grows into the hundreds.
  loadLinkStats(): void {
    for (const c of this.campaigns) {
      if (!c.id) continue;
      this.publicLinkService.list('campaign', c.id).subscribe({
        next: (res: any) => {
          const links = res?.data || [];
          this.linkStats[c.id!] = links.length
            ? links.reduce((acc: any, l: any) => ({
                views: acc.views + (l.views || 0),
                ctaClicks: acc.ctaClicks + (l.cta_clicks || 0),
                linkCount: acc.linkCount + 1,
              }), { views: 0, ctaClicks: 0, linkCount: 0 })
            : null;
        },
        error: () => { this.linkStats[c.id!] = null; },
      });
    }
  }

  // Template helper — Angular's template type-checker doesn't narrow a
  // dynamic index lookup like linkStats[c.id] just because it was checked
  // truthy earlier in the same @if (that's what broke the build: two
  // separate `linkStats[c.id]` reads inside the block, each seen as
  // possibly-null on its own). Returning the value from one method call and
  // binding it with `@if (...; as stats)` gives the template a single,
  // properly narrowed local instead.
  linkStatsFor(c: Campaign): { views: number; ctaClicks: number; linkCount: number } | null {
    return c.id ? this.linkStats[c.id] ?? null : null;
  }

  deleteCampaign(campaign: Campaign): void {
    if (!campaign?.id) return;
    if (!confirm(`Delete "${campaign.title}"? This only removes it from Neozaar — it does not touch anything already pushed to Zoho.`)) return;

    this.campaignService.deleteCampaign(campaign.id).subscribe({
      next: (res: any) => {
        if (res.status === 'success') {
          this.toasterService.setToaster('success', 'Deleted', 'Campaign deleted successfully');
          this.getData();
        } else {
          this.toasterService.setToaster('error', 'Error', res.message || 'Failed to delete campaign');
        }
      },
      error: (err) => {
        console.error('deleteCampaign error:', err);
        this.toasterService.setToaster('error', 'Error', 'Failed to delete campaign. Please try again.');
      }
    });
  }

  // Opens the "For which list?" modal. campaignName/subject are still auto-derived from
  // the campaign's own title here (same philosophy as the single-listing flow — both are
  // editable inside Zoho before anyone sends); only the mandatory list answer is prompted.
  pushCampaign(campaign: Campaign): void {
    if (!campaign?.id) return;
    this.pushTarget = campaign;
    this.pushListLabel = '';
  }

  closePushModal(): void {
    if (this.isPushing) return;
    this.pushTarget = null;
    this.pushListLabel = '';
  }

  confirmPush(): void {
    const campaign = this.pushTarget;
    if (!campaign?.id || this.isPushing) return;
    if (!this.pushListLabel.trim()) {
      this.toasterService.setToaster('error', 'Error', 'Please answer "For which list?" before sending.');
      return;
    }

    const alreadyPushed = campaign.status === 'pushed';

    this.isPushing = true;
    this.campaignService.pushCampaign(campaign.id, {
      campaignName: `Neozaar ${campaign.title}`,
      subject: campaign.title,
      whichList: this.pushListLabel.trim(),
      force: alreadyPushed,
    }).subscribe({
      next: (res: any) => {
        this.isPushing = false;
        if (res.status === 'success') {
          this.pushTarget = null;
          this.pushListLabel = '';
          const stillAlready = res.data?.alreadyPushed;
          this.toasterService.setToaster(
            'success',
            stillAlready ? 'Already pushed' : 'Pushed to Zoho',
            stillAlready ? 'No new draft created — try again if you meant to push again.' : 'Draft created in Zoho Campaigns.'
          );
          this.getData();
        } else {
          this.toasterService.setToaster('error', 'Error', res.message || 'Failed to push to Zoho');
        }
      },
      error: (err) => {
        this.isPushing = false;
        console.error('pushCampaign error:', err);
        this.toasterService.setToaster('error', 'Error', 'Failed to push to Zoho. Please try again.');
      }
    });
  }
}
