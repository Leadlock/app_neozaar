const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const request = require("supertest");
const repository = require("../src/repositories/marketing/marketing.repository");
const eventIngestion = require("../src/services/marketing/event-ingestion.service");
const identity = require("../src/services/marketing/identity.service");
const trackingRouter = require("../src/routes/marketing-tracking.route");
const automation = require("../src/services/marketing/automation/automation.service");
const tagging = require("../src/services/marketing/tagging.service");
const segmentation=require("../src/services/marketing/segmentation.service");

function trackingApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/marketing", trackingRouter);
  return app;
}

test("browser tracking requires no client-side secret and still validates input", async () => {
  const oldServer = process.env.MARKETING_TRACKING_SERVER_KEY;
  const oldPublic = process.env.MARKETING_TRACKING_PUBLIC_KEY;
  delete process.env.MARKETING_TRACKING_SERVER_KEY;
  delete process.env.MARKETING_TRACKING_PUBLIC_KEY;
  try {
    await request(trackingApp()).post("/api/marketing/events").send({}).expect(400);
  } finally {
    if (oldServer) process.env.MARKETING_TRACKING_SERVER_KEY = oldServer;
    if (oldPublic) process.env.MARKETING_TRACKING_PUBLIC_KEY = oldPublic;
  }
});

test("tracking rejects an invalid key before request processing", async () => {
  const oldKey = process.env.MARKETING_TRACKING_SERVER_KEY;
  process.env.MARKETING_TRACKING_SERVER_KEY = "server-secret-for-tests";
  try {
    await request(trackingApp()).post("/api/marketing/events")
      .set("X-Marketing-Key", "wrong-key").send({}).expect(401);
  } finally {
    if (oldKey) process.env.MARKETING_TRACKING_SERVER_KEY = oldKey;
    else delete process.env.MARKETING_TRACKING_SERVER_KEY;
  }
});

test("identity normalization is stable", () => {
  assert.equal(identity.normalizeEmail("  Person@Example.COM "), "person@example.com");
  assert.equal(identity.normalizePhone("+91 (987) 654-3210"), "+919876543210");
});

test("idempotent event replay returns the stored event without rescoring", async () => {
  const originalConnect = repository.pool.connect;
  const originalDispatch=automation.dispatchEvent,originalTagging=tagging.evaluateForEvent;
  const originalSegmentation=segmentation.evaluateContact;
  let updateCount = 0;
  let invocation = 0;
  const client = {
    async query(sql) {
      if (sql.includes("SELECT * FROM marketing_events") && invocation === 2) {
        return { rows: [{ id: 51, score_delta: 5 }] };
      }
      if (sql.includes("SELECT * FROM marketing_events")) return { rows: [] };
      if (sql.includes("SELECT id FROM marketing_contacts")) return { rows: [{ id: 7 }] };
      if (sql.includes("FROM marketing_scoring_rules")) return { rows: [{ id:1,score_delta:5,model_id:1,is_default:true }] };
      if (sql.includes("INSERT INTO marketing_events")) return { rows: [{ id: 51, score_delta: 5 }] };
      if (sql.includes("UPDATE marketing_contacts")) updateCount += 1;
      return { rows: [] };
    },
    release() {},
  };
  repository.pool.connect = async () => { invocation += 1; return client; };
  automation.dispatchEvent=async()=>[];tagging.evaluateForEvent=async()=>[];
  segmentation.evaluateContact=async()=>[];
  try {
    const payload = { marketingContactId: 7, eventType: "EMAIL_CLICK", idempotencyKey: "event-replay-001", ingestionSource: "server" };
    const first = await eventIngestion.ingestEvent({ ...payload });
    const replay = await eventIngestion.ingestEvent({ ...payload });
    assert.equal(first.duplicate, false);
    assert.equal(replay.duplicate, true);
    assert.equal(updateCount, 1);
  } finally {
    repository.pool.connect = originalConnect;
    automation.dispatchEvent=originalDispatch;tagging.evaluateForEvent=originalTagging;
    segmentation.evaluateContact=originalSegmentation;
  }
});
