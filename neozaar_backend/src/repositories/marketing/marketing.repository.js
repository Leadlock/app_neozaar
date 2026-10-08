const pool = require("../../config/database");

async function tableExists(name) {
  const { rows } = await pool.query("SELECT to_regclass($1) AS t", [`public.${name}`]);
  return Boolean(rows[0]?.t);
}

async function getContacts({ search, stage, limit = 50, offset = 0 }) {
  const clauses = ["mc.is_deleted = FALSE"];
  const filters = [];
  if (stage) { filters.push(stage); clauses.push(`mc.lifecycle_stage = $${filters.length}`); }
  if (search) {
    filters.push(`%${search}%`);
    clauses.push(`(cc.name ILIKE $${filters.length} OR cc.email ILIKE $${filters.length} OR mc.email ILIKE $${filters.length})`);
  }
  const pageParams = [...filters, limit, offset];
  const { rows } = await pool.query(`
    SELECT mc.id, mc.crm_contact_id, mc.email AS mkt_email, mc.marketing_score,
           mc.lifecycle_stage, mc.last_source, mc.last_activity_at, mc.email_consent,
           mc.do_not_contact, mc.custom_fields,mc.owner_id,mc.created_at, cc.name AS contact_name,
           cc.email AS contact_email, cc.company, cc.industry
    FROM marketing_contacts mc LEFT JOIN crm_contacts cc ON cc.id = mc.crm_contact_id
    WHERE ${clauses.join(" AND ")}
    ORDER BY mc.last_activity_at DESC NULLS LAST, mc.created_at DESC
    LIMIT $${filters.length + 1} OFFSET $${filters.length + 2}`, pageParams);
  const total = await pool.query(`
    SELECT COUNT(*)::int AS n FROM marketing_contacts mc
    LEFT JOIN crm_contacts cc ON cc.id = mc.crm_contact_id
    WHERE ${clauses.join(" AND ")}`, filters);
  return { rows, total: total.rows[0].n };
}

async function getContactTimeline(id,{eventType,dateFrom,dateTo,limit=50,offset=0}={}) {
  const params=[id]; const filters=[];
  if(eventType){params.push(eventType);filters.push(`event_type=$${params.length}`);}
  if(dateFrom){params.push(dateFrom);filters.push(`occurred_at >= $${params.length}`);}
  if(dateTo){params.push(dateTo);filters.push(`occurred_at <= $${params.length}`);}
  params.push(limit,offset);
  const where=filters.length?`AND ${filters.join(" AND ")}`:"";
  const {rows}=await pool.query(`WITH timeline AS (
    SELECT id::text,event_type,ref_type,ref_id,url,channel,score_delta,metadata,occurred_at
      FROM marketing_events WHERE marketing_contact_id=$1
    UNION ALL SELECT ('tag-'||id)::text,('TAG_'||UPPER(action)), 'tag',tag_id,NULL,NULL,0,
      jsonb_build_object('source',source),occurred_at FROM marketing_tag_history WHERE marketing_contact_id=$1
    UNION ALL SELECT ('segment-'||id)::text,('SEGMENT_'||UPPER(action)),'segment',segment_id,NULL,NULL,0,
      '{}'::jsonb,occurred_at FROM marketing_segment_history WHERE marketing_contact_id=$1)
    SELECT *,COUNT(*) OVER()::int AS total_count FROM timeline WHERE TRUE ${where}
    ORDER BY occurred_at DESC LIMIT $${params.length-1} OFFSET $${params.length}`,params);
  return {rows,total:rows[0]?.total_count||0};
}

async function getTags() {
  const { rows } = await pool.query(`SELECT t.*, COALESCE(ct.n, 0)::int AS contact_count
    FROM marketing_tags t LEFT JOIN
    (SELECT tag_id, COUNT(*) AS n FROM marketing_contact_tags GROUP BY tag_id) ct ON ct.tag_id = t.id
    ORDER BY t.name ASC`);
  return rows;
}

async function createTag({ name, color, userId }) {
  const { rows } = await pool.query(`INSERT INTO marketing_tags (name, color, created_by)
    VALUES ($1, $2, $3) ON CONFLICT (name) DO NOTHING RETURNING *`, [name, color || null, userId]);
  return rows[0] || null;
}

async function deleteTag(id) {
  const result = await pool.query("DELETE FROM marketing_tags WHERE id = $1", [id]);
  return result.rowCount > 0;
}

async function getSegments() {
  const { rows } = await pool.query(`SELECT s.*, u.name AS created_by_name FROM marketing_segments s
    LEFT JOIN users u ON u.id = s.created_by ORDER BY s.updated_at DESC`);
  return rows;
}

async function createSegment({ name, description, rules, userId }) {
  const { rows } = await pool.query(`INSERT INTO marketing_segments (name, description, rules, created_by)
    VALUES ($1, $2, $3, $4) RETURNING *`, [name, description || null, JSON.stringify(rules), userId]);
  return rows[0];
}

async function updateSegment(id, { name, description, rules }) {
  const { rows } = await pool.query(`UPDATE marketing_segments SET name = $1, description = $2,
    rules = $3, updated_at = NOW() WHERE id = $4 RETURNING *`,
  [name, description || null, JSON.stringify(rules), id]);
  return rows[0] || null;
}

async function deleteSegment(id) {
  const result = await pool.query("DELETE FROM marketing_segments WHERE id = $1", [id]);
  return result.rowCount > 0;
}

async function getScoringRules() {
  const { rows } = await pool.query("SELECT * FROM marketing_scoring_rules ORDER BY event_type ASC, priority DESC, id DESC");
  return rows;
}

module.exports = { pool, tableExists, getContacts, getContactTimeline, getTags, createTag,
  deleteTag, getSegments, createSegment, updateSegment, deleteSegment, getScoringRules };
