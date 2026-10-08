import { Component, ElementRef, HostListener, Input, OnInit } from '@angular/core';
import { NgClass, NgStyle } from '@angular/common';
import { RouterModule } from '@angular/router';
import { UserRole } from '../../../core/modal/user.modal';
import { HasRoleDirective } from '../../directives/has-role.directive';
import { AuthService } from '../../../core/services/auth.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterModule, HasRoleDirective, NgClass, NgStyle],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent implements OnInit {
  @Input() mode: 'fixed' | 'drawer' = 'fixed';

  userRole = UserRole;
  baseUrl = environment.frontendUrl;
  menus: any[] = [];
  openMenuIndex: number | null = null;

  // Flyout used to be `absolute left-full top-0` on the trigger — fine for
  // items near the top of a tall sidebar (Master Data, Catalog...), but a
  // trigger low in the list (Marketing, 12 items) opened a box anchored
  // near the bottom of the screen with nowhere for the page to scroll to,
  // so everything past the viewport edge was simply unreachable. This
  // computes a `fixed` position clamped to the viewport instead, flipping
  // to open upward when there isn't room below, and always capping
  // max-height so the flyout's own scrollbar (already `overflow-y-auto`)
  // is the actual, reachable overflow boundary — never the browser edge.
  flyoutStyle: { [key: string]: string } = {};

  toggleMenu(index: number, event?: MouseEvent): void {
    if (event) this.positionFlyout(event.currentTarget as HTMLElement);
    this.openMenuIndex = this.openMenuIndex === index ? null : index;
  }

  onTriggerEnter(event: MouseEvent): void {
    this.positionFlyout(event.currentTarget as HTMLElement);
  }

  private positionFlyout(triggerEl: HTMLElement): void {
    const rect = triggerEl.getBoundingClientRect();
    const gap = 12;    // matches the sidebar's original pl-3 gap
    const margin = 12; // minimum breathing room from the viewport edge
    const viewportHeight = window.innerHeight;
    const left = Math.round(rect.right + gap);
    const spaceBelow = viewportHeight - rect.top;
    const openUpward = spaceBelow < 320; // not enough room below for a typical flyout — flip and grow upward instead
    this.flyoutStyle = openUpward
      ? (() => {
          const bottom = Math.max(margin, viewportHeight - rect.bottom);
          // Space available between the top margin and the bottom anchor —
          // NOT a flat "100vh minus margins": that ignored how far the
          // anchor already sits from the viewport bottom and could still
          // push the box off the top of the screen for a trigger that
          // isn't right at the very last row.
          return {
            left: `${left}px`,
            top: 'auto',
            bottom: `${bottom}px`,
            'max-height': `${viewportHeight - bottom - margin}px`,
          };
        })()
      : {
          left: `${left}px`,
          top: `${Math.max(margin, rect.top)}px`,
          bottom: 'auto',
          'max-height': `calc(100vh - ${Math.max(margin, rect.top) + margin}px)`,
        };
  }

  /** Close a click-opened flyout when clicking anywhere outside the sidebar. */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.openMenuIndex !== null && !this.host.nativeElement.contains(event.target as Node)) {
      this.openMenuIndex = null;
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.openMenuIndex = null;
  }

  constructor(private authService: AuthService, private host: ElementRef<HTMLElement>) {}

