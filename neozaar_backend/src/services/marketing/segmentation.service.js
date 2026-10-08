const repository = require("../../repositories/marketing/marketing.repository");
const tagging = require("./tagging.service");

const FIELD_SQL = Object.freeze({
  lifecycle_stage: "mc.lifecycle_stage",
  marketing_score: "mc.marketing_score",
  email_consent: "mc.email_consent",
  whatsapp_consent: "mc.whatsapp_consent",
  sms_consent: "mc.sms_consent",
  do_not_contact: "mc.do_not_contact",
  first_source: "mc.first_source",
  last_source: "mc.last_source",
  created_at: "mc.created_at",
  last_activity_at: "mc.last_activity_at",
  industry: "cc.industry",
  company: "cc.company",
  utm_source:"mc.utm_source",utm_campaign:"mc.utm_campaign",last_campaign:"mc.last_campaign",
});

const EVENT_FIELDS={product_viewed:"PRODUCT_VIEW",category_viewed:"CATEGORY_VIEW",page_visited:"PAGE_VIEW",
  form_submitted:"FORM_SUBMIT",asset_downloaded:"ASSET_DOWNLOAD",email_opened:"EMAIL_OPEN",email_clicked:"EMAIL_CLICK"};

function compileRules(definition = { match: "all", rules: [] }) {
  if (!["all", "any"].includes(definition.match) || !Array.isArray(definition.rules)) {
    throw Object.assign(new Error("Invalid segment rule definition"), { statusCode: 400 });
  }
  const params = [];
  const clauses = definition.rules.map((rule) => {
    if(rule.field==="tag"){
      params.push(rule.value); const p=`$${params.length}`;
      const exists=`EXISTS (SELECT 1 FROM marketing_contact_tags mct JOIN marketing_tags mt ON mt.id=mct.tag_id WHERE mct.marketing_contact_id=mc.id AND (mt.id::text=${p}::text OR mt.name=${p}::text))`;
      return ["neq","not_exists"].includes(rule.op)?`NOT ${exists}`:exists;
    }
    if(EVENT_FIELDS[rule.field]){
      params.push(EVENT_FIELDS[rule.field]);const type=`$${params.length}`;
      let extra="";
      if(rule.value!==undefined&&rule.value!==null&&rule.value!==""){params.push(rule.value);const value=`$${params.length}`;extra=rule.field==="page_visited"?` AND me.url ILIKE '%'||${value}::text||'%'`:` AND me.ref_id::text=${value}::text`;}
      const exists=`EXISTS (SELECT 1 FROM marketing_events me WHERE me.marketing_contact_id=mc.id AND me.event_type=${type}${extra})`;
      return ["neq","not_exists"].includes(rule.op)?`NOT ${exists}`:exists;
    }
    if(rule.field==="activity_count"){
      const value=rule.value||{};params.push(value.eventType||null);const type=`$${params.length}`;
      params.push(Number(value.count||0));const count=`$${params.length}`;
      let time="";if(value.withinDays){params.push(Number(value.withinDays));time=` AND me.occurred_at>NOW()-(${`$${params.length}`}*INTERVAL '1 day')`;}
      const op={gt:">",gte:">=",lt:"<",lte:"<=",eq:"="}[rule.op];if(!op)throw Object.assign(new Error("Invalid activity count operator"),{statusCode:400});
      return `(SELECT COUNT(*) FROM marketing_events me WHERE me.marketing_contact_id=mc.id AND (${type}::text IS NULL OR me.event_type=${type})${time}) ${op} ${count}`;
    }
    const field = FIELD_SQL[rule.field];
    if (!field) throw Object.assign(new Error(`Unsupported segment field: ${rule.field}`), { statusCode: 400 });
    params.push(rule.value);
    const p = `$${params.length}`;
    switch (rule.op) {
      case "eq": return `${field} = ${p}`;
      case "neq": return `${field} IS DISTINCT FROM ${p}`;
      case "gt": return `${field} > ${p}`;
      case "gte": return `${field} >= ${p}`;
      case "lt": return `${field} < ${p}`;
      case "lte": return `${field} <= ${p}`;
      case "contains": return `COALESCE(${field}::text, '') ILIKE '%' || ${p}::text || '%'`;
      case "not_contains": return `COALESCE(${field}::text, '') NOT ILIKE '%' || ${p}::text || '%'`;
      case "exists": params.pop(); return `${field} IS NOT NULL`;
      case "not_exists": params.pop(); return `${field} IS NULL`;
      case "before": return `${field} < ${p}::timestamp`;
      case "after": return `${field} > ${p}::timestamp`;
      case "within_days": return `${field} >= NOW()-(${p}::int*INTERVAL '1 day')`;
      case "within_hours": return `${field} >= NOW()-(${p}::int*INTERVAL '1 hour')`;
      case "in":
        if (!Array.isArray(rule.value) || !rule.value.length) {
          throw Object.assign(new Error("The in operator requires a non-empty array"), { statusCode: 400 });
        }
        return `${field}::text = ANY(${p}::text[])`;
      default: throw Object.assign(new Error(`Unsupported segment operator: ${rule.op}`), { statusCode: 400 });
    }
  });
  return { where: clauses.length ? `(${clauses.join(definition.match === "all" ? " AND " : " OR ")})` : "TRUE", params };
}

