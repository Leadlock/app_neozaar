# Marketing tracking integration contract

Browser tracking uses the existing `POST /api/marketing/events` endpoint and does not embed a secret. Global CORS policy, endpoint rate limiting, validation, payload limits, and visitor/session identifiers provide the public boundary. A server integration may additionally send `X-Marketing-Key` matching `MARKETING_TRACKING_SERVER_KEY`; an invalid supplied key is rejected.

```json
{"visitorId":"visitor-uuid","sessionId":"session-uuid","idempotencyKey":"browser-event-uuid","eventType":"page_view","url":"https://neozaar.com/products/42","utmSource":"google","utmCampaign":"spring","referrer":"https://google.com/","landingPage":"https://neozaar.com/products/42","device":{"browser":"Chrome","deviceType":"desktop"}}
```

Supported event names are normalized to uppercase internally. Metadata is limited to 16 KB and device properties are allow-listed. Use `sendBeacon` or a fire-and-forget request so tracking never delays navigation or rendering.

Identity stitching uses `POST /api/marketing/identity/stitch` with an anonymous visitor ID and a known email or phone. It only resolves existing CRM contacts; it never creates one. Previous Marketing events are reassigned to the canonical Marketing profile. Ambiguous/conflicting identities return `409`.

Authenticated Marketing managers can inspect records using `GET /api/marketing/visitors/:visitorId` and `GET /api/marketing/sessions/:sessionId`.
