import { Component, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormArray, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';


type ServiceType =
  | 'Migration'
  | 'Modernization'
  | 'FinOps'
  | 'Managed Services'
  | 'Premium Support'
  | 'Professional Services';

  type CloudPlatform = 'AWS' | 'Azure' | 'GCP' | 'Multi-Cloud';
type Region =
  | 'India'
  | 'Middle East'
  | 'APAC'
  | 'EMEA'
  | 'North America'
  | 'Global';

  type FundingAlignment = 'AWS MAP' | 'Azure AMMP' | 'GCP Modernization Program' | 'None';
type PricingModel = 'Fixed' | 'Starting From' | 'Custom Quote';
type BillingFrequency = 'One-Time' | 'Monthly' | 'Annual';

@Component({
  selector: 'app-marketplace-service',
  standalone: true,
 imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './marketplace-service.component.html',
  styleUrl: './marketplace-service.component.css',
   changeDetection: ChangeDetectionStrategy.OnPush
})
export class MarketplaceServiceComponent {

  serviceTypes: ServiceType[] = [
    'Migration',
    'Modernization',
    'FinOps',
    'Managed Services',
    'Premium Support',
    'Professional Services'
  ];

  cloudPlatforms: CloudPlatform[] = ['AWS', 'Azure', 'GCP', 'Multi-Cloud'];

  regions: Region[] = ['India', 'Middle East', 'APAC', 'EMEA', 'North America', 'Global'];

  targetAudiences = ['ISVs', 'SaaS Vendors', 'Startups', 'Mid-Market', 'Enterprise', 'Public Sector'];

  industries = ['Retail', 'BFSI', 'Manufacturing', 'Healthcare', 'Education', 'Technology', 'ITIES'];

  modernizationOrMigrationTypes = ['Rehost', 'Replatform', 'Refactor', 'Rebuild', 'Optimize', 'Manage'];

  fundingAlignments: FundingAlignment[] = ['AWS MAP', 'Azure AMMP', 'GCP Modernization Program', 'None'];

  pricingModels: PricingModel[] = ['Fixed', 'Starting From', 'Custom Quote'];

  billingFrequencies: BillingFrequency[] = ['One-Time', 'Monthly', 'Annual'];

  form: FormGroup;

  // Fixed CTA text per spec
  readonly fixedCtaText = 'Book a Call with an Expert';

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      // 1) Offer Basics
      offerTitle: ['', [Validators.required, Validators.maxLength(120)]],
      serviceType: ['Modernization', [Validators.required]],
      cloudPlatform: [<CloudPlatform[]>['AWS'], [Validators.required]],
      serviceAvailability: [<Region[]>['Global'], [Validators.required]],
      shortTagline: ['', [Validators.required, Validators.maxLength(140)]],
      startingPriceUsd: ['Starting at $2,950', [Validators.required, Validators.maxLength(40)]],
      duration: ['As per Scope', [Validators.required, Validators.maxLength(60)]],

      // 2) Description
      overview: ['', [Validators.required, Validators.minLength(30)]],
      keyOutcomes: ['', [Validators.required, Validators.minLength(20)]],
      targetAudience: [['ISVs', 'SaaS Vendors']],
      industryFocus: [['Technology']],

      // 3) Technical & Service Scope
      serviceComponents: ['', [Validators.required, Validators.minLength(20)]],
      primaryTechnologies: ['', [Validators.required, Validators.minLength(10)]],
      engagementModel: ['Fixed Fee', [Validators.required]],
      modernizationOrMigrationType: ['Optimize', [Validators.required]],
      fundingAlignment: [['None']],
      servicesSupportedByPartner: ['NeoZaar', [Validators.required, Validators.maxLength(80)]],

      // 4) Pricing & Commercials
      pricingModel: ['Starting From', [Validators.required]],
      privateOfferAvailable: [true],
      billingFrequency: ['One-Time', [Validators.required]],

      // 5) Marketing Assets (paths/URLs or filenames)
      bannerImage: [''],
      offerIcon: [''],
      datasheet: [''],
      caseStudy: [''],

      // 6) Contact & CTA
      contactEmail: ['neozaar@neozaar.com', [Validators.required, Validators.email]],
      contactPerson: ['Rajesh Thadhani', [Validators.required, Validators.maxLength(80)]],
      ctaText: [{ value: this.fixedCtaText, disabled: true }],
      ctaUrl: ['https://neozaar.com/book-a-call', [Validators.required]],

      // Hidden/auto field for routing tag (derived from email)
      serviceProviderTag: ['NeoZaar'],

      // Optional internal metadata
      internal: this.fb.group({
        offerOwner: ['Nova (GTM Agent)'],
        technicalReviewer: ['Neo (AI Onboarding Agent)'],
        listingStage: ['Draft'],
        marketplaceOfferId: ['']
      })
    });
  }

  get payload() {
    // Build the exact JSON spec you want to send to your backend
    const raw = this.form.getRawValue(); // includes disabled fields (ctaText)
    return {
      basics: {
        offerTitle: raw.offerTitle,
        serviceType: raw.serviceType,
        cloudPlatform: raw.cloudPlatform,
        serviceAvailability: raw.serviceAvailability,
        shortTagline: raw.shortTagline,
        startingPriceUsd: raw.startingPriceUsd,
        duration: raw.duration
      },
      description: {
        overview: raw.overview,
        keyOutcomes: raw.keyOutcomes,
        targetAudience: raw.targetAudience,
        industryFocus: raw.industryFocus
      },
      scope: {
        serviceComponents: raw.serviceComponents,
        primaryTechnologies: raw.primaryTechnologies,
        engagementModel: raw.engagementModel,
        modernizationOrMigrationType: raw.modernizationOrMigrationType,
        fundingAlignment: raw.fundingAlignment,
        servicesSupportedByPartner: raw.servicesSupportedByPartner
      },
      commercials: {
        pricingModel: raw.pricingModel,
        startingPriceUsd: raw.startingPriceUsd,
        privateOfferAvailable: raw.privateOfferAvailable,
        billingFrequency: raw.billingFrequency
      },
      assets: {
        bannerImage: raw.bannerImage,
        offerIcon: raw.offerIcon,
        datasheet: raw.datasheet,
        caseStudy: raw.caseStudy
      },
      contact: {
        contactEmail: raw.contactEmail,
        contactPerson: raw.contactPerson,
        ctaText: raw.ctaText, // disabled field is included by getRawValue()
        ctaUrl: raw.ctaUrl,
        serviceProviderTag: this.computeServiceProviderTag(raw.contactEmail, raw.servicesSupportedByPartner)
      },
      internal: raw.internal
    };
  }

  computeServiceProviderTag(email: string, partnerName: string): string {
    // Simple routing tag: "<PartnerName> | <email>"
    const safePartner = (partnerName || 'NeoZaar').trim();
    return `${safePartner} | ${email.toLowerCase()}`;
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      alert('Please complete the required fields.');
      return;
    }
    // Here you would POST this.payload to your API
    console.log('SUBMIT PAYLOAD', this.payload);
    alert('Listing payload ready. Check console for JSON.');
  }

  copyJson() {
    const json = JSON.stringify(this.payload, null, 2);
    navigator.clipboard.writeText(json).then(() => {
      alert('JSON copied to clipboard!');
    });
  }

}
