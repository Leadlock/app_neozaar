const repository = require("../../repositories/marketing/marketing.repository");

async function createRule(input, userId) {
  try {
    const { rows } = await repository.pool.query(`INSERT INTO marketing_scoring_rules
      (event_type, score_delta, description, is_active, priority, conditions, model_id, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [input.eventType, input.scoreDelta, input.description || null, input.isActive !== false,
      input.priority || 0, JSON.stringify(input.conditions || {}), input.modelId, userId]);
    return rows[0];
  } catch (error) {
    if (error.code === "23505") throw Object.assign(new Error("An active rule already exists for this event type"), { statusCode: 409 });
    throw error;
  }
}

async function updateRule(id, input) {
  try {
    const { rows } = await repository.pool.query(`UPDATE marketing_scoring_rules SET
      event_type=$1, score_delta=$2, description=$3, is_active=$4, priority=$5,
      conditions=$6, model_id=$7, updated_at=NOW() WHERE id=$8 RETURNING *`,
    [input.eventType, input.scoreDelta, input.description || null, input.isActive !== false,
      input.priority || 0, JSON.stringify(input.conditions || {}), input.modelId, id]);
    if (!rows[0]) throw Object.assign(new Error("Scoring rule not found"), { statusCode: 404 });
    return rows[0];
  } catch (error) {
    if (error.code === "23505") throw Object.assign(new Error("An active rule already exists for this event type"), { statusCode: 409 });
    throw error;
  }
}

async function deleteRule(id) {
  const result = await repository.pool.query("DELETE FROM marketing_scoring_rules WHERE id = $1", [id]);
  if (!result.rowCount) throw Object.assign(new Error("Scoring rule not found"), { statusCode: 404 });
}

async function rebuildContact(contactId) {
  const client = await repository.pool.connect();
  try {
    await client.query("BEGIN");
    const contact = await client.query("SELECT id FROM marketing_contacts WHERE id=$1 AND is_deleted=FALSE FOR UPDATE", [contactId]);
    if (!contact.rows[0]) throw Object.assign(new Error("Marketing contact not found"), { statusCode: 404 });
    await client.query(`INSERT INTO marketing_score_ledger
      (marketing_contact_id, marketing_event_id, model_id, score_delta, reason, occurred_at)
      SELECT marketing_contact_id,id,(SELECT id FROM marketing_scoring_models WHERE is_default=TRUE LIMIT 1),score_delta,'event_rebuild',occurred_at
      FROM marketing_events WHERE marketing_contact_id=$1 AND score_delta<>0
      ON CONFLICT (marketing_event_id,model_id) DO NOTHING`, [contactId]);
    const totals=await client.query(`SELECT model_id,COALESCE(SUM(score_delta),0)::int score
      FROM marketing_score_ledger WHERE marketing_contact_id=$1 GROUP BY model_id`,[contactId]);
    for(const row of totals.rows)await client.query(`INSERT INTO marketing_contact_scores(marketing_contact_id,model_id,score)
      VALUES($1,$2,$3) ON CONFLICT(marketing_contact_id,model_id) DO UPDATE SET score=EXCLUDED.score,updated_at=NOW()`,[contactId,row.model_id,row.score]);
    const total = await client.query(`SELECT COALESCE(cs.score,0)::int score FROM marketing_scoring_models m
      LEFT JOIN marketing_contact_scores cs ON cs.model_id=m.id AND cs.marketing_contact_id=$1
      WHERE m.is_default=TRUE LIMIT 1`, [contactId]);
    await client.query(`UPDATE marketing_contacts SET marketing_score=$1, score_updated_at=NOW(),
      updated_at=NOW() WHERE id=$2`, [total.rows[0]?.score||0, contactId]);
    await client.query("COMMIT");
    return { marketingContactId: Number(contactId), marketingScore: total.rows[0]?.score||0,scores:totals.rows };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally { client.release(); }
}

async function listModels(){return (await repository.pool.query("SELECT * FROM marketing_scoring_models ORDER BY is_default DESC,name")).rows;}
async function createModel(input){return (await repository.pool.query(`INSERT INTO marketing_scoring_models
  (name,code,description,decay_enabled,decay_after_days,decay_percent) VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,
 [input.name,input.code,input.description||null,input.decayEnabled||false,input.decayAfterDays||30,input.decayPercent||10])).rows[0];}
async function runDecay(){
  const client=await repository.pool.connect();let changed=0;
  try{await client.query("BEGIN");const models=await client.query("SELECT * FROM marketing_scoring_models WHERE is_active=TRUE AND decay_enabled=TRUE FOR UPDATE");
    for(const model of models.rows){const candidates=await client.query(`SELECT cs.marketing_contact_id,cs.score
      FROM marketing_contact_scores cs JOIN marketing_contacts mc ON mc.id=cs.marketing_contact_id
      WHERE cs.model_id=$1 AND mc.last_activity_at<NOW()-($2::int*INTERVAL '1 day')`,[model.id,model.decay_after_days]);
    for(const row of candidates.rows){const next=Math.max(0,Math.floor(Number(row.score)*(1-Number(model.decay_percent)/100))),delta=next-Number(row.score);if(!delta)continue;await client.query("UPDATE marketing_contact_scores SET score=$1,updated_at=NOW() WHERE marketing_contact_id=$2 AND model_id=$3",[next,row.marketing_contact_id,model.id]);await client.query(`INSERT INTO marketing_score_ledger(marketing_contact_id,model_id,score_delta,reason) VALUES($1,$2,$3,'score_decay')`,[row.marketing_contact_id,model.id,delta]);if(model.is_default)await client.query("UPDATE marketing_contacts SET marketing_score=$1,score_updated_at=NOW() WHERE id=$2",[next,row.marketing_contact_id]);changed++;}
    await client.query("UPDATE marketing_scoring_models SET last_decay_at=NOW() WHERE id=$1",[model.id]);}
    await client.query("COMMIT");return{contactsChanged:changed};
  }catch(error){await client.query("ROLLBACK").catch(()=>{});throw error;}finally{client.release();}
}

module.exports = { createRule, updateRule, deleteRule, rebuildContact,listModels,createModel,runDecay };