ngOnInit(): void {
  const currentUser = this.authService.getCurrentUser();
  const userId = currentUser?.id;

  // AGENT can only access affiliate leads; everyone else lands on the direct tab.
  const leadsUrl = currentUser?.role_type === this.userRole.AGENT ? 'leads-affiliate' : 'leads-direct';

  this.menus = [
    {
      label: 'dashboard',
      url: 'dashboard',
      permissions: [this.userRole.ADMIN, this.userRole.ISV, this.userRole.PARTNER, this.userRole.MANAGER, this.userRole.SUPERADMIN],
      items: []
    },
    // --- NEW DROPDOWN MENU ---
    {
      label: 'Master Data',
      url: '', // Parent doesn't need a URL
      permissions: [this.userRole.ADMIN,this.userRole.SUPERADMIN],
      items: [
        { label: 'Advertisement', url: 'myads' },
        { label: 'Ask the Champ', url: 'askthechamp' },
        { label: 'Brand Name', url: 'brandname' },
        { label: 'Categories', url: 'categories' },
        { label: 'Sub Categories', url: 'subcategories' },
        { label: 'Target Audiences', url: 'targetaudiance' },
        { label: 'Target Segments', url: 'targetsegment' },
        { label: 'Industries', url: 'industry' },
        { label: 'Instructions', url: 'instruction' },
        { label: 'Homepage Banner', url: 'homepagebanner' },
        { label: 'Hero Carousel', url: 'hero-carousel' },
        { label: 'Hero Wide Banner', url: 'hero-wide-banner' },
        { label: 'Catalog Hero Banner', url: 'catalog-hero-banner' },
      ]
    },
    // Manager gets a trimmed Master Data menu — homepage promo content only.
    {
      label: 'Master Data',
      url: '',
      permissions: [this.userRole.MANAGER],
      items: [
        { label: 'Advertisement', url: 'myads' },
        { label: 'Ask the Champ', url: 'askthechamp' },
        { label: 'Hero Carousel', url: 'hero-carousel' },
        { label: 'Hero Wide Banner', url: 'hero-wide-banner' },
      ]
    },
        {
      label: 'User Setting',
      url: '', // Parent doesn't need a URL
      permissions: [ this.userRole.SUPERADMIN],
      items: [
        { label: 'Customers', url: 'user' },
        { label: 'All Users', url: 'all-users' },
        { label: 'WhatsApp Log', url: 'whatsapp-conversations' },
        { label: 'Consent Audit', url: 'consent-audit' },
      ]
    },
    // -------------------------
    {
      label: 'Catalog',
      url: '',
      permissions: [this.userRole.ADMIN, this.userRole.ISV, this.userRole.SUPERADMIN, this.userRole.MANAGER, this.userRole.MARKETING],
      items: [
        { label: 'Products', url: 'products' },
        { label: 'Services', url: 'service' },
        { label: 'Solutions', url: 'solution' },
        // { label: 'Bundles', url: 'bundles' }, // temporarily disabled
        // Featured management is not available to ISV or Manager
        ...(currentUser?.role_type !== this.userRole.ISV && currentUser?.role_type !== this.userRole.MANAGER
          ? [{ label: 'Featured', url: 'featured' }]
          : []),
      ]
    },
    {
      label: 'Partners',
      url: '',
      permissions: [this.userRole.SUPERADMIN, this.userRole.ADMIN, this.userRole.M_SELLER],
      items: [
        { label: 'Software Vendors', url: 'isv' },
        { label: 'Solution Partners', url: 'partners' },
        { label: 'Consulting Advisors', url: 'consulting-advisors' },
        // Moved here from "User Setting"; M_SELLER / A_MANAGER already have it as a standalone item
        ...(currentUser?.role_type === this.userRole.M_SELLER || currentUser?.role_type === this.userRole.A_MANAGER
          ? []
          : [{ label: 'Manage Partners', url: 'sellers' }]),
      ]
    },
    {
      label: 'Leads',
      url: leadsUrl,
      permissions: [this.userRole.SUPERADMIN, this.userRole.ADMIN, this.userRole.AGENT, this.userRole.M_SELLER, this.userRole.A_MANAGER],
      items: []
    },
    {
      label: 'My Dashboard',
      url: 'seller-dashboard',
      permissions: [this.userRole.M_SELLER, this.userRole.AGENT, this.userRole.A_MANAGER],
      items: []
    },
    {
      label: 'Manage Partners',
      url: 'sellers',
      permissions: [this.userRole.M_SELLER, this.userRole.A_MANAGER],
      items: []
    },
    // Temporarily hidden
    // {
    //   label: 'SEO',
    //   url: 'seo',
    //   permissions: [this.userRole.SUPERADMIN],
    //   items: []
    // },
    {
      label: 'Marketing',
      url: '',
      permissions: [this.userRole.SUPERADMIN, this.userRole.MANAGER, this.userRole.MARKETING],
      items: [
        { label: 'Dashboard', url: 'marketing/dashboard' },
        { label: 'Contacts', url: 'marketing/contacts' },
        { label: 'Segments', url: 'marketing/segments' },
        { label: 'Tags', url: 'marketing/tags' },
        { label: 'Scoring', url: 'marketing/scoring' },
        { label: 'Campaigns', url: 'campaigns' },
        { label: 'Campaign Studio', url: 'marketing/campaign-studio' },
        { label: 'Journeys', url: 'marketing/journeys' },
        { label: 'WhatsApp & SMS', url: 'marketing/channels' },
        { label: 'Automations', url: 'marketing/automations' },
        { label: 'Emails', url: 'marketing/emails' },
        { label: 'Forms', url: 'marketing/forms' },
        { label: 'Pages & Assets', url: 'marketing/content' },
        { label: 'Analytics', url: 'marketing/analytics' },
        { label: 'Settings & Logs', url: 'marketing/settings' },
        { label: 'Help & Walkthrough', url: 'marketing/help' },
      ]
    },

    // {
    //   label: 'Customers',
    //   url: 'user',
    //   permissions: [this.userRole.ADMIN],
    //   items: []
    // },
  ];
}

  logout(): void {
    this.authService.logout();
  }
}
