const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function initDatabase() {
  console.log('====================================================');
  console.log('🚀 RAILWAY MANAGEMENT SYSTEM — SUPABASE DB INITIALIZER');
  console.log('====================================================');

  let clientConfig = {
    ssl: { rejectUnauthorized: false }
  };

  if (process.env.DB_HOST && process.env.DB_USER && process.env.DB_PASSWORD) {
    clientConfig.host = process.env.DB_HOST;
    clientConfig.port = parseInt(process.env.DB_PORT || '6543', 10);
    clientConfig.user = process.env.DB_USER;
    clientConfig.password = process.env.DB_PASSWORD;
    clientConfig.database = process.env.DB_NAME || 'postgres';
  } else if (process.env.DATABASE_URL) {
    clientConfig.connectionString = process.env.DATABASE_URL;
  } else {
    console.error('❌ Database credentials not found in server/.env');
    process.exit(1);
  }

  console.log(`Connecting to Supabase PostgreSQL at ${clientConfig.host || 'remote'}...`);

  const client = new Client(clientConfig);

  try {
    await client.connect();
    console.log('✅ Connected to Supabase PostgreSQL successfully!');

    const schemaPath = path.join(__dirname, '..', '..', 'database', 'schema.sql');
    const seedPath = path.join(__dirname, '..', '..', 'database', 'seed.sql');

    console.log('\n1️⃣  Executing database/schema.sql...');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    await client.query(schemaSql);
    console.log('✅ Schema executed successfully! 13 tables, views, and PL/pgSQL triggers created.');

    console.log('\n2️⃣  Executing database/seed.sql...');
    const seedSql = fs.readFileSync(seedPath, 'utf8');
    await client.query(seedSql);
    console.log('✅ Seed data inserted successfully!');

    // Validation queries
    const stations = await client.query('SELECT COUNT(*) as count FROM "station"');
    const trains = await client.query('SELECT COUNT(*) as count FROM "train"');
    const runs = await client.query('SELECT COUNT(*) as count FROM "train_run"');
    const seats = await client.query('SELECT COUNT(*) as count FROM "seat"');
    const allocs = await client.query('SELECT COUNT(*) as count FROM "seat_allocation"');
    const users = await client.query('SELECT COUNT(*) as count FROM "user_account"');

    console.log('\n====================================================');
    console.log('📊 DATABASE VERIFICATION SUMMARY:');
    console.log(`- Stations created:        ${stations.rows[0].count}`);
    console.log(`- Trains registered:       ${trains.rows[0].count}`);
    console.log(`- Physical Seats defined:  ${seats.rows[0].count}`);
    console.log(`- Scheduled Train Runs:    ${runs.rows[0].count}`);
    console.log(`- Seat Allocations active: ${allocs.rows[0].count}`);
    console.log(`- User Accounts:           ${users.rows[0].count}`);
    console.log('====================================================');
    console.log('🎉 Setup complete! Supabase PostgreSQL is live and ready.');
  } catch (err) {
    console.error('❌ Error executing database setup:', err.message);
  } finally {
    await client.end();
  }
}

initDatabase();
