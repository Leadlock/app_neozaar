const { body, param, query } = require("express-validator");
const pool = require("../config/database");

// subscriptionCode used to be checked against a hardcoded list of 5 codes
// that didn't match the real marketing_subscription_types table — a topic
// created through the Subscription Topics screen with any other code would
// pass every other check and then fail here with no useful explanation.
// Checking the table directly keeps this in sync with whatever topics
// actually exist.
async function subscriptionCodeExists(code) {
  if (code === undefined || code === null || code === "") return true; // optional field
  const { rows } = await pool.query("SELECT 1 FROM marketing_subscription_types WHERE code = $1", [code]);
  if (!rows[0]) throw new Error("Unknown subscription topic code");
  return true;
}

const LIFECYCLE_STAGES = ["visitor", "subscriber", "lead", "mql", "sql", "customer"];
const EVENT_CHANNELS = ["web", "email", "whatsapp", "sms", "api"];
const REF_TYPES = ["product", "service", "solution", "email", "form", "asset", "campaign"];
const TRACKING_EVENTS = ["PAGE_VIEW", "PRODUCT_VIEW", "SERVICE_VIEW", "SOLUTION_VIEW", "CATEGORY_VIEW",
  "SEARCH", "CTA_CLICK", "DEMO_CLICK", "TRIAL_CLICK", "CONTACT_CLICK", "FORM_SUBMIT",
  "ASSET_DOWNLOAD", "LANDING_PAGE_VIEW", "CAMPAIGN_CLICK"];
const SEGMENT_FIELDS = new Set([
  "lifecycle_stage", "marketing_score", "email_consent", "whatsapp_consent",
  "sms_consent", "do_not_contact", "first_source", "last_source", "created_at",
  "last_activity_at",
  "industry", "company",
  "utm_source","utm_campaign","last_campaign","tag","product_viewed","category_viewed","page_visited",
  "form_submitted","asset_downloaded","email_opened","email_clicked","activity_count",
]);
const SEGMENT_OPERATORS = new Set(["eq","neq","gt","gte","lt","lte","contains","not_contains","in",
  "exists","not_exists","before","after","within_days","within_hours"]);

const positiveId = (name = "id") => param(name).isInt({ min: 1 }).withMessage(`${name} must be a positive integer`).toInt();

function validSegmentRules(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("rules must be an object");
  if (!["all", "any"].includes(value.match)) throw new Error("rules.match must be all or any");
  if (!Array.isArray(value.rules) || value.rules.length > 50) throw new Error("rules.rules must be an array with at most 50 entries");
  for (const rule of value.rules) {
    if (!rule || typeof rule !== "object" || !SEGMENT_FIELDS.has(rule.field) || !SEGMENT_OPERATORS.has(rule.op) || !("value" in rule)) {
      throw new Error("rules contains an unsupported field or operator");
    }
  }
  return true;
}

const tagBody = [
  body("name").isString().trim().isLength({ min: 1, max: 80 }).withMessage("Tag name must be between 1 and 80 characters"),
  body("color").optional({ nullable: true }).isString().trim().isLength({ max: 20 }).withMessage("Color must be at most 20 characters"),
];

const segmentBody = [
  body("name").isString().trim().isLength({ min: 1, max: 120 }).withMessage("Segment name must be between 1 and 120 characters"),
  body("description").optional({ nullable: true }).isString().isLength({ max: 2000 }).withMessage("Description must be at most 2000 characters"),
  body("rules").optional().custom(validSegmentRules),
];

const identityFields = [
  body("email").optional({ nullable: true }).isEmail().normalizeEmail().isLength({ max: 255 }),
  body("phone").optional({ nullable: true }).isString().trim().matches(/^\+?[0-9 ()-]{7,30}$/).withMessage("Invalid phone"),
  body("anonymousId").optional({ nullable: true }).isString().trim().isLength({ min: 1, max: 64 }),
];

