// ============================================================
// MULTI-MANIACS CUSTOMS LLC
// FILE: db.js
// NEON POSTGRESQL DATABASE CONNECTION
// ============================================================

"use strict";

const {
  Pool
} = require("pg");

// ============================================================
// DATABASE CONFIGURATION
// ============================================================

function getDatabaseUrl() {
  const databaseUrl =
    String(
      process.env.DATABASE_URL ||
      ""
    ).trim();

  if (!databaseUrl) {
    const error =
      new Error(
        "DATABASE_URL is not configured."
      );

    error.code =
      "DATABASE_URL_MISSING";

    throw error;
  }

  return databaseUrl;
}

function createPool() {
  return new Pool({
    connectionString:
      getDatabaseUrl(),

    /*
     * Neon connection strings normally include:
     *
     * sslmode=require
     *
     * The SSL setting below supports Neon connections through
     * node-postgres without requiring a local CA certificate.
     */

    ssl: {
      rejectUnauthorized:
        false
    },

    /*
     * Keep the application-side pool modest because the Neon
     * pooled URL already connects through Neon's PgBouncer.
     */

    max:
      Number(
        process.env
          .DATABASE_POOL_MAX ||
        5
      ),

    min:
      0,

    idleTimeoutMillis:
      Number(
        process.env
          .DATABASE_IDLE_TIMEOUT_MS ||
        30000
      ),

    connectionTimeoutMillis:
      Number(
        process.env
          .DATABASE_CONNECTION_TIMEOUT_MS ||
        10000
      ),

    /*
     * Allows command-line tests to finish after all database
     * clients become idle. It does not close active clients.
     */

    allowExitOnIdle:
      process.env.NODE_ENV !==
      "production"
  });
}

// ============================================================
// SINGLE SHARED POOL
//
// Reusing one shared Pool prevents the application from creating
// a new connection pool every time a model or route imports db.js.
// ============================================================

const globalDatabase =
  globalThis;

const pool =
  globalDatabase
    .mmcPostgresPool ||
  createPool();

if (
  process.env.NODE_ENV !==
  "production"
) {
  globalDatabase
    .mmcPostgresPool =
    pool;
}

// ============================================================
// POOL EVENTS
// ============================================================

pool.on(
  "error",
  function (error) {
    console.error(
      "Unexpected Neon PostgreSQL pool error:",
      error
    );
  }
);

// ============================================================
// RUN A SINGLE QUERY
//
// Use db.query() for ordinary queries that do not require a
// transaction.
// ============================================================

function query(
  queryText,
  parameters
) {
  return pool.query(
    queryText,
    parameters
  );
}

// ============================================================
// GET A DATABASE CLIENT
//
// Use db.getClient() or db.pool.connect() for transactions.
//
// Always release the client in a finally block.
// ============================================================

function getClient() {
  return pool.connect();
}

// ============================================================
// RUN A TRANSACTION
//
// Example:
//
// const result = await db.withTransaction(
//   async function (client) {
//     return client.query("SELECT NOW()");
//   }
// );
// ============================================================

async function withTransaction(
  callback
) {
  if (
    typeof callback !==
    "function"
  ) {
    throw new TypeError(
      "withTransaction requires a callback function."
    );
  }

  const client =
    await pool.connect();

  try {
    await client.query(
      "BEGIN"
    );

    const result =
      await callback(
        client
      );

    await client.query(
      "COMMIT"
    );

    return result;
  } catch (error) {
    try {
      await client.query(
        "ROLLBACK"
      );
    } catch (rollbackError) {
      console.error(
        "Neon transaction rollback failed:",
        rollbackError
      );
    }

    throw error;
  } finally {
    client.release();
  }
}

// ============================================================
// TEST DATABASE CONNECTION
// ============================================================

async function testConnection() {
  const result =
    await query(
      `
        SELECT
          NOW() AS database_time,
          CURRENT_DATABASE() AS database_name,
          CURRENT_USER AS database_user
      `
    );

  return {
    connected:
      true,

    databaseTime:
      result.rows[0]
        .database_time,

    databaseName:
      result.rows[0]
        .database_name,

    databaseUser:
      result.rows[0]
        .database_user
  };
}

// ============================================================
// POOL STATUS
//
// Returns counts only. It does not expose credentials.
// ============================================================

function getPoolStatus() {
  return {
    totalConnections:
      pool.totalCount,

    idleConnections:
      pool.idleCount,

    waitingRequests:
      pool.waitingCount
  };
}

// ============================================================
// CLOSE DATABASE POOL
//
// Use this only for tests, maintenance scripts, or controlled
// local shutdown. Do not close the pool after each request.
// ============================================================

async function closePool() {
  await pool.end();
}

// ============================================================
// EXPORT DATABASE UTILITIES
// ============================================================

module.exports = {
  pool:
    pool,

  query:
    query,

  getClient:
    getClient,

  withTransaction:
    withTransaction,

  testConnection:
    testConnection,

  getPoolStatus:
    getPoolStatus,

  closePool:
    closePool
};
``