async function preview(rules, client = repository.pool) {
  const compiled = compileRules(rules);
  const { rows } = await client.query(`SELECT mc.id FROM marketing_contacts mc
    LEFT JOIN crm_contacts cc ON cc.id = mc.crm_contact_id
    WHERE mc.is_deleted = FALSE AND ${compiled.where}
    ORDER BY mc.id ASC LIMIT 26`, compiled.params);
  const countResult = await client.query(`SELECT COUNT(*)::int AS count FROM marketing_contacts mc
    LEFT JOIN crm_contacts cc ON cc.id = mc.crm_contact_id
    WHERE mc.is_deleted = FALSE AND ${compiled.where}`, compiled.params);
  return { count: countResult.rows[0].count, sampleContactIds: rows.slice(0, 25).map((row) => row.id) };
}

async function refresh(segmentId) {
  const client = await repository.pool.connect();
  try {
    await client.query("BEGIN");
    const segmentResult = await client.query("SELECT * FROM marketing_segments WHERE id = $1 FOR UPDATE", [segmentId]);
    const segment = segmentResult.rows[0];
    if (!segment) throw Object.assign(new Error("Segment not found"), { statusCode: 404 });
    const version = Number(segment.evaluation_version || 0) + 1;
    await client.query(`UPDATE marketing_segments SET evaluation_status = 'evaluating',
      evaluation_error = NULL WHERE id = $1`, [segmentId]);
    const compiled = compileRules(segment.rules);
    const matches = await client.query(`SELECT mc.id FROM marketing_contacts mc
      LEFT JOIN crm_contacts cc ON cc.id = mc.crm_contact_id
      WHERE mc.is_deleted = FALSE AND ${compiled.where}`, compiled.params);
    const previous=await client.query("SELECT marketing_contact_id id FROM marketing_segment_members WHERE segment_id=$1",[segmentId]);
    const oldIds=new Set(previous.rows.map(r=>r.id));const newIds=new Set(matches.rows.map(r=>r.id));
    for(const id of newIds)if(!oldIds.has(id))await client.query(`INSERT INTO marketing_segment_history(marketing_contact_id,segment_id,action,evaluation_version) VALUES($1,$2,'entered',$3)`,[id,segmentId,version]);
    for(const id of oldIds)if(!newIds.has(id))await client.query(`INSERT INTO marketing_segment_history(marketing_contact_id,segment_id,action,evaluation_version) VALUES($1,$2,'exited',$3)`,[id,segmentId,version]);
    await client.query("DELETE FROM marketing_segment_members WHERE segment_id = $1", [segmentId]);
    if (matches.rows.length) {
      const ids = matches.rows.map((row) => row.id);
      await client.query(`INSERT INTO marketing_segment_members
        (segment_id, marketing_contact_id, membership_reason, evaluation_version, evaluated_at)
        SELECT $1, matched.id, $2::jsonb, $3, NOW() FROM UNNEST($4::int[]) AS matched(id)`,
      [segmentId, JSON.stringify({ match: segment.rules.match }), version, ids]);
    }
    await client.query(`UPDATE marketing_segments SET member_count = $1, last_evaluated_at = NOW(),
      evaluation_version = $2, evaluation_status = 'ready', evaluation_error = NULL,
      next_refresh_at = CASE WHEN refresh_interval_minutes IS NULL THEN NULL
        ELSE NOW() + (refresh_interval_minutes * INTERVAL '1 minute') END,
      updated_at = NOW() WHERE id = $3`, [matches.rows.length, version, segmentId]);
    await client.query("COMMIT");
    return { segmentId: Number(segmentId), memberCount: matches.rows.length, evaluationVersion: version };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    if (!error.statusCode) {
      await repository.pool.query(`UPDATE marketing_segments SET evaluation_status = 'failed',
        evaluation_error = $1 WHERE id = $2`, [String(error.message).slice(0, 500), segmentId]).catch(() => {});
    }
    throw error;
  } finally { client.release(); }
}

