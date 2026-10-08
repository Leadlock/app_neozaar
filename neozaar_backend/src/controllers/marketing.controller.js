const repository = require("../repositories/marketing/marketing.repository");
const eventIngestion = require("../services/marketing/event-ingestion.service");
const segmentation = require("../services/marketing/segmentation.service");
const scoring = require("../services/marketing/scoring.service");
const tracking = require("../services/marketing/tracking.service");
const tagging = require("../services/marketing/tagging.service");
const userPermissions = require("../services/marketing/userPermissions.service");

function fail(res, error, message) {
  if (error.statusCode) return res.status(error.statusCode).json({ status: "fail", message: error.message });
  console.error(`${message}:`, error?.message || error);
  return res.status(500).json({ status: "fail", message });
}

const getDashboard = async (req, res) => {
  try {
    const hasContacts = await repository.tableExists("marketing_contacts");
    const hasEvents = await repository.tableExists("marketing_events");
    const hasCrmLeads = await repository.tableExists("crm_leads");
    const out = {
      totalContacts: 0, newContacts30d: 0, knownContacts: 0, anonymousVisitors: 0,
      marketingQualified: 0, avgMarketingScore: 0, eventsLast30d: 0,
      campaignsTotal: 0, campaignsPushed: 0,
      campaignLinkViews: 0, campaignLinkViews30d: 0, campaignLinkClicks: 0, campaignLinkCount: 0,
      lifecycle: { visitor: 0, subscriber: 0, lead: 0, mql: 0, sql: 0, customer: 0 },
      sources: [], recentEvents: [],
    };
    if (hasContacts) {
      const c = await repository.pool.query(`SELECT COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days')::int AS new30,
        COUNT(*) FILTER (WHERE crm_contact_id IS NOT NULL)::int AS known,
        COUNT(*) FILTER (WHERE crm_contact_id IS NULL)::int AS anon,
        COUNT(*) FILTER (WHERE lifecycle_stage = 'mql')::int AS mql,
        COALESCE(ROUND(AVG(marketing_score))::int, 0) AS avg_score
        FROM marketing_contacts WHERE is_deleted = FALSE`);
      const row = c.rows[0];
      Object.assign(out, { totalContacts: row.total, newContacts30d: row.new30,
        knownContacts: row.known, anonymousVisitors: row.anon,
        marketingQualified: row.mql, avgMarketingScore: row.avg_score });
      const life = await repository.pool.query(`SELECT lifecycle_stage, COUNT(*)::int AS n
        FROM marketing_contacts WHERE is_deleted = FALSE GROUP BY lifecycle_stage`);
      life.rows.forEach((item) => { if (out.lifecycle[item.lifecycle_stage] !== undefined) out.lifecycle[item.lifecycle_stage] = item.n; });
      const sources = await repository.pool.query(`SELECT COALESCE(last_source, first_source, 'Unknown') AS source,
        COUNT(*)::int AS contacts FROM marketing_contacts WHERE is_deleted = FALSE
        GROUP BY 1 ORDER BY contacts DESC LIMIT 8`);
      out.sources = sources.rows;
    }
    if (hasEvents) {
      const events = await repository.pool.query(`SELECT COUNT(*) FILTER
        (WHERE occurred_at > NOW() - INTERVAL '30 days')::int AS n30 FROM marketing_events`);
      out.eventsLast30d = events.rows[0].n30;
      const recent = await repository.pool.query(`SELECT id, event_type, ref_type, ref_id, channel, occurred_at
        FROM marketing_events ORDER BY occurred_at DESC LIMIT 15`);
      out.recentEvents = recent.rows;
    }
    if (await repository.tableExists("campaigns")) {
      const campaigns = await repository.pool.query(`SELECT COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'pushed')::int AS pushed FROM campaigns`);
      out.campaignsTotal = campaigns.rows[0].total;
      out.campaignsPushed = campaigns.rows[0].pushed;
    }
    // Rolls up every public link made for a campaign (a campaign can have
    // more than one — different labels, re-issued after expiry) into one
    // dashboard-level total. Per-link detail already exists on the campaign
    // list row and in that link's own analytics panel; this is just the
    // "does this matter at all" number for the dashboard.
    if (await repository.tableExists("public_links") && await repository.tableExists("public_link_events")) {
      const links = await repository.pool.query(`
        SELECT COUNT(DISTINCT l.id)::int AS link_count,
               COALESCE(SUM(v.views), 0)::int AS views,
               COALESCE(SUM(v.views_30d), 0)::int AS views_30d,
               COALESCE(SUM(c.cta_clicks), 0)::int AS cta_clicks
          FROM public_links l
          LEFT JOIN (
            SELECT link_id, COUNT(*) AS views,
                   COUNT(*) FILTER (WHERE occurred_at > NOW() - INTERVAL '30 days') AS views_30d
              FROM public_link_events WHERE event_type = 'view' AND is_bot = false GROUP BY link_id
          ) v ON v.link_id = l.id
          LEFT JOIN (
            SELECT link_id, COUNT(*) AS cta_clicks
              FROM public_link_events WHERE event_type IN ('cta_click','block_click') AND is_bot = false GROUP BY link_id
          ) c ON c.link_id = l.id
         WHERE l.target_type = 'campaign'`);
      const row = links.rows[0];
      out.campaignLinkViews = row.views;
      out.campaignLinkViews30d = row.views_30d;
      out.campaignLinkClicks = row.cta_clicks;
      out.campaignLinkCount = row.link_count;
    }
    if (hasCrmLeads) {
      const hot = await repository.pool.query(`SELECT COUNT(*)::int AS n FROM crm_leads
        WHERE is_deleted = FALSE AND score_label = 'Hot'`);
      out.crmHotLeads = hot.rows[0].n;
    }
    return res.json({ status: "success", data: out });
  } catch (error) { return fail(res, error, "Failed to build marketing dashboard"); }
};

