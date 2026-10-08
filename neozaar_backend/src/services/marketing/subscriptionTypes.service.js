const pool = require("../../config/database");

async function list() {
  return (await pool.query(`SELECT * FROM marketing_subscription_types ORDER BY name`)).rows;
}

async function create(input) {
  const { rows } = await pool.query(
    `INSERT INTO marketing_subscription_types (code, name) VALUES ($1,$2) RETURNING *`,
    [input.code, input.name],
  );
  return rows[0];
}

async function update(id, input) {
  const { rows } = await pool.query(
    `UPDATE marketing_subscription_types SET name=$1 WHERE id=$2 RETURNING *`,
    [input.name, id],
  );
  if (!rows[0]) throw Object.assign(new Error("Subscription type not found"), { statusCode: 404 });
  return rows[0];
}

async function remove(id) {
  // marketing_subscriptions.subscription_type_id is ON DELETE CASCADE, so
  // this also drops everyone's subscription record for this topic — that
  // is the correct behavior (the topic no longer exists to be subscribed
  // to), not silently orphaning rows.
  const { rowCount } = await pool.query(`DELETE FROM marketing_subscription_types WHERE id=$1`, [id]);
  if (!rowCount) throw Object.assign(new Error("Subscription type not found"), { statusCode: 404 });
  return { id };
}

module.exports = { list, create, update, remove };
