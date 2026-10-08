import {
  sendWhatsAppMessage,
  sendWhatsAppButtons,
  sendWhatsAppList,
  sendWhatsAppCtaUrl,
  markAsRead,
} from "./whatsappService.js";
import { getSession, saveSession, clearSession, pushHistory } from "./sessionStore.js";
import {
  getSolutionCategories,
  searchSolutions,
  getSolutionById,
  searchProducts,
  getProductById,
  getProductForOffer,
  getServiceCategories,
  searchServices,
  getServiceById,
} from "./catalogService.js";
import { resolveIntent, looksLikeExpertRequest } from "./intentService.js";
import { buildStudioLink, hasUsefulContext, startingPointLines } from "./proposalStudio.js";
import { submitCommercialRequest } from "./crmService.js";
import { notifyExpertHandoff } from "./expertService.js";
import { logInbound, isOptedOut, setOptOut } from "./messageLog.js";
import { withConversationLock, isHumanConversation, humanOptOutChange } from "./conversationControl.js";

/**
 * Neo — the NeoZaar WhatsApp concierge.
 *
 * WhatsApp is the engagement / discovery / routing layer only:
 *   DISCOVER  solution / product / service   (this bot)
 *   DESIGN    Proposal Studio                (deep requirement work — off-platform)
 *   BUY       Commercial Offer               (short capture here, team follows up)
 *   TALK      NeoZaar expert                 (always one tap away)
 *
 * No deep discovery / scoping happens here (no workload counts, users, servers,
 * architecture, BOM). Catalogue answers come only from catalogService (approved,
 * published rows); nothing invents availability, pricing or eligibility.
 */

/* ─────────────────────────────── option catalogue ─────────────────────────────── */

const NAV = {
  expert: { id: "act_expert", title: "Speak to an Expert" },
  menu: { id: "nav_menu", title: "Back to Menu" },
  build: { id: "act_build", title: "Build My Requirement" },
};

const MENU = [
  { id: "menu_solution", title: "Find a Solution" },
  { id: "menu_product", title: "Find a Product" },
  { id: "menu_service", title: "Find a Service" },
  { id: "menu_build", title: "Build My Requirement" },
  { id: "menu_offer", title: "Get a Commercial Offer" },
  { id: "menu_expert", title: "Speak to an Expert" },
];

const ROUTE_OPTS = [
  { id: "route_aws", title: "AWS Marketplace", value: "AWS Marketplace" },
  { id: "route_ms", title: "Microsoft Marketplace", value: "Microsoft Marketplace" },
  { id: "route_neozaar", title: "Transact with NeoZaar", value: "Transact with NeoZaar" },
  { id: "route_unsure", title: "Not Sure", value: "Not Sure" },
];

const INTENT_OPTS = [
  { id: "ci_best", title: "Best Commercial Offer", value: "Best Commercial Offer" },
  { id: "ci_standard", title: "Standard Pricing", value: "Standard Pricing" },
  { id: "ci_negotiated", title: "Already Negotiated", value: "Already Negotiated" },
];

const SERVICES_OPTS = [
  { id: "sv_yes", title: "Yes — Build My Requirement", value: "build_requirement" },
  { id: "sv_software", title: "Software Only", value: "software_only" },
  { id: "sv_unsure", title: "Not Sure", value: "requires_discussion" },
];

