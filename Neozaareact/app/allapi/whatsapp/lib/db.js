import pg from "pg";
import { AsyncLocalStorage } from "node:async_hooks";

export const conversationConnection = new AsyncLocalStorage();

const { Pool } = pg;

let pool;

function getPool() {
  if (conversationConnection.getStore()) return conversationConnection.getStore();
  if (!pool) {
    pool = new Pool({
      host: process.env.WA_DB_HOST || process.env.DB_HOST || "localhost",
      port: parseInt(process.env.WA_DB_PORT || process.env.DB_PORT || "5432"),
      database: process.env.WA_DB_NAME || process.env.DB_NAME || "proddb",
      user: process.env.WA_DB_USER || process.env.DB_USER || "devuser",
      password: process.env.WA_DB_PASSWORD || process.env.DB_PASSWORD,
    });
  }
  return pool;
}

export default getPool;
