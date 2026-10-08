Cloud Service Pricing Calculator — version 50
Source commit: f465b0ce12f4541050754586ca76c7258ccc66d2

Includes complete source, built Cloudflare Worker (dist/server/index.js), catalogue, proposal template and SQL migrations.
Build: npm run build
Validate: npm run validate
Preview: npm run dev
Requires modern Node.js supporting import.meta.dirname.

For Cloudflare Workers, deploy dist/server/index.js. A wrangler.json.example is included; rename it to wrangler.json and set your D1 database ID. Create a D1 database, apply migrations in drizzle/ in filename order, and bind it as DB.

The calculator can use its built-in catalogue without DB, but admin editing requires DB. Existing live database overrides, custom entries and settings are NOT included in this source export; migrate your live database separately to preserve them.

Admin authentication currently uses a trusted oai-authenticated-user-email header supplied by ChatGPT Sites. On another host, replace it with verified authentication and strip client-supplied identity headers before enabling admin access. Do not trust that header directly on a public external Worker.
