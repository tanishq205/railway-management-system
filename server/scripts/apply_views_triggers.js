const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function applyViewsAndTriggers() {
  console.log('====================================================');
  console.log('⚙️  RAILWAY MANAGEMENT SYSTEM — APPLY VIEWS & TRIGGERS');
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

  const client = new Client(clientConfig);

  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL!');

    const sqlPath = path.join(__dirname, '..', '..', 'database', 'views_and_triggers.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('🚀 Executing database/views_and_triggers.sql...');
    await client.query(sql);

    const views = await client.query(
      "SELECT viewname FROM pg_views WHERE schemaname = 'public' AND viewname LIKE 'vw_%' ORDER BY viewname"
    );
    const triggers = await client.query(
      "SELECT tgname, tgrelid::regclass::text AS table_name FROM pg_trigger WHERE NOT tgisinternal ORDER BY tgname"
    );

    console.log(`\n✅ Active Views (${views.rows.length}):`, views.rows.map((r) => r.viewname).join(', '));
    console.log(`✅ Active Triggers (${triggers.rows.length}):`);
    triggers.rows.forEach((t) => console.log(`   - ${t.tgname} ON ${t.table_name}`));
  } catch (err) {
    console.error('❌ Failed to apply views and triggers:', err.message);
    process.exitCode = 1;
  } finally {
    await client.end().catch(() => {});
  }
}

applyViewsAndTriggers();

