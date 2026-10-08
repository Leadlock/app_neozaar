const repository = require("../../repositories/marketing/marketing.repository");

async function applyTag(client, contactId, tagId, source, ruleId = null, actorId = null) {
  const inserted = await client.query(`INSERT INTO marketing_contact_tags (marketing_contact_id,tag_id)
    VALUES ($1,$2) ON CONFLICT DO NOTHING RETURNING tag_id`, [contactId,tagId]);
  if (inserted.rows[0]) await client.query(`INSERT INTO marketing_tag_history
    (marketing_contact_id,tag_id,action,source,rule_id,actor_id) VALUES ($1,$2,'added',$3,$4,$5)`,
  [contactId,tagId,source,ruleId,actorId]);
  return Boolean(inserted.rows[0]);
}

async function removeTag(client, contactId, tagId, source, actorId = null) {
  const removed = await client.query(`DELETE FROM marketing_contact_tags
    WHERE marketing_contact_id=$1 AND tag_id=$2 RETURNING tag_id`, [contactId,tagId]);
  if (removed.rows[0]) await client.query(`INSERT INTO marketing_tag_history
    (marketing_contact_id,tag_id,action,source,actor_id) VALUES ($1,$2,'removed',$3,$4)`,
  [contactId,tagId,source,actorId]);
  return Boolean(removed.rows[0]);
}

async function evaluateForEvent(contactId, event) {
  if (!contactId) return [];
  const client = await repository.pool.connect();
  try {
    await client.query("BEGIN");
    const { rows } = await client.query(`SELECT * FROM marketing_tag_rules
      WHERE is_active=TRUE AND trigger_type IN ('event','score','lifecycle') ORDER BY id`);
    const contactResult = await client.query(`SELECT marketing_score,lifecycle_stage FROM marketing_contacts WHERE id=$1`, [contactId]);
    const contact = contactResult.rows[0] || {};
    const applied = [];
    for (const rule of rows) {
      const c = rule.conditions || {};
      let eventMatches=rule.trigger_type === "event" && (!c.eventType || c.eventType === event.eventType);
      if(eventMatches&&c.minimumCount){const count=await client.query(`SELECT COUNT(*)::int n FROM marketing_events WHERE marketing_contact_id=$1 AND event_type=$2 AND ($3::int IS NULL OR occurred_at>NOW()-($3::int*INTERVAL '1 day'))`,[contactId,c.eventType,c.withinDays||null]);eventMatches=count.rows[0].n>=Number(c.minimumCount);}
      const matches = eventMatches ||
        (rule.trigger_type === "score" && Number(contact.marketing_score) >= Number(c.minimum || 0)) ||
        (rule.trigger_type === "lifecycle" && contact.lifecycle_stage === c.stage);
      if (matches && await applyTag(client,contactId,rule.tag_id,"automatic",rule.id)) applied.push(rule.tag_id);
    }
    await client.query("COMMIT");
    return applied;
  } catch (error) { await client.query("ROLLBACK").catch(() => {}); throw error; }
  finally { client.release(); }
}

async function evaluateSegment(contactId,segmentId,entered){if(!entered)return[];const client=await repository.pool.connect();try{await client.query("BEGIN");const{rows}=await client.query(`SELECT * FROM marketing_tag_rules WHERE is_active=TRUE AND trigger_type='segment' AND (conditions->>'segmentId')::int=$1`,[segmentId]);const applied=[];for(const rule of rows)if(await applyTag(client,contactId,rule.tag_id,"segment",rule.id))applied.push(rule.tag_id);await client.query("COMMIT");return applied;}catch(e){await client.query("ROLLBACK").catch(()=>{});throw e;}finally{client.release();}}

async function bulk(input, actorId) {
  const client = await repository.pool.connect();
  try {
    await client.query("BEGIN");
    let changed=0;
    for (const contactId of input.contactIds) {
      changed += input.action === "add"
        ? Number(await applyTag(client,contactId,input.tagId,"bulk",null,actorId))
        : Number(await removeTag(client,contactId,input.tagId,"bulk",actorId));
    }
    await client.query("COMMIT");
    return { requested: input.contactIds.length,changed };
  } catch (error) { await client.query("ROLLBACK").catch(() => {}); throw error; }
  finally { client.release(); }
}

async function listRules(){ return (await repository.pool.query(`SELECT r.*,t.name tag_name FROM marketing_tag_rules r JOIN marketing_tags t ON t.id=r.tag_id ORDER BY r.id`)).rows; }
async function createRule(input,userId){ return (await repository.pool.query(`INSERT INTO marketing_tag_rules
  (name,tag_id,trigger_type,conditions,is_active,created_by) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
 [input.name,input.tagId,input.triggerType,JSON.stringify(input.conditions||{}),input.isActive!==false,userId])).rows[0]; }
async function deleteRule(id){ const r=await repository.pool.query("DELETE FROM marketing_tag_rules WHERE id=$1",[id]); return r.rowCount>0; }

module.exports={applyTag,removeTag,evaluateForEvent,evaluateSegment,bulk,listRules,createRule,deleteRule};
