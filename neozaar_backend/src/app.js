const express = require('express');
const cors = require('cors');
require('dotenv').config();

const pool = require('./config/database');
// Import routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const productRoutes = require('./routes/product.routes');
const enquiryRoutes = require('./routes/enquiry.routes');
const enumRoutes = require('./routes/enum.routes');
const contactRoutes = require('./routes/contact'); // Import contact routes
const cosell360Routes = require('./routes/cosell360'); // CoSell360 readiness assessment
const app = express();
const jwt = require('jsonwebtoken');
const catalogRoutes = require('./routes/catalog.route'); // Import catalog routes
const campaignsRoutes = require('./routes/campaigns.route'); // Campaigns composer routes
const IndustryRoutes = require('./routes/industry.routes');
const targetSegmentsRoutes = require("./routes/targetsegments.route");
const TargetAudienceRoutes = require('./routes/target.audience.route'); // Import target audience routes
const leadRoutes = require('./routes/lead.routes');
const CategoryRoutes = require('./routes/category.routes');
const SubCategoryRoutes = require('./routes/subcategory.routes');
const BrandRoutes = require('./routes/brand.routes');
const AdvertismentRoutes = require('./routes/advertisment.route'); // Import advertisment routes
const AskTheChampRoutes = require('./routes/askthechamp.routes'); // Import Ask The Champ routes
const HeroCarouselRoutes = require('./routes/heroCarousel.routes'); // Import Hero Carousel routes
const HeroWideBannerRoutes = require('./routes/heroWideBanner.routes'); // Import Hero Wide Banner routes
const CatalogHeroBannerRoutes = require('./routes/catalogHeroBanner.routes'); // Import Catalog Hero Banner routes
const ChatbotRoutes = require('./routes/chatbot.route'); // Import Chatbot routes

const HomemasterRoutes = require('./routes/homemaster.routes'); // Import Homemaster routes
// const session = require('express-session');
const dashboardRoutes = require('./routes/dashboard.routes');
const subscribeRoutes = require('./routes/subscribe.route'); // Import subscribe routes
const pricingRoutes = require('./routes/pricing.routes'); 
const CommissionRoutes = require('./routes/commission/commission.route');
const seoRoutes = require('./routes/seo/seo.route'); // Import SEO routes

const sellerRoutes = require('./routes/seller.routes');
const azureMarketplaceRoutes = require('./routes/azure-marketplace/azure.marketplace.routes');
const awsMarketplaceRoutes = require('./routes/aws-marketplace/aws.marketplace.routes');
const crmRoutes = require('./routes/crm/crm.routes');
const publicLeadsRoutes = require('./routes/crm/public.leads.routes');
const aiRoutes = require('./routes/ai/ai.routes');
const affiliateRoutes       = require('./routes/affiliate/affiliate.routes');
const affiliatePublicRoutes = require('./routes/affiliate/affiliate.public.routes');

const trackRoute = require("./routes/track");
const consentRoute = require("./routes/consent");
const consentPublicRoutes = require("./routes/consent.public.routes");
const authMiddleware = require("./middlewares/auth");
const contextMiddleware = require("./middlewares/context.middleware");

// const contextMiddleware = require("./middleware/context.middleware");

// Middlewares
const allowedOrigins = ['http://localhost:3000','http://localhost:3001','https://neozaar.com' ,'https://www.neozaar.com', 'http://localhost:4200', 'http://135.235.138.35', 'http://72.61.251.15', 'https://72.61.251.15', 'http://72.61.244.75', 'http://72.61.244.75', 'http://135.235.138.35/app', 'https://135.235.138.35/app']; // List of allowed frontend URLs

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Allow cookies/headers to be sent
}));

app.use(express.json());
const path = require('path');
app.use('/images', express.static(path.join(__dirname, '../public/images')));
app.use('/assets/images', express.static(path.join(__dirname, '../../assets/images')));
// app.use(session({
//   name:'token',
//   secret: process.env.SESSION_SECRET || 'mySecretKey',
//   resave: false,
//   saveUninitialized: false,
//   cookie: { 
//     secure: false, 
//     httpOnly: true
//   }
// }));
app.use('/api', authRoutes);                // Auth routes
app.use('/api/user', userRoutes);           // User routes
app.use('/api/subscribe', subscribeRoutes); // Subscribe routes
app.use('/api', contactRoutes);
app.use('/api', cosell360Routes);