const getContacts = async (req, res) => {
  try {
    const result = await repository.getContacts(req.query);
    return res.json({ status: "success", data: result.rows, total: result.total });
  } catch (error) { return fail(res, error, "Failed to fetch marketing contacts"); }
};

const getContactTimeline = async (req, res) => {
  try { const result=await repository.getContactTimeline(req.params.id,req.query); return res.json({ status: "success", data: result.rows,total:result.total }); }
  catch (error) { return fail(res, error, "Failed to fetch contact timeline"); }
};

const bulkTagContacts=async(req,res)=>{try{return res.json({status:"success",data:await tagging.bulk(req.body,req.user.id)});}catch(error){return fail(res,error,"Failed to bulk tag contacts");}};
const getTagRules=async(req,res)=>{try{return res.json({status:"success",data:await tagging.listRules()});}catch(error){return fail(res,error,"Failed to fetch tag rules");}};
const createTagRule=async(req,res)=>{try{return res.json({status:"success",data:await tagging.createRule(req.body,req.user.id)});}catch(error){return fail(res,error,"Failed to create tag rule");}};
const deleteTagRule=async(req,res)=>{try{if(!await tagging.deleteRule(req.params.id))return res.status(404).json({status:"fail",message:"Tag rule not found"});return res.json({status:"success"});}catch(error){return fail(res,error,"Failed to delete tag rule");}};

const getTags = async (req, res) => {
  try { return res.json({ status: "success", data: await repository.getTags() }); }
  catch (error) { return fail(res, error, "Failed to fetch tags"); }
};

const createTag = async (req, res) => {
  try {
    const tag = await repository.createTag({ ...req.body, userId: req.user.id });
    if (!tag) return res.status(409).json({ status: "fail", message: "A tag with that name already exists" });
    return res.json({ status: "success", data: tag });
  } catch (error) { return fail(res, error, "Failed to create tag"); }
};

const deleteTag = async (req, res) => {
  try {
    if (!await repository.deleteTag(req.params.id)) return res.status(404).json({ status: "fail", message: "Tag not found" });
    return res.json({ status: "success", message: "Tag deleted" });
  } catch (error) { return fail(res, error, "Failed to delete tag"); }
};

const getSegments = async (req, res) => {
  try { return res.json({ status: "success", data: await repository.getSegments() }); }
  catch (error) { return fail(res, error, "Failed to fetch segments"); }
};

const defaultRules = { match: "all", rules: [] };
const createSegment = async (req, res) => {
  try {
    const segment = await repository.createSegment({ ...req.body, rules: req.body.rules || defaultRules, userId: req.user.id });
    return res.json({ status: "success", data: segment });
  } catch (error) { return fail(res, error, "Failed to create segment"); }
};

const updateSegment = async (req, res) => {
  try {
    const segment = await repository.updateSegment(req.params.id, { ...req.body, rules: req.body.rules || defaultRules });
    if (!segment) return res.status(404).json({ status: "fail", message: "Segment not found" });
    return res.json({ status: "success", data: segment });
  } catch (error) { return fail(res, error, "Failed to update segment"); }
};

