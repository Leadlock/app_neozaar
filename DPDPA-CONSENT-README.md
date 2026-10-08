# Consent & Cookie Management — a plain-English guide

**Who this is for:** a developer seeing this part of the codebase for the first
time. No legal background assumed. Read this before touching anything in the
consent flow.

---

## 1. The one-paragraph version

When someone visits a NeoZaar website, we may set cookies and run scripts (like
Google Analytics) that collect personal data. Indian law (the **DPDP Act, 2023**)
says we can only do that **after the visitor agrees**, we must **tell them what
we're doing**, we must let them **change their mind as easily as they said yes**,
and we must be able to **prove** they agreed if a regulator ever asks. This module
is the machinery that makes all of that happen: a cookie banner, a place to store
every yes/no, a switch that blocks the tracking scripts until consent, and an
admin screen to show the evidence.

---

## 2. Background: what is the DPDP Act and why should I care?

**DPDP Act = Digital Personal Data Protection Act, 2023.** India's main data
privacy law. Think of it as India's version of the EU's GDPR.

Key ideas in beginner terms:

| Term in the law | What it means here |
|---|---|
| **Data Principal** | The person whose data it is — i.e. the website visitor. |
| **Data Fiduciary** | The company deciding what to do with that data — i.e. NeoZaar. |
| **Personal data** | Anything that can identify a person. A cookie ID, an IP address, and "user 565" all count. |
| **Consent** | A clear, specific "yes" given by a free choice. Not a pre-ticked box, not "by using this site you agree". |
| **Notice** | A plain-language explanation you must show *before* asking for consent. |

**Why you can't ignore it:**

- It applies to anyone processing the personal data of people in India — which is
  every visitor to neozaar.com.
- Analytics and advertising cookies process personal data, so they need **consent**.
- Penalties go up to **₹250 crore per breach**. Regulators can also order you to
  stop processing.
- "We didn't know" is not a defence. Neither is "the user kept using the site".

---

## 3. Mandatory vs. recommended

### Mandatory (the law requires this — no shipping without it)

1. **Ask before you track.** Non-essential cookies/scripts must not load until the
   visitor opts in. Rejecting must be as easy as accepting (equal buttons, no
   dark patterns, nothing pre-ticked).
2. **Show a notice.** Before the choice, tell the visitor what data, for what
   purpose, who receives it, and how to withdraw — in plain language.
3. **Let them withdraw.** Withdrawing consent must be as easy as giving it, and
   available at any time (not just once on the banner).
4. **Be able to prove it.** For every consent event you must be able to show
   *who* agreed, *when*, *to what*, and *what notice they saw*. This is the
   "accountability" principle.
5. **Language access.** The notice must be available in English or any of the 22
   languages in the Eighth Schedule to the Constitution.
6. **Point people to the regulator.** Grievances escalate to the **Data
   Protection Board of India**.

### Recommended (not spelled out in the law, but the sane way to satisfy it)

- **The Superadmin "Consent Audit Console."** The law doesn't say "build a
  dashboard", but it *does* say "be able to demonstrate consent". A searchable,
  read-only view of the ledger is how you actually do that when asked.
- **Tamper-evident storage (hash chaining).** Makes the "prove it" story much
  stronger — you can show the records weren't edited after the fact.
- **Full translations of the notice** (vs. only offering it "on request"). The
  law requires the *option*; shipping real translations is the robust way to
  meet it and is better UX.
- **Recording the exact language shown** with each consent, and linking a
  person's anonymous choices to their account after they log in.

> Naming note: our admin screen is a **"Consent Audit Console"** / consent
> register. Under the Act, a **"Consent Manager"** is a specific company
> registered with the Data Protection Board. We are **not** that. Never label
> anything customer-facing "Consent Manager".

---

## 4. What we built — the five parts

### Part 1 — The consent ledger (backend)
*Repo: `neozaar_backend`*

