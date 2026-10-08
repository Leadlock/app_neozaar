/**
 * End-to-end simulation of the Neo WhatsApp router.
 *
 * Drives lib/botService.js through every flow with real DB access (wa_sessions +
 * catalogue) but every outbound HTTP call — WhatsApp Graph API and Zoho Bigin —
 * mocked at the axios adapter, so nothing leaves the machine.
 *
 *   cd Neozaareact
 *   node scripts/whatsapp-sim.mjs
 *
 * Reads DB / API config from process.env, falling back to ../.env.local. All
 * paths are resolved relative to this file, so the working directory doesn't
 * matter.
 */

import { fileURLToPath } from "node:url";
import axios from "axios";

// ── env: prefer the real environment, else load .env.local next to the app ──
if (!process.env.WA_DB_HOST && !process.env.DB_HOST) {
  try {
    process.loadEnvFile(fileURLToPath(new URL("../.env.local", import.meta.url)));
  } catch {
    console.error("No DB env found and ../.env.local is missing.");
    console.error("Set WA_DB_* (or DB_*) in the environment, or run from a checkout with .env.local.");
    process.exit(1);
  }
}

const LIB = new URL("../app/allapi/whatsapp/lib/", import.meta.url);
const load = (name) => import(new URL(name, LIB).href);

// ── mock every outbound HTTP call ──
const outbox = [];
axios.defaults.adapter = async (config) => {
  const url = config.url || "";
  let body = {};
  try {
    body = config.data ? JSON.parse(config.data) : {};
  } catch {
    /* non-JSON body (e.g. token refresh form) */
  }
  if (url.includes("graph.facebook.com")) {
    if (body.status === "read") return ok({ success: true }, config);
    outbox.push(summarise(body));
    return ok({ messages: [{ id: "wamid.mock" }] }, config);
  }
  if (url.includes("zoho")) {
    if (url.includes("/oauth/")) return ok({ access_token: "tok", expires_in: 3600 }, config);
    return ok({ data: [{ code: "SUCCESS", details: { id: "bigin1" } }] }, config);
  }
  return ok({}, config);
};

function ok(data, config) {
  return { data, status: 200, statusText: "OK", headers: {}, config };
}

