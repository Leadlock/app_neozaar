const repository = require("../../repositories/marketing/marketing.repository");
const eventIngestion = require("./event-ingestion.service");
const journeys = require("./journey-attribution.service");

function utmFrom(input) {
  return Object.fromEntries([["source", input.utmSource], ["medium", input.utmMedium],
    ["campaign", input.utmCampaign], ["term", input.utmTerm], ["content", input.utmContent]]
    .filter(([, value]) => value));
}

async function track(input, source) {
  const client = await repository.pool.connect();
  let visitor;
  let session;
  try {
    await client.query("BEGIN");
    const utm = utmFrom(input);
    const visitorResult = await client.query(`INSERT INTO marketing_visitors
      (visitor_id, first_seen_at, last_seen_at, page_count, landing_page, exit_page, referrer, first_utm, latest_utm, device)
      VALUES ($1,NOW(),NOW(),$2,$3,$4,$5,$6,$6,$7)
      ON CONFLICT (visitor_id) DO UPDATE SET last_seen_at=NOW(),
        page_count=marketing_visitors.page_count+EXCLUDED.page_count,
        exit_page=COALESCE(EXCLUDED.exit_page, marketing_visitors.exit_page),
        latest_utm=CASE WHEN EXCLUDED.latest_utm='{}'::jsonb THEN marketing_visitors.latest_utm ELSE EXCLUDED.latest_utm END
      RETURNING *`, [input.visitorId, input.eventType === "PAGE_VIEW" ? 1 : 0,
      input.landingPage || input.url || null, input.url || null, input.referrer || null,
      JSON.stringify(utm), JSON.stringify(input.device || {})]);
    visitor = visitorResult.rows[0];
    const sessionResult = await client.query(`INSERT INTO marketing_sessions
      (session_id, visitor_id, page_count, landing_page, exit_page, referrer, utm, device)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      ON CONFLICT (session_id) DO UPDATE SET last_seen_at=NOW(),
        page_count=marketing_sessions.page_count+EXCLUDED.page_count,
        exit_page=COALESCE(EXCLUDED.exit_page, marketing_sessions.exit_page)
      RETURNING *`, [input.sessionId, visitor.id, input.eventType === "PAGE_VIEW" ? 1 : 0,
      input.landingPage || input.url || null, input.url || null, input.referrer || null,
      JSON.stringify(utm), JSON.stringify(input.device || {})]);
    session = sessionResult.rows[0];
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally { client.release(); }

  const result = await eventIngestion.ingestEvent({ ...input, anonymousId: input.visitorId,
    marketingSessionId: session.id, ingestionSource: source });
  if (result.event?.marketing_contact_id) {
    await repository.pool.query(`UPDATE marketing_visitors SET marketing_contact_id=$1
      WHERE id=$2 AND marketing_contact_id IS DISTINCT FROM $1`, [result.event.marketing_contact_id, visitor.id]);
    const utm=utmFrom(input);
    await repository.pool.query(`UPDATE marketing_contacts SET
      first_source=COALESCE(first_source,$1),last_source=COALESCE($1,last_source),
      first_campaign=COALESCE(first_campaign,$2),last_campaign=COALESCE($2,last_campaign),
      utm_source=COALESCE($3,utm_source),utm_medium=COALESCE($4,utm_medium),
      utm_campaign=COALESCE($5,utm_campaign),utm_term=COALESCE($6,utm_term),utm_content=COALESCE($7,utm_content),updated_at=NOW()
      WHERE id=$8`,[utm.source||null,utm.campaign||null,input.utmSource||null,input.utmMedium||null,
      input.utmCampaign||null,input.utmTerm||null,input.utmContent||null,result.event.marketing_contact_id]);
  }

  // Attribution touchpoints are for identifiable marketing touches, not
  // every internal page view — only recorded when this hit actually came
  // from somewhere attributable (a UTM-tagged link or an external
  // referrer). recordTouchpoint() existed already but had no caller at
  // all, so attribution() always had nothing to compute against.
  const utmForTouchpoint = utmFrom(input);
  if (utmForTouchpoint.source || input.referrer) {
    try {
      await journeys.recordTouchpoint({
        contactId: result.event?.marketing_contact_id || null,
        visitorId: visitor.id,
        eventId: result.event?.id || null,
        touchType: input.eventType === "PAGE_VIEW" ? "visit" : "interaction",
        source: utmForTouchpoint.source || null,
        medium: utmForTouchpoint.medium || (input.referrer ? "referral" : null),
        campaign: utmForTouchpoint.campaign || null,
        content: utmForTouchpoint.content || null,
        landingPage: input.landingPage || input.url || null,
        referrer: input.referrer || null,
      });
    } catch (error) {
      console.error("Marketing touchpoint recording failed:", error?.message || error);
    }
  }

  return { ...result, visitor: { visitorId: visitor.visitor_id }, session: { sessionId: session.session_id } };
}

async function getVisitor(visitorId) {
  const { rows } = await repository.pool.query(`SELECT visitor_id, marketing_contact_id, first_seen_at,
    last_seen_at, page_count, landing_page, exit_page, referrer, first_utm, latest_utm, device
    FROM marketing_visitors WHERE visitor_id=$1`, [visitorId]);
  if (!rows[0]) throw Object.assign(new Error("Visitor not found"), { statusCode: 404 });
  return rows[0];
}

async function getSession(sessionId) {
  const { rows } = await repository.pool.query(`SELECT s.*, v.visitor_id AS marketing_visitor_id
    FROM marketing_sessions s JOIN marketing_visitors v ON v.id=s.visitor_id WHERE s.session_id=$1`, [sessionId]);
  if (!rows[0]) throw Object.assign(new Error("Session not found"), { statusCode: 404 });
  return rows[0];
}

module.exports = { track, getVisitor, getSession, utmFrom };