const deleteSegment = async (req, res) => {
  try {
    if (!await repository.deleteSegment(req.params.id)) return res.status(404).json({ status: "fail", message: "Segment not found" });
    return res.json({ status: "success", message: "Segment deleted" });
  } catch (error) { return fail(res, error, "Failed to delete segment"); }
};

const getScoringRules = async (req, res) => {
  try { return res.json({ status: "success", data: await repository.getScoringRules() }); }
  catch (error) { return fail(res, error, "Failed to fetch scoring rules"); }
};

const previewSegmentRules = async (req, res) => {
  try { return res.json({ status: "success", data: await segmentation.preview(req.body.rules) }); }
  catch (error) { return fail(res, error, "Failed to preview segment"); }
};

const previewSegment = async (req, res) => {
  try { return res.json({ status: "success", data: await segmentation.previewSegment(req.params.id) }); }
  catch (error) { return fail(res, error, "Failed to preview segment"); }
};

const refreshSegment = async (req, res) => {
  try { return res.json({ status: "success", data: await segmentation.refresh(req.params.id) }); }
  catch (error) { return fail(res, error, "Failed to refresh segment"); }
};

const createScoringRule = async (req, res) => {
  try { return res.json({ status: "success", data: await scoring.createRule(req.body, req.user.id) }); }
  catch (error) { return fail(res, error, "Failed to create scoring rule"); }
};

const updateScoringRule = async (req, res) => {
  try { return res.json({ status: "success", data: await scoring.updateRule(req.params.id, req.body) }); }
  catch (error) { return fail(res, error, "Failed to update scoring rule"); }
};

const deleteScoringRule = async (req, res) => {
  try {
    await scoring.deleteRule(req.params.id);
    return res.json({ status: "success", message: "Scoring rule deleted" });
  } catch (error) { return fail(res, error, "Failed to delete scoring rule"); }
};

const rebuildContactScore = async (req, res) => {
  try { return res.json({ status: "success", data: await scoring.rebuildContact(req.params.id) }); }
  catch (error) { return fail(res, error, "Failed to rebuild contact score"); }
};
const getScoringModels=async(req,res)=>{try{return res.json({status:"success",data:await scoring.listModels()});}catch(error){return fail(res,error,"Failed to fetch scoring models");}};
const createScoringModel=async(req,res)=>{try{return res.json({status:"success",data:await scoring.createModel(req.body)});}catch(error){return fail(res,error,"Failed to create scoring model");}};
const runScoreDecay=async(req,res)=>{try{return res.json({status:"success",data:await scoring.runDecay()});}catch(error){return fail(res,error,"Failed to run score decay");}};

const getVisitor = async (req, res) => {
  try { return res.json({ status: "success", data: await tracking.getVisitor(req.params.visitorId) }); }
  catch (error) { return fail(res, error, "Failed to fetch visitor"); }
};

const getSession = async (req, res) => {
  try { return res.json({ status: "success", data: await tracking.getSession(req.params.sessionId) }); }
  catch (error) { return fail(res, error, "Failed to fetch session"); }
};

const ingestEvent = async (req, res) => {
  try {
    const result = await eventIngestion.ingestEvent({ ...req.body, ingestionSource: "management_api" });
    return res.json({ status: "success", data: result.event, duplicate: result.duplicate });
  }
  catch (error) { return fail(res, error, "Failed to record event"); }
};

const getUserPermissions = async (req, res) => {
  try { return res.json({ status: "success", data: await userPermissions.list(), grantable: userPermissions.GRANTABLE_PERMISSIONS }); }
  catch (error) { return fail(res, error, "Failed to fetch permissions"); }
};
const grantUserPermission = async (req, res) => {
  try { return res.json({ status: "success", data: await userPermissions.grant(req.body.userId, req.body.permission, req.user.id) }); }
  catch (error) { return fail(res, error, "Failed to grant permission"); }
};
const revokeUserPermission = async (req, res) => {
  try { return res.json({ status: "success", data: await userPermissions.revoke(req.params.userId, req.params.permission) }); }
  catch (error) { return fail(res, error, "Failed to revoke permission"); }
};

module.exports = { getDashboard, getContacts, getContactTimeline, getTags, createTag, deleteTag,
  getSegments, createSegment, updateSegment, deleteSegment, getScoringRules, ingestEvent,
  previewSegmentRules, previewSegment, refreshSegment, createScoringRule, updateScoringRule,
  deleteScoringRule, rebuildContactScore, getVisitor, getSession,bulkTagContacts,getTagRules,createTagRule,deleteTagRule,
  getScoringModels,createScoringModel,runScoreDecay,
  getUserPermissions, grantUserPermission, revokeUserPermission };
