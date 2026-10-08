const repository = require("../../repositories/marketing/marketing.repository");
const identity = require("./identity.service");
const tagging = require("./tagging.service");
const automation = require("./automation/automation.service");
const segmentation = require("./segmentation.service");

async function ingestEvent(event) {
  const client = await repository.pool.connect();
  try {
    await client.query("BEGIN");

    if (event.idempotencyKey) {
      const duplicate = await client.query(`SELECT * FROM marketing_events
        WHERE ingestion_source = $1 AND idempotency_key = $2 LIMIT 1`,
      [event.ingestionSource || "management_api", event.idempotencyKey]);
      if (duplicate.rows[0]) {
        await client.query("COMMIT");
        return { event: duplicate.rows[0], duplicate: true };
      }
    }

    if (!event.marketingContactId && (event.anonymousId || event.email || event.phone)) {
      const resolved = await identity.resolveIdentity(event, client);
      event.marketingContactId = resolved.marketingContactId;
    }

    if (event.marketingContactId) {
      const contact = await client.query(
        "SELECT id FROM marketing_contacts WHERE id = $1 AND is_deleted = FALSE FOR UPDATE",
        [event.marketingContactId],
      );
      if (!contact.rows[0]) {
        const error = new Error("Marketing contact not found");
        error.statusCode = 404;
        throw error;
      }
    }
    if(event.marketingContactId){try{await segmentation.evaluateContact(event.marketingContactId);}catch(error){console.error("Marketing segment evaluation failed:",error?.message||error);}}
    // Stable tie-breaker makes legacy duplicate rules predictable until the
    // scoring migration can enforce uniqueness/priority.
    const rule = await client.query(`SELECT r.id, r.score_delta, r.model_id, r.conditions, m.is_default
      FROM marketing_scoring_rules r JOIN marketing_scoring_models m ON m.id=r.model_id
      WHERE r.event_type=$1 AND r.is_active=TRUE AND m.is_active=TRUE
      ORDER BY r.priority DESC,r.updated_at DESC,r.id DESC`, [event.eventType]);
    rule.rows=rule.rows.filter((item)=>matchesRule(item,event));
    const defaultRule = rule.rows.find((item) => item.is_default);
    const scoreDelta = defaultRule?.score_delta || 0;
    const { rows } = await client.query(`INSERT INTO marketing_events
      (marketing_contact_id, anonymous_id, event_type, ref_type, ref_id, url, channel, score_delta,
       metadata, idempotency_key, ingestion_source, schema_version, marketing_session_id,
       utm_source, utm_medium, utm_campaign, utm_term, utm_content, referrer, landing_page)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)
      ON CONFLICT (ingestion_source, idempotency_key) WHERE idempotency_key IS NOT NULL
      DO NOTHING RETURNING *`,
    [event.marketingContactId || null, event.anonymousId || null, event.eventType,
      event.refType || null, event.refId || null, event.url || null, event.channel || "web",
      scoreDelta, JSON.stringify(event.metadata || {}), event.idempotencyKey || null,
      event.ingestionSource || "management_api", event.schemaVersion || 1,
      event.marketingSessionId || null, event.utmSource || null, event.utmMedium || null,
      event.utmCampaign || null, event.utmTerm || null, event.utmContent || null,
      event.referrer || null, event.landingPage || null]);

    if (!rows[0]) {
      const duplicate = await client.query(`SELECT * FROM marketing_events
        WHERE ingestion_source = $1 AND idempotency_key = $2 LIMIT 1`,
      [event.ingestionSource || "management_api", event.idempotencyKey]);
      await client.query("COMMIT");
      return { event: duplicate.rows[0], duplicate: true };
    }

    if (event.marketingContactId) {
      for (const matchedRule of rule.rows) {
        if (matchedRule.score_delta === 0) continue;
        await client.query(`INSERT INTO marketing_score_ledger
          (marketing_contact_id,marketing_event_id,scoring_rule_id,model_id,score_delta,reason,occurred_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (marketing_event_id,model_id) DO NOTHING`,
        [event.marketingContactId, rows[0].id, matchedRule.id, matchedRule.model_id,
          matchedRule.score_delta, `event:${event.eventType}`, rows[0].occurred_at || new Date()]);
        await client.query(`INSERT INTO marketing_contact_scores (marketing_contact_id,model_id,score)
          VALUES ($1,$2,$3) ON CONFLICT (marketing_contact_id,model_id)
          DO UPDATE SET score=marketing_contact_scores.score+EXCLUDED.score,updated_at=NOW()`,
        [event.marketingContactId, matchedRule.model_id, matchedRule.score_delta]);
      }
      await client.query(`UPDATE marketing_contacts SET marketing_score = marketing_score + $1,
        score_updated_at = CASE WHEN $1 <> 0 THEN NOW() ELSE score_updated_at END,
        last_activity_at = NOW(), updated_at = NOW() WHERE id = $2`, [scoreDelta, event.marketingContactId]);
    }
    await client.query("COMMIT");
    // try/catch, not `.catch()`, past this point: the event is already
    // committed, so a failure here must never look like the whole ingest
    // call failed (see the identical reasoning — and a real, live-confirmed
    // instance of this exact bug — in email.service.js's recordDelivery).
    // `.catch()` alone doesn't guard a synchronous throw from a stale
    // module reference.
    if (event.marketingContactId) {
      try { await tagging.evaluateForEvent(event.marketingContactId, event); }
      catch (error) { console.error("Marketing automatic tagging failed:", error?.message || error); }
    }
    try { await automation.dispatchEvent(rows[0]); }
    catch (error) { console.error("Marketing automation dispatch failed:", error?.message || error); }
    return { event: rows[0], duplicate: false };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

function matchesRule(rule,event){const c=rule.conditions||{};if(c.channel&&c.channel!==event.channel)return false;if(c.refType&&c.refType!==event.refType)return false;if(c.refId&&String(c.refId)!==String(event.refId))return false;return true;}

module.exports = { ingestEvent,matchesRule };
