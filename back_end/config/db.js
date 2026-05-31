const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'image_metadata',
  password: process.env.DB_PASSWORD || '',
  port: parseInt(process.env.DB_PORT || '5432'),
  ssl: process.env.DB_SSL === "false" ? false : { rejectUnauthorized: false },
  family: 4,
  max: parseInt(process.env.DB_POOL_MAX || '5'),
  idleTimeoutMillis: 300000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected pool error:', err.message);
});

module.exports = pool;