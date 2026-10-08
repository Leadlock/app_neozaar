const express = require("express");
const request = require("supertest");
const test = require("node:test");
const assert = require("node:assert/strict");
const { validate } = require("../src/middlewares/validator");
const validation = require("../src/validations/marketing.validation");
const { requireMarketingManager } = require("../src/middlewares/marketing.middleware");
const repository = require("../src/repositories/marketing/marketing.repository");
const eventIngestion = require("../src/services/marketing/event-ingestion.service");
const automation = require("../src/services/marketing/automation/automation.service");
const tagging = require("../src/services/marketing/tagging.service");
const segmentation = require("../src/services/marketing/segmentation.service");
const jwt = require("jsonwebtoken");

function validationApp(rules) {
  const app = express();
  app.use(express.json({ limit: "32kb" }));
  app.post("/", validate(rules), (req, res) => res.json({ body: req.body, query: req.query }));
  return app;
}

function marketingRouteApp() {
  process.env.JWT_SECRET = "marketing-phase1-test-secret";
  const app = express();
  app.use(express.json());
  app.use("/api/marketing", require("../src/routes/marketing-tracking.route"));
  app.use("/api/marketing", require("../src/routes/marketing.route"));
  return app;
}

test("authorization only admits the two Marketing management roles", () => {
    let nextCalls = 0;
    const statuses = [];
    const response = { status(code) { statuses.push(code); return this; }, json() { return this; } };
    const next = () => { nextCalls += 1; };
    requireMarketingManager({ user: { role_type: "ROLE_MANAGER" } }, response, next);
    assert.equal(nextCalls, 1);

    requireMarketingManager({ user: { role_type: "ADMIN" } }, response, next);
    assert.equal(nextCalls, 1);
    assert.deepEqual(statuses, [403]);
  });

test("Marketing routes require authentication and the management role", async () => {
  const app = marketingRouteApp();
  await request(app).get("/api/marketing/tags").expect(401);
  const token = jwt.sign({ id: 3, role_type: "ADMIN" }, process.env.JWT_SECRET);
  await request(app).get("/api/marketing/tags").set("Authorization", `Bearer ${token}`).expect(403);
});

test("malformed authenticated events are rejected before database access", async () => {
  const app = marketingRouteApp();
  const token = jwt.sign({ id: 4, role_type: "ROLE_MANAGER" }, process.env.JWT_SECRET);
  await request(app).post("/api/marketing/events").set("Authorization", `Bearer ${token}`)
    .send({ eventType: "bad event", metadata: [] }).expect(400);
});

  test("contact pagination rejects negative values", async () => {
    await request(validationApp(validation.listContacts)).post("/?limit=-1&offset=-2").send({}).expect(400);
  });

  test("segment validation rejects non-allow-listed fields", async () => {
    await request(validationApp(validation.createSegment)).post("/").send({
      name: "Unsafe segment",
      rules: { match: "all", rules: [{ field: "password", op: "eq", value: "x" }] },
    }).expect(400);
  });

  test("event validation accepts a bounded well-formed event", async () => {
    await request(validationApp(validation.ingestEvent)).post("/").send({
      marketingContactId: 7,
      eventType: "PRODUCT_VIEW",
      refType: "product",
      refId: 12,
      channel: "web",
      metadata: { source: "catalog" },
    }).expect(200);
  });

  test("event validation rejects oversized metadata", async () => {
    await request(validationApp(validation.ingestEvent)).post("/").send({
      eventType: "PRODUCT_VIEW",
      metadata: { value: "x".repeat(17 * 1024) },
    }).expect(400);
  });

test("event scoring uses a deterministic rule and commits contact update atomically", async () => {
  const originalConnect = repository.pool.connect;
  const originalDispatch = automation.dispatchEvent;
  const originalTagging = tagging.evaluateForEvent;
  const originalSegmentation=segmentation.evaluateContact;
  const calls = [];
  const client = {
    async query(sql, params) {
      calls.push({ sql, params });
      if (sql.includes("SELECT id FROM marketing_contacts")) return { rows: [{ id: 7 }] };
      if (sql.includes("FROM marketing_scoring_rules")) return { rows: [{ id: 1, score_delta: 5, model_id: 1, is_default: true }] };
      if (sql.includes("INSERT INTO marketing_events")) return { rows: [{ id: 99, score_delta: 5 }] };
      return { rows: [], rowCount: 1 };
    },
    release() { calls.push({ sql: "RELEASE" }); },
  };
  repository.pool.connect = async () => client;
  automation.dispatchEvent = async()=>[];
  tagging.evaluateForEvent = async()=>[];
  segmentation.evaluateContact=async()=>[];
  try {
    const result = await eventIngestion.ingestEvent({ marketingContactId: 7, eventType: "EMAIL_CLICK" });
    assert.equal(result.event.id, 99);
    assert.equal(result.duplicate, false);
    assert.match(calls.find((call) => call.sql.includes("FROM marketing_scoring_rules")).sql, /ORDER BY r.priority DESC,r.updated_at DESC,r.id DESC/);
    assert.ok(calls.some((call) => call.sql === "COMMIT"));
    assert.ok(calls.some((call) => call.sql.includes("UPDATE marketing_contacts")));
    assert.equal(calls.at(-1).sql, "RELEASE");
  } finally {
    repository.pool.connect = originalConnect;
    automation.dispatchEvent = originalDispatch;
    tagging.evaluateForEvent = originalTagging;
    segmentation.evaluateContact=originalSegmentation;
  }
});
