const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'image_metadata',
  password: 'Hesoyamraj@1234',
  port: 5432,
});

module.exports = pool;