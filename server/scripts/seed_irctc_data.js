const { Client } = require('pg');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function seedIRCTCData() {
  console.log('====================================================');
  console.log('🇮🇳 SEEDING AUTHENTIC IRCTC RAILWAY DATA TO SUPABASE');
  console.log('====================================================');

  let clientConfig = { ssl: { rejectUnauthorized: false } };
  if (process.env.DB_HOST && process.env.DB_USER && process.env.DB_PASSWORD) {
    clientConfig.host = process.env.DB_HOST;
    clientConfig.port = parseInt(process.env.DB_PORT || '6543', 10);
    clientConfig.user = process.env.DB_USER;
    clientConfig.password = process.env.DB_PASSWORD;
    clientConfig.database = process.env.DB_NAME || 'postgres';
  } else if (process.env.DATABASE_URL) {
    clientConfig.connectionString = process.env.DATABASE_URL;
  }

  const client = new Client(clientConfig);
  await client.connect();
  console.log('✅ Connected to Supabase PostgreSQL!');

  try {
    await client.query('BEGIN');

    // Clean all existing data safely
    console.log('🧹 Truncating existing tables...');
    await client.query(`
      TRUNCATE TABLE 
        Audit_Log,
        Payment,
        Ticket_Detail,
        Ticket_Header,
        Passenger,
        User_Account,
        Seat_Allocation,
        Train_Run,
        Seat,
        Coach,
        Route_Schedule,
        Train,
        Station 
      CASCADE;
    `);

    // 1. STATIONS (18 Realistic Indian Railway Stations)
    console.log('🚉 1. Inserting 18 Authentic IRCTC Stations...');
    const stations = [
      [1, 'NDLS', 'New Delhi Railway Station', 'New Delhi', 'Delhi'],
      [2, 'MMCT', 'Mumbai Central', 'Mumbai', 'Maharashtra'],
      [3, 'HWH',  'Howrah Junction', 'Kolkata', 'West Bengal'],
      [4, 'MAS',  'Chennai Central (MGR Central)', 'Chennai', 'Tamil Nadu'],
      [5, 'SBC',  'KSR Bengaluru City', 'Bengaluru', 'Karnataka'],
      [6, 'PNBE', 'Patna Junction', 'Patna', 'Bihar'],
      [7, 'ADI',  'Ahmedabad Junction', 'Ahmedabad', 'Gujarat'],
      [8, 'HYB',  'Hyderabad Deccan (Nampally)', 'Hyderabad', 'Telangana'],
      [9, 'CNB',  'Kanpur Central', 'Kanpur', 'Uttar Pradesh'],
      [10, 'BRC', 'Vadodara Junction', 'Vadodara', 'Gujarat'],
      [11, 'BPL', 'Bhopal Junction', 'Bhopal', 'Madhya Pradesh'],
      [12, 'BSB', 'Varanasi Junction (Cantonment)', 'Varanasi', 'Uttar Pradesh'],
      [13, 'AGC', 'Agra Cantt', 'Agra', 'Uttar Pradesh'],
      [14, 'PUNE', 'Pune Junction', 'Pune', 'Maharashtra'],
      [15, 'LKO', 'Lucknow Charbagh', 'Lucknow', 'Uttar Pradesh'],
      [16, 'JAT', 'Jammu Tawi', 'Jammu', 'Jammu & Kashmir'],
      [17, 'GHY', 'Guwahati Junction', 'Guwahati', 'Assam'],
      [18, 'TVC', 'Thiruvananthapuram Central', 'Thiruvananthapuram', 'Kerala']
    ];

    for (const s of stations) {
      await client.query(
        'INSERT INTO Station (Station_ID, Station_Code, Name, City, State) VALUES ($1, $2, $3, $4, $5)',
        s
      );
    }

    // 2. TRAINS (8 Famous Indian Trains)
    console.log('🚆 2. Inserting 8 Premier IRCTC Trains...');
    const trains = [
      [1, '12952 Mumbai Tejas Rajdhani Express', 'RAJDHANI', 1, 2],       // NDLS -> MMCT
      [2, '22436 Vande Bharat Express', 'VANDE_BHARAT', 1, 12],            // NDLS -> BSB
      [3, '12002 New Delhi Bhopal Shatabdi Express', 'SHATABDI', 1, 11],   // NDLS -> BPL
      [4, '12302 Howrah Rajdhani Express', 'RAJDHANI', 1, 3],              // NDLS -> HWH
      [5, '20608 Chennai - Bengaluru Vande Bharat', 'VANDE_BHARAT', 4, 5], // MAS -> SBC
      [6, '12260 Sealdah AC Duronto Express', 'DURONTO', 1, 3],            // NDLS -> HWH
      [7, '12138 Punjab Mail Superfast', 'SUPERFAST', 1, 2],               // NDLS -> MMCT
      [8, '12626 Kerala Superfast Express', 'SUPERFAST', 1, 18]            // NDLS -> TVC
    ];

    for (const t of trains) {
      await client.query(
        'INSERT INTO Train (Train_ID, Name, Type, Source_ID, Destination_ID) VALUES ($1, $2, $3, $4, $5)',
        t
      );
    }

    // 3. ROUTE SCHEDULES (Realistic Interconnected Indian Railway Stops)
    console.log('🗺️  3. Inserting Route Schedules with Realistic Timings...');
    const routes = [
      // Train 1: 12952 Mumbai Tejas Rajdhani (NDLS -> ADI -> BRC -> MMCT)
      [1, 1, 1, null, '16:55:00'],
      [1, 7, 2, '01:10:00', '01:20:00'],
      [1, 10, 3, '03:45:00', '03:55:00'],
      [1, 2, 4, '08:35:00', null],

      // Train 2: 22436 Vande Bharat Express (NDLS -> AGC -> CNB -> LKO -> BSB)
      [2, 1, 1, null, '06:00:00'],
      [2, 13, 2, '07:45:00', '07:50:00'],
      [2, 9, 3, '10:08:00', '10:12:00'],
      [2, 15, 4, '11:30:00', '11:35:00'],
      [2, 12, 5, '14:00:00', null],

      // Train 3: 12002 New Delhi Bhopal Shatabdi (NDLS -> AGC -> BPL)
      [3, 1, 1, null, '06:00:00'],
      [3, 13, 2, '07:50:00', '07:55:00'],
      [3, 11, 3, '14:40:00', null],

      // Train 4: 12302 Howrah Rajdhani (NDLS -> CNB -> BSB -> PNBE -> HWH)
      [4, 1, 1, null, '16:50:00'],
      [4, 9, 2, '21:32:00', '21:37:00'],
      [4, 12, 3, '01:15:00', '01:25:00'],
      [4, 6, 4, '04:30:00', '04:40:00'],
      [4, 3, 5, '09:55:00', null],

      // Train 5: 20608 Chennai - Bengaluru Vande Bharat (MAS -> SBC)
      [5, 4, 1, null, '05:50:00'],
      [5, 5, 2, '10:20:00', null],

      // Train 6: 12260 Sealdah Duronto (NDLS -> CNB -> HWH -> GHY)
      [6, 1, 1, null, '19:45:00'],
      [6, 9, 2, '00:35:00', '00:40:00'],
      [6, 3, 3, '12:45:00', '13:00:00'],
      [6, 17, 4, '23:30:00', null],

      // Train 7: 12138 Punjab Mail (JAT -> NDLS -> AGC -> BPL -> PUNE -> MMCT)
      [7, 16, 1, null, '21:40:00'],
      [7, 1, 2, '05:00:00', '05:15:00'],
      [7, 13, 3, '07:45:00', '07:50:00'],
      [7, 11, 4, '16:35:00', '16:45:00'],
      [7, 14, 5, '03:15:00', '03:25:00'],
      [7, 2, 6, '07:35:00', null],

      // Train 8: 12626 Kerala Superfast (NDLS -> AGC -> BPL -> HYB -> MAS -> TVC)
      [8, 1, 1, null, '20:10:00'],
      [8, 13, 2, '22:20:00', '22:25:00'],
      [8, 11, 3, '05:20:00', '05:25:00'],
      [8, 8, 4, '14:10:00', '14:20:00'],
      [8, 4, 5, '22:45:00', '23:05:00'],
      [8, 18, 6, '14:30:00', null]
    ];

    let scheduleId = 1;
    for (const r of routes) {
      await client.query(
        'INSERT INTO Route_Schedule (Schedule_ID, Train_ID, Station_ID, Stop_Sequence, Arrival_Time, Departure_Time) VALUES ($1, $2, $3, $4, $5, $6)',
        [scheduleId++, r[0], r[1], r[2], r[3], r[4]]
      );
    }

    // 4. COACHES (21 Realistic Coaches)
    console.log('🚃 4. Inserting 21 Realistic Coaches...');
    const coaches = [
      // Train 1: Mumbai Tejas Rajdhani
      [1, 1, '1A'], [2, 1, '2A'], [3, 1, '3A'],
      // Train 2: Vande Bharat NDLS-BSB
      [4, 2, 'EC'], [5, 2, 'CC'], [6, 2, 'CC'],
      // Train 3: Bhopal Shatabdi
      [7, 3, 'EC'], [8, 3, 'CC'],
      // Train 4: Howrah Rajdhani
      [9, 4, '1A'], [10, 4, '2A'], [11, 4, '3A'],
      // Train 5: Chennai Vande Bharat
      [12, 5, 'EC'], [13, 5, 'CC'],
      // Train 6: Sealdah Duronto
      [14, 6, '2A'], [15, 6, '3A'],
      // Train 7: Punjab Mail
      [16, 7, '2A'], [17, 7, '3A'], [18, 7, 'SL'],
      // Train 8: Kerala Superfast
      [19, 8, '2A'], [20, 8, '3A'], [21, 8, 'SL']
    ];

    for (const c of coaches) {
      await client.query(
        'INSERT INTO Coach (Coach_ID, Train_ID, Coach_Type) VALUES ($1, $2, $3)',
        c
      );
    }

    // 5. PHYSICAL SEATS (126 Seats across coaches)
    console.log('💺 5. Inserting 126 Physical Seats with Berth Codes...');
    let seatId = 1;
    const seatMap = []; // { seatId, coachId, trainId }

    for (const c of coaches) {
      const coachId = c[0];
      const trainId = c[1];
      const coachType = c[2];

      const prefix = coachType === '1A' ? 'H1' :
                     coachType === '2A' ? 'A1' :
                     coachType === '3A' ? 'B1' :
                     coachType === 'EC' ? 'E1' :
                     coachType === 'CC' ? (coachId % 2 === 0 ? 'C1' : 'C2') : 'S1';

      for (let s = 1; s <= 6; s++) {
        const seatNum = `${prefix}-0${s}`;
        // Mark 2 specific seats under repair to test admin maintenance flow
        const condition = (coachId === 3 && s === 6) || (coachId === 18 && s === 6) ? 'UNDER_REPAIR' : 'OPERATIONAL';

        await client.query(
          'INSERT INTO Seat (Seat_ID, Coach_ID, Seat_Number, Physical_Condition) VALUES ($1, $2, $3, $4)',
          [seatId, coachId, seatNum, condition]
        );

        seatMap.push({ seatId, coachId, trainId, condition });
        seatId++;
      }
    }

    // 6. TRAIN RUNS (12 Scheduled Runs)
    console.log('📅 6. Scheduling 12 Train Runs across Journey Dates...');
    const runs = [
      // Today: 2026-10-30
      [1, 1, '2026-10-30', 'SCHEDULED'], // Tejas Rajdhani
      [2, 2, '2026-10-30', 'SCHEDULED'], // Vande Bharat BSB
      [3, 3, '2026-10-30', 'SCHEDULED'], // Bhopal Shatabdi
      [4, 4, '2026-10-30', 'SCHEDULED'], // Howrah Rajdhani
      [5, 5, '2026-10-30', 'SCHEDULED'], // Chennai Vande Bharat
      [6, 6, '2026-10-30', 'SCHEDULED'], // Sealdah Duronto
      [7, 7, '2026-10-30', 'SCHEDULED'], // Punjab Mail
      [8, 8, '2026-10-30', 'SCHEDULED'], // Kerala Express

      // Tomorrow: 2026-10-31
      [9, 1, '2026-10-31', 'SCHEDULED'],
      [10, 2, '2026-10-31', 'SCHEDULED'],
      [11, 3, '2026-10-31', 'SCHEDULED'],
      [12, 4, '2026-10-31', 'SCHEDULED']
    ];

    for (const r of runs) {
      await client.query(
        'INSERT INTO Train_Run (Run_ID, Train_ID, Service_Date, Run_Status) VALUES ($1, $2, $3, $4)',
        r
      );
    }

    // 7. SEAT ALLOCATIONS
    console.log('🎫 7. Generating Seat Allocations for Train Runs...');
    let allocId = 1;
    const bookedSeatRun1 = [1, 2]; // For PNR8492013
    const bookedSeatRun2 = [19];   // For Vande Bharat PNR4420193
    const bookedSeatRun5 = [73];   // For Chennai VB PNR5102948

    for (const r of runs) {
      const runId = r[0];
      const trainId = r[1];
      const trainSeats = seatMap.filter(sm => sm.trainId === trainId);

      for (const ts of trainSeats) {
        let status = 'AVAILABLE';
        if (ts.condition === 'UNDER_REPAIR') {
          status = 'BLOCKED';
        } else if (runId === 1 && bookedSeatRun1.includes(ts.seatId)) {
          status = 'BOOKED';
        } else if (runId === 2 && bookedSeatRun2.includes(ts.seatId)) {
          status = 'BOOKED';
        } else if (runId === 5 && bookedSeatRun5.includes(ts.seatId)) {
          status = 'BOOKED';
        }

        await client.query(
          'INSERT INTO Seat_Allocation (Allocation_ID, Run_ID, Seat_ID, Booking_Status) VALUES ($1, $2, $3, $4)',
          [allocId++, runId, ts.seatId, status]
        );
      }
    }

    // 8. USER ACCOUNTS (Admin + 6 Passengers)
    console.log('👤 8. Inserting User Accounts...');
    // bcrypt hash of 'admin123': $2a$10$kuMM4OpP9xgBDKMwz3lE4eac0r4bQnvsJINCqAusTqaT2za1a/KNK
    // bcrypt hash of 'password123': $2a$10$49PtgvVT5dN2THmJoEWd4uhR.zIYzunlen0LdQHpjnKfcZ4VRcz2S
    const users = [
      [1, 'admin@railway.gov.in', '$2a$10$kuMM4OpP9xgBDKMwz3lE4eac0r4bQnvsJINCqAusTqaT2za1a/KNK', 'ADMIN'],
      [2, 'rahul.sharma@example.com', '$2a$10$49PtgvVT5dN2THmJoEWd4uhR.zIYzunlen0LdQHpjnKfcZ4VRcz2S', 'PASSENGER'],
      [3, 'amit.kumar@example.com', '$2a$10$49PtgvVT5dN2THmJoEWd4uhR.zIYzunlen0LdQHpjnKfcZ4VRcz2S', 'PASSENGER'],
      [4, 'sneha.reddy@example.com', '$2a$10$49PtgvVT5dN2THmJoEWd4uhR.zIYzunlen0LdQHpjnKfcZ4VRcz2S', 'PASSENGER'],
      [5, 'ananya.iyer@example.com', '$2a$10$49PtgvVT5dN2THmJoEWd4uhR.zIYzunlen0LdQHpjnKfcZ4VRcz2S', 'PASSENGER'],
      [6, 'rajesh.patel@example.com', '$2a$10$49PtgvVT5dN2THmJoEWd4uhR.zIYzunlen0LdQHpjnKfcZ4VRcz2S', 'PASSENGER'],
      [7, 'vikram.malhotra@example.com', '$2a$10$49PtgvVT5dN2THmJoEWd4uhR.zIYzunlen0LdQHpjnKfcZ4VRcz2S', 'PASSENGER']
    ];

    for (const u of users) {
      await client.query(
        'INSERT INTO User_Account (User_ID, Email, Password_Hash, Role) VALUES ($1, $2, $3, $4)',
        u
      );
    }

    // 9. PASSENGER PROFILES
    console.log('👥 9. Inserting Realistic Indian Passenger Profiles...');
    const passengers = [
      [1, 2, 'Rahul Sharma', 32, 'MALE'],
      [2, 2, 'Priya Sharma', 29, 'FEMALE'],
      [3, 3, 'Amit Kumar Verma', 26, 'MALE'],
      [4, 4, 'Sneha Reddy', 28, 'FEMALE'],
      [5, 5, 'Ananya Iyer', 24, 'FEMALE'],
      [6, 6, 'Rajesh Patel', 45, 'MALE'],
      [7, 7, 'Vikram Malhotra', 52, 'MALE'],
      [8, 2, 'Aditya Sharma', 60, 'MALE']
    ];

    for (const p of passengers) {
      await client.query(
        'INSERT INTO Passenger (Passenger_ID, User_ID, Name, Age, Gender) VALUES ($1, $2, $3, $4, $5)',
        p
      );
    }

    // 10. TICKET HEADERS (Realistic PNRs)
    console.log('📑 10. Inserting Sample IRCTC Ticket Reservations...');
    const tickets = [
      ['PNR8492013', 2, 1, 1, 2, '2026-10-28 14:30:00+05:30', 4840.00], // Tejas Rajdhani (2 pax)
      ['PNR4420193', 5, 2, 1, 12, '2026-10-29 11:20:00+05:30', 1650.00], // Vande Bharat BSB (1 pax)
      ['PNR5102948', 3, 5, 4, 5, '2026-10-29 09:15:00+05:30', 1250.00],  // Chennai VB (1 pax)
      ['PNR7381920', 4, 1, 1, 2, '2026-10-29 18:45:00+05:30', 2420.00],  // Waitlist (1 pax)
      ['PNR9920145', 7, 6, 1, 3, '2026-10-27 10:10:00+05:30', 2100.00]   // Cancelled (1 pax)
    ];

    for (const t of tickets) {
      await client.query(
        'INSERT INTO Ticket_Header (PNR, User_ID, Run_ID, From_Station_ID, To_Station_ID, Booking_Date, Total_Amount) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        t
      );
    }

    // 11. TICKET DETAILS
    console.log('🎟️  11. Linking Passenger Ticket Details...');
    const details = [
      [1, 'PNR8492013', 1, 1, 'CONFIRMED'],
      [2, 'PNR8492013', 2, 2, 'CONFIRMED'],
      [3, 'PNR4420193', 5, 19, 'CONFIRMED'],
      [4, 'PNR5102948', 3, 73, 'CONFIRMED'],
      [5, 'PNR7381920', 4, null, 'WAITLIST'],
      [6, 'PNR9920145', 7, null, 'CANCELLED']
    ];

    for (const d of details) {
      await client.query(
        'INSERT INTO Ticket_Detail (Detail_ID, PNR, Passenger_ID, Allocation_ID, Current_Status) VALUES ($1, $2, $3, $4, $5)',
        d
      );
    }

    // 12. PAYMENTS
    console.log('💳 12. Inserting Payment Transactions...');
    const payments = [
      [1, 'PNR8492013', 4840.00, 'SUCCESS', '2026-10-28 14:31:05+05:30'],
      [2, 'PNR4420193', 1650.00, 'SUCCESS', '2026-10-29 11:21:10+05:30'],
      [3, 'PNR5102948', 1250.00, 'SUCCESS', '2026-10-29 09:16:12+05:30'],
      [4, 'PNR7381920', 2420.00, 'SUCCESS', '2026-10-29 18:46:22+05:30'],
      [5, 'PNR9920145', 2100.00, 'REFUNDED', '2026-10-27 10:12:00+05:30']
    ];

    for (const p of payments) {
      await client.query(
        'INSERT INTO Payment (Transaction_ID, PNR, Amount, Payment_Status, Timestamp) VALUES ($1, $2, $3, $4, $5)',
        p
      );
    }

    // 13. AUDIT LOGS (Realistic Operational & Administrative Trail)
    console.log('📋 13. Populating Comprehensive Admin Audit Trail...');
    const auditLogs = [
      ['ADMIN_LOGIN', 'User_Account', '2026-10-27 08:30:00+05:30', 1],
      ['STATION_REGISTERED_BSB', 'Station', '2026-10-27 08:45:00+05:30', 1],
      ['TRAIN_REGISTERED_VANDE_BHARAT', 'Train', '2026-10-27 09:00:00+05:30', 1],
      ['ROUTE_SCHEDULE_CONFIGURED', 'Route_Schedule', '2026-10-27 09:30:00+05:30', 1],
      ['SEAT_MAINTENANCE_BLOCKED', 'Seat', '2026-10-28 07:15:00+05:30', 1],
      ['TRAIN_RUN_SCHEDULED', 'Train_Run', '2026-10-28 08:00:00+05:30', 1],
      ['BOOKING_CONFIRMED', 'Ticket_Header', '2026-10-28 14:31:05+05:30', 2],
      ['PASSENGER_REGISTERED', 'Passenger', '2026-10-29 11:15:00+05:30', 5],
      ['PAYMENT_SUCCESS', 'Payment', '2026-10-29 11:21:10+05:30', 5],
      ['BOOKING_CANCELLED', 'Ticket_Detail', '2026-10-29 16:00:00+05:30', 7],
      ['PAYMENT_REFUNDED', 'Payment', '2026-10-29 16:01:00+05:30', 1],
      ['ADMIN_INSPECTED_OCCUPANCY', 'vw_train_occupancy', '2026-10-30 08:15:00+05:30', 1]
    ];

    for (const a of auditLogs) {
      await client.query(
        'INSERT INTO Audit_Log (Action_Type, Table_Affected, Created_At, User_ID) VALUES ($1, $2, $3, $4)',
        a
      );
    }

    // Synchronize identity sequences to highest primary key IDs
    console.log('🔄 Synchronizing PostgreSQL Identity Sequences...');
    await client.query(`
      SELECT setval(pg_get_serial_sequence('"station"', 'station_id'), coalesce(max("station_id"), 1)) FROM "station";
      SELECT setval(pg_get_serial_sequence('"train"', 'train_id'), coalesce(max("train_id"), 1)) FROM "train";
      SELECT setval(pg_get_serial_sequence('"route_schedule"', 'schedule_id'), coalesce(max("schedule_id"), 1)) FROM "route_schedule";
      SELECT setval(pg_get_serial_sequence('"coach"', 'coach_id'), coalesce(max("coach_id"), 1)) FROM "coach";
      SELECT setval(pg_get_serial_sequence('"seat"', 'seat_id'), coalesce(max("seat_id"), 1)) FROM "seat";
      SELECT setval(pg_get_serial_sequence('"train_run"', 'run_id'), coalesce(max("run_id"), 1)) FROM "train_run";
      SELECT setval(pg_get_serial_sequence('"seat_allocation"', 'allocation_id'), coalesce(max("allocation_id"), 1)) FROM "seat_allocation";
      SELECT setval(pg_get_serial_sequence('"user_account"', 'user_id'), coalesce(max("user_id"), 1)) FROM "user_account";
      SELECT setval(pg_get_serial_sequence('"passenger"', 'passenger_id'), coalesce(max("passenger_id"), 1)) FROM "passenger";
      SELECT setval(pg_get_serial_sequence('"ticket_detail"', 'detail_id'), coalesce(max("detail_id"), 1)) FROM "ticket_detail";
      SELECT setval(pg_get_serial_sequence('"payment"', 'transaction_id'), coalesce(max("transaction_id"), 1)) FROM "payment";
      SELECT setval(pg_get_serial_sequence('"audit_log"', 'log_id'), coalesce(max("log_id"), 1)) FROM "audit_log";
    `);

    await client.query('COMMIT');
    console.log('\n✅ All authentic IRCTC sample data loaded successfully into Supabase!');

    // Verification summary
    const stCount = await client.query('SELECT COUNT(*) as count FROM "station"');
    const trCount = await client.query('SELECT COUNT(*) as count FROM "train"');
    const cCount = await client.query('SELECT COUNT(*) as count FROM "coach"');
    const sCount = await client.query('SELECT COUNT(*) as count FROM "seat"');
    const rCount = await client.query('SELECT COUNT(*) as count FROM "train_run"');
    const aCount = await client.query('SELECT COUNT(*) as count FROM "seat_allocation"');
    const uCount = await client.query('SELECT COUNT(*) as count FROM "user_account"');
    const pCount = await client.query('SELECT COUNT(*) as count FROM "passenger"');
    const tCount = await client.query('SELECT COUNT(*) as count FROM "ticket_header"');
    const logCount = await client.query('SELECT COUNT(*) as count FROM "audit_log"');

    console.log('\n====================================================');
    console.log('📊 LIVE SUPABASE DATABASE INVENTORY:');
    console.log(`- Stations:          ${stCount.rows[0].count}`);
    console.log(`- Trains:            ${trCount.rows[0].count}`);
    console.log(`- Coaches:           ${cCount.rows[0].count}`);
    console.log(`- Physical Seats:    ${sCount.rows[0].count}`);
    console.log(`- Scheduled Runs:    ${rCount.rows[0].count}`);
    console.log(`- Seat Allocations:  ${aCount.rows[0].count}`);
    console.log(`- User Accounts:     ${uCount.rows[0].count}`);
    console.log(`- Passengers:        ${pCount.rows[0].count}`);
    console.log(`- Active Bookings:   ${tCount.rows[0].count}`);
    console.log(`- Admin Audit Logs:  ${logCount.rows[0].count}`);
    console.log('====================================================');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('❌ Error during IRCTC seed:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

seedIRCTCData();
