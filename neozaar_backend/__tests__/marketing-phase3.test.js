const test = require("node:test");
const assert = require("node:assert/strict");
const segmentation = require("../src/services/marketing/segmentation.service");
const repository = require("../src/repositories/marketing/marketing.repository");
const scoring = require("../src/services/marketing/scoring.service");

test("segment compiler uses fixed column mappings and bound values", () => {
  const compiled = segmentation.compileRules({
    match: "all",
    rules: [
      { field: "lifecycle_stage", op: "eq", value: "mql' OR TRUE--" },
      { field: "marketing_score", op: "gte", value: 20 },
    ],
  });
  assert.equal(compiled.where, "(mc.lifecycle_stage = $1 AND mc.marketing_score >= $2)");
  assert.deepEqual(compiled.params, ["mql' OR TRUE--", 20]);
  assert.ok(!compiled.where.includes("OR TRUE"));
});

test("segment compiler rejects unapproved fields and invalid in rules", () => {
  assert.throws(() => segmentation.compileRules({ match: "all", rules: [{ field: "password", op: "eq", value: "x" }] }), /Unsupported segment field/);
  assert.throws(() => segmentation.compileRules({ match: "all", rules: [{ field: "company", op: "in", value: [] }] }), /non-empty array/);
});

test("segment compiler supports ANY, date windows and activity rules",()=>{const any=segmentation.compileRules({match:"any",rules:[{field:"last_activity_at",op:"within_days",value:30},{field:"activity_count",op:"gte",value:{eventType:"EMAIL_OPEN",count:3,withinDays:7}}]});assert.match(any.where,/ OR /);assert.match(any.where,/INTERVAL '1 day'/);assert.match(any.where,/COUNT\(\*\)/);});

test("Marketing scoring implementation never writes CRM score tables",()=>{const fs=require("node:fs"),path=require("node:path");for(const file of ["../src/services/marketing/scoring.service.js","../src/services/marketing/event-ingestion.service.js"]){const text=fs.readFileSync(path.resolve(__dirname,file),"utf8");assert.ok(!text.includes("crm_leads"));assert.ok(!text.includes("crm_opportunities"));}});

test("score rebuild derives the aggregate from the immutable ledger", async () => {
  const originalConnect = repository.pool.connect;
  const calls = [];
  const client = {
    async query(sql, params) {
      calls.push({ sql, params });
      if (sql.includes("SELECT id FROM marketing_contacts")) return { rows: [{ id: 9 }] };
      if (sql.includes("GROUP BY model_id")) return { rows: [{ model_id:1,score:42 }] };
      if (sql.includes("WHERE m.is_default")) return { rows: [{ score:42 }] };
      return { rows: [], rowCount: 1 };
    },
    release() {},
  };
  repository.pool.connect = async () => client;
  try {
    const result = await scoring.rebuildContact(9);
    assert.equal(result.marketingContactId,9);assert.equal(result.marketingScore,42);assert.deepEqual(result.scores,[{model_id:1,score:42}]);
    assert.ok(calls.some((call) => call.sql.includes("INSERT INTO marketing_score_ledger")));
    assert.ok(calls.some((call) => call.sql.includes("UPDATE marketing_contacts SET marketing_score")));
    assert.ok(calls.some((call) => call.sql === "COMMIT"));
  } finally { repository.pool.connect = originalConnect; }
});
