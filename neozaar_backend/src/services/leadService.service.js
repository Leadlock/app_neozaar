const Bundle = require("../models/bundle");
const {
  User,
  Product,
  LeadDetail,
  DemoLead,
  PrivateOfferLead,
  Purchase,
} = require("../models/Leads");
const ActionService = require("./action.service");
const { sendLeadNotification } = require("../utils/email");
const LeadAssign = require("../models/Leads/LeadAssign");
const LeadComment = require("../models/Leads/Leadcomments");
const sequelize = require("../config/sequelize");
const CrmApiService = require("./crmApi/crmApi.service");
const pool = require("../config/database");
const { Op } = require("sequelize");
const commonConstant = require("../config/common.constant");
const emailService = require("../config/mail");

class LeadService {
  async createLead(data, userId) {
    const user = await User.findByPk(userId); // ✅ fetch full user details
    const {
      action_id,
      action_type,
      message,
      remark,
      leadType,
      demoData,
      privateOfferData,
      purchaseData,
      track,
      action_for = "",
    } = data;
    if (
      action_type === "product" ||
      action_type === "service" ||
      action_type === "solution"
    ) {
      const product = await Product.findByPk(action_id);
      if (!product) {
        throw new Error("Product not found");
      }
    } else if (action_type === "bundle") {
      const bundle = await Bundle.findByPk(action_id);
      if (!bundle) {
        throw new Error("Bundle not found");
      }
    } else {
      throw new Error("Invalid action_type");
    }
    const lead = await LeadDetail.create({
      user_id: userId,
      // Snapshot the customer's contact details onto the lead so it still
      // renders if the user account is later removed (see contact_* columns).
      contact_name: user?.name || null,
      contact_email: user?.email || null,
      contact_phone: user?.mobile || null,
      status: "new",
      type: leadType,
      action_id,
      action_for,
      action_type,
      message,
      remark,
    });
    // Marketing: score/segment/automate on this lead, independent of the
    // existing user_activity_logs audit trail below (different purpose —
    // that one is a general activity log, this feeds Marketing scoring,
    // tagging and automations). Never allowed to fail lead creation.
    try {
      const marketingEventType = {
        demo: "DEMO_REQUEST",
        book_assessment: "ASSESSMENT_REQUEST",
        talk_to_expert: "EXPERT_CONTACT_REQUEST",
        private_offer: "PRIVATE_OFFER_REQUEST",
        buy_now: "BUY_NOW_REQUEST",
      }[leadType] || "FORM_SUBMIT";
      if (user?.email || user?.mobile) {
        const ingestion = require("./marketing/event-ingestion.service");
        await ingestion.ingestEvent({
          email: user?.email || null,
          phone: user?.mobile || null,
          eventType: marketingEventType,
          refType: action_type,
          refId: action_id,
          channel: "web",
          metadata: { leadId: lead.id, leadType },
          ingestionSource: "lead",
        });
      }
    } catch (marketingError) {
      console.error("Marketing lead event ingestion failed:", marketingError?.message || marketingError);
    }
    // Track user activity if tracking data is provided
    const { pageUrl, utm } = track || {};
    const metadata = {
      leadType,
      action_type,
      action_id,
    };
    const eventType = "lead_created";
    const entityType = "lead";
    const entityId = lead.id;
    //Lead Track Store
    await pool.query(
      `INSERT INTO user_activity_logs
        (user_id, event_type, entity_type, entity_id, page_url, metadata, utm)
        VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        userId,
        eventType,
        entityType,
        entityId,
        pageUrl,
        metadata || {},
        utm || {},
      ],
    );

    // Create related records depending on leadType
    if (
      leadType === "demo" ||
      leadType === "book_assessment" ||
      leadType === "talk_to_expert"
    ) {
      if (!demoData) throw new Error("demoData is required for demo lead type");
      await DemoLead.create({
        lead_id: lead.id,
        role_title: demoData.role_title,
        use_case: demoData.use_case,
      });
    } else if (leadType === "private_offer") {
      if (!privateOfferData)
        throw new Error(
          "privateOfferData is required for private_offer lead type",
        );
      await PrivateOfferLead.create({
        lead_id: lead.id,
        aws_account_id: privateOfferData.aws_account_id,
        desired_pricing: privateOfferData.desired_pricing,
        term_length: privateOfferData.term_length,
        notes: privateOfferData.notes,
      });
    } else if (leadType === "buy_now") {
      if (!purchaseData)
        throw new Error("purchaseData is required for buy_now lead type");
      await Purchase.create({
        lead_id: lead.id,
        aws_account_id: purchaseData.aws_account_id,
        product_id: action_id,
        purchase_date: new Date(),
        entitlement_status: purchaseData.entitlement_status,
      });
    } else {
      throw new Error("Invalid lead type");
    }
    if (
      leadType === "demo" ||
      leadType === "buy_now" ||
      leadType === "book_assessment" ||
      leadType === "talk_to_expert"
    ) {
      try {
        // Get product/bundle name
        let productName = "Product";
        try {
          const actionDetail = await ActionService.getActionDetail(
            action_type,
            action_id,
          );
          productName = actionDetail?.name || productName;
        } catch (err) {
          // Use default name if can't fetch details
        }
        // Send notification to Customer, Admin, ISV if applicable
        const product = await Product.findByPk(action_id);
        if (product) {
          const productOwner = await User.findByPk(product.user_id);
          if (productOwner && productOwner.email) {
            await emailService.sendLeadNotification(
              leadType,
              user.email,
              user.name || user.email,
              productName,
              productOwner.email,
              productOwner.name,
            );
          }
        }
      } catch (emailError) {
        console.error("Email notification failed:", emailError);
      }
    }
    // Sync lead to CRM
    const product = await Product.findByPk(action_id);
    let crmLeadData = {
      product_id: product.id || null,
      leadType: leadType,
      name: user.name || user.email,
      email: user.email,
      phone: user.email,
      title:
        "Interested in " + (product ? product.name : "your " + action_type),
      lead_address: "",
      lead_city: "",
      lead_state: "",
      lead_country: "",
      lead_postalcode: "",
      status: "New",
      source: utm?.utm_source || "Website",
      opportunity_amount: 0,
      description: message || remark || "",
    };
    try {
      const crmResponse = await CrmApiService.createLead(crmLeadData);
    } catch (err) {
      console.error("❌ CRM API Error:", err.response?.data || err.message);
    }

    // Auto-assign lead to affiliate if UTM is fresh affiliate referral
    try {
      const isAffiliateUtmFresh = utm &&
        utm.utm_source === 'affiliate' &&
        utm.utm_campaign &&
        (Date.now() - (utm.timestamp || 0)) < 30 * 60 * 1000;

      if (isAffiliateUtmFresh) {
        const campaignParts = (utm.utm_campaign || '').split('_');
        const referrerId = campaignParts.length > 1 ? parseInt(campaignParts[campaignParts.length - 1]) : null;
        if (referrerId) {
          await pool.query(
            `INSERT INTO lead_assigns (lead_id, user_id, assign_user_id, assign_user_type, created_at, updated_at)
             VALUES ($1, $2, $3, $4, NOW(), NOW())
             ON CONFLICT DO NOTHING`,
            [lead.id, referrerId, referrerId, 'AGENT']
          );
        }
      }
    } catch (assignErr) {
      console.error('Affiliate lead assign error:', assignErr.message);
    }

    // ═══ SYNC TO INTERNAL CRM — one opportunity per product CTA ═══
    // Account and Contact are shared per customer (1 per email).
    // Each distinct product × intent action creates its own opportunity.
    try {
      const { createProductOpportunity } = require('../controllers/crm/lifecycle.engine');

      // Resolve affiliate from UTM (fresh within 30 min)
      let crmOwnerId = null;
      let affiliateId = null;

      const isAffiliateUtm = utm &&
        utm.utm_source === 'affiliate' &&
        utm.utm_campaign &&
        (Date.now() - (utm.timestamp || 0)) < 30 * 60 * 1000;

      if (isAffiliateUtm) {
        const campaignParts = (utm.utm_campaign || '').split('_');
        const referrerId = campaignParts.length > 1 ? parseInt(campaignParts[campaignParts.length - 1]) : null;
        if (referrerId) {
          const { rows: refCheck } = await pool.query(
            'SELECT id FROM users WHERE id=$1 AND is_active=true LIMIT 1', [referrerId]
          );
          if (refCheck.length) affiliateId = referrerId;
        }
      }

      // Always assign to M_SELLER as primary owner
      const { rows: ms } = await pool.query(
        "SELECT id FROM users WHERE role_type='M_SELLER' AND is_active=true ORDER BY id LIMIT 1"
      );
      if (ms.length) crmOwnerId = ms[0].id;

      const productForCrm = await Product.findByPk(action_id);
      const productName   = productForCrm?.name || action_type;
      let convSource      = affiliateId ? 'affiliate_cta' : 'direct_cta';

      // ── Upsert lead (1 per customer email) ──────────────────────────
      const { rows: upserted } = await pool.query(
        `INSERT INTO crm_leads
           (name,email,phone,lead_source,product_interest,status,lead_stage,score,
            owner_id,affiliate_id,created_at,updated_at)
         VALUES ($1,$2,$3,$4,$5,'New','New Inquiry',0,$6,$7,NOW(),NOW())
         ON CONFLICT (email_normalized)
           WHERE is_deleted=FALSE
             AND email_normalized IS NOT NULL
             AND email_normalized <> ''
         DO UPDATE SET
           product_interest = EXCLUDED.product_interest,
           owner_id   = COALESCE(crm_leads.owner_id,    EXCLUDED.owner_id),
           affiliate_id = COALESCE(crm_leads.affiliate_id, EXCLUDED.affiliate_id),
           updated_at = NOW()
         RETURNING *`,
        [
          user.name || user.email,
          user.email,
          user.mobile || null,
          leadType === 'private_offer' ? 'Private Offer Button' : 'Demo Request',
          productName,
          crmOwnerId,
          affiliateId,
        ]
      );
      const crmLead = upserted[0];

      // A returning customer's permanent affiliate attribution is stored on
      // the CRM lead even when the original UTM values are no longer present.
      affiliateId = crmLead.affiliate_id || affiliateId;
      convSource = affiliateId ? 'affiliate_cta' : 'direct_cta';

      // ── Create one opportunity for this product × intent ────────────
      const leadSourceLabel = leadType === 'private_offer' ? 'Private Offer Button' : 'Demo Request';
      const oppId = await createProductOpportunity({
        leadId          : crmLead.id,
        ownerId         : crmOwnerId,
        affiliateId,
        productName,
        productId       : action_id,
        leadSource      : leadSourceLabel,
        conversionSource: convSource,
        lead            : crmLead,
      });

      console.log(`✅ CRM opp created: opp_id=${oppId}, product=${productName}, lead_id=${crmLead.id}`);

    } catch (crmSyncErr) {
      console.error('CRM internal sync error:', crmSyncErr.message);
      throw new Error(`CRM opportunity creation failed: ${crmSyncErr.message}`);
    }

    return lead;
  }

  async updateLeadStatus(id, status, remark) {
    const lead = await LeadDetail.findByPk(id);
    if (!lead) throw new Error("Lead not found");
    lead.status = status;
    lead.remark = remark;
    await lead.save();
    await this.createLeadComment(lead.id, lead.user_id, remark, status);
    return lead;
  }

  async getAllLeads_withoutSearchFilter(page = 1, limit = 10) {
    const parsedPage = parseInt(page, 10);
    const parsedLimit = parseInt(limit, 10);
    const offset = (parsedPage - 1) * parsedLimit;

    const leads = await LeadDetail.findAll({
      include: [
        { model: User, as: "user" },
        { model: DemoLead, as: "demoLead" },
        { model: PrivateOfferLead, as: "privateOfferLead" },
      ],
      order: [["created_at", "DESC"]],
      limit: parsedLimit,
      offset,
    });

    const leadIds = leads.map((l) => l.id);

    // 🔥 FETCH ACTIVITY LOGS IN ONE QUERY
    const activityLogMap = await this.getLeadActivityLogs(leadIds);
    console.log("Activity Log Map:", activityLogMap);

    const leadsWithAction = await Promise.all(
      leads.map(async (lead) => {
        const leadData = lead.get({ plain: true });

        // Attach activity logs
        leadData.activity_logs = activityLogMap[leadData.id] || null;

        // Existing action logic
        if (leadData.action_type && leadData.action_id) {
          try {
            leadData.action_detail = await ActionService.getActionDetail(
              leadData.action_type,
              leadData.action_id,
            );
          } catch {
            leadData.action_detail = null;
          }
        } else {
          leadData.action_detail = null;
        }

        return leadData;
      }),
    );

    const totalLeads = await LeadDetail.count();
    console.log("Total Leads:", totalLeads, page, parsedLimit);

    const pagination = commonConstant.PAGINATION.build({
      total: totalLeads,
      page,
      limit: parsedLimit,
    });

    return {
      data: leadsWithAction,
      pagination: pagination,
    };
  }

  async getAllLeads(params = {}, ownerId = null) {
    try {
      let {
        page = 1,
        limit = 10,
        search = "",
        status = null,
        user_id = null,
        from_date = null,
        to_date = null,
        action_type = null,
        source = null,
      } = params;
      page = parseInt(page, 10);
      limit = parseInt(limit, 10);
      const offset = (page - 1) * limit;

      search = search?.trim();
      from_date = from_date || null;
      to_date = to_date || null;
      const where = {};
      if (status) where.status = status;
      if (user_id) where.user_id = user_id;

      if (from_date && to_date) {
        where.created_at = {
          [Op.between]: [new Date(from_date), new Date(to_date)],
        };
      }

      if (search) {
        where[Op.or] = [
          { "$user.name$": { [Op.like]: `%${search}%` } },
          { "$user.email$": { [Op.like]: `%${search}%` } },
          { contact_name: { [Op.like]: `%${search}%` } },
          { contact_email: { [Op.like]: `%${search}%` } },
          { contact_phone: { [Op.like]: `%${search}%` } },
          { message: { [Op.like]: `%${search}%` } },
          { remark: { [Op.like]: `%${search}%` } },
        ];
      }

      if (action_type) {
        where.action_type = action_type;
      }

      // Filter by lead source:
      //   'affiliate' → only leads assigned to this specific affiliate (or any, for admin)
      //   'whatsapp'  → only leads captured by the WhatsApp bot (type='whatsapp')
      //   'direct'    → website/portal leads NOT assigned to any affiliate/seller,
      //                 excluding WhatsApp-bot leads (those have their own tab)
      if (source === 'affiliate' && ownerId) {
        where.id = {
          [Op.in]: sequelize.literal(
            `(SELECT lead_id FROM lead_assigns WHERE assign_user_id = ${parseInt(ownerId, 10)})`
          )
        };
      } else if (source === 'affiliate') {
        where.id = {
          [Op.in]: sequelize.literal(
            `(SELECT lead_id FROM lead_assigns WHERE assign_user_id IS NOT NULL)`
          )
        };
      } else if (source === 'whatsapp') {
        where.type = 'whatsapp';
      } else if (source === 'direct') {
        where.type = { [Op.ne]: 'whatsapp' };
        where.id = {
          [Op.notIn]: sequelize.literal(
            `(SELECT lead_id FROM lead_assigns WHERE assign_user_id IS NOT NULL)`
          )
        };
      }

      const { rows: leads, count: totalLeads } =
        await LeadDetail.findAndCountAll({
          where,
          include: [
            {
              model: User,
              as: "user",
              attributes: ["id", "name", "email"],
            },
            {
              model: DemoLead,
              as: "demoLead",
            },
            {
              model: PrivateOfferLead,
              as: "privateOfferLead",
            },
          ],
          order: [["created_at", "DESC"]],
          limit,
          offset,
          distinct: true,
        });

      if (!leads) {
        return {
          data: [],
          pagination: commonConstant.PAGINATION.build({
            total: 0,
            page,
            limit,
          }),
        };
      }
      const leadIds = leads.map((l) => l.id);
      const activityLogMap = leadIds.length
        ? await this.getLeadActivityLogs(leadIds)
        : {};

      const leadsWithAction = await Promise.all(
        leads.map(async (lead) => {
          const leadData = lead.get({ plain: true });

          leadData.activity_logs = activityLogMap[leadData.id] || null;
          if (leadData.action_type && leadData.action_id) {
            try {
              leadData.action_detail = await ActionService.getActionDetail(
                leadData.action_type,
                leadData.action_id,
              );
            } catch (err) {
              leadData.action_detail = null;
            }
          } else {
            leadData.action_detail = null;
          }

          return leadData;
        }),
      );

      const pagination = commonConstant.PAGINATION.build({
        total: totalLeads,
        page,
        limit,
      });
      return {
        data: leadsWithAction,
        pagination,
      };
    } catch (error) {
      console.error("getAllLeads error:", error);
      throw error;
    }
  }

  async getAllLeads_OLD(page = 1, limit = 10) {
    const parsedPage = parseInt(page, 10);
    const parsedLimit = parseInt(limit, 10);
    const offset = (parsedPage - 1) * parsedLimit;
    const leads = await LeadDetail.findAll({
      include: [
        { model: User, as: "user" },
        { model: DemoLead, as: "demoLead" },
        { model: PrivateOfferLead, as: "privateOfferLead" },
        // { model: Purchase, as: 'purchase' }
      ],
      order: [["created_at", "DESC"]],
      limit: parsedLimit,
      offset: offset,
    });

    const leadsWithAction = await Promise.all(
      leads.map(async (lead) => {
        const leadData = lead.get({ plain: true });
        try {
          if (leadData.action_type && leadData.action_id) {
            const actionDetail = await ActionService.getActionDetail(
              leadData.action_type,
              leadData.action_id,
            );
            leadData.action_detail = actionDetail || null;
          } else {
            leadData.action_detail = null;
          }
        } catch (err) {
          leadData.action_detail = null;
        }
        return leadData;
      }),
    );

    const totalLeads = await LeadDetail.count();
    const totalPages = Math.ceil(totalLeads / parsedLimit);

    // Generate page numbers (for frontend pagination controls)
    const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

    return {
      data: leadsWithAction,
      pagination: {
        total: totalLeads,
        page: parsedPage,
        limit: parsedLimit,
        current_page: parsedPage,
        next_page: parsedPage < totalPages ? parsedPage + 1 : null,
        prev_page: parsedPage > 1 ? parsedPage - 1 : null,
        pages,
      },
    };
  }

  async getAllLeadsByUser(userId, page = 1, limit = 10) {
    const parsedPage = parseInt(page, 10);
    const parsedLimit = parseInt(limit, 10);
    const offset = (parsedPage - 1) * parsedLimit;
    const leads = await LeadDetail.findAll({
      where: { user_id: userId },
      include: [
        { model: DemoLead, as: "demoLead" },
        { model: PrivateOfferLead, as: "privateOfferLead" },
        { model: Purchase, as: "purchase" },
      ],
      order: [["created_at", "DESC"]],
      limit: parsedLimit,
      offset: offset,
    });

    const leadsWithAction = await Promise.all(
      leads.map(async (lead) => {
        const leadData = lead.get({ plain: true });
        try {
          if (leadData.action_type && leadData.action_id) {
            const actionDetail = await ActionService.getActionDetail(
              leadData.action_type,
              leadData.action_id,
            );
            leadData.action_detail = actionDetail || null;
          } else {
            leadData.action_detail = null;
          }
        } catch (err) {
          leadData.action_detail = null;
        }
        return leadData;
      }),
    );
    const totalLeads = await LeadDetail.count();
    const totalPages = Math.ceil(totalLeads / parsedLimit);
    const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
    return {
      data: leadsWithAction,
      pagination: {
        total: totalLeads,
        page: parsedPage,
        limit: parsedLimit,
        current_page: parsedPage,
        next_page: parsedPage < totalPages ? parsedPage + 1 : null,
        prev_page: parsedPage > 1 ? parsedPage - 1 : null,
        pages,
      },
    };
  }

  async getAllLeadsByISV(userId, params = {}) {
    let {
      page = 1,
      limit = 10,
      search = "",
      status = null,
      from_date = null,
      to_date = null,
      action_type = null,
    } = params;
    page = parseInt(page, 10);
    limit = parseInt(limit, 10);
    const offset = (page - 1) * limit;

    search = search?.trim();
    from_date = from_date || null;
    to_date = to_date || null;
    const where = {};
    if (status) where.status = status;

    if (from_date && to_date) {
      where.created_at = {
        [Op.between]: [new Date(from_date), new Date(to_date)],
      };
    }

    if (search) {
      where[Op.or] = [
        { "$user.name$": { [Op.like]: `%${search}%` } },
        { "$user.email$": { [Op.like]: `%${search}%` } },
        { message: { [Op.like]: `%${search}%` } },
        { remark: { [Op.like]: `%${search}%` } },
      ];
    }

    if (action_type) {
      where.action_type = action_type;
    }

    const { rows: leads, count: totalLeads } = await LeadDetail.findAndCountAll(
      {
        where,
        include: [
          {
            model: Product,
            as: "product",
            required: true,
            where: { user_id: userId },
          },
          {
            model: User,
            as: "user",
            attributes: ["id", "name", "email"],
          },
          { model: DemoLead, as: "demoLead" },
          { model: PrivateOfferLead, as: "privateOfferLead" },
        ],
        order: [["created_at", "DESC"]],
        limit,
        offset,
        distinct: true,
      },
    );

    if (!leads) {
      return {
        data: [],
        pagination: commonConstant.PAGINATION.build({ total: 0, page, limit }),
      };
    }
    const leadIds = leads.map((l) => l.id);
    const activityLogMap = leadIds.length
      ? await this.getLeadActivityLogs(leadIds)
      : {};

    const leadsWithAction = await Promise.all(
      leads.map(async (lead) => {
        const leadData = lead.get({ plain: true });
        leadData.activity_logs = activityLogMap[leadData.id] || null;
        if (leadData.action_type && leadData.action_id) {
          try {
            leadData.action_detail = await ActionService.getActionDetail(
              leadData.action_type,
              leadData.action_id,
            );
          } catch {
            leadData.action_detail = null;
          }
        } else {
          leadData.action_detail = null;
        }

        return leadData;
      }),
    );
    const pagination = commonConstant.PAGINATION.build({
      total: totalLeads,
      page,
      limit,
    });

    return {
      data: leadsWithAction,
      pagination: pagination,
    };
  }

  async getLeadActivityLogs(leadIds) {
    const result = await pool.query(
      `
      SELECT *
      FROM user_activity_logs
      WHERE entity_type = 'lead'
        AND entity_id = ANY($1)
      ORDER BY created_at DESC
      `,
      [leadIds],
    );

    const rows = result.rows;

    return rows.reduce((acc, log) => {
      // only keep the latest log per lead
      if (!acc[log.entity_id]) {
        acc[log.entity_id] = log;
      }
      return acc;
    }, {});
  }

  // Get Lead by ID with Relations
  async getLeadById(id) {
    try {
      /** -----------------------------
       * FETCH LEAD WITH RELATIONS
       * ----------------------------- */
      const lead = await LeadDetail.findOne({
        where: { id },
        include: [
          {
            model: User,
            as: "user",
            attributes: ["id", "name", "email"],
          },
          {
            model: DemoLead,
            as: "demoLead",
          },
          {
            model: PrivateOfferLead,
            as: "privateOfferLead",
          },
          {
            model: LeadComment,
            as: "comments",
            attributes: ["id", "comments", "status", "created_at"],
            include: [
              {
                model: User,
                as: "user",
                attributes: ["id", "name"],
              },
            ],
            order: [["created_at", "DESC"]],
          },
        ],
      });

      if (!lead) {
        throw new Error("Lead not found");
      }

      const leadData = lead.get({ plain: true });

      /** -----------------------------
       * ACTIVITY LOGS
       * ----------------------------- */
      const activityLogMap = await this.getLeadActivityLogs([leadData.id]);
      leadData.activity_logs = activityLogMap[leadData.id] || [];

      /** -----------------------------
       * ACTION DETAILS
       * ----------------------------- */
      if (leadData.action_type && leadData.action_id) {
        try {
          leadData.action_detail = await ActionService.getActionDetail(
            leadData.action_type,
            leadData.action_id,
          );
        } catch {
          leadData.action_detail = null;
        }
      } else {
        leadData.action_detail = null;
      }

      /** -----------------------------
       * COMMENT STATUS SUMMARY (OPTIONAL)
       * ----------------------------- */
      leadData.comment_status_summary = leadData.comments.reduce((acc, c) => {
        acc[c.status] = (acc[c.status] || 0) + 1;
        return acc;
      }, {});

      return leadData;
    } catch (error) {
      console.error("getLeadById error:", error);
      throw error;
    }
  }

  async getLeadById_old(id) {
    try {
      const lead = await LeadDetail.findOne({
        where: { id },
        include: [
          {
            model: User,
            as: "user",
            attributes: ["id", "name", "email"],
          },
          {
            model: DemoLead,
            as: "demoLead",
          },
          {
            model: PrivateOfferLead,
            as: "privateOfferLead",
          },
          {
            model: Purchase,
            as: "purchase",
          },
        ],
      });

      if (!lead) {
        throw new Error("Lead not found");
      }
      const leadData = lead.get({ plain: true });
      const activityLogMap = await this.getLeadActivityLogs([leadData.id]);
      leadData.activity_logs = activityLogMap[leadData.id] || null;

      if (leadData.action_type && leadData.action_id) {
        try {
          leadData.action_detail = await ActionService.getActionDetail(
            leadData.action_type,
            leadData.action_id,
          );
        } catch (err) {
          leadData.action_detail = null;
        }
      } else {
        leadData.action_detail = null;
      }

      return leadData;
    } catch (error) {
      console.error("getLeadById error:", error);
      throw error;
    }
  }

  async assignLead(lead_id, assign_user_id, assign_user_type, assign_by) {
    // ✅ Validate lead exists
    const lead = await LeadDetail.findByPk(lead_id);
    if (!lead) throw new Error("Lead not found");

    // ✅ Check if already assigned
    const alreadyAssigned = await LeadAssign.findOne({ where: { lead_id } });
    if (alreadyAssigned)
      throw new Error(
        "This lead is already assigned and cannot be reassigned.",
      );

    // ✅ Validate assign_to user exists
    const assignToUser = await User.findByPk(assign_user_id);
    if (!assignToUser) throw new Error("Assigned user not found");

    // ✅ Create assignment
    const newAssign = await LeadAssign.create({
      lead_id,
      user_id: assign_by,
      assign_user_id,
      assign_user_type,
    });

    return newAssign;
  }
  async createLeadComment(lead_id, user_id, comments, status) {
    // validate lead
    return await sequelize.transaction(async (t) => {
      // 1️⃣ Validate lead
      const lead = await LeadDetail.findByPk(lead_id, { transaction: t });
      if (!lead) throw new Error("Lead not found");

      // 2️⃣ Create comment
      const comment = await LeadComment.create(
        { lead_id, user_id, comments, status },
        { transaction: t },
      );

      // 3️⃣ Update lead_details table status (or any other field)
      await lead.update(
        {
          status: status,
          remark: comments,
        }, // update the status or any column you want
        { transaction: t },
      );

      return comment;
    });
  }
}

module.exports = new LeadService();
