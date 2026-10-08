export const seoconfig = {
  default: {
    title: "NeoZaar — Enterprise Outcomes, Delivered.",
    description:
      "NeoZaar helps SaaS and ISVs grow across AWS, Azure, and GCP marketplaces with private offers, co-sell, and AI-powered GTM automation.",
    keywords:
      "cloud marketplace, SaaS marketplace, cloud GTM, ISV growth, co-sell, AWS marketplace, Azure marketplace, GCP marketplace, NeoZaar",
    url: process.env.NEXT_PUBLIC_SITE_URL || "https://www.neozaar.com",
    image: "/images/og-home.jpg",
    locale: "en_US",
    siteName: "NeoZaar",
  },

  analytics: {
    googleAnalyticsId: "G-88XST2Y1BK",
    facebookPixelId: "123456789012345",
  },

  pages: {
    home: {
      title: "NeoZaar | Fast-Track Co-Sell, Private Offers & ISV Growth",
      description:
        "NeoZaar helps SaaS and ISVs grow across AWS, Azure, and GCP marketplaces with private offers, co-sell, and AI-powered GTM automation.",
      canonical: `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.neozaar.com"}/`,
      keywords:
        "cloud marketplace, SaaS marketplace, cloud solutions, cloud bundles, AWS marketplace partner, Azure EDP accelerator, curated SaaS bundles, ISV enablement, cloud modernization, FinOps, AI for cloud buyers, NeoZaar marketplace, NeoZaar CoSell360, NeoZaar bundles",
     siteName: "NeoZaar",
     icons: {
    icon: "/assests/Favicon _Neozaar.ico",
  },
     robots: {
    index: true,
    follow: true,
     type: "website",
    locale: "en_US",
  },
      },

    marketplace: {
      title: "Marketplace | Explore Cloud Solutions | NeoZaar",
      description:
        "Browse verified SaaS and cloud bundles on NeoZaar Marketplace — aligned with AWS, Azure & GCP ecosystems.",
      canonical: `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.neozaar.com"}/marketplace/`,
      keywords:
        "cloud marketplace, SaaS marketplace, AWS marketplace listings, Azure marketplace solutions, GCP marketplace bundles, enterprise SaaS, NeoZaar marketplace, NeoZaar bundles",
    },

    isv: {
      title: "ISV Registration | List Your SaaS on NeoZaar Marketplace",
      description:
        "Register as an ISV and list your SaaS, AI, or cloud solution on NeoZaar. Unlock co-sell growth and marketplace visibility.",
      canonical: `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.neozaar.com"}/isv-registration/`,
      keywords:
        "ISV registration, SaaS listing, cloud marketplace onboarding, ISV partner program, AWS ISV onboarding, Azure marketplace partner, co-sell enablement, private offers, NeoZaar ISV registration, NeoZaar CoSell360, NeoZaar partner program",
    },

    solutionPartner: {
      title: "Solution Partner Registration | NeoZaar",
      description:
        "Turn Your Microsoft & AWS Capabilities Into More Customer Opportunities. Register as a NeoZaar Solution Partner and convert your cloud, security, data, AI, migration or managed-services expertise into recurring revenue.",
      canonical: `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.neozaar.com"}/solution-partner/`,
      keywords:
        "solution partner, Microsoft solutions partner, AWS services partner, cloud partner program, managed services partner, NeoZaar solution partner, ISV ecosystem, co-sell, private offers, cloud migration partner, security partner, AI partner, managed services revenue",
      openGraph: {
        title: "Solution Partner Registration | NeoZaar",
        description: "Turn Your Microsoft & AWS Capabilities Into More Customer Opportunities. Join NeoZaar as a Solution Partner.",
        type: "website",
      },
    },

    consultingAdvisor: {
      title: "Consulting Advisor Registration | NeoZaar",
      description:
        "Turn Trusted Relationships Into Revenue Opportunities. Register as a Consulting Advisor with NeoZaar and connect customer needs to the right ISVs, Solution Partners, services and hyperscaler-aligned commercial options.",
      canonical: `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.neozaar.com"}/consulting-advisor/`,
      keywords:
        "consulting advisor, NeoZaar advisor program, technology advisor, referral partner, revenue share, ISV ecosystem, solution partners, hyperscaler, opportunity referral, advisory program",
      openGraph: {
        title: "Consulting Advisor Registration | NeoZaar",
        description: "Turn Trusted Relationships Into Revenue Opportunities. Join NeoZaar as a Consulting Advisor.",
        type: "website",
      },
    },

    proposalStudio: {
      title: "Proposal Studio | Build Your Request with Neo AI | NeoZaar",
      description:
        "Tell Neo what you need. In a few guided steps, Neo AI turns your business challenge into a structured requirement, indicative BOM and SOW — ready for a NeoZaar proposal.",
      canonical: `${process.env.NEXT_PUBLIC_SITE_URL || "https://www.neozaar.com"}/proposal-studio/`,
      keywords:
        "proposal studio, Neo AI, solution advisor, requirement builder, indicative BOM, indicative SOW, structured requirement, NeoZaar",
      openGraph: {
        title: "Proposal Studio | Build Your Request with Neo AI | NeoZaar",
        description: "Tell Neo what you need. Neo will help you build the rest — from your initial need to a structured proposal request.",
        type: "website",
      },
    },
  },
};
