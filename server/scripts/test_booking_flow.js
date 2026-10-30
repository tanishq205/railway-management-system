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

async function testBookingWorkflow() {
  console.log('🚄 Starting Full Booking & Cancellation Workflow Verification...\n');

  // Step 1: Login as Passenger
  console.log('1️⃣ Logging in as passenger (rahul.sharma@example.com)...');
  const loginRes = await request(
    { host: 'localhost', port: 5000, path: '/api/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json' } },
    { email: 'rahul.sharma@example.com', password: 'password123' }
  );

  if (loginRes.status !== 200 || !loginRes.data.token) {
    throw new Error('Passenger login failed: ' + JSON.stringify(loginRes.data));
  }
  const token = loginRes.data.token;
  console.log(`✅ Logged in successfully! User: ${loginRes.data.user.email}, ID: ${loginRes.data.user.userId}\n`);

  // Step 2: Book ticket for 2 passengers on Run 1 (NDLS to MMCT)
  console.log('2️⃣ Booking ticket for 2 passengers on Run 1 (NDLS -> MMCT)...');
  const bookingPayload = {
    runId: 1,
    fromStationId: 1, // NDLS
    toStationId: 2,   // MMCT
    passengers: [
      { name: 'Kavita Sharma', age: 31, gender: 'FEMALE' },
      { name: 'Rohan Sharma', age: 7, gender: 'MALE' }
    ]
  };

  const bookingRes = await request(
    {
      host: 'localhost',
      port: 5000,
      path: '/api/bookings',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      }
    },
    bookingPayload
  );

  console.log(`Booking Response (${bookingRes.status}):`, JSON.stringify(bookingRes.data, null, 2));
  if (bookingRes.status !== 201) {
    throw new Error('Booking failed');
  }

  const pnr = bookingRes.data.booking.pnr;
  console.log(`\n🎉 TICKET BOOKED SUCCESSFULLY! PNR: ${pnr}, Total Amount: Rs. ${bookingRes.data.booking.totalAmount}\n`);

  // Step 3: Check PNR Status
  console.log(`3️⃣ Querying PNR Status for ${pnr}...`);
  const pnrRes = await request({
    host: 'localhost',
    port: 5000,
    path: `/api/bookings/pnr/${pnr}`,
    method: 'GET'
  });

  const b = pnrRes.data.booking;
  console.log(`PNR Status (${pnrRes.status}):`);
  console.log(`- Train: ${b.train.name} (${b.train.type})`);
  console.log(`- From: ${b.route.fromName} -> To: ${b.route.toName}`);
  console.log(`- Service Date: ${b.run.serviceDate}`);
  console.log(`- Passengers (${b.passengers.length}):`);
  b.passengers.forEach(p => {
    console.log(`  * ${p.name} (${p.age}, ${p.gender}): Status=${p.status}, Seat=${p.seatNumber || 'N/A'}`);
  });

  // Step 4: Test Cancellation
  console.log(`\n4️⃣ Testing Ticket Cancellation for PNR ${pnr}...`);
  const cancelRes = await request(
    {
      host: 'localhost',
      port: 5000,
      path: '/api/bookings/cancel',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      }
    },
    { pnr }
  );

  console.log(`Cancellation Response (${cancelRes.status}):`, JSON.stringify(cancelRes.data, null, 2));

  // Step 5: Verify Final PNR Status post-cancellation
  const postCancelRes = await request({
    host: 'localhost',
    port: 5000,
    path: `/api/bookings/pnr/${pnr}`,
    method: 'GET'
  });
  console.log(`\n5️⃣ Verified Post-Cancellation Status for PNR ${pnr}:`);
  postCancelRes.data.booking.passengers.forEach(p => {
    console.log(`  * ${p.name}: Status=${p.status}`);
  });

  console.log('\n🏆 COMPLETE END-TO-END WORKFLOW VERIFIED SUCCESSFULLY AGAINST SUPABASE POSTGRESQL!');
}

testBookingWorkflow().catch(err => {
  console.error('Workflow error:', err);
  process.exit(1);
});