const trackingEvent = [
  body("visitorId").isString().trim().isLength({ min: 8, max: 64 }).matches(/^[A-Za-z0-9._:-]+$/),
  body("sessionId").isString().trim().isLength({ min: 8, max: 64 }).matches(/^[A-Za-z0-9._:-]+$/),
  body("idempotencyKey").optional().isString().trim().isLength({ min: 8, max: 128 }).matches(/^[A-Za-z0-9._:-]+$/),
  body("schemaVersion").optional().isInt({ min: 1, max: 10 }).toInt(),
  body("eventType").isString().trim().customSanitizer((value) => value.toUpperCase()).isIn(TRACKING_EVENTS),
  body("refType").optional({ nullable: true }).isIn(REF_TYPES),
  body("refId").optional({ nullable: true }).isInt({ min: 1 }).toInt(),
  body("url").optional({ nullable: true }).isURL({ protocols: ["http", "https"], require_protocol: true }).isLength({ max: 2048 }),
  body("channel").optional({ nullable: true }).isIn(EVENT_CHANNELS),
  body("metadata").optional().custom((value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("metadata must be an object");
    if (Buffer.byteLength(JSON.stringify(value), "utf8") > 16 * 1024) throw new Error("metadata must not exceed 16 KB");
    return true;
  }),
  ...["utmSource", "utmMedium", "utmCampaign", "utmTerm", "utmContent"].map((field) =>
    body(field).optional({ nullable: true }).isString().trim().isLength({ max: 150 })),
  body("referrer").optional({ nullable: true }).isURL({ protocols: ["http", "https"], require_protocol: true }).isLength({ max: 2048 }),
  body("landingPage").optional({ nullable: true }).isURL({ protocols: ["http", "https"], require_protocol: true }).isLength({ max: 2048 }),
  body("device").optional().custom((value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("device must be an object");
    const allowed = ["browser", "browserVersion", "os", "deviceType", "language", "screenWidth", "screenHeight"];
    if (Object.keys(value).some((key) => !allowed.includes(key))) throw new Error("device contains unsupported fields");
    return true;
  }),
];

const scoringRule = [
  body("eventType").isString().trim().matches(/^[A-Z][A-Z0-9_]{0,49}$/)
    .withMessage("eventType must be an uppercase event key"),
  body("scoreDelta").isInt({ min: -10000, max: 10000 }).toInt(),
  body("modelId").isInt({min:1}).toInt(),
  body("description").optional({ nullable: true }).isString().trim().isLength({ max: 255 }),
  body("isActive").optional().isBoolean().toBoolean(),
  body("priority").optional().isInt({ min: -1000, max: 1000 }).toInt(),
  body("conditions").optional().custom((value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("conditions must be an object");
    if (Buffer.byteLength(JSON.stringify(value), "utf8") > 4096) throw new Error("conditions must not exceed 4 KB");
    return true;
  }),
];

function validAutomation(value){
  if(!value||!Array.isArray(value.nodes)||value.nodes.length>100)throw new Error("definition.nodes must contain at most 100 nodes");
  const allowed=new Set(["trigger","action","condition","branch","wait","stop","start_automation","stop_automation","add_tag","remove_tag","update_field","lifecycle","adjust_score","add_segment","remove_segment","send_email","send_whatsapp","send_sms","add_campaign","remove_campaign","create_crm_activity","create_crm_task","crm_handoff","notification","webhook"]);
  const ids=new Set();for(const node of value.nodes){if(!node?.id||ids.has(node.id)||!allowed.has(node.type))throw new Error("Automation contains an invalid or duplicate node");ids.add(node.id);}
  if(value.start&&!ids.has(value.start))throw new Error("Automation start node does not exist");
  for(const node of value.nodes)for(const edge of [node.next,node.onTrue,node.onFalse])if(edge&&!ids.has(edge))throw new Error("Automation edge points to a missing node");
  return true;
}
const automationBody=[body("name").isString().trim().isLength({min:1,max:160}),body("description").optional({nullable:true}).isString().isLength({max:2000}),
  body("triggerType").isString().trim().isLength({min:1,max:50}),body("triggerConfig").optional().isObject(),body("definition").custom(validAutomation),
  body("status").optional().isIn(["draft","active","paused","archived"])];