A database table, `consent_events`, that stores one row every time a visitor
grants, withdraws, updates or renews consent. It is **append-only** — rows are
never edited or deleted. Each row is **hash-chained** to the one before it (like
blocks in a blockchain), so if anyone tampered with a row, a verification step
would spot exactly where.

Supporting tables: `consent_notices` (the exact text of every notice version, in
every language) and `dsar_requests` (a queue for "please show me / delete my
data" requests).

**Why it exists:** this is the "be able to prove it" requirement. Without a
durable, honest record, you cannot demonstrate consent.

### Part 2 — The cookie banner + capture (public website)
*Repo: `Neozaareact`*

The banner a visitor sees. It:
- Gives every visitor a random first-party ID (`nz_aid`) so we can record their
  choice even before they have an account.
- Shows Accept / Reject / Customise with equal weight, nothing pre-ticked.
- Sends every choice to the ledger (Part 1) — for anonymous visitors too.
- Has a **"Cookie Preferences"** link in the footer of every page so consent can
  be changed or withdrawn any time.
- Switches between 23 languages live.

**Why it exists:** this is the "ask before you track", "plain notice", "easy
withdrawal" and "language access" requirements, all in one component.

### Part 3 — Tag gating (public website)
*Repo: `Neozaareact`*

The part that actually **blocks** the tracking scripts. Before Google's tag
loads, we tell it "consent = denied" for analytics and ads (this is called
**Google Consent Mode v2**). Google Analytics only fully loads once the visitor
opts in. If they later withdraw, we flip the signal back and delete the cookies
we can reach.

**Why it exists:** a banner that records a "no" but still runs the trackers is
worthless. This makes the "no" mean something.

### Part 4 — The Consent Audit Console (internal admin portal)
*Repo: `neozaar_portal_frontend_A18`*

A screen only Superadmins can open (`/consent-audit`). Read-only. Tabs:
- **Overview** — totals, grant vs. reject rate, a daily trend chart.
- **Ledger** — every consent event, filterable by date/country/action/search,
  exportable as CSV.
- **Subject drill-down** — click any row to see that person's full history
  *across all their identities* (their anonymous visits + their logged-in
  account), plus the **exact notice text** they saw at each moment.
- **Notices** — the registry of notice versions per language.
- **Integrity** — runs the hash-chain check and says "chain intact" or points at
  the broken row.
- **DSAR** — the data-request queue.

**Why it exists:** this is how "be able to demonstrate consent" becomes a
30-second task instead of a database archaeology project.

### Part 5 — Notice & policy copy
*Repo: `Neozaareact` + legal review*

The actual words. The Privacy Policy was rewritten to use DPDP terms ("Data
Fiduciary", not "Data Controller"), to drop the GDPR-only concept of "legitimate
interest" for cookies, and to route grievances to the Data Protection Board of
India. The banner text lives in `app/lib/notice-i18n/en.json` and is translated
into all 22 scheduled languages.

**Why it exists:** the mechanism is only as good as what it says. Wrong wording =
invalid notice = invalid consent.

---

## 5. How it fits together — a visitor's journey

```
Visitor opens neozaar.com
        │
        ▼
Consent Mode default = DENIED  ← no analytics/ads cookies yet   (Part 3)
        │
        ▼
Banner appears, in the visitor's language                        (Part 2)
        │
        ├── "Reject All"  → choice saved locally + sent to ledger as "grant, analytics:false"
        │                                                          (Part 1)
        │
        └── "Accept All"  → choice saved + sent to ledger
                          → Consent Mode flips to GRANTED
                          → Google Analytics script loads          (Part 3)
        │
        ▼
Later: visitor clicks "Cookie Preferences" in the footer         (Part 2)
        → toggles analytics off → "withdraw" event in ledger
        → Consent Mode flips to denied, _ga cookies deleted        (Part 3)
        │
        ▼
Auditor asks "prove user X consented on the 9th"
        → Superadmin opens the Consent Audit Console               (Part 4)
        → searches the email → sees every event + the exact notice shown
        → Integrity tab confirms the records weren't altered       (Part 1)
```

---

## 6. Where the code lives

| Area | Repo | Key files |
|---|---|---|
| Ledger DB + APIs | `neozaar_backend` | `src/migrations/037_consent_ledger.sql`, `src/services/consentLedger.service.js`, `src/routes/consent.public.routes.js`, `src/routes/admin/consent.audit.routes.js`, `src/middlewares/consent.js` |
| Banner + capture | `Neozaareact` | `app/components/CookieConsent.js`, `app/lib/consent.js`, `app/lib/consentNotice.js`, `app/lib/notice-i18n/*.json`, `app/components/ConsentSync.js` |
| Tag gating | `Neozaareact` | `app/lib/consentMode.js`, `app/components/ConsentModeBridge.js`, `app/components/Analytics4.js`, `app/layout.js` |
| Audit console | `neozaar_portal_frontend_A18` | `src/app/pages/consent-audit/`, `src/app/core/services/consent-audit.service.ts` |
| Policy pages | `Neozaareact` | `app/privacy-policy/page.js`, `app/cookie-policy/page.js` |

Deeper detail: `DPDPA-CONSENT-PLAN.md` (build log, all phases) and
`DPDPA-PHASE5-HANDOFF.md` (what still needs legal sign-off).

---

## 7. Rules for working on this (read before you edit)

- **Never edit or delete rows in `consent_events` by hand.** It is append-only on
  purpose. Editing a row breaks the hash chain and destroys its evidentiary
  value. (During development the whole table was wiped and reset several times —
  that's fine for a dev DB with no real data, but never in production.)
- **If you change what the notice *says*, bump `NOTICE_VERSION`** in
  `app/lib/consent.js` and add matching `consent_notices` rows. A changed notice
  means everyone must consent again. Adding a *translation* of the same text does
  **not** need a bump.
- **Keep Reject and Accept equal.** Same size, same prominence. No pre-ticked
  toggles. This is a legal requirement, not a design preference.
- **Don't add a tracking script straight into `layout.js`.** Route it through the
  consent gate (Part 3) like `Analytics4.js` does.
- **Translation files must keep the exact key shape of `en.json`** — there's a
  validator in `app/lib/notice-i18n/README.md`.
- **Set the env vars** in each environment: `CONSENT_IP_SALT` (backend),
  `NEXT_PUBLIC_GA4_ID` (frontend).

---

## 8. What is not done yet

- **Legal sign-off** on the reworded Privacy Policy and the English notice text —
  this is the one thing blocking go-live.
- **Native-speaker review** of the 22 translations (they work now, but were a
  first pass; Bodo/Kashmiri/Manipuri/Santali especially need checking).
- **DSAR intake form** — the queue and storage exist, but there's no public form
  for a visitor to submit a data request yet.
- **Consent-receipt PDF** export for a single subject (CSV/JSON export works).
- **Geo rules** — one banner variant for everyone today; no per-country logic.

---

## 9. Mini-glossary

- **Cookie** — a small file a site stores in your browser. Can hold an ID that
  identifies you across visits.
- **Consent Mode v2** — Google's mechanism for telling its tags "the user said
  no", so they run in a limited, cookieless way (or not at all).
- **First-party ID (`nz_aid`)** — a random ID *we* generate and store, used to
  attach a consent record to an anonymous visitor.
- **Ledger** — the append-only `consent_events` table.
- **Hash chain** — each record includes a fingerprint of the previous record, so
  the whole history is tamper-evident.
- **DSAR** — Data Subject Access Request: a person asking to see, correct, or
  delete their data.
- **Eighth Schedule languages** — the 22 languages officially recognised in the
  Indian Constitution; the notice must be available in these.
- **Data Protection Board of India** — the regulator that enforces the DPDP Act
  and hears unresolved grievances.