// Routes
app.use('/api/products', productRoutes);    // Product routes
app.use('/api/enquiries', enquiryRoutes);   // Enquiry routes
app.use('/api/enums', enumRoutes);          // Enum routes
app.use('/api/catalog', catalogRoutes);        // Contact routes
app.use('/api/campaigns', campaignsRoutes);    // Campaigns composer routes
// More specific /api/marketing/* sub-paths MUST be mounted before the
// generic /api/marketing (marketing.route.js) below — Express matches
// app.use() prefixes in registration order, not by specificity, and
// marketing.route.js applies a blanket requireMarketingManager to every
// request that reaches it. Mounting it first would intercept requests to
// /automations and /platform before their own (granular, for /platform)
// middleware ever runs.
app.use('/api/marketing', require('./routes/marketing-tracking.route')); // Public asynchronous tracking + identity stitch
app.use('/api/marketing/email',require('./routes/marketing-email.route'));
app.use('/api/marketing/forms',require('./routes/marketing-forms.route'));
app.use('/api/marketing/content',require('./routes/marketing-content.route')); // Landing pages and tracked marketing assets
app.use('/api/marketing/contact-admin',require('./routes/marketing-contacts-admin.route')); // Import/export, custom fields and notes
app.use('/api/marketing/preferences', require('./routes/marketing-preferences.route')); // Public self-service consent/subscription center
app.use('/api/marketing/automations', require('./routes/marketing-automation.route')); // Backend automation definitions/executions
app.use('/api/marketing/platform', require('./routes/marketing-platform.route')); // Journeys, attribution, channels and administration
app.use('/api/marketing', require('./routes/marketing.route')); // Marketing management API
app.use('/api/public-links', require('./routes/publicLinks.route')); // Public shareable links + engagement events
app.use('/api/lead', leadRoutes);
app.use('/api/industries', IndustryRoutes);
app.use('/api/target-segments',targetSegmentsRoutes);
app.use('/api/target-audience', TargetAudienceRoutes); // Target audience routes
app.use('/api/advertisment', AdvertismentRoutes); // Advertisment routes
app.use('/api/ask-the-champ', AskTheChampRoutes); // Ask The Champ routes
app.use('/api/hero-carousel', HeroCarouselRoutes); // Hero Carousel routes
app.use('/api/hero-wide-banner', HeroWideBannerRoutes); // Hero Wide Banner routes
app.use('/api/catalog-hero-banner', CatalogHeroBannerRoutes); // Catalog Hero Banner routes
app.use('/api/categories',CategoryRoutes);
app.use('/api/sub-categories', SubCategoryRoutes);
app.use('/api/brands', BrandRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/instructions', ChatbotRoutes); // Chatbot routes
app.use('/api/pricing', pricingRoutes);
app.use('/api/commision', CommissionRoutes);
app.use('/api/seo', seoRoutes); // SEO routes
app.use('/api/homemaster', HomemasterRoutes); // Homemaster routes
app.use('/api/seller', sellerRoutes); // Seller routes
app.use('/api/azure-marketplace', azureMarketplaceRoutes); // Azure Marketplace routes
app.use('/api/aws-marketplace', awsMarketplaceRoutes); // AWS Marketplace routes
app.use('/api/internal/crm', crmRoutes); // CRM internal routes
app.use('/api/internal/partners', require('./routes/internal.partners.routes')); // Partners management
app.use('/api/internal/whatsapp', require('./routes/whatsapp.routes')); // WhatsApp conversation log (SUPER_ADMIN)
app.use('/api/public/leads', publicLeadsRoutes); // CRM public lead capture
app.use('/api/consent', consentPublicRoutes); // DPDPA consent capture (anonymous, no auth) — POST /events, GET /notice
app.use('/api/ai', aiRoutes); // AI Proposal Studio (Neo) routes
// Public click/token routes must run before the internal router's JWT middleware.
// Unmatched paths still continue into the protected affiliate router.
app.use('/api/affiliate', affiliatePublicRoutes);         // Affiliate public (no auth)
app.use('/api/affiliate', affiliateRoutes);              // Affiliate internal (JWT required)

// Health check endpoint
app.get('/', (req, res) => {
  res.send('NeoZaar API Server');
});

// Health check with status
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date(),
    uptime: process.uptime()
  });
});

// Same check, reachable through the public /api/* proxy (bare /health isn't
// forwarded by nginx — only /api/* and /webhook/* are). Used for external
// uptime monitors (e.g. Site24x7).
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date(),
    uptime: process.uptime()
  });
});

app.use(authMiddleware);      // 1️⃣ decode JWT
app.use(contextMiddleware);   // 2️⃣ store user in context

app.use("/api/track", trackRoute);
app.use("/api/track", require("./routes/admin/track.routes"));

app.use("/api/consent", consentRoute);

app.use("/api/consent", require("./routes/admin/consent.routes"));
app.use("/api/admin/consent", require("./routes/admin/consent.audit.routes")); // Consent Audit Console (SUPER_ADMIN)
app.use("/api/admin", require("./routes/admin/admin.routes"));
app.use("/api/admin/trash", require("./routes/admin/trash.routes"));

// logout

app.post('/api/logout', (req, res) => {
  const authHeader = req.headers['authorization'];
  // console.log('Authorization header:', authHeader); // Add this

  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(400).json({ error: 'Token missing or invalid format' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = null;
    // req.clearCookie('token')
    return res.json({ message: 'Logged out successfully' });
  } catch (err) {
    // console.error('JWT Error:', err.message); // Add this
    return res.status(401).json({ error: 'Invalid token' });
  }
});



// Database connection check
pool.connect()
  .then(client => {
    console.log('PostgreSQL connected');
    client.release();
  })
  .catch(err => {
    console.error('Failed to connect to PostgreSQL:', err.message);
    process.exit(1);
  });

module.exports = app;