module.exports = {
  listContacts: [
    query("search").optional().isString().trim().isLength({ max: 200 }),
    query("stage").optional().isIn(LIFECYCLE_STAGES).withMessage("Invalid lifecycle stage"),
    query("limit").optional().isInt({ min: 1, max: 200 }).withMessage("limit must be between 1 and 200").toInt(),
    query("offset").optional().isInt({ min: 0 }).withMessage("offset must be zero or greater").toInt(),
  ],
  id: [positiveId()],
  publicId: [(name="visitorId")=>param(name)],
  createTag: tagBody,
  createSegment: segmentBody,
  updateSegment: [positiveId(), ...segmentBody],
  ingestEvent: [
    body("marketingContactId").optional({ nullable: true }).isInt({ min: 1 }).toInt(),
    body("anonymousId").optional({ nullable: true }).isString().trim().isLength({ min: 1, max: 64 }),
    body("eventType").isString().trim().matches(/^[A-Z][A-Z0-9_]{0,49}$/).withMessage("eventType must be an uppercase event key of at most 50 characters"),
    body("refType").optional({ nullable: true }).isIn(REF_TYPES).withMessage("Invalid refType"),
    body("refId").optional({ nullable: true }).isInt({ min: 1 }).toInt(),
    body("url").optional({ nullable: true }).isURL({ protocols: ["http", "https"], require_protocol: true }).isLength({ max: 2048 }),
    body("channel").optional({ nullable: true }).isIn(EVENT_CHANNELS).withMessage("Invalid channel"),
    body("metadata").optional().custom((value) => {
      if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("metadata must be an object");
      if (Buffer.byteLength(JSON.stringify(value), "utf8") > 16 * 1024) throw new Error("metadata must not exceed 16 KB");
      return true;
    }),
  ],
  trackingEvent,
  identify: [
    ...identityFields,
    body().custom((value) => {
      if (!value.anonymousId || (!value.email && !value.phone)) {
        throw new Error("anonymousId and either email or phone are required");
      }
      return true;
    }),
  ],
  previewSegment: [body("rules").custom(validSegmentRules)],
  scoringRule,
  updateScoringRule: [positiveId(), ...scoringRule],
  timeline: [positiveId(),query("eventType").optional().isString().trim().isLength({max:80}),
    query("dateFrom").optional().isISO8601(),query("dateTo").optional().isISO8601(),
    query("limit").optional().isInt({min:1,max:100}).toInt(),query("offset").optional().isInt({min:0}).toInt()],
  bulkTag: [body("contactIds").isArray({min:1,max:500}),body("contactIds.*").isInt({min:1}).toInt(),
    body("tagId").isInt({min:1}).toInt(),body("action").isIn(["add","remove"])],
  tagRule: [body("name").isString().trim().isLength({min:1,max:120}),body("tagId").isInt({min:1}).toInt(),
    body("triggerType").isIn(["event","score","segment","lifecycle"]),body("conditions").isObject(),
    body("isActive").optional().isBoolean().toBoolean()],
  scoringModel:[body("name").isString().trim().isLength({min:1,max:120}),body("code").matches(/^[a-z][a-z0-9_]{1,49}$/),
    body("description").optional().isString().isLength({max:255}),body("decayEnabled").optional().isBoolean().toBoolean(),
    body("decayAfterDays").optional().isInt({min:1,max:3650}).toInt(),body("decayPercent").optional().isFloat({min:0,max:100}).toFloat()],
  automation:automationBody,
  updateAutomation:[positiveId(),...automationBody],
  emailTemplate:[body('name').isString().trim().isLength({min:1,max:160}),body('category').optional({nullable:true}).isString().isLength({max:80}),body('status').optional().isIn(['draft','published','archived']),body('subject').isString().isLength({min:1,max:255}),body('html').isString().isLength({max:500000}),body('text').isString().isLength({max:200000})],
  updateEmailTemplate:[positiveId(),body('name').isString().trim().isLength({min:1,max:160}),body('category').optional({nullable:true}).isString().isLength({max:80}),body('status').optional().isIn(['draft','published','archived']),body('subject').isString().isLength({min:1,max:255}),body('html').isString().isLength({max:500000}),body('text').isString().isLength({max:200000})],
  emailTemplateValidation:[body('subject').optional().isString().isLength({max:255}),body('html').optional().isString().isLength({max:500000}),body('text').optional().isString().isLength({max:200000})],
  emailTest:[positiveId(),body('recipient').isEmail().normalizeEmail(),body('senderProfileId').optional({nullable:true}).isInt({min:1}).toInt(),body('sampleValues').optional().isObject()],
  emailSend:[body('templateId').isInt({min:1}).toInt(),body('contactIds').optional().isArray({min:1,max:500}),body('contactIds.*').isInt({min:1}).toInt(),body('segmentId').optional({nullable:true}).isInt({min:1}).toInt(),body().custom((value)=>{if(!Array.isArray(value.contactIds)&&!value.segmentId)throw new Error('Provide contactIds or segmentId');return true;}),body('senderProfileId').optional({nullable:true}).isInt({min:1}).toInt(),body('sendType').optional().isIn(['single','campaign','automation','scheduled','batch']),body('scheduledAt').optional({nullable:true}).isISO8601(),body('subscriptionCode').optional({nullable:true}).isString().isLength({max:50}).custom(subscriptionCodeExists)],
  emailProviderEvent:[body('eventType').isIn(['delivered','opened','clicked','bounced','failed','unsubscribed','complaint']),body('providerEventId').optional().isString().isLength({min:1,max:255}),body('metadata').optional().isObject()],
  senderProfile:[body('name').isString().trim().isLength({min:1,max:120}),body('fromEmail').isEmail().isLength({max:255}),body('replyTo').optional({nullable:true}).isEmail().isLength({max:255}),body('providerType').optional().isIn(['graph']),body('isActive').optional().isBoolean()],
  updateSenderProfile:[positiveId(),body('name').isString().trim().isLength({min:1,max:120}),body('fromEmail').isEmail().isLength({max:255}),body('replyTo').optional({nullable:true}).isEmail().isLength({max:255}),body('providerType').optional().isIn(['graph']),body('isActive').optional().isBoolean()],
  grantPermission:[body('userId').isInt({min:1}).toInt(),body('permission').isIn(["MARKETING_VIEW","MARKETING_JOURNEYS","MARKETING_ANALYTICS","MARKETING_AUTOMATIONS","MARKETING_SETTINGS"])],
  revokePermission:[param('userId').isInt({min:1}).toInt(),param('permission').isIn(["MARKETING_VIEW","MARKETING_JOURNEYS","MARKETING_ANALYTICS","MARKETING_AUTOMATIONS","MARKETING_SETTINGS"])],
  subscriptionType:[body('code').matches(/^[a-z][a-z0-9_]{0,49}$/),body('name').isString().trim().isLength({min:1,max:100})],
  updateSubscriptionType:[positiveId(),body('name').isString().trim().isLength({min:1,max:100})],
  marketingForm:[body('name').isString().trim().isLength({min:1,max:160}),body('slug').matches(/^[a-z0-9][a-z0-9-]{1,159}$/),body('formType').isIn(['contact','demo','trial','assessment','newsletter','custom']),body('status').optional().isIn(['draft','published','archived']),body('fields').isArray({max:100}),body('fields.*.name').matches(/^[a-z][a-z0-9_]{0,49}$/),body('fields.*.label').isString().trim().isLength({min:1,max:120}),body('fields.*.type').isIn(['text','email','phone','textarea','select','checkbox','hidden']),body('fields.*.required').optional().isBoolean(),body('redirectUrl').optional({nullable:true}).isURL({protocols:['http','https'],require_protocol:true}),body('campaignId').optional({nullable:true}).isInt({min:1}).toInt(),body('consent').optional().isObject(),body('consent.required').optional().isBoolean(),body('consent.doubleOptIn').optional().isBoolean(),body('consent.channels').optional().isArray({max:3}),body('consent.channels.*').isIn(['email','whatsapp','sms']),body('consent.subscriptionCodes').optional().isArray({max:20}),body('consent.subscriptionCodes.*').isString().isLength({min:1,max:50})],
  updateMarketingForm:[positiveId(),body('name').isString().trim().isLength({min:1,max:160}),body('slug').matches(/^[a-z0-9][a-z0-9-]{1,159}$/),body('formType').isIn(['contact','demo','trial','assessment','newsletter','custom']),body('status').optional().isIn(['draft','published','archived']),body('fields').isArray({max:100}),body('fields.*.name').matches(/^[a-z][a-z0-9_]{0,49}$/),body('fields.*.label').isString().trim().isLength({min:1,max:120}),body('fields.*.type').isIn(['text','email','phone','textarea','select','checkbox','hidden']),body('fields.*.required').optional().isBoolean(),body('consent').optional().isObject(),body('consent.required').optional().isBoolean(),body('consent.doubleOptIn').optional().isBoolean(),body('consent.channels').optional().isArray({max:3}),body('consent.channels.*').isIn(['email','whatsapp','sms']),body('consent.subscriptionCodes').optional().isArray({max:20}),body('consent.subscriptionCodes.*').isString().isLength({min:1,max:50})],
  formSubmission:[body('visitorId').optional({nullable:true}).isString().isLength({min:8,max:64}),body('sessionId').optional({nullable:true}).isString().isLength({min:8,max:64}),body('data').isObject(),body('utm').optional().isObject(),body('consent').optional().isObject(),body('consent.accepted').optional().isBoolean(),body('_website').optional().isString().isLength({max:0})],
  emailConfirmToken:[param('token').isString().isLength({min:16,max:64}).matches(/^[a-f0-9]+$/)],
  preferenceToken:[param('token').isString().isLength({min:16,max:64}).matches(/^[a-f0-9]+$/)],
  updatePreferences:[param('token').isString().isLength({min:16,max:64}).matches(/^[a-f0-9]+$/),body('emailConsent').optional().isBoolean(),body('whatsappConsent').optional().isBoolean(),body('smsConsent').optional().isBoolean(),body('doNotContact').optional().isBoolean(),body('subscriptions').optional().isArray({max:20}),body('subscriptions.*').isString().isLength({min:1,max:50})],
};
