const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

let poolConfig = {
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ssl: {
    rejectUnauthorized: false
  }
};

// Prefer discrete parameters to prevent URI parsing errors with special characters in passwords
if (process.env.DB_HOST && process.env.DB_USER && process.env.DB_PASSWORD) {
  poolConfig.host = process.env.DB_HOST;
  poolConfig.port = parseInt(process.env.DB_PORT || '6543', 10);
  poolConfig.user = process.env.DB_USER;
  poolConfig.password = process.env.DB_PASSWORD;
  poolConfig.database = process.env.DB_NAME || 'postgres';
} else if (process.env.DATABASE_URL) {
  poolConfig.connectionString = process.env.DATABASE_URL;
}

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client:', err);
});

async function testConnection() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT 1 + 1 AS result, current_database() as db_name, version()');
    client.release();

    return {
      connected: true,
      database: result.rows[0].db_name,
      version: result.rows[0].version.split(' ')[0] + ' ' + result.rows[0].version.split(' ')[1],
      message: 'Successfully connected to Supabase PostgreSQL database.'
    };
  } catch (error) {
    return {
      connected: false,
      code: error.code || 'CONNECTION_ERROR',
      message: error.message,
      suggestion: 'Verify that your Supabase project is active, password is correct, and network allows outbound traffic on port 6543 / 5432.'
    };
  }
}

module.exports = {
  pool,
  testConnection
};
