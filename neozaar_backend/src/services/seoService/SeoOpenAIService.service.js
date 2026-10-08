const SeoModel = require('../../models/SeoModel/SeoModel.js');
const { Op } = require('sequelize');
const slugify = require('slugify');

class SeoOpenAIService {

    constructor() {
        // SEO metadata is generated purely from product/brand fields (slug,
        // meta tags, schema). No OpenAI client is used or instantiated here.
        this.baseUrl = (process.env.FRONTEND_URL || "https://neozaar.com/").replace(/\/$/, "");
    }

    extractJson(text) {
        if (!text) return null;

        try {
            const start = text.indexOf("{");
            const end = text.lastIndexOf("}");
            if (start !== -1 && end !== -1) {
                const json = text.substring(start, end + 1);
                return JSON.parse(json);
            }
        } catch (e) {}
        return null;
    }

    /**
     * 🚀 Generate Product SEO (Auto SLUG, Auto Keywords, JSON-LD Schema)
     */ 
    async generateSEO(data) {
        const {
            name,
            description = "",
            action_type = "product", // product | marketplace | page
            category = [],
            subcategory = [],
            brand_name = "",
            price,
            currency = "INR"
        } = data;
        const page_type = action_type;

        // ------------------------------------
        // ✅ SLUG + URL STRUCTURE (SEO CRITICAL)
        // ------------------------------------
        const baseKeyword = name || brand_name || category?.[0] || "product";

        const slug = slugify(baseKeyword, { lower: true, strict: true }) 
            || `page-${Date.now()}`;

        let page_url = "";
        let canonical_url = "";

        if (page_type === "product") {
            page_url = `/product/${slug}`;
        } else if (page_type === "service") {
            page_url = `/service/${slug}`;
        } else if (page_type === "solution") {
            page_url = `/solution/${slug}`;
        } else {
            page_url = `/${slug}`;
        }

        canonical_url = `${this.baseUrl}${page_url}`;

        // ------------------------------------
        // ✅ KEYWORD ENGINE (VERY IMPORTANT)
        // ------------------------------------
        const keywords = [
            name,
            brand_name,
            ...(category || []),
            ...(subcategory || []),
            `${baseKeyword} marketplace`,
            `${baseKeyword} solutions`,
            `${baseKeyword} SaaS`,
            `${baseKeyword} tools`,
        ]
            .filter(Boolean)
            .map(k => k.toLowerCase());

        const uniqueKeywords = [...new Set(keywords)].slice(0, 12);

        // ------------------------------------
        // ✅ META TITLE (NO DUPLICATION)
        // ------------------------------------
        let meta_title = `${baseKeyword} Solutions | NeoZaar`;

        if (page_type === "product") {
            meta_title = `${name} by ${brand_name} | NeoZaar`;
        }

        meta_title = meta_title.slice(0, 60);

        // ------------------------------------
        // ✅ META DESCRIPTION (CTR FOCUSED)
        // ------------------------------------
        let meta_description = description ? description.slice(0, 150) : `Explore ${baseKeyword} solutions on NeoZaar marketplace. Compare features, pricing & deploy easily.`;

        meta_description = meta_description.slice(0, 160);

        // ------------------------------------
        // ✅ OPEN GRAPH + TWITTER
        // ------------------------------------
        const og_title = meta_title;
        const og_description = meta_description;

        // ------------------------------------
        // ✅ SCHEMA MARKUP (UPGRADED)
        // ------------------------------------
        let schema_markup = {};

        if (page_type === "product") {
            schema_markup = {
                "@context": "https://schema.org",
                "@type": "Product",
                name,
                description,
                brand: {
                    "@type": "Brand",
                    name: brand_name
                },
                offers: {
                    "@type": "Offer",
                    price: price || "",
                    priceCurrency: currency,
                    availability: "https://schema.org/InStock"
                },
                url: canonical_url
            };
        } else {
            schema_markup = {
                "@context": "https://schema.org",
                "@type": "WebPage",
                name: meta_title,
                description: meta_description,
                url: canonical_url
            };
        }

        // ------------------------------------
        // ✅ BREADCRUMB SCHEMA (VERY IMPORTANT FOR SEO)
        // ------------------------------------
        const breadcrumb_schema = {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
                {
                    "@type": "ListItem",
                    position: 1,
                    name: "Home",
                    item: this.baseUrl
                },
                {
                    "@type": "ListItem",
                    position: 2,
                    name: page_type,
                    item: `${this.baseUrl}/${page_type}`
                },
                {
                    "@type": "ListItem",
                    position: 3,
                    name: baseKeyword,
                    item: canonical_url
                }
            ]
        };

