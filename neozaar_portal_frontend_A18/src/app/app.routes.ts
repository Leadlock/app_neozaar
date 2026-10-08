import { Routes } from '@angular/router';
import { LoginByTokenComponent } from './pages/auth/login-by-token/login-by-token.component';
import { redirectGuard } from './core/guard/redirect.guard';
import { LoginComponent } from './pages/auth/login/login.component';
import { authGuard } from './core/guard/auth.guard';
import { LayoutComponent } from './pages/layout/layout.component';
import { roleGuard } from './core/guard/role.guard';
import { UserRole } from './core/modal/user.modal';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { ProductListComponent } from './pages/product/product-list/product-list.component';
import { ProductCreateComponent } from './pages/product/product-create/product-create.component';
import { ProductViewComponent } from './pages/product/product-view/product-view.component';
// import { BundleCreateComponent } from './pages/product/bundle-create/bundle-create.component'; // temporarily disabled
// import { BundleListComponent } from './pages/bundle/view-bundle-list/view-bundle-list.component'; // temporarily disabled
// import { ViewBundleComponent } from './pages/bundle/view-bundle/view-bundle.component'; // temporarily disabled
import { LeadsComponent } from './pages/leads/leads.component';
import { ViewIsvComponentComponent } from './pages/view-isv-component/view-isv-component.component';
import { ViewPartnersComponentComponent } from './pages/view-partners-component/view-partners-component.component';
import { LeadDetailComponent } from './pages/leads/lead-detail/lead-detail.component';
import { DisplayIsvComponent } from './pages/display-isv/display-isv.component';
import { IsvapprovedComponent } from './pages/isvapproved/isvapproved.component';
import { AprovalIsvComponent } from './pages/product/aproval-isv/aproval-isv.component';
import { MarketplaceServiceComponent } from './pages/marketplace-service/marketplace-service.component';
import { SeoListComponent } from './pages/seo/seo-list/seo-list.component';
import { SeoformComponent } from './pages/seo/seoform/seoform.component';
import { ServiceListComponent } from './pages/service/service-list/service-list.component';
import { ServiceCreateComponent } from './pages/service/service-create/service-create.component';
import { ServiceDetailComponent } from './pages/service/service-detail/service-detail.component';
import { SolutionCreateComponent } from './pages/solution/solution-create/solution-create.component';
import { SolutionListComponent } from './pages/solution/solution-list/solution-list.component';
import { SolutionDetailComponent } from './pages/solution/solution-detail/solution-detail.component';
import { ViewProfileComponent } from './pages/profile/view-profile/view-profile.component';
import { EditprofileComponent } from './pages/profile/editprofile/editprofile.component';
// import { UserComponent } from './pages/user/user.component';
import { UserlistComponent } from './pages/User/userlist/userlist.component';
import { TargetsegmentComponent } from './pages/master/targetsegment/targetsegment.component';
import { CategoryComponent } from './pages/master/category/category.component';
import { SubcategoryComponent } from './pages/master/subcategory/subcategory.component';
import { BrandnameComponent } from './pages/master/brandname/brandname.component';
import { AdvertisementComponent } from './pages/master/advertisement/advertisement.component';
import { TargetaudianceComponent } from './pages/master/targetaudiance/targetaudiance.component';
import { IndustryComponent } from './pages/master/industry/industry.component';
import { AskthechampComponent } from './pages/master/askthechamp/askthechamp.component';
import { InstructionComponent } from './pages/master/instruction/instruction.component';
import { HompageBannerComponent } from './pages/master/hompage-banner/hompage-banner.component';
import { HeroCarouselComponent } from './pages/master/hero-carousel/hero-carousel.component';
import { HeroWideBannerComponent } from './pages/master/hero-wide-banner/hero-wide-banner.component';
import { CatalogHeroBannerComponent } from './pages/master/catalog-hero-banner/catalog-hero-banner.component';
import {  UsersettingComponent } from './pages/User/usersetting/usersetting.component';
import { FeaturedComponent } from './pages/featured/featured.component';
import { crmGuard } from './core/guard/crm.guard';
import { UnauthorizedComponent } from './pages/unauthorized/unauthorized.component';
import { rootRedirectGuard } from './core/guard/root-redirect.guard';