async function previewSegment(segmentId) {
  const { rows } = await repository.pool.query("SELECT rules FROM marketing_segments WHERE id = $1", [segmentId]);
  if (!rows[0]) throw Object.assign(new Error("Segment not found"), { statusCode: 404 });
  return preview(rows[0].rules);
}

async function evaluateContact(contactId){const{rows}=await repository.pool.query("SELECT id,rules,evaluation_version FROM marketing_segments WHERE is_dynamic=TRUE");const changes=[];for(const segment of rows){const compiled=compileRules(segment.rules);const params=[...compiled.params,contactId];const match=await repository.pool.query(`SELECT 1 FROM marketing_contacts mc LEFT JOIN crm_contacts cc ON cc.id=mc.crm_contact_id WHERE mc.is_deleted=FALSE AND ${compiled.where} AND mc.id=$${params.length}`,params);const existing=await repository.pool.query("SELECT 1 FROM marketing_segment_members WHERE segment_id=$1 AND marketing_contact_id=$2",[segment.id,contactId]);if(match.rows[0]&&!existing.rows[0]){await repository.pool.query(`INSERT INTO marketing_segment_members(segment_id,marketing_contact_id,membership_reason,evaluation_version) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING`,[segment.id,contactId,JSON.stringify({source:"automatic"}),Number(segment.evaluation_version||0)+1]);await repository.pool.query(`INSERT INTO marketing_segment_history(marketing_contact_id,segment_id,action,evaluation_version) VALUES($1,$2,'entered',$3)`,[contactId,segment.id,Number(segment.evaluation_version||0)+1]);await tagging.evaluateSegment(contactId,segment.id,true);changes.push({segmentId:segment.id,action:"entered"});}else if(!match.rows[0]&&existing.rows[0]){await repository.pool.query("DELETE FROM marketing_segment_members WHERE segment_id=$1 AND marketing_contact_id=$2",[segment.id,contactId]);await repository.pool.query(`INSERT INTO marketing_segment_history(marketing_contact_id,segment_id,action,evaluation_version) VALUES($1,$2,'exited',$3)`,[contactId,segment.id,Number(segment.evaluation_version||0)+1]);changes.push({segmentId:segment.id,action:"exited"});}await repository.pool.query(`UPDATE marketing_segments SET member_count=(SELECT COUNT(*) FROM marketing_segment_members WHERE segment_id=$1),last_evaluated_at=NOW() WHERE id=$1`,[segment.id]);}return changes;}

module.exports = { FIELD_SQL, compileRules, preview, previewSegment, refresh,evaluateContact };