        // ------------------------------------
        // ✅ FINAL RESPONSE
        // ------------------------------------
        return {
            slug,
            meta_title,
            meta_description,
            meta_keywords: uniqueKeywords.join(", "),
            h1_title: name || baseKeyword,
            canonical_url,
            og_title,
            og_description,
            og_image: "",
            twitter_title: og_title,
            twitter_description: og_description,
            twitter_image: "",
            schema_markup: JSON.stringify(schema_markup),
            breadcrumb_schema: JSON.stringify(breadcrumb_schema),
            page_url
        };
    }

    async generateBrandSEO(brand) {
        const baseName = brand.name;

        // ✅ SLUG
        const slug = slugify(baseName, { lower: true, strict: true });

        const page_url = `/brand/${slug}`;
        const canonical_url = `${this.baseUrl}${page_url}`;
        const baseUrl = this.baseUrl;

        // ✅ KEYWORDS (IMPORTANT)
        const keywords = [
            `${baseName} cloud`,
            `${baseName} marketplace`,
            `${baseName} SaaS`,
            `${baseName} solutions`,
            `${baseName} tools`,
            `${baseName} products`,
            `buy ${baseName} services`,
            `${baseName} platform`
        ];

        // ✅ META TITLE
        const meta_title = `${baseName} Solutions & Products | NeoZaar`
            .slice(0, 60);

        // ✅ META DESCRIPTION
        const meta_description = (
            brand.description ||
            `Explore ${baseName} products, cloud solutions and SaaS tools on NeoZaar marketplace. Compare features, pricing & deploy easily.`
        ).slice(0, 160);

        // ✅ SCHEMA (WebPage + Organization)
        const schema_markup = {
            "@context": "https://schema.org",
            "@type": "CollectionPage",
            "name": `${baseName} Products`,
            "description": meta_description,
            "url": canonical_url
        };

        // ✅ BREADCRUMB
        const breadcrumb_schema = {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
            {
                "@type": "ListItem",
                "position": 1,
                "name": "Home",
                "item": baseUrl
            },
            {
                "@type": "ListItem",
                "position": 2,
                "name": "Marketplace",
                "item": `${baseUrl}/marketplace`
            },
            {
                "@type": "ListItem",
                "position": 3,
                "name": baseName,
                "item": canonical_url
            }
            ]
        };

        return {
            page_type: 'brand',
            slug,
            page_url,
            meta_title,
            meta_description,
            meta_keywords: keywords.join(', '),
            h1_title: `${baseName} Products & Solutions`,
            canonical_url,

            og_title: meta_title,
            og_description: meta_description,
            og_image: brand.icon || "",

            twitter_title: meta_title,
            twitter_description: meta_description,
            twitter_image: brand.icon || "",

            schema_markup: JSON.stringify(schema_markup),
            breadcrumb_schema: JSON.stringify(breadcrumb_schema),

            robots_meta: 'index, follow'
        };
    }

    /**
     * Save or Update SEO in DB
     */
    async saveSEO(page_id, seo) {
        console.log("Saving SEO for page_id:", page_id, "page_name:", seo.h1_title);
        try {
            const exists = await SeoModel.findOne({
                where: { page_id, page_name: seo.h1_title }
            });

            const exists1 = await SeoModel.findOne({
                where: { slug: seo.slug }
            });


            const payload = {
                page_id,
                page_name: seo.h1_title || seo.meta_title,
                page_url: seo.page_url,
                slug: seo.slug,
                page_type: seo.page_type || 'product',

                meta_title: seo.meta_title,
                meta_description: seo.meta_description,
                meta_keywords: seo.meta_keywords,

                h1_title: seo.h1_title,
                canonical_url: seo.canonical_url,

                // ------------------------------------
                // SCHEMA
                // ------------------------------------
                schema_markup: seo.schema_markup,
                breadcrumb_schema: seo.breadcrumb_schema,
                faq_schema: seo.faq_schema || null,

                // ------------------------------------
                // SOCIAL
                // ------------------------------------
                og_title: seo.og_title,
                og_description: seo.og_description,
                og_image: seo.og_image,

                twitter_title: seo.twitter_title,
                twitter_description: seo.twitter_description,
                twitter_image: seo.twitter_image,

                // ------------------------------------
                // ROBOTS
                // ------------------------------------
                robots_meta: seo.robots_meta || 'index, follow',
                is_follow: seo.is_follow ?? 1,
                is_index: seo.is_index ?? 1,

                // ------------------------------------
                // STATUS
                // ------------------------------------
                status: 'active'
            };

            if (exists) {
                await exists.update(payload);
                return exists;
            }
            if(exists1) {
                await exists1.update(payload);
                return exists1;
            }

            return await SeoModel.create(payload);

        } catch (err) {
            console.error("SEO DB Save Error:", err);
            throw new Error("Failed to save SEO.");
        }
    }
}

module.exports = SeoOpenAIService;