export const routes: Routes = [
  // Smart redirect root → role-specific dashboard
  {
    path: '',
    pathMatch: 'full',
    canActivate: [rootRedirectGuard],
    component: UnauthorizedComponent, // never rendered; guard always redirects
  },

  {
    path: 'auth',
    children: [
      {
        path: 'login',
        component: LoginComponent,
        canActivate: [redirectGuard],
        title: 'Login'
      },
      {
        path: 'login-token',
        component: LoginByTokenComponent,
        canActivate: [redirectGuard],
      },
      {
        path: '',
        redirectTo: 'login',
        pathMatch: 'full',
      }
    ]
  },

  // Protected layout
  {
    path: '',
    canActivate: [authGuard],
    component: LayoutComponent,
    children: [
      // Dashboard
      {
        path: 'dashboard',
        component: DashboardComponent,
        canActivate: [roleGuard([UserRole.ADMIN, UserRole.ISV, UserRole.PARTNER, UserRole.SUPERADMIN, UserRole.MANAGER, UserRole.M_SELLER, UserRole.AGENT, UserRole.A_MANAGER, UserRole.SELLER])],
        title: 'Neozaar App Dashboard'
      },
      {
        path: 'seo',
        canActivate: [roleGuard([UserRole.ADMIN,UserRole.SUPERADMIN])],
        children: [
          {
            path: '',
            component: SeoListComponent,
            title: 'SEO List'
          },
          {
            path: 'create',
            component: SeoformComponent,
            title: 'Create SEO'
          },
          {
            path: ':id',
            component: SeoformComponent,
            title: 'Edit SEO'
          },
        ]
      },
      {
        path: 'service',
        canActivate: [roleGuard([UserRole.ADMIN, UserRole.ISV, UserRole.SUPERADMIN, UserRole.PARTNER, UserRole.MANAGER, UserRole.A_MANAGER, UserRole.MARKETING])],
        children: [
          {
            path: '',
            component: ServiceListComponent,
            title: 'Service List'
          },
          {
            path: 'create',
            component: ServiceCreateComponent,
            title: 'Create Service'
          },
          {
            path: 'edit/:id',
            component: ServiceCreateComponent,
            title: 'Edit Service'
          },
          {
            path: 'view/:id',
            component: ServiceDetailComponent,
            title: 'Service Details'
          }
        ]
      },
      // Products
      {
        path: 'targetsegment',
        canActivate: [roleGuard([UserRole.ADMIN, UserRole.SUPERADMIN])],
        children: [
          {
            path: '',
            component: TargetsegmentComponent,
            title: 'Target Segment List'
          },
        ]
      },
      {
        path: 'all-users',
        canActivate: [roleGuard([UserRole.ADMIN, UserRole.SUPERADMIN])],
        children: [
          {
            path: '',
            component: UsersettingComponent,
            title: 'All Users List'
          },
        ]
      },
      {
        path: 'trash',
        canActivate: [roleGuard([UserRole.ADMIN, UserRole.SUPERADMIN])],
        loadComponent: () => import('./pages/trash/trash.component').then(m => m.TrashComponent),
        title: 'Trash'
      },
      {
        path: 'whatsapp-conversations',
        canActivate: [roleGuard([UserRole.SUPERADMIN])],
        loadComponent: () => import('./pages/whatsapp-conversations/whatsapp-conversations.component').then(m => m.WhatsappConversationsComponent),
        title: 'WhatsApp Conversations'
      },
      {
        path: 'consent-audit',
        canActivate: [roleGuard([UserRole.SUPERADMIN])],
        loadComponent: () => import('./pages/consent-audit/consent-audit.component').then(m => m.ConsentAuditComponent),
        title: 'Consent Audit Console'
      },
      {
        path: 'industry',
        canActivate: [roleGuard([UserRole.ADMIN, UserRole.SUPERADMIN])],
        children: [
          {
            path: '',
            component: IndustryComponent,
            title: 'Industry List'
          },
        ]
      },
      {
        path: 'askthechamp',
        canActivate: [roleGuard([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.MANAGER])],
        children: [
          {
            path: '',
            component: AskthechampComponent,
            title: 'Ask the Champ'
          },
        ]
      },
      {
        path: 'homepagebanner',
        canActivate: [roleGuard([UserRole.ADMIN, UserRole.SUPERADMIN ])],
        children: [
          {
            path: '',
            component: HompageBannerComponent,
            title: 'Homepage Banner'
          },
        ]
      },
      {
        path: 'hero-carousel',
        canActivate: [roleGuard([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.MANAGER])],
        children: [
          {
            path: '',
            component: HeroCarouselComponent,
            title: 'Hero Carousel'
          },
        ]
      },
      {
        path: 'hero-wide-banner',
        canActivate: [roleGuard([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.MANAGER])],
        children: [
          {
            path: '',
            component: HeroWideBannerComponent,
            title: 'Hero Wide Banner'
          },
        ]
      },
      {
        path: 'catalog-hero-banner',
        canActivate: [roleGuard([UserRole.ADMIN, UserRole.SUPERADMIN])],
        children: [
          {
            path: '',
            component: CatalogHeroBannerComponent,
            title: 'Catalog Hero Banner'
          },
        ]
      },
      {
        path: 'targetaudiance',
        canActivate: [roleGuard([UserRole.ADMIN,UserRole.SUPERADMIN])],
        children: [
          {
            path: '',
            component: TargetaudianceComponent,
            title: 'Target Audience List'
          },
        ]
      },
      {
        path: 'categories',
        canActivate: [roleGuard([UserRole.ADMIN, UserRole.SUPERADMIN])],
        children: [
          {
            path: '',
            component: CategoryComponent,
            title: 'Category List'
          },
        ]
      },
      {
        path: 'subcategories',
        canActivate: [roleGuard([UserRole.ADMIN, UserRole.SUPERADMIN  ])],
        children: [
          {
            path: '',
            component: SubcategoryComponent,
            title: 'Subcategory List'
          },
        ]
      },
      {
        path: 'myads',
        canActivate: [roleGuard([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.MANAGER])],
        children: [
          {
            path: '',
            component: AdvertisementComponent,
            title: 'MyAds List'
          },
        ]
      },
      {
        path: 'brandname',
        canActivate: [roleGuard([UserRole.ADMIN, UserRole.SUPERADMIN])],
        children: [
          {
            path: '',
            component: BrandnameComponent,
            title: 'Brand Name List'
          },
        ]
      },
      {
        path: 'instruction',
        canActivate: [roleGuard([UserRole.ADMIN, UserRole.SUPERADMIN])],
        children: [
          {
            path: '',
            component: InstructionComponent,
            title: 'Instruction List'
          },
        ]
      },
      {
        path: 'products',
        canActivate: [roleGuard([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.ISV, UserRole.MANAGER, UserRole.A_MANAGER, UserRole.MARKETING])],
        children: [
          {
            path: '',
            component: ProductListComponent,
            title: 'Product List'
          },
          {
            path: 'create',
            component: ProductCreateComponent,
            title: 'Create Product'
          },
          {
            path: 'edit/:id',
            component: ProductCreateComponent,
            title: 'Edit Product'
          },
          {
            path: 'view/:id',
            component: ProductViewComponent,
            title: 'Product Details'
          }
        ]
      },
      {
        path: 'profile',
        canActivate: [roleGuard([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.ISV])],
        children: [
          {
            path: 'edit/:id',
            component: EditprofileComponent,
            title: 'Edit Profile'
          },
          {
            path: 'view/:id',
            component: ViewProfileComponent,
            title: 'View Profile'
          }
        ]
      },
      {
        path: 'solution',
        canActivate: [roleGuard([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.ISV, UserRole.MANAGER, UserRole.A_MANAGER, UserRole.MARKETING])],
        children: [
          {
            path: '',
            component: SolutionListComponent,
            title: 'Solution List'
          },
          {
            path: 'create',
            component: SolutionCreateComponent,
            title: 'Create Solution'
          },
          {
            path: 'edit/:id',
            component: SolutionCreateComponent,
            title: 'Edit Solution'
          },
          {
            path: 'view/:id',
            component: SolutionDetailComponent,
            title: 'Solution Details'
          }
        ]
      },
         {
        path: 'user',
        canActivate: [roleGuard([UserRole.ADMIN, UserRole.SUPERADMIN])],
        children: [
          {
            path: '',
            component:UserlistComponent,
            title: 'Customers'
          },
          {
            path: 'create',
            component: ServiceCreateComponent,
            title: 'Create Service'
          },
          {
            path: 'edit/:id',
            component: ServiceCreateComponent,
            title: 'Edit Service'
          },
          {
            path: 'view/:id',
            component: ServiceDetailComponent,
            title: 'Service Details'
          }
        ]
      },
      // bundles route temporarily disabled
      // { path: 'bundles', canActivate: [roleGuard([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.ISV])], children: [...] },
      {
        path: 'isv',
        component: ViewIsvComponentComponent,
        canActivate: [roleGuard([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.M_SELLER, UserRole.A_MANAGER])],
        title: 'ISV List'
      },
      {
        path: 'marketplace-form',
        component: MarketplaceServiceComponent,
        title: 'Marketplace Service Form'
      },
      {
        path: 'isv-approved',
        component: IsvapprovedComponent,
        canActivate: [roleGuard([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.M_SELLER, UserRole.A_MANAGER])],
        title: 'ISV Approved List'
      },
      {
        path: 'verify/:id',
        component: AprovalIsvComponent,
        canActivate: [roleGuard([UserRole.ADMIN, UserRole.SUPERADMIN])],
        title: 'ISV Approval Form'
      },
      {
        path: 'display-isv/:id',
        component: DisplayIsvComponent,
        canActivate: [roleGuard([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.M_SELLER, UserRole.A_MANAGER])],
        title: 'Display ISV'
      },
      // leads
      {
        path: 'leads-direct',
        component: LeadsComponent,
        canActivate: [roleGuard([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.M_SELLER, UserRole.A_MANAGER])],
        data: { source: 'direct' },
        title: 'Leads'
      },
      {
        path: 'leads-affiliate',
        component: LeadsComponent,
        canActivate: [roleGuard([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.AGENT, UserRole.M_SELLER, UserRole.A_MANAGER])],
        data: { source: 'affiliate' },
        title: 'Leads'
      },
      {
        path: 'leads-whatsapp',
        component: LeadsComponent,
        canActivate: [roleGuard([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.M_SELLER, UserRole.A_MANAGER])],
        data: { source: 'whatsapp' },
        title: 'Leads'
      },
      {
        path: 'leads',
        component: LeadsComponent,
        canActivate: [roleGuard([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.ISV, UserRole.PARTNER, UserRole.M_SELLER])],
        title: 'All Leads'
      },
      {
        path: 'leads/leaddetail/:id',
        component: LeadDetailComponent,
        canActivate: [roleGuard([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.ISV, UserRole.PARTNER])]
      },
      {
        path: 'featured',
        component: FeaturedComponent,
        canActivate: [roleGuard([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.MARKETING])],
        title: 'Featured Items'
      },
      // Unauthorized page
      {
        path: 'unauthorized',
        component: UnauthorizedComponent,
        title: 'Access Denied'
      },

      // Seller/Affiliate dashboard — M_SELLER, SELLER, AGENT, A_MANAGER roles
      {
        path: 'seller-dashboard',
        canActivate: [roleGuard([UserRole.M_SELLER, UserRole.AGENT, UserRole.A_MANAGER])],
        loadComponent: () => import('./pages/seller-dashboard/seller-dashboard.component').then(m => m.SellerDashboardComponent),
        title: 'Seller Dashboard'
      },

      // Seller management — ADMIN / SUPERADMIN / M_SELLER / A_MANAGER
      {
        path: 'sellers',
        canActivate: [roleGuard([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.M_SELLER, UserRole.A_MANAGER])],
        loadComponent: () => import('./pages/User/sellerlist/sellerlist.component').then(m => m.SellerlistComponent),
        title: 'Seller Management'
      },

      // Partners management — ADMIN / SUPERADMIN / M_SELLER / A_MANAGER
      {
        path: 'partners',
        canActivate: [roleGuard([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.M_SELLER, UserRole.A_MANAGER])],
        loadComponent: () => import('./pages/partners/partners.component').then(m => m.PartnersComponent),
        title: 'Partners'
      },
      // Consulting Advisors — ADMIN / SUPERADMIN / M_SELLER / A_MANAGER
      {
        path: 'consulting-advisors',
        canActivate: [roleGuard([UserRole.ADMIN, UserRole.SUPERADMIN, UserRole.M_SELLER, UserRole.A_MANAGER])],
        loadComponent: () => import('./pages/consulting-advisors/consulting-advisors.component').then(m => m.ConsultingAdvisorsComponent),
        title: 'Consulting Advisors'
      },

      // Campaigns — SUPERADMIN + MANAGER
      {
        path: 'campaigns',
        canActivate: [roleGuard([UserRole.SUPERADMIN, UserRole.MANAGER, UserRole.MARKETING])],
        children: [
          {
            path: '',
            loadComponent: () => import('./pages/campaigns/campaign-list/campaign-list.component').then(m => m.CampaignListComponent),
            title: 'Campaigns'
          },
          {
            path: 'create',
            loadComponent: () => import('./pages/campaigns/campaign-create/campaign-create.component').then(m => m.CampaignCreateComponent),
            title: 'Compose Campaign'
          },
          {
            path: 'edit/:id',
            loadComponent: () => import('./pages/campaigns/campaign-create/campaign-create.component').then(m => m.CampaignCreateComponent),
            title: 'Edit Campaign'
          }
        ]
      },

      // Marketing Automation — SUPERADMIN + MANAGER (same gate as Campaigns)
      {
        path: 'marketing',
        canActivate: [roleGuard([UserRole.SUPERADMIN, UserRole.MANAGER, UserRole.MARKETING])],
        children: [
          { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
          {
            path: 'dashboard',
            loadComponent: () => import('./pages/marketing/marketing-dashboard/marketing-dashboard.component').then(m => m.MarketingDashboardComponent),
            title: 'Marketing Dashboard'
          },
          {
            path: 'contacts',
            loadComponent: () => import('./pages/marketing/marketing-contacts/marketing-contacts.component').then(m => m.MarketingContactsComponent),
            title: 'Marketing Contacts'
          },
          {
            path: 'segments',
            loadComponent: () => import('./pages/marketing/marketing-segments/marketing-segments.component').then(m => m.MarketingSegmentsComponent),
            title: 'Segments'
          },
          {
            path: 'tags',
            loadComponent: () => import('./pages/marketing/marketing-tags/marketing-tags.component').then(m => m.MarketingTagsComponent),
            title: 'Marketing Tags'
          },
          {
            path: 'scoring',
            loadComponent: () => import('./pages/marketing/marketing-scoring/marketing-scoring.component').then(m => m.MarketingScoringComponent),
            title: 'Marketing Scoring'
          },
          // Later-phase capabilities — placeholder pages keep the nav complete and honest.
          {
            path: 'journeys',
            loadComponent: () => import('./pages/marketing/marketing-journeys/marketing-journeys.component').then(m => m.MarketingJourneysComponent),
            title: 'Journeys'
          },
          {
            path: 'automations',
            loadComponent: () => import('./pages/marketing/marketing-automations/marketing-automations.component').then(m => m.MarketingAutomationsComponent),
            title: 'Automations'
          },
          {
            path: 'emails',
            loadComponent: () => import('./pages/marketing/marketing-emails/marketing-emails.component').then(m => m.MarketingEmailsComponent),
            title: 'Emails'
          },
          {
            path: 'campaign-studio',
            loadComponent: () => import('./pages/marketing/campaign-studio/campaign-studio.component').then(m => m.CampaignStudioComponent),
            title: 'Campaign Studio'
          },
          {
            path: 'forms',
            loadComponent: () => import('./pages/marketing/marketing-forms/marketing-forms.component').then(m => m.MarketingFormsComponent),
            title: 'Forms'
          },
          {
            path: 'content',
            loadComponent: () => import('./pages/marketing/marketing-content/marketing-content.component').then(m => m.MarketingContentComponent),
            title: 'Landing Pages & Assets'
          },
          { path: 'channels', loadComponent: () => import('./pages/marketing/marketing-channels/marketing-channels.component').then(m => m.MarketingChannelsComponent), title: 'Marketing Channels' },
          {
            path: 'analytics',
            loadComponent: () => import('./pages/marketing/marketing-admin/marketing-admin.component').then(m => m.MarketingAdminComponent),
            title: 'Marketing Analytics'
          },
          { path: 'settings', loadComponent: () => import('./pages/marketing/marketing-admin/marketing-admin.component').then(m => m.MarketingAdminComponent), title: 'Marketing Settings' },
          { path: 'help', loadComponent: () => import('./pages/marketing/marketing-help/marketing-help.component').then(m => m.MarketingHelpComponent), title: 'Marketing Walkthrough' },
        ]
      },

      // Azure Marketplace — ADMIN / SUPERADMIN
      {
        path: 'azure-marketplace',
        canActivate: [roleGuard([UserRole.ADMIN, UserRole.SUPERADMIN])],
        children: [
          {
            path: '',
            loadComponent: () => import('./pages/azure-marketplace/azure-marketplace.component').then(m => m.AzureMarketplaceComponent),
            title: 'Azure Marketplace'
          },
          {
            path: 'review/:id',
            loadComponent: () => import('./pages/azure-marketplace/azure-marketplace-review/azure-marketplace-review.component').then(m => m.AzureMarketplaceReviewComponent),
            title: 'Azure Marketplace Review'
          }
        ]
      },

      // AWS Marketplace — ADMIN / SUPERADMIN
      {
        path: 'aws-marketplace',
        canActivate: [roleGuard([UserRole.ADMIN, UserRole.SUPERADMIN])],
        children: [
          {
            path: '',
            loadComponent: () => import('./pages/aws-marketplace/aws-marketplace.component').then(m => m.AwsMarketplaceComponent),
            title: 'AWS Marketplace'
          },
          {
            path: 'review/:id',
            loadComponent: () => import('./pages/aws-marketplace/aws-marketplace-review/aws-marketplace-review.component').then(m => m.AwsMarketplaceReviewComponent),
            title: 'AWS Marketplace Review'
          }
        ]
      },
    ]
  },

  // CRM — internal staff only (separate layout via CrmShellComponent)
  {
    path: 'crm',
    canActivate: [crmGuard],
    loadComponent: () => import('./pages/crm/crm-shell/crm-shell.component').then(m => m.CrmShellComponent),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', loadComponent: () => import('./pages/crm/crm-dashboard/crm-dashboard.component').then(m => m.CrmDashboardComponent), title: 'CRM Dashboard' },
      { path: 'dashboard-2', loadComponent: () => import('./pages/crm/crm-dashboard-2/crm-dashboard-2.component').then(m => m.CrmDashboard2Component), title: 'CRM Dashboard 2' },
      // ── Affiliate Progress (SuperAdmin additive view — existing dashboard unchanged) ──
      { path: 'affiliate-progress', loadComponent: () => import('./pages/affiliate/affiliate-progress/affiliate-progress.component').then(m => m.AffiliateProgressComponent), title: 'Affiliate Progress' },
      { path: 'leads', loadComponent: () => import('./pages/crm/crm-leads/crm-leads.component').then(m => m.CrmLeadsComponent), title: 'CRM Leads' },
      { path: 'accounts', loadComponent: () => import('./pages/crm/crm-accounts/crm-accounts.component').then(m => m.CrmAccountsComponent), title: 'CRM Accounts' },
      { path: 'contacts', loadComponent: () => import('./pages/crm/crm-contacts/crm-contacts.component').then(m => m.CrmContactsComponent), title: 'CRM Contacts' },
      { path: 'opportunities', loadComponent: () => import('./pages/crm/crm-opportunities/crm-opportunities.component').then(m => m.CrmOpportunitiesComponent), title: 'CRM Opportunities' },
      { path: 'opportunity-scoring', loadComponent: () => import('./pages/crm/crm-opp-scoring/crm-opp-scoring.component').then(m => m.CrmOppScoringComponent), title: 'Opportunity Scoring' },
      { path: 'customer-scoring', loadComponent: () => import('./pages/crm/crm-customer-scoring/crm-customer-scoring.component').then(m => m.CrmCustomerScoringComponent), title: 'Customer Scoring' },
      { path: 'activities', loadComponent: () => import('./pages/crm/crm-activities/crm-activities.component').then(m => m.CrmActivitiesComponent), title: 'CRM Activities' },
      { path: 'tasks', loadComponent: () => import('./pages/crm/crm-tasks/crm-tasks.component').then(m => m.CrmTasksComponent), title: 'CRM Tasks' },
      { path: 'audit-logs', loadComponent: () => import('./pages/crm/crm-audit-logs/crm-audit-logs.component').then(m => m.CrmAuditLogsComponent), title: 'CRM Audit Logs' },
      { path: 'users', loadComponent: () => import('./pages/crm/crm-users/crm-users.component').then(m => m.CrmUsersComponent), title: 'CRM Users' },
      { path: 'roles', loadComponent: () => import('./pages/crm/crm-roles/crm-roles.component').then(m => m.CrmRolesComponent), title: 'CRM Roles' },
      { path: 'permissions', loadComponent: () => import('./pages/crm/crm-permissions/crm-permissions.component').then(m => m.CrmPermissionsComponent), title: 'CRM Permissions' },
      { path: 'products', loadComponent: () => import('./pages/crm/crm-products/crm-products.component').then(m => m.CrmProductsComponent), title: 'CRM Products' },
      { path: 'quotes', loadComponent: () => import('./pages/crm/crm-quotes/crm-quotes.component').then(m => m.CrmQuotesComponent), title: 'CRM Quotes' },
      { path: 'sales-orders', loadComponent: () => import('./pages/crm/crm-sales-orders/crm-sales-orders.component').then(m => m.CrmSalesOrdersComponent), title: 'Sales Orders' },
      { path: 'invoices', loadComponent: () => import('./pages/crm/crm-invoices/crm-invoices.component').then(m => m.CrmInvoicesComponent), title: 'Invoices' },
      { path: 'profile', loadComponent: () => import('./pages/crm/crm-profile/crm-profile.component').then(m => m.CrmProfileComponent), title: 'My Profile' },
      { path: 'isv', loadComponent: () => import('./pages/crm/crm-isv/crm-isv.component').then(m => m.CrmIsvComponent), title: 'ISV List' },
      { path: 'isv-approved', loadComponent: () => import('./pages/isvapproved/isvapproved.component').then(m => m.IsvapprovedComponent), title: 'ISV Approved' },
      { path: 'verify/:id', loadComponent: () => import('./pages/product/aproval-isv/aproval-isv.component').then(m => m.AprovalIsvComponent), title: 'ISV Approval' },
      { path: 'display-isv/:id', loadComponent: () => import('./pages/display-isv/display-isv.component').then(m => m.DisplayIsvComponent), title: 'Display ISV' },
    ]
  },

  // ── Affiliate section — uses CRM shell layout ─────────────────────────────
  {
    path: 'affiliate',
    canActivate: [crmGuard],
    loadComponent: () => import('./pages/crm/crm-shell/crm-shell.component').then(m => m.CrmShellComponent),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard',     loadComponent: () => import('./pages/affiliate/affiliate-dashboard/affiliate-dashboard.component').then(m => m.AffiliateDashboardComponent),       title: 'Affiliate Dashboard' },
      { path: 'customers',     loadComponent: () => import('./pages/affiliate/affiliate-customers/affiliate-customers.component').then(m => m.AffiliateCustomersComponent),       title: 'Affiliate Customers' },
      { path: 'opportunities', loadComponent: () => import('./pages/affiliate/affiliate-opportunities/affiliate-opportunities.component').then(m => m.AffiliateOpportunitiesComponent), title: 'Affiliate Opportunities' },
      { path: 'scores',        loadComponent: () => import('./pages/affiliate/affiliate-scores/affiliate-scores.component').then(m => m.AffiliateScoresComponent),                title: 'Customer Scores' },
      { path: 'database',      loadComponent: () => import('./pages/affiliate/affiliate-database/affiliate-database.component').then(m => m.AffiliateDatabaseComponent),          title: 'Affiliate Database' },
      { path: 'campaigns',     loadComponent: () => import('./pages/affiliate/affiliate-campaigns/affiliate-campaigns.component').then(m => m.AffiliateCampaignsComponent),       title: 'Affiliate Campaigns' },
      { path: 'links',         loadComponent: () => import('./pages/affiliate/affiliate-links/affiliate-links.component').then(m => m.AffiliateLinksComponent),                   title: 'Affiliate Links' },
      { path: 'management',    loadComponent: () => import('./pages/affiliate/affiliate-management/affiliate-management.component').then(m => m.AffiliateManagementComponent),    title: 'Affiliate Management' },
      { path: 'conflicts',     loadComponent: () => import('./pages/affiliate/affiliate-conflicts/affiliate-conflicts.component').then(m => m.AffiliateConflictsComponent),        title: 'Attribution Conflicts' },
      { path: 'audit-log',     loadComponent: () => import('./pages/affiliate/affiliate-audit-log/affiliate-audit-log.component').then(m => m.AffiliateAuditLogComponent),         title: 'Affiliate Audit Log' },
    ]
  },

  // Wildcard (404) route
  {
    path: '**',
    redirectTo: 'dashboard',
  }
];
