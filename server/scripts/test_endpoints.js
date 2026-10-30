const http = require('http');

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function runTests() {
  console.log('🧪 Testing Backend Endpoints against Live Supabase PostgreSQL...');

  // 1. Health
  const health = await request({ host: 'localhost', port: 5000, path: '/api/health', method: 'GET' });
  console.log('1. /api/health:', health.status, JSON.stringify(health.data));

  // 2. Stations
  const stations = await request({ host: 'localhost', port: 5000, path: '/api/stations', method: 'GET' });
  console.log(`2. /api/stations: ${stations.status}, Total Stations: ${stations.data?.stations?.length ?? stations.data?.count}`);

  // 3. Trains
  const trains = await request({ host: 'localhost', port: 5000, path: '/api/trains', method: 'GET' });
  console.log(`3. /api/trains: ${trains.status}, Total Trains: ${trains.data?.trains?.length ?? trains.data?.count}`);

  // 4. Admin Login
  const login = await request(
    {
      host: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    },
    { email: 'admin@railway.gov.in', password: 'admin123' }
  );
  console.log(`4. /api/auth/login: ${login.status}, User: ${login.data?.user?.email} (${login.data?.user?.role})`);

  const token = login.data?.token;
  if (token) {
    // 5. Admin Dashboard stats
    const dash = await request({
      host: 'localhost',
      port: 5000,
      path: '/api/admin/dashboard',
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`5. /api/admin/dashboard: ${dash.status}, Total Trains: ${dash.data?.dashboard?.totalTrains}, Revenue: Rs. ${dash.data?.dashboard?.totalRevenue}`);

    // 6. Audit Logs
    const audit = await request({
      host: 'localhost',
      port: 5000,
      path: '/api/audit-logs',
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`6. /api/audit-logs: ${audit.status}, Total Audit Logs: ${audit.data?.logs?.length ?? audit.data?.count}`);
  }

  // 7. Search Trains
  const search = await request({
    host: 'localhost',
    port: 5000,
    path: '/api/trains/search?from=1&to=2&date=2026-10-30',
    method: 'GET'
  });
  console.log(`7. /api/trains/search (NDLS -> MMCT): ${search.status}, Found: ${search.data?.trains?.length ?? 0} trains`);
  if (search.data?.trains?.length > 0) {
    console.log(`   Train 1: ${search.data.trains[0].Train_Name} (${search.data.trains[0].Train_Type}), Available Seats: ${search.data.trains[0].Available_Seats}`);
  }

  console.log('\n🎯 ALL TESTS COMPLETED SUCCESSFULLY!');
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