// ── mock fetch (backend cta-action lead intake + any OpenAI call) ──
const ctaCalls = [];
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init = {}) => {
  const u = String(url);
  if (u.includes("/public/leads/cta-action")) {
    ctaCalls.push(JSON.parse(init.body || "{}"));
    return new Response(JSON.stringify({ status: "success", message: "received" }), {
      status: 201,
      headers: { "content-type": "application/json" },
    });
  }
  if (u.includes("api.openai.com")) {
    return new Response(JSON.stringify({ choices: [{ message: { content: "{}" } }] }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }
  return realFetch ? realFetch(url, init) : new Response("{}", { status: 200 });
};

function summarise(body) {
  if (body.type === "text") return { kind: "text", text: body.text.body };
  const it = body.interactive || {};
  if (it.type === "button")
    return { kind: "buttons", text: it.body?.text, options: it.action.buttons.map((b) => b.reply.title) };
  if (it.type === "list")
    return {
      kind: "list",
      text: it.body?.text,
      options: it.action.sections.flatMap((s) => s.rows.map((r) => r.title)),
    };
  if (it.type === "cta_url")
    return {
      kind: "cta",
      text: it.body?.text,
      button: it.action.parameters.display_text,
      url: it.action.parameters.url,
    };
  return { kind: body.type, body };
}

const { handleMessage } = await load("botService.js");
const getPool = (await load("db.js")).default;
const pool = getPool();

const PHONE = "000_sim_user";
for (const t of ["wa_sessions", "wa_messages", "wa_contacts"]) {
  await pool.query(`delete from ${t} where phone=$1`, [PHONE]);
}

let step = 0;
async function feed(label, { text = "", choiceId = null } = {}) {
  outbox.length = 0;
  const inbound = {
    from: PHONE,
    profileName: "Sim",
    messageId: "wamid.in" + step++,
    timestamp: "1",
    type: choiceId ? "interactive" : "text",
    text,
    choiceId,
    choiceTitle: choiceId ? text : null,
    raw: {},
  };
  await handleMessage(PHONE, text, inbound);
  const { rows } = await pool.query("select state, context from wa_sessions where phone=$1", [PHONE]);
  const st = rows[0]?.state ?? "(cleared)";
  console.log(`\n▶ ${label}  ${choiceId ? `[tap:${choiceId}]` : text ? `"${text}"` : ""}`);
  console.log(`  state: ${st}`);
  for (const m of outbox) {
    if (m.kind === "text") console.log(`  ← text: ${m.text.replace(/\n/g, " ⏎ ").slice(0, 140)}`);
    else if (m.kind === "cta") console.log(`  ← cta:  "${m.text.slice(0, 60)}" [${m.button}] ${m.url}`);
    else console.log(`  ← ${m.kind}: "${(m.text || "").slice(0, 70)}" {${m.options.join(" | ")}}`);
  }
  return { state: st, ctx: rows[0]?.context, out: [...outbox] };
}

console.log("═══════════ JOURNEY 0: floating-button prefill lands on the menu ═══════════");
await feed("button opener", { text: "Hi Neo, can you help me find, build or buy the right thing?" });
await feed("reset", { text: "reset" });

console.log("═══════════ JOURNEY 1: main menu → Find a Solution → detail → Build ═══════════");
await feed("first contact", { text: "hi" });
await feed("open solution flow", { text: "Find a Solution", choiceId: "menu_solution" });
let r = await feed("pick category Enterprise Security", { text: "Enterprise Security", choiceId: "cat_enterprise_security" });
await feed("pick first solution", { text: r.ctx._results[0].name, choiceId: String(r.ctx._results[0].id) });
await feed("tap Build My Requirement", { text: "Build My Requirement", choiceId: "act_build" });

console.log("\n═══════════ JOURNEY 2: Find a Product → Get Commercial Offer → submit ═══════════");
await feed("reset", { text: "reset" });
await feed("open product flow", { text: "Find a Product", choiceId: "menu_product" });
r = await feed("search 'barracuda'", { text: "barracuda" });
await feed("pick first product", { text: r.ctx._results[0].name, choiceId: String(r.ctx._results[0].id) });
await feed("tap Get Commercial Offer", { text: "Get Commercial Offer", choiceId: "pd_offer" });
await feed("route: AWS Marketplace", { text: "AWS Marketplace", choiceId: "route_aws" });
await feed("intent: Best Commercial Offer", { text: "Best Commercial Offer", choiceId: "ci_best" });
await feed("services: Software Only", { text: "Software Only", choiceId: "sv_software" });
await feed("email", { text: "buyer@acme.com" });
await feed("name + company", { text: "Ravi, Acme Corp" });
ctaCalls.length = 0;
await feed("submit", { text: "Submit Request", choiceId: "sum_submit" });
console.log("   cta-action payload:", JSON.stringify(ctaCalls[0]));

console.log("\n═══════════ JOURNEY 3: Find a Service (no scoping questions) ═══════════");
await feed("reset", { text: "reset" });
await feed("open service flow", { text: "Find a Service", choiceId: "menu_service" });
r = await feed("type 'migration'", { text: "migration" });
await feed("pick first service", { text: r.ctx._results[0].name, choiceId: String(r.ctx._results[0].id) });

console.log("\n═══════════ JOURNEY 4: product not found → Ask NeoZaar to Check ═══════════");
await feed("reset", { text: "reset" });
await feed("open product flow", { text: "Find a Product", choiceId: "menu_product" });
await feed("search made-up", { text: "Nonexistent Widget 9000" });
await feed("Ask NeoZaar to Check", { text: "Ask NeoZaar to Check", choiceId: "pnf_check" });
await feed("email", { text: "check@acme.com" });
await feed("skip name", { text: "skip" });
await feed("submit", { text: "Submit Request", choiceId: "sum_submit" });

console.log("\n═══════════ JOURNEY 5: direct intent — 'I need CrowdStrike pricing through AWS' ═══════════");
await feed("reset", { text: "reset" });
r = await feed("nl intent", { text: "I need CrowdStrike pricing through AWS" });
console.log("   ctx:", JSON.stringify({ route: r.ctx.commercial_route, cloud: r.ctx.target_cloud, product: r.ctx.product }));

console.log("\n═══════════ JOURNEY 6: Speak to an Expert — cold vs with context ═══════════");
await feed("reset", { text: "reset" });
await feed("cold expert (free text)", { text: "can I talk to someone" });
await feed("pick topic", { text: "Commercial Offer", choiceId: "et_offer" });
await feed("reset", { text: "reset" });
await feed("solution first", { text: "endpoint security" });
ctaCalls.length = 0;
await feed("then expert mid-flow (no email → no CRM record)", { text: "please connect me with an expert" });
console.log("   cta-action calls (expect 0, no email):", ctaCalls.length);

console.log("\n═══════════ GUARDRAIL: unknown input re-prompts, no crash ═══════════");
await feed("reset", { text: "reset" });
await feed("garbage at menu", { text: "asdfqwer" });
await feed("garbage tap", { text: "zzz", choiceId: "bogus_id" });

console.log("\n═══════════ JOURNEY 7: opt-out → silent → opt-in ═══════════");
await feed("reset", { text: "reset" });
let r7 = await feed("stop", { text: "stop" });
let optRow = (await pool.query("select opted_out from wa_contacts where phone=$1", [PHONE])).rows[0];
console.log("   opted_out after 'stop':", optRow?.opted_out, "(expect true)");
r7 = await feed("hi (while opted out)", { text: "hi" });
console.log("   bot messages while opted out:", r7.out.length, "(expect 0)");
r7 = await feed("start", { text: "start" });
optRow = (await pool.query("select opted_out from wa_contacts where phone=$1", [PHONE])).rows[0];
console.log("   opted_out after 'start':", optRow?.opted_out, "(expect false), bot replied:", r7.out.length > 0);

console.log("\n═══════════ TRANSCRIPT LOG: wa_messages / wa_contacts ═══════════");
const msgStats = (
  await pool.query(
    "select direction, count(*)::int n from wa_messages where phone=$1 group by direction order by direction",
    [PHONE]
  )
).rows;
console.log("   wa_messages by direction:", JSON.stringify(msgStats));
const contact = (
  await pool.query(
    "select profile_name, message_count, last_state, last_intent, opted_out from wa_contacts where phone=$1",
    [PHONE]
  )
).rows[0];
console.log("   wa_contacts row:", JSON.stringify(contact));
const sample = (
  await pool.query(
    "select direction, msg_type, left(replace(body,E'\\n',' / '),70) body from wa_messages where phone=$1 order by id limit 6",
    [PHONE]
  )
).rows;
console.log("   first 6 messages:");
for (const m of sample) console.log(`     ${m.direction.padEnd(3)} ${m.msg_type.padEnd(9)} ${m.body}`);

for (const t of ["wa_sessions", "wa_messages", "wa_contacts"]) {
  await pool.query(`delete from ${t} where phone=$1`, [PHONE]);
}
await pool.end();
console.log("\n✅ simulation complete");
