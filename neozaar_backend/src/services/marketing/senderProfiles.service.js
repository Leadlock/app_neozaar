const pool = require("../../config/database");

async function list() {
  return (await pool.query(`SELECT * FROM marketing_sender_profiles ORDER BY is_active DESC, name`)).rows;
}

async function create(input) {
  const { rows } = await pool.query(
    `INSERT INTO marketing_sender_profiles (name, from_email, reply_to, provider_type, domain_config, is_active)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [input.name, input.fromEmail, input.replyTo || null, input.providerType || "graph", JSON.stringify(input.domainConfig || {}), input.isActive !== false],
  );
  return rows[0];
}

async function update(id, input) {
  const { rows } = await pool.query(
    `UPDATE marketing_sender_profiles SET name=$1, from_email=$2, reply_to=$3, provider_type=$4, domain_config=$5, is_active=$6
     WHERE id=$7 RETURNING *`,
    [input.name, input.fromEmail, input.replyTo || null, input.providerType || "graph", JSON.stringify(input.domainConfig || {}), input.isActive !== false, id],
  );
  if (!rows[0]) throw Object.assign(new Error("Sender profile not found"), { statusCode: 404 });
  return rows[0];
}

async function remove(id) {
  // FK is ON DELETE SET NULL on marketing_email_messages, so past messages
  // keep their history — they just lose the profile link, same as deleting
  // an email template version would.
  const { rowCount } = await pool.query(`DELETE FROM marketing_sender_profiles WHERE id=$1`, [id]);
  if (!rowCount) throw Object.assign(new Error("Sender profile not found"), { statusCode: 404 });
  return { id };
}

module.exports = { list, create, update, remove };
