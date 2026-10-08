# Consent notice — translations

The cookie consent banner and preference centre are legally operative under the
DPDP Act, 2023, which requires (s.5(3)) the notice to be available in **English or
any of the 22 languages in the Eighth Schedule to the Constitution**.

`en.json` is the canonical English and the source every translation is built from.
`<code>.json` holds one language each (23 files total). The banner
dynamic-imports the selected one — see `../consentNotice.js` → `loadNoticeStrings()`.
Each file is its own build chunk, so only the chosen language is fetched.

## Status of the translations

The non-English files were produced in-house as a first pass so the banner is
**fully functional in all 23 languages now** (no "request it" fallback). They still
need a **native-speaker + legal review** before they are treated as final — the
reccommended order:

| Tier | Languages | Confidence | Review priority |
|---|---|---|---|
| 1 | hi, mr, bn, ta, te, gu, kn, ml, pa, or, ur | good | standard proofread |
| 2 | as, ne, sa, kok, mai, doi, sd | fair | careful review |
| 3 | brx (Bodo), ks (Kashmiri), mni (Manipuri/Meitei Mayek), sat (Santali/Ol Chiki) | **low — rare scripts** | mandatory native validation before relying on them |

Fixing a file is just editing its JSON — no code change, no version bump (the text
meaning is unchanged).

## Rules for anyone editing these

- Translate **values only**, never keys. Keep the key shape identical to `en.json`
  (validate with the check in the repo, below).
- Keep verbatim / unlocalised: `{NeoZaar}`, `Google LLC`, `Google Analytics 4`,
  `Data Protection Board of India`, the quoted UI label `"Cookie Preferences"`,
  `compliance@neozaar.com`, URLs, and the numerals in retention periods.
- Translate: "Cookie Policy", "Privacy Policy", "Recipients", "Retention",
  "session / up to 12 months", "up to 14 months", and all UI labels.
- `withdrawLine` carries legal meaning ("change your choice", "grievances",
  "Data Protection Board of India") — translate precisely, don't paraphrase away
  the withdrawal right or the Board reference.
- Plain strings, no HTML/markdown.
- RTL languages (`ur`, `ks`, `sd`) are handled automatically by
  `consentNotice.js` (`RTL_LOCALES`) — the component sets `dir="rtl"`.

## Adding a new language / replacing a file

1. Drop `<iso-code>.json` in this folder, same shape as `en.json`.
2. That's it for the banner — `loadNoticeStrings()` picks it up if the code is in
   `NOTICE_LOCALES` in `../consentNotice.js` (all 23 are already listed).
3. Add a matching `consent_notices` row (`version='v1'`, `locale='<code>'`,
   translated `title` / `body_html` / `categories`) via a migration so the
   Superadmin Consent Audit Console can render the exact notice a speaker of that
   language saw. Until then the console shows the English `v1/en` row for those
   events, which is acceptable but not ideal.

## Validate key shape

```bash
node -e "const fs=require('fs');const ks=o=>Object.keys(o).flatMap(k=>o[k]&&typeof o[k]=='object'?Object.keys(o[k]).map(x=>k+'.'+x):[k]).sort();const en=ks(require('./en.json'));fs.readdirSync('.').filter(f=>f.endsWith('.json')).forEach(f=>{const d=ks(require('./'+f));console.log(f, JSON.stringify(d)===JSON.stringify(en)?'OK':'DIFF')})"
```

## Go-live gate

Every wording change in `en.json`, the Cookie Policy and the Privacy Policy needs
**compliance / legal sign-off** — see `DPDPA-PHASE5-HANDOFF.md` at the repo root.