const EXPERT_TOPICS = [
  { id: "et_solution", title: "Solution Advice" },
  { id: "et_product", title: "Product / Licensing" },
  { id: "et_services", title: "Services" },
  { id: "et_offer", title: "Commercial Offer" },
  { id: "et_other", title: "Something Else" },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* ─────────────────────────────── small helpers ─────────────────────────────── */

const iso = () => new Date().toISOString();
const wordy = (s) => String(s || "").trim().split(/\s+/).filter(Boolean).length >= 4;
const cleanOutcome = (s) => String(s || "").trim().replace(/\s+/g, " ").slice(0, 240);

/**
 * The floating "Chat with Neo" button prefills a "Hi Neo … find, build or buy …"
 * opener. That contains the word "buy", which would otherwise be read as offer
 * intent — so recognise the opener and just show the welcome menu instead.
 * (A genuine "hi neo, I want <product> pricing" still routes normally.)
 */
function isButtonOpener(low) {
  return (
    /^\s*(hi|hey|hello)\s+neo\b/.test(low) &&
    /\bfind\b/.test(low) &&
    /\bbuild\b/.test(low) &&
    /\bbuy\b/.test(low)
  );
}

function freshSessionShape(phone) {
  return { phone, state: null, context: { history: [] }, lastIntent: null, messageCount: 1, isNew: true };
}

function normaliseInbound(from, text, inbound) {
  if (inbound && inbound.from) {
    return { ...inbound, text: (inbound.text ?? text ?? "").toString() };
  }
  return { from, text: (text ?? "").toString(), choiceId: null, choiceTitle: null, type: "text", messageId: null };
}

/** Resolve an inbound message to one option's value: by reply id, exact title, 1-based number, then loose contains. */
function pick(msg, options) {
  const val = (o) => o.value ?? o.id;
  if (msg.choiceId) {
    const byId = options.find((o) => o.id === msg.choiceId);
    if (byId) return val(byId);
  }
  const t = (msg.text || "").trim().toLowerCase();
  if (!t) return null;
  const byTitle = options.find((o) => o.title.toLowerCase() === t);
  if (byTitle) return val(byTitle);
  if (/^\d+$/.test(t)) {
    const i = parseInt(t, 10) - 1;
    if (i >= 0 && i < options.length) return val(options[i]);
  }
  const loose = options
    .filter((o) => {
      const ot = o.title.toLowerCase();
      return ot.includes(t) || t.includes(ot);
    })
    .sort((a, b) => a.title.length - b.title.length)[0];
  return loose ? val(loose) : null;
}

async function safeSend(fn) {
  try {
    return await fn();
  } catch (err) {
    console.error("send failed:", err.response?.data?.error?.message || err.message);
  }
}

/** Run a search; if a multi-word query misses, retry on its longer words. */
async function looseSearch(fn, query, opts) {
  const q = String(query || "").trim();
  if (!q) return [];
  let items = await fn(q, opts);
  if (items.length) return items;
  for (const w of q.split(/\s+/).filter((w) => w.length > 3)) {
    items = await fn(w, opts);
    if (items.length) return items;
  }
  return [];
}

function categoryRows(cats) {
  return cats.map((c) => ({ id: `cat_${c.toLowerCase().replace(/[^a-z0-9]+/g, "_")}`, title: c, value: c }));
}

/* ─────────────────────────────── main menu (§1) ─────────────────────────────── */

async function enterMainMenu(session, { greet = false } = {}) {
  session.state = "main_menu";
  if (greet) {
    await safeSend(() =>
      sendWhatsAppMessage(
        session.phone,
        "👋 Welcome to *NeoZaar*. I'm Neo — your technology concierge. I can help you discover solutions, find products and services, build a requirement, get a commercial offer, or connect you with an expert."
      )
    );
  }
  return sendWhatsAppList(session.phone, "How can I help today?", "Choose", MENU);
}

async function handleMainMenu(session, msg) {
  switch (pick(msg, MENU)) {
    case "menu_solution":
      return enterSolutionAsk(session);
    case "menu_product":
      return enterProductAsk(session);
    case "menu_service":
      return enterServiceAsk(session);
    case "menu_build":
      return enterBuildRequirement(session);
    case "menu_offer":
      session.context.intent = "offer";
      return enterOfferRoute(session);
    case "menu_expert":
      return enterExpert(session);
    default:
      return sendWhatsAppList(session.phone, "Pick one of these to get started 👇", "Choose", MENU);
  }
}

/* ─────────────────────────────── find a solution (§2) ─────────────────────────────── */

async function enterSolutionAsk(session) {
  session.state = "solution_ask";
  session.context.intent = "solution";
  const cats = await getSolutionCategories();
  const rows = [...categoryRows(cats), NAV.expert];
  return sendWhatsAppList(
    session.phone,
    "What are you trying to achieve? Pick an area below, or type your goal in a few words.",
    "Browse areas",
    rows
  );
}

async function handleSolutionAsk(session, msg) {
  const cats = await getSolutionCategories();
  const opts = [...categoryRows(cats), NAV.expert];
  const choice = pick(msg, opts);
  if (choice === NAV.expert.id) return enterExpert(session);
  if (choice) return enterSolutionResults(session, choice);
  if (msg.text && msg.text.trim()) return enterSolutionResults(session, msg.text.trim());
  return enterSolutionAsk(session);
}

async function enterSolutionResults(session, query) {
  if (wordy(query)) session.context.business_outcome = session.context.business_outcome || cleanOutcome(query);
  const items = await looseSearch(searchSolutions, query, { limit: 8 });
  if (!items.length) {
    await safeSend(() =>
      sendWhatsAppMessage(session.phone, "I couldn't match that to a solution. Try another area, or tap Speak to an Expert.")
    );
    return enterSolutionAsk(session);
  }
  if (items.length === 1) return enterSolutionDetail(session, items[0].id);

  session.context._results = items.map((i) => ({ id: i.id, name: i.name }));
  session.state = "solution_results";
  const rows = items.map((i) => ({ id: String(i.id), title: i.name, description: i.categories?.[0] }));
  rows.push(NAV.expert, NAV.menu);
  return sendWhatsAppList(session.phone, "Here's what fits:", "View solutions", rows);
}

async function handleSolutionResults(session, msg) {
  return handleResults(session, msg, "solution");
}

async function enterSolutionDetail(session, id) {
  const s = await getSolutionById(id);
  if (!s) {
    await safeSend(() => sendWhatsAppMessage(session.phone, "That solution isn't available right now."));
    return enterSolutionAsk(session);
  }
  session.context.solution = { id: s.id, name: s.name, url: s.url, type: "solution" };
  session.state = "solution_detail";

  let body = `*${s.name}*\n\n${s.outcome}`;
  if (s.relatedProducts?.length) body += `\n\n*Relevant products:* ${s.relatedProducts.map((p) => p.name).join(", ")}`;
  if (s.relatedServices?.length) body += `\n*Relevant services:* ${s.relatedServices.map((x) => x.name).join(", ")}`;
  if (s.url) body += `\n\nExplore the solution: ${s.url}`;

  await safeSend(() => sendWhatsAppMessage(session.phone, body, { previewUrl: true }));
  return sendWhatsAppButtons(session.phone, "Where next?", [NAV.build, NAV.expert, NAV.menu]);
}

async function handleSolutionDetail(session, msg) {
  switch (pick(msg, [NAV.build, NAV.expert, NAV.menu])) {
    case NAV.build.id:
      return enterBuildRequirement(session);
    case NAV.expert.id:
      return enterExpert(session);
    case NAV.menu.id:
      return enterMainMenu(session);
    default:
      return sendWhatsAppButtons(session.phone, "Tap an option 👇", [NAV.build, NAV.expert, NAV.menu]);
  }
}

/* ─────────────────────────────── find a product (§3) ─────────────────────────────── */

async function enterProductAsk(session) {
  session.state = "product_ask";
  session.context.intent = "product";
  return sendWhatsAppButtons(
    session.phone,
    "What product are you looking for?\n\n_Examples: MongoDB, endpoint security, backup, identity management_",
    [NAV.expert, NAV.menu]
  );
}

async function handleProductAsk(session, msg) {
  const choice = pick(msg, [NAV.expert, NAV.menu]);
  if (choice === NAV.expert.id) return enterExpert(session);
  if (choice === NAV.menu.id) return enterMainMenu(session);
  if (msg.text && msg.text.trim()) return enterProductResults(session, msg.text.trim());
  return enterProductAsk(session);
}

async function enterProductResults(session, query) {
  const items = await looseSearch(searchProducts, query, { limit: 5 });
  if (!items.length) return enterProductNotFound(session, query);
  if (items.length === 1) return enterProductDetail(session, items[0].id);

  session.context._results = items.map((i) => ({ id: i.id, name: i.name }));
  session.state = "product_results";
  const rows = items.map((i) => ({ id: String(i.id), title: i.name, description: i.vendor || undefined }));
  rows.push(NAV.expert, NAV.menu);
  return sendWhatsAppList(session.phone, `Results for "${query}":`, "View products", rows);
}

async function handleProductResults(session, msg) {
  return handleResults(session, msg, "product");
}

async function enterProductNotFound(session, query) {
  session.context.product = { name: String(query || "").slice(0, 200), catalog_status: "requires_verification", type: "product" };
  session.state = "product_notfound";
  await safeSend(() =>
    sendWhatsAppMessage(
      session.phone,
      "I couldn't confirm this product in our current catalogue. I can still send the request to the NeoZaar team to check availability."
    )
  );
  return sendWhatsAppButtons(session.phone, "How would you like to proceed?", [
    { id: "pnf_check", title: "Ask NeoZaar to Check" },
    NAV.expert,
    NAV.menu,
  ]);
}

async function handleProductNotFound(session, msg) {
  switch (pick(msg, [{ id: "pnf_check", title: "Ask NeoZaar to Check" }, NAV.expert, NAV.menu])) {
    case "pnf_check":
      session.context.intent = "offer";
      await safeSend(() => sendWhatsAppMessage(session.phone, "I'll get this checked with the NeoZaar team. Just a couple of details so they can come back to you."));
      return enterOfferIdentity(session);
    case NAV.expert.id:
      return enterExpert(session);
    case NAV.menu.id:
      return enterMainMenu(session);
    default:
      return sendWhatsAppButtons(session.phone, "Tap an option 👇", [
        { id: "pnf_check", title: "Ask NeoZaar to Check" },
        NAV.expert,
        NAV.menu,
      ]);
  }
}

async function enterProductDetail(session, id) {
  const p = await getProductById(id);
  if (!p) {
    await safeSend(() => sendWhatsAppMessage(session.phone, "That product isn't available right now."));
    return enterProductAsk(session);
  }
  session.context.product = {
    id: p.id,
    name: p.name,
    vendor: p.vendor,
    url: p.url,
    type: "product",
    catalog_status: "verified",
  };
  session.state = "product_detail";

  let body = `*${p.name}*`;
  if (p.vendor) body += `\n${p.vendor}`;
  body += `\n\n${p.outcome}`;
  if (p.relatedSolution) body += `\n\n*Solution:* ${p.relatedSolution}`;
  if (p.url) body += `\n\nView the product: ${p.url}`;

  await safeSend(() => sendWhatsAppMessage(session.phone, body, { previewUrl: true }));
  return sendWhatsAppButtons(session.phone, "What next?", [
    { id: "pd_offer", title: "Get Commercial Offer" },
    { id: "pd_services", title: "Need Services" },
    NAV.expert,
  ]);
}

async function handleProductDetail(session, msg) {
  const opts = [
    { id: "pd_offer", title: "Get Commercial Offer" },
    { id: "pd_services", title: "Need Services" },
    NAV.expert,
    NAV.menu,
  ];
  switch (pick(msg, opts)) {
    case "pd_offer":
      session.context.intent = "offer";
      return enterOfferRoute(session);
    case "pd_services":
      return enterProductServices(session);
    case NAV.expert.id:
      return enterExpert(session);
    case NAV.menu.id:
      return enterMainMenu(session);
    default:
      return sendWhatsAppButtons(session.phone, "Tap an option 👇", [
        { id: "pd_offer", title: "Get Commercial Offer" },
        { id: "pd_services", title: "Need Services" },
        NAV.expert,
      ]);
  }
}

async function enterProductServices(session) {
  session.state = "product_services";
  const name = session.context.product?.name || "this product";
  return sendWhatsAppButtons(
    session.phone,
    `Implementation, migration and managed services for *${name}* are scoped in the NeoZaar Proposal Studio.`,
    [NAV.build, NAV.expert, NAV.menu]
  );
}

async function handleProductServices(session, msg) {
  switch (pick(msg, [NAV.build, NAV.expert, NAV.menu])) {
    case NAV.build.id:
      return enterBuildRequirement(session);
    case NAV.expert.id:
      return enterExpert(session);
    case NAV.menu.id:
      return enterMainMenu(session);
    default:
      return sendWhatsAppButtons(session.phone, "Tap an option 👇", [NAV.build, NAV.expert, NAV.menu]);
  }
}

/* ─────────────────────────────── find a service (§4) ─────────────────────────────── */

async function enterServiceAsk(session) {
  session.state = "service_ask";
  session.context.intent = "service";
  const cats = await getServiceCategories();
  const rows = [...categoryRows(cats), NAV.expert];
  return sendWhatsAppList(
    session.phone,
    "What kind of help are you looking for? Pick an area below, or type what you need.",
    "Browse areas",
    rows
  );
}

async function handleServiceAsk(session, msg) {
  const cats = await getServiceCategories();
  const opts = [...categoryRows(cats), NAV.expert];
  const choice = pick(msg, opts);
  if (choice === NAV.expert.id) return enterExpert(session);
  if (choice) return enterServiceResults(session, choice);
  if (msg.text && msg.text.trim()) return enterServiceResults(session, msg.text.trim());
  return enterServiceAsk(session);
}

async function enterServiceResults(session, query) {
  if (wordy(query)) session.context.business_outcome = session.context.business_outcome || cleanOutcome(query);
  const items = await looseSearch(searchServices, query, { limit: 6 });
  if (!items.length) {
    await safeSend(() =>
      sendWhatsAppMessage(session.phone, "I couldn't match that to a service. Try another area, or tap Speak to an Expert.")
    );
    return enterServiceAsk(session);
  }
  if (items.length === 1) return enterServiceDetail(session, items[0].id);

  session.context._results = items.map((i) => ({ id: i.id, name: i.name }));
  session.state = "service_results";
  const rows = items.map((i) => ({ id: String(i.id), title: i.name, description: i.categories?.[0] }));
  rows.push(NAV.expert, NAV.menu);
  return sendWhatsAppList(session.phone, "Here's what fits:", "View services", rows);
}

async function handleServiceResults(session, msg) {
  return handleResults(session, msg, "service");
}

async function enterServiceDetail(session, id) {
  const s = await getServiceById(id);
  if (!s) {
    await safeSend(() => sendWhatsAppMessage(session.phone, "That service isn't available right now."));
    return enterServiceAsk(session);
  }
  session.context.service = { id: s.id, name: s.name, url: s.url, type: "service" };
  session.state = "service_detail";

  let body = `*${s.name}*\n\n${s.outcome}`;
  if (s.url) body += `\n\nMore detail: ${s.url}`;

  await safeSend(() => sendWhatsAppMessage(session.phone, body, { previewUrl: true }));
  return sendWhatsAppButtons(session.phone, "Where next?", [NAV.build, NAV.expert, NAV.menu]);
}

async function handleServiceDetail(session, msg) {
  switch (pick(msg, [NAV.build, NAV.expert, NAV.menu])) {
    case NAV.build.id:
      return enterBuildRequirement(session);
    case NAV.expert.id:
      return enterExpert(session);
    case NAV.menu.id:
      return enterMainMenu(session);
    default:
      return sendWhatsAppButtons(session.phone, "Tap an option 👇", [NAV.build, NAV.expert, NAV.menu]);
  }
}

/* ─────────────────────────────── build my requirement (§5) ─────────────────────────────── */

async function enterBuildRequirement(session) {
  session.state = "build_requirement";
  const ctx = session.context;
  const link = buildStudioLink(ctx);

  let body;
  let buttonText;
  if (hasUsefulContext(ctx)) {
    body = `I already have the starting point:\n\n${startingPointLines(ctx)}\n\nContinue in Proposal Studio to build the solution and scope.`;
    buttonText = "Continue in Proposal Studio";
  } else {
    body =
      "Let's build this properly.\n\nContinue in the NeoZaar Proposal Studio to define your requirement, identify the right solutions, products and services, and prepare your request.";
    buttonText = "Open Proposal Studio";
  }

  if (link) {
    await safeSend(() => sendWhatsAppCtaUrl(session.phone, body, buttonText, link));
  } else {
    await safeSend(() => sendWhatsAppMessage(session.phone, `${body}\n\nAsk our team for your Proposal Studio link.`));
  }
  return sendWhatsAppButtons(session.phone, "Or:", [NAV.expert, NAV.menu]);
}

async function handleBuildRequirement(session, msg) {
  switch (pick(msg, [NAV.expert, NAV.menu, { id: "act_build", title: "Open Proposal Studio" }])) {
    case NAV.expert.id:
      return enterExpert(session);
    case NAV.menu.id:
      return enterMainMenu(session);
    case "act_build":
      return enterBuildRequirement(session);
    default:
      return sendWhatsAppButtons(session.phone, "Tap an option 👇", [NAV.expert, NAV.menu]);
  }
}

/* ─────────────────────────────── get a commercial offer (§6–7) ─────────────────────────────── */

async function enterOfferRoute(session) {
  session.state = "offer_route";
  session.context.intent = "offer";
  const rows = [...ROUTE_OPTS, NAV.expert];
  return sendWhatsAppList(session.phone, "Where would you like to transact?", "Choose route", rows);
}

async function handleOfferRoute(session, msg) {
  const choice = pick(msg, [...ROUTE_OPTS, NAV.expert]);
  if (choice === NAV.expert.id) return enterExpert(session);
  if (!choice) return sendWhatsAppList(session.phone, "Pick where you'd like to transact 👇", "Choose route", [...ROUTE_OPTS, NAV.expert]);
  session.context.commercial_route = choice;
  return session.context.product?.name ? enterOfferIntent(session) : enterOfferProduct(session);
}

async function enterOfferProduct(session) {
  session.state = "offer_product";
  return sendWhatsAppMessage(session.phone, "What product are you looking to purchase?");
}

async function handleOfferProduct(session, msg) {
  const q = (msg.text || "").trim();
  if (!q) return enterOfferProduct(session);
  const p = await getProductForOffer(q);
  if (p.found) {
    session.context.product = {
      id: p.catalog_product_id,
      name: p.product_name,
      vendor: p.vendor_name,
      url: p.url,
      type: "product",
      catalog_status: "verified",
    };
  } else {
    session.context.product = { name: p.product_name, type: "product", catalog_status: "requires_verification" };
    await safeSend(() =>
      sendWhatsAppMessage(
        session.phone,
        "I couldn't confirm this product in our current catalogue. I can still send the request to the NeoZaar team to check availability."
      )
    );
  }
  return enterOfferIntent(session);
}

async function enterOfferIntent(session) {
  session.state = "offer_intent";
  const rows = [...INTENT_OPTS, NAV.expert];
  return sendWhatsAppList(session.phone, "What would you like us to help with?", "Choose", rows);
}

async function handleOfferIntent(session, msg) {
  const choice = pick(msg, [...INTENT_OPTS, NAV.expert]);
  if (choice === NAV.expert.id) return enterExpert(session);
  if (!choice) return sendWhatsAppList(session.phone, "Pick one 👇", "Choose", [...INTENT_OPTS, NAV.expert]);
  session.context.commercial_intent = choice;
  return enterOfferServices(session);
}

async function enterOfferServices(session) {
  session.state = "offer_services";
  const rows = [...SERVICES_OPTS, NAV.expert];
  return sendWhatsAppList(
    session.phone,
    "Do you also need help with implementation, migration or managed services?",
    "Choose",
    rows
  );
}

async function handleOfferServices(session, msg) {
  const choice = pick(msg, [...SERVICES_OPTS, NAV.expert]);
  if (choice === NAV.expert.id) return enterExpert(session);
  if (!choice) return sendWhatsAppList(session.phone, "Pick one 👇", "Choose", [...SERVICES_OPTS, NAV.expert]);
  session.context.services_status = choice;
  if (choice === "build_requirement") return enterBuildRequirement(session);
  return enterOfferIdentity(session);
}

async function enterOfferIdentity(session) {
  if (session.context.email) return enterOfferSummary(session);
  session.state = "offer_identity_email";
  return sendWhatsAppMessage(session.phone, "Almost there — what's the best email for our commercial team to reach you?");
}

async function handleOfferIdentityEmail(session, msg) {
  const email = (msg.text || "").trim();
  if (!EMAIL_RE.test(email)) {
    return sendWhatsAppMessage(session.phone, "That doesn't look like a valid email — please send it again.");
  }
  session.context.email = email;
  session.state = "offer_identity_name";
  return sendWhatsAppMessage(session.phone, "And your name and company? _(e.g. Ravi, Acme Corp — or type skip)_");
}

async function handleOfferIdentityName(session, msg) {
  const raw = (msg.text || "").trim();
  if (raw && !/^skip$/i.test(raw)) {
    const [name, ...rest] = raw.split(/\s*[,|/–-]\s*| at /i);
    session.context.name = (name || "").trim() || undefined;
    const company = rest.join(", ").trim();
    if (company) session.context.company = company;
  }
  return enterOfferSummary(session);
}

async function enterOfferSummary(session) {
  session.state = "offer_summary";
  const c = session.context;
  const productLine = c.product?.name
    ? `${c.product.name}${c.product.catalog_status === "requires_verification" ? " — pending verification" : ""}`
    : "—";
  const servicesLabel =
    c.services_status === "software_only"
      ? "Software Only"
      : c.services_status === "requires_discussion"
      ? "To discuss"
      : c.services_status === "build_requirement"
      ? "Proposal Studio"
      : "—";

  const body =
    `*COMMERCIAL REQUEST*\n\n` +
    `Product: ${productLine}\n` +
    `Route: ${c.commercial_route || "—"}\n` +
    `Commercial Intent: ${c.commercial_intent || "—"}\n` +
    `Services: ${servicesLabel}`;

  await safeSend(() => sendWhatsAppMessage(session.phone, body));
  return sendWhatsAppList(session.phone, "Ready to send this to the NeoZaar team?", "Choose", [
    { id: "sum_submit", title: "Submit Request" },
    NAV.build,
    NAV.expert,
    { id: "sum_edit", title: "Edit" },
  ]);
}

async function handleOfferSummary(session, msg) {
  const opts = [
    { id: "sum_submit", title: "Submit Request" },
    NAV.build,
    NAV.expert,
    { id: "sum_edit", title: "Edit" },
  ];
  switch (pick(msg, opts)) {
    case "sum_submit": {
      const result = await submitCommercialRequest(session);
      const email = session.context.email;
      await safeSend(() =>
        sendWhatsAppMessage(
          session.phone,
          result.ok
            ? `✅ Your commercial request is in. The NeoZaar team will get back to you${email ? ` at ${email}` : ""}.\n\nType *menu* anytime.`
            : "✅ Request received — the NeoZaar team will follow up shortly.\n\nType *menu* anytime."
        )
      );
      await clearSession(session.phone);
      session._ended = true;
      return;
    }
    case NAV.build.id:
      return enterBuildRequirement(session);
    case NAV.expert.id:
      return enterExpert(session);
    case "sum_edit":
      return enterOfferRoute(session);
    default:
      return sendWhatsAppList(session.phone, "Pick one 👇", "Choose", opts);
  }
}

/* ─────────────────────────────── speak to an expert (§9) ─────────────────────────────── */

function deriveExpertTopic(ctx) {
  if (ctx.intent === "offer" || ctx.commercial_route) return "Commercial Offer";
  if (ctx.solution) return "Solution Advice";
  if (ctx.service) return "Services";
  if (ctx.product) return "Product / Licensing";
  return "General";
}

async function sendExpertHandoff(session, topic) {
  const { bookingUrl } = await notifyExpertHandoff(session, topic);
  if (bookingUrl) {
    await safeSend(() =>
      sendWhatsAppCtaUrl(
        session.phone,
        "A NeoZaar expert will pick this up. Grab a time that suits you:",
        "Book a time",
        bookingUrl
      )
    );
  } else {
    await safeSend(() =>
      sendWhatsAppMessage(session.phone, "A NeoZaar expert will reach out to you shortly on this number.")
    );
  }
  session.state = "expert_done";
  return sendWhatsAppButtons(session.phone, "Anything else?", [NAV.menu]);
}

async function enterExpert(session) {
  session.context.intent = session.context.intent || "expert";
  const ctx = session.context;
  if (hasUsefulContext(ctx) || (ctx.history?.length || 0) > 3) {
    await safeSend(() =>
      sendWhatsAppMessage(
        session.phone,
        "Absolutely. I'll pass along what we've already discussed so you don't have to repeat yourself."
      )
    );
    return sendExpertHandoff(session, deriveExpertTopic(ctx));
  }
  session.state = "expert_topic";
  return sendWhatsAppList(session.phone, "What would you like help with?", "Choose", EXPERT_TOPICS);
}

async function handleExpertTopic(session, msg) {
  const opts = EXPERT_TOPICS;
  const choice = pick(msg, opts);
  if (!choice) return sendWhatsAppList(session.phone, "Pick one 👇", "Choose", opts);
  const topic = opts.find((o) => o.id === choice)?.title || "General";
  return sendExpertHandoff(session, topic);
}

async function handleExpertDone(session, msg) {
  if (pick(msg, [NAV.menu])) return enterMainMenu(session);
  return sendWhatsAppButtons(session.phone, "Tap below when you're ready.", [NAV.menu]);
}

/* ─────────────────────────────── shared results handler ─────────────────────────────── */

const DETAIL = {
  solution: enterSolutionDetail,
  product: enterProductDetail,
  service: enterServiceDetail,
};

async function handleResults(session, msg, type) {
  const results = session.context._results || [];
  const opts = [...results.map((r) => ({ id: String(r.id), title: r.name })), NAV.expert, NAV.menu];
  const choice = pick(msg, opts);
  if (choice === NAV.expert.id) return enterExpert(session);
  if (choice === NAV.menu.id) return enterMainMenu(session);
  if (choice && /^\d+$/.test(choice)) return DETAIL[type](session, Number(choice));

  // free text at a results list → treat as a fresh search of the same type
  if (msg.text && msg.text.trim()) {
    if (type === "solution") return enterSolutionResults(session, msg.text.trim());
    if (type === "service") return enterServiceResults(session, msg.text.trim());
    if (type === "product") return enterProductResults(session, msg.text.trim());
  }
  const rows = [...results.map((r) => ({ id: String(r.id), title: r.name })), NAV.expert, NAV.menu];
  return sendWhatsAppList(session.phone, "Tap one of these 👇", "View options", rows);
}

/* ─────────────────────────────── direct intent (§10–11) ─────────────────────────────── */

async function applyIntent(session, det, raw) {
  session.lastIntent = det.intent;
  const ctx = session.context;
  ctx.intent = det.intent;
  if (det.cloud) ctx.target_cloud = det.cloud;
  if (det.route) ctx.commercial_route = det.route;
  if (det.outcome) ctx.business_outcome = ctx.business_outcome || cleanOutcome(det.outcome);
  if (!ctx.business_outcome && wordy(raw)) ctx.business_outcome = cleanOutcome(raw);

  switch (det.intent) {
    case "expert":
      return enterExpert(session);

    case "offer": {
      const q = (det.query || "").trim();
      if (q.length > 2 && !ctx.product?.name) {
        const p = await getProductForOffer(q);
        ctx.product = p.found
          ? {
              id: p.catalog_product_id,
              name: p.product_name,
              vendor: p.vendor_name,
              url: p.url,
              type: "product",
              catalog_status: "verified",
            }
          : { name: p.product_name, type: "product", catalog_status: "requires_verification" };
      }
      if (ctx.commercial_route && ctx.product?.name) return enterOfferIntent(session);
      if (ctx.commercial_route) return enterOfferProduct(session);
      return enterOfferRoute(session);
    }

    case "build":
      return enterBuildRequirement(session);

    case "service": {
      const q = (det.query || raw).trim();
      return q ? enterServiceResults(session, q) : enterServiceAsk(session);
    }

    case "solution": {
      const q = (det.query || raw).trim();
      return q ? enterSolutionResults(session, q) : enterSolutionAsk(session);
    }

    default:
      return enterMainMenu(session);
  }
}

/* ─────────────────────────────── dispatch table ─────────────────────────────── */

const STATE_HANDLERS = {
  main_menu: handleMainMenu,
  solution_ask: handleSolutionAsk,
  solution_results: handleSolutionResults,
  solution_detail: handleSolutionDetail,
  product_ask: handleProductAsk,
  product_results: handleProductResults,
  product_notfound: handleProductNotFound,
  product_detail: handleProductDetail,
  product_services: handleProductServices,
  service_ask: handleServiceAsk,
  service_results: handleServiceResults,
  service_detail: handleServiceDetail,
  build_requirement: handleBuildRequirement,
  offer_route: handleOfferRoute,
  offer_product: handleOfferProduct,
  offer_intent: handleOfferIntent,
  offer_services: handleOfferServices,
  offer_identity_email: handleOfferIdentityEmail,
  offer_identity_name: handleOfferIdentityName,
  offer_summary: handleOfferSummary,
  expert_topic: handleExpertTopic,
  expert_done: handleExpertDone,
};

/* ─────────────────────────────── entry point ─────────────────────────────── */

/**
 * @param {string} from     E.164 digits (no '+')
 * @param {string} text      best-effort text (typed body or tapped option label)
 * @param {object} [inbound] full parsed message from parseInbound (choiceId, type, messageId…)
 */
export async function handleMessage(from, text, inbound) {
  const phone = inbound?.from || from;
  if (!phone) return;
  return withConversationLock(phone, () => processMessage(from, text, inbound));
}

async function processMessage(from, text, inbound) {
  const msg = normaliseInbound(from, text, inbound);
  if (!msg.from) return;

  markAsRead(msg.messageId).catch(() => {});

  const session = await getSession(msg.from);
  session.messageCount = (session.messageCount || 0) + 1;
  if (msg.text) {
    pushHistory(session, { role: "user", text: msg.text.slice(0, 500), at: iso() });
  }

  // Transcript log — awaited (and before routing) so the inbound row commits
  // ahead of the replies it triggers. logInbound swallows its own errors, so
  // this can't break the turn.
  const inserted = await logInbound(msg, {
    arrivalState: session.state,
    state: session.state,
    lastIntent: session.lastIntent,
    humanOptOut: humanOptOutChange(msg, OPT_OUT_WORDS, OPT_IN_WORDS),
  });

  if (inserted === false) return; // Existing wamid: do not route a webhook retry.
  if (await isHumanConversation(msg.from)) return;

  try {
    await route(session, msg);
  } catch (err) {
    console.error("router error:", err.stack || err.message);
    await safeSend(() =>
      sendWhatsAppMessage(msg.from, "Something went wrong on our side. Type *menu* to start again.")
    );
  }

  if (!session._ended) {
    pushHistory(session, { role: "neo", text: `state:${session.state || "none"}`, at: iso() });
    await saveSession(session);
  }
}

const OPT_OUT_WORDS = ["stop", "unsubscribe", "stop messages", "unsubscribe me", "opt out", "opt-out", "stop all"];
const OPT_IN_WORDS = ["start", "resume", "unstop", "opt in", "opt-in"];

async function route(session, msg) {
  const raw = (msg.text || "").trim();
  const low = raw.toLowerCase();
  const isTap = Boolean(msg.choiceId);

  // opt-out / opt-in — checked before anything else
  if (!isTap && OPT_OUT_WORDS.includes(low)) {
    await setOptOut(session.phone, true);
    return sendWhatsAppMessage(
      session.phone,
      "You won't receive further messages from Neo. Reply *START* any time to resume."
    );
  }
  if (await isOptedOut(session.phone)) {
    if (!isTap && OPT_IN_WORDS.includes(low)) {
      await setOptOut(session.phone, false);
      return enterMainMenu(session, { greet: true });
    }
    return; // opted out and not opting back in — stay silent
  }

  // global commands
  if (low === "reset") {
    await clearSession(session.phone);
    Object.assign(session, freshSessionShape(session.phone));
    return enterMainMenu(session, { greet: true });
  }
  if (["menu", "main menu", "home", "back to menu"].includes(low)) return enterMainMenu(session);
  if (["hi", "hello", "hey", "start", "hi neo", "hey neo", "hello neo"].includes(low) || isButtonOpener(low)) {
    return enterMainMenu(session, { greet: session.isNew });
  }
  if (session.isNew && !isTap && !raw) return enterMainMenu(session, { greet: true });

  // human escape hatch — available from anywhere except an active expert step
  if (!isTap && raw && !(session.state || "").startsWith("expert") && looksLikeExpertRequest(raw)) {
    return enterExpert(session);
  }

  // direct intent — always at a neutral point, otherwise only when very confident.
  // The LLM tier (if NEO_LLM_INTENT=true) is allowed only at neutral points so
  // the model isn't called on every mid-flow message.
  const neutral = session.isNew || !session.state || session.state === "main_menu";
  if (!isTap && raw) {
    const det = await resolveIntent(raw, { allowLLM: neutral });
    if (det && (neutral || det.confidence >= 0.85)) {
      return applyIntent(session, det, raw);
    }
  }

  const handler = STATE_HANDLERS[session.state];
  if (!handler) return enterMainMenu(session, { greet: session.isNew });
  return handler(session, msg);
}
