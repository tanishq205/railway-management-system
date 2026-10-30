const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { sendBookingConfirmationEmail, generateTicketHtml, getEmailByPnr } = require('../services/email.service');

// Helper to generate a unique 10-character PNR
async function generateUniquePNR(client) {
  let isUnique = false;
  let pnr = '';
  let attempts = 0;

  while (!isUnique && attempts < 10) {
    attempts++;
    const randomDigits = Math.floor(1000000 + Math.random() * 9000000);
    pnr = `PNR${randomDigits}`;

    const existing = await client.query('SELECT "pnr" FROM "ticket_header" WHERE "pnr" = $1', [pnr]);
    if (existing.rows.length === 0) {
      isUnique = true;
    }
  }

  if (!isUnique) {
    pnr = `PNR${Date.now().toString().slice(-7)}`;
  }
  return pnr;
}

// POST /api/bookings
// PostgreSQL Transaction with Pessimistic Locking (SELECT ... FOR UPDATE)
router.post('/', authenticate, async (req, res) => {
  const { runId, fromStationId, toStationId, passengers, simulatePaymentFail } = req.body;

  if (!runId || !fromStationId || !toStationId || !passengers || !Array.isArray(passengers) || passengers.length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Please provide runId, fromStationId, toStationId, and a list of passengers.'
    });
  }

  // Validate passenger profiles
  for (let i = 0; i < passengers.length; i++) {
    const p = passengers[i];
    if (!p.name || !p.name.trim()) {
      return res.status(400).json({ success: false, message: `Passenger #${i + 1} must have a valid name.` });
    }
    if (!p.age || isNaN(parseInt(p.age, 10)) || parseInt(p.age, 10) <= 0) {
      return res.status(400).json({ success: false, message: `Passenger #${i + 1} must have a valid age.` });
    }
  }

  const client = await pool.connect();
  try {
    // 1. Begin PostgreSQL Transaction on dedicated client
    await client.query('BEGIN');

    // Verify train run
    const runs = await client.query(
      `SELECT tr."run_id", tr."train_id", tr."service_date", tr."run_status", t."name" AS "train_name", t."type" AS "train_type"
       FROM "train_run" tr
       JOIN "train" t ON tr."train_id" = t."train_id"
       WHERE tr."run_id" = $1`,
      [runId]
    );

    if (runs.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Train run not found.' });
    }

    const run = runs.rows[0];
    if (run.run_status === 'CANCELLED') {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Cannot book: This train run has been cancelled.' });
    }

    // 2. Lock relevant available seat allocations using SELECT ... FOR UPDATE
    const availableSeats = await client.query(
      `SELECT sa."allocation_id", sa."seat_id", s."seat_number", c."coach_type", c."coach_id"
       FROM "seat_allocation" sa
       JOIN "seat" s ON sa."seat_id" = s."seat_id"
       JOIN "coach" c ON s."coach_id" = c."coach_id"
       WHERE sa."run_id" = $1 AND sa."booking_status" = 'AVAILABLE' AND s."physical_condition" = 'OPERATIONAL'
       ORDER BY sa."allocation_id" ASC
       LIMIT $2
       FOR UPDATE`,
      [runId, passengers.length]
    );

    // Calculate demo ticket fare
    const stops = await client.query(
      `SELECT "stop_sequence" FROM "route_schedule" WHERE "train_id" = $1 AND "station_id" IN ($2, $3) ORDER BY "stop_sequence" ASC`,
      [run.train_id, fromStationId, toStationId]
    );
    const stopsDiff = stops.rows.length >= 2 ? Math.abs(stops.rows[1].stop_sequence - stops.rows[0].stop_sequence) : 1;
    const baseFare = run.train_type === 'VANDE_BHARAT' ? 650 : run.train_type === 'RAJDHANI' ? 550 : 350;
    const farePerPassenger = baseFare + stopsDiff * 220;
    const totalFare = farePerPassenger * passengers.length;

    // Generate unique PNR
    const pnr = await generateUniquePNR(client);

    // 3. Insert Ticket_Header
    await client.query(
      `INSERT INTO "ticket_header" ("pnr", "user_id", "run_id", "from_station_id", "to_station_id", "total_amount", "booking_date")
       VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)`,
      [pnr, req.user.userId, runId, fromStationId, toStationId, totalFare]
    );

    const ticketDetailsSummary = [];

    // 4. Allocate seats or assign waitlist
    for (let i = 0; i < passengers.length; i++) {
      const pData = passengers[i];

      const pResult = await client.query(
        'INSERT INTO "passenger" ("user_id", "name", "age", "gender") VALUES ($1, $2, $3, $4) RETURNING "passenger_id"',
        [req.user.userId, pData.name.trim(), parseInt(pData.age, 10), pData.gender || 'OTHER']
      );
      const passengerId = pResult.rows[0].passenger_id;

      let allocationId = null;
      let seatStatus = 'WAITLIST';
      let allocatedSeatInfo = null;

      if (i < availableSeats.rows.length) {
        allocationId = availableSeats.rows[i].allocation_id;
        seatStatus = 'CONFIRMED';
        allocatedSeatInfo = availableSeats.rows[i];

        await client.query(
          "UPDATE \"seat_allocation\" SET \"booking_status\" = 'BOOKED' WHERE \"allocation_id\" = $1",
          [allocationId]
        );
      }

      const detailResult = await client.query(
        'INSERT INTO "ticket_detail" ("pnr", "passenger_id", "allocation_id", "current_status") VALUES ($1, $2, $3, $4) RETURNING "detail_id"',
        [pnr, passengerId, allocationId, seatStatus]
      );

      ticketDetailsSummary.push({
        detailId: detailResult.rows[0].detail_id,
        passengerId,
        name: pData.name.trim(),
        age: parseInt(pData.age, 10),
        gender: pData.gender || 'OTHER',
        status: seatStatus,
        allocationId,
        seatNumber: allocatedSeatInfo ? allocatedSeatInfo.seat_number : null,
        coachType: allocatedSeatInfo ? allocatedSeatInfo.coach_type : null
      });
    }

    // 5. Handle Simulated Payment
    const paymentStatus = simulatePaymentFail ? 'FAILED' : 'SUCCESS';

    await client.query(
      'INSERT INTO "payment" ("pnr", "amount", "payment_status", "timestamp") VALUES ($1, $2, $3, CURRENT_TIMESTAMP)',
      [pnr, totalFare, paymentStatus]
    );

    if (simulatePaymentFail) {
      await client.query('ROLLBACK');
      return res.status(402).json({
        success: false,
        message: 'Simulated payment failed! Transaction was aborted and seat locks were rolled back safely.'
      });
    }

    // 6. Audit logging
    await client.query(
      'INSERT INTO "audit_log" ("action_type", "table_affected", "user_id") VALUES ($1, $2, $3)',
      ['TICKET_BOOKED_' + pnr, 'Ticket_Header', req.user.userId]
    );

    // 7. Commit Transaction
    await client.query('COMMIT');

    // 8. Fetch station names & passenger email for E-Ticket confirmation email
    const fromStationRes = await pool.query('SELECT name, station_code, city FROM "station" WHERE station_id = $1', [fromStationId]);
    const toStationRes = await pool.query('SELECT name, station_code, city FROM "station" WHERE station_id = $1', [toStationId]);
    const userRes = await pool.query('SELECT email FROM "user_account" WHERE user_id = $1', [req.user.userId]);

    const userEmail = (userRes.rows[0] && userRes.rows[0].email) ? userRes.rows[0].email : req.user.email;
    const fromStationName = fromStationRes.rows[0] ? `${fromStationRes.rows[0].name} (${fromStationRes.rows[0].station_code})` : 'Origin';
    const toStationName = toStationRes.rows[0] ? `${toStationRes.rows[0].name} (${toStationRes.rows[0].station_code})` : 'Destination';

    // Dispatch official IRCTC Confirmation E-Ticket Email in the background (non-blocking)
    const emailStatus = 'SENT';
    sendBookingConfirmationEmail({
      pnr,
      trainName: run.train_name,
      trainType: run.train_type,
      serviceDate: new Date(run.service_date).toISOString().slice(0, 10),
      fromStation: fromStationName,
      toStation: toStationName,
      passengers: ticketDetailsSummary,
      totalAmount: totalFare,
      paymentStatus: 'SUCCESS',
      userEmail
    }).catch((e) => {
      console.warn('📧 Email background dispatch notice:', e.message);
    });

    return res.status(201).json({
      success: true,
      message: 'Booking completed successfully!',
      booking: {
        pnr,
        runId,
        trainName: run.train_name,
        trainType: run.train_type,
        serviceDate: run.service_date,
        totalAmount: totalFare,
        passengers: ticketDetailsSummary,
        paymentStatus: 'SUCCESS',
        emailStatus,
        userEmail
      }
    });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Booking transaction error:', error);
    return res.status(500).json({ success: false, message: 'Database transaction error: ' + error.message });
  } finally {
    client.release();
  }
});

// GET /api/bookings/email/:pnr
// Retrieve generated E-Ticket Confirmation Email for a booking
router.get('/email/:pnr', async (req, res) => {
  const pnr = req.params.pnr.trim().toUpperCase();

  try {
    const cached = getEmailByPnr(pnr);
    if (cached) {
      return res.json({ success: true, email: cached });
    }

    // Generate on the fly from database
    const bookingRes = await pool.query('SELECT * FROM vw_booking_details WHERE "pnr" = $1', [pnr]);
    if (bookingRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: `No booking found for PNR '${pnr}'.` });
    }

    const first = bookingRes.rows[0];
    const passengers = bookingRes.rows.map((r) => ({
      name: r.Passenger_Name,
      age: r.Passenger_Age,
      gender: r.Passenger_Gender,
      status: r.Ticket_Status,
      seatNumber: r.Seat_Number,
      coachType: r.Coach_Type
    }));

    const html = generateTicketHtml({
      pnr: first.PNR,
      trainName: first.Train_Name,
      trainType: first.Train_Type,
      serviceDate: first.Service_Date,
      fromStation: `${first.From_Station_Name} (${first.From_Station_Code})`,
      toStation: `${first.To_Station_Name} (${first.To_Station_Code})`,
      passengers,
      totalAmount: first.Total_Amount,
      paymentStatus: first.Payment_Status,
      userEmail: first.Booker_Email
    });

    return res.json({
      success: true,
      email: {
        pnr,
        to: first.Booker_Email,
        subject: `🚆 IRCTC Booking Confirmation — PNR: ${pnr} (${first.Train_Name})`,
        timestamp: first.Booking_Date,
        html,
        status: 'SENT'
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve email: ' + err.message });
  }
});

// GET /api/bookings/pnr/:pnr
// PNR Status and Itinerary Lookup via PostgreSQL View `vw_booking_details`
router.get('/pnr/:pnr', async (req, res) => {
  const pnr = req.params.pnr.trim().toUpperCase();

  try {
    const result = await pool.query(
      `SELECT 
        "pnr" AS "PNR", 
        "booking_date" AS "Booking_Date", 
        "total_amount" AS "Total_Amount", 
        "user_id" AS "User_ID", 
        "booker_email" AS "Booker_Email", 
        "run_id" AS "Run_ID", 
        TO_CHAR("service_date", 'YYYY-MM-DD') AS "Service_Date", 
        "run_status" AS "Run_Status", 
        "train_id" AS "Train_ID", 
        "train_name" AS "Train_Name", 
        "train_type" AS "Train_Type", 
        "from_station_code" AS "From_Station_Code", 
        "from_station_name" AS "From_Station_Name", 
        "to_station_code" AS "To_Station_Code", 
        "to_station_name" AS "To_Station_Name", 
        "detail_id" AS "Detail_ID", 
        "passenger_id" AS "Passenger_ID", 
        "passenger_name" AS "Passenger_Name", 
        "passenger_age" AS "Passenger_Age", 
        "passenger_gender" AS "Passenger_Gender", 
        "ticket_status" AS "Ticket_Status", 
        "coach_type" AS "Coach_Type", 
        "seat_number" AS "Seat_Number", 
        "payment_status" AS "Payment_Status", 
        "transaction_id" AS "Transaction_ID"
       FROM vw_booking_details WHERE "pnr" = $1`,
      [pnr]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: `No booking found for PNR '${pnr}'.` });
    }

    const header = result.rows[0];
    const passengers = result.rows.map((r) => ({
      detailId: r.Detail_ID,
      passengerId: r.Passenger_ID,
      name: r.Passenger_Name,
      age: r.Passenger_Age,
      gender: r.Passenger_Gender,
      status: r.Ticket_Status === 'WAITLIST' ? 'WAITLIST' : r.Ticket_Status,
      coachType: r.Coach_Type,
      seatNumber: r.Seat_Number
    }));

    return res.json({
      success: true,
      booking: {
        pnr: header.PNR,
        bookingDate: header.Booking_Date,
        totalAmount: header.Total_Amount,
        bookerEmail: header.Booker_Email,
        train: {
          id: header.Train_ID,
          name: header.Train_Name,
          type: header.Train_Type
        },
        run: {
          id: header.Run_ID,
          serviceDate: header.Service_Date,
          runStatus: header.Run_Status
        },
        route: {
          fromCode: header.From_Station_Code,
          fromName: header.From_Station_Name,
          toCode: header.To_Station_Code,
          toName: header.To_Station_Name
        },
        paymentStatus: header.Payment_Status,
        passengers
      }
    });
  } catch (error) {
    console.error('PNR lookup error:', error);
    return res.status(500).json({ success: false, message: 'Database error: ' + error.message });
  }
});

// GET /api/bookings/my
router.get('/my', authenticate, async (req, res) => {
  try {
    const query = `
      SELECT 
        th.pnr AS "PNR",
        th.booking_date AS "Booking_Date",
        th.total_amount AS "Total_Amount",
        tr.run_id AS "Run_ID",
        TO_CHAR(tr.service_date, 'YYYY-MM-DD') AS "Service_Date",
        tr.run_status AS "Run_Status",
        t.name AS "Train_Name",
        t.type AS "Train_Type",
        s1.station_code AS "From_Code",
        s1.name AS "From_Name",
        s2.station_code AS "To_Code",
        s2.name AS "To_Name",
        COUNT(td.detail_id)::int AS "Passenger_Count",
        SUM(CASE WHEN td.current_status = 'CONFIRMED' THEN 1 ELSE 0 END)::int AS "Confirmed_Count",
        SUM(CASE WHEN td.current_status = 'WAITLIST' THEN 1 ELSE 0 END)::int AS "Waitlisted_Count",
        SUM(CASE WHEN td.current_status = 'CANCELLED' THEN 1 ELSE 0 END)::int AS "Cancelled_Count",
        COALESCE(p.payment_status, 'PENDING') AS "Payment_Status"
      FROM "ticket_header" th
      JOIN "train_run" tr ON th.run_id = tr.run_id
      JOIN "train" t ON tr.train_id = t.train_id
      JOIN "station" s1 ON th.from_station_id = s1.station_id
      JOIN "station" s2 ON th.to_station_id = s2.station_id
      LEFT JOIN "ticket_detail" td ON th.pnr = td.pnr
      LEFT JOIN (
        SELECT p1.pnr, p1.payment_status FROM "payment" p1
        WHERE (p1.pnr, p1.transaction_id) IN (SELECT pnr, MAX(transaction_id) FROM "payment" GROUP BY pnr)
      ) p ON th.pnr = p.pnr
      WHERE th.user_id = $1
      GROUP BY th.pnr, th.booking_date, th.total_amount, tr.run_id, tr.service_date, tr.run_status, t.name, t.type, s1.station_code, s1.name, s2.station_code, s2.name, p.payment_status
      ORDER BY th.booking_date DESC
    `;

    const result = await pool.query(query, [req.user.userId]);
    return res.json({ success: true, count: result.rows.length, bookings: result.rows });
  } catch (error) {
    console.error('Fetch my bookings error:', error);
    return res.status(500).json({ success: false, message: 'Database error: ' + error.message });
  }
});

// GET /api/bookings/all (Admin only)
router.get('/all', authenticate, requireAdmin, async (req, res) => {
  const { pnr, status, date } = req.query;

  try {
    let whereClauses = [];
    let params = [];

    if (pnr) {
      params.push(`%${pnr.trim()}%`);
      whereClauses.push(`th.pnr ILIKE $${params.length}`);
    }

    if (date) {
      params.push(date);
      whereClauses.push(`tr.service_date = $${params.length}`);
    }

    const whereSql = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

    const query = `
      SELECT 
        th.pnr AS "PNR",
        th.booking_date AS "Booking_Date",
        th.total_amount AS "Total_Amount",
        ua.email AS "Booker_Email",
        tr.run_id AS "Run_ID",
        TO_CHAR(tr.service_date, 'YYYY-MM-DD') AS "Service_Date",
        t.name AS "Train_Name",
        s1.station_code AS "From_Code",
        s2.station_code AS "To_Code",
        COUNT(td.detail_id)::int AS "Total_Passengers",
        SUM(CASE WHEN td.current_status = 'CONFIRMED' THEN 1 ELSE 0 END)::int AS "Confirmed_Passengers",
        SUM(CASE WHEN td.current_status = 'WAITLIST' THEN 1 ELSE 0 END)::int AS "Waitlisted_Passengers",
        SUM(CASE WHEN td.current_status = 'CANCELLED' THEN 1 ELSE 0 END)::int AS "Cancelled_Passengers",
        COALESCE(p.payment_status, 'PENDING') AS "Latest_Payment_Status"
      FROM "ticket_header" th
      JOIN "user_account" ua ON th.user_id = ua.user_id
      JOIN "train_run" tr ON th.run_id = tr.run_id
      JOIN "train" t ON tr.train_id = t.train_id
      JOIN "station" s1 ON th.from_station_id = s1.station_id
      JOIN "station" s2 ON th.to_station_id = s2.station_id
      LEFT JOIN "ticket_detail" td ON th.pnr = td.pnr
      LEFT JOIN (
        SELECT p1.pnr, p1.payment_status FROM "payment" p1
        WHERE (p1.pnr, p1.transaction_id) IN (SELECT pnr, MAX(transaction_id) FROM "payment" GROUP BY pnr)
      ) p ON th.pnr = p.pnr
      ${whereSql}
      GROUP BY th.pnr, th.booking_date, th.total_amount, ua.email, tr.run_id, tr.service_date, t.name, s1.station_code, s2.station_code, p.payment_status
      ORDER BY th.booking_date DESC
    `;

    const result = await pool.query(query, params);
    return res.json({ success: true, count: result.rows.length, bookings: result.rows });
  } catch (error) {
    console.error('Fetch all bookings error:', error);
    return res.status(500).json({ success: false, message: 'Database error: ' + error.message });
  }
});

// POST /api/bookings/cancel
// Cancellation Workflow with Automated Waitlist Promotion in a PostgreSQL Transaction
router.post('/cancel', authenticate, async (req, res) => {
  const { pnr, detailId } = req.body;

  if (!pnr) {
    return res.status(400).json({ success: false, message: 'PNR is required for ticket cancellation.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const headerResult = await client.query(
      'SELECT "user_id", "run_id", "total_amount" FROM "ticket_header" WHERE "pnr" = $1',
      [pnr]
    );

    if (headerResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Ticket not found.' });
    }

    const header = headerResult.rows[0];

    if (req.user.role !== 'ADMIN' && header.user_id !== req.user.userId) {
      await client.query('ROLLBACK');
      return res.status(403).json({ success: false, message: 'Unauthorized. You can only cancel your own bookings.' });
    }

    const runId = header.run_id;

    let detailQuery = `
      SELECT "detail_id", "pnr", "passenger_id", "allocation_id", "current_status" 
      FROM "ticket_detail" 
      WHERE "pnr" = $1 AND "current_status" IN ('CONFIRMED', 'WAITLIST')
    `;
    let detailParams = [pnr];

    if (detailId) {
      detailQuery += ' AND "detail_id" = $2';
      detailParams.push(parseInt(detailId, 10));
    }

    detailQuery += ' FOR UPDATE';

    const ticketsToCancel = await client.query(detailQuery, detailParams);

    if (ticketsToCancel.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'No active (confirmed or waitlisted) passengers found to cancel for this request.'
      });
    }

    const promotionSummary = [];

    for (const ticket of ticketsToCancel.rows) {
      const { detail_id, allocation_id, current_status } = ticket;

      await client.query(
        "UPDATE \"ticket_detail\" SET \"current_status\" = 'CANCELLED', \"allocation_id\" = NULL WHERE \"detail_id\" = $1",
        [detail_id]
      );

      if (current_status === 'CONFIRMED' && allocation_id) {
        // Query earliest waitlisted passenger on the same run
        const waitlisted = await client.query(
          `SELECT td."detail_id", td."pnr", td."passenger_id", p."name" AS "passenger_name"
           FROM "ticket_detail" td
           JOIN "ticket_header" th ON td."pnr" = th."pnr"
           JOIN "passenger" p ON td."passenger_id" = p."passenger_id"
           WHERE th."run_id" = $1 AND td."current_status" = 'WAITLIST'
           ORDER BY td."detail_id" ASC
           LIMIT 1
           FOR UPDATE`,
          [runId]
        );

        if (waitlisted.rows.length > 0) {
          const candidate = waitlisted.rows[0];
          await client.query(
            "UPDATE \"ticket_detail\" SET \"current_status\" = 'CONFIRMED', \"allocation_id\" = $1 WHERE \"detail_id\" = $2",
            [allocation_id, candidate.detail_id]
          );

          promotionSummary.push({
            promotedDetailId: candidate.detail_id,
            promotedPNR: candidate.pnr,
            promotedPassenger: candidate.passenger_name,
            assignedAllocationId: allocation_id
          });

          await client.query(
            'INSERT INTO "audit_log" ("action_type", "table_affected", "user_id") VALUES ($1, $2, $3)',
            [`WAITLIST_PROMOTED_${candidate.pnr}`, 'Ticket_Detail', req.user.userId]
          );
        } else {
          await client.query(
            "UPDATE \"seat_allocation\" SET \"booking_status\" = 'AVAILABLE' WHERE \"allocation_id\" = $1",
            [allocation_id]
          );

          await client.query(
            'INSERT INTO "audit_log" ("action_type", "table_affected", "user_id") VALUES ($1, $2, $3)',
            [`SEAT_RELEASED_${allocation_id}`, 'Seat_Allocation', req.user.userId]
          );
        }
      }

      await client.query(
        'INSERT INTO "audit_log" ("action_type", "table_affected", "user_id") VALUES ($1, $2, $3)',
        [`TICKET_CANCELLED_${pnr}_ID_${detail_id}`, 'Ticket_Detail', req.user.userId]
      );
    }

    await client.query(
      "INSERT INTO \"payment\" (\"pnr\", \"amount\", \"payment_status\", \"timestamp\") VALUES ($1, $2, 'REFUNDED', CURRENT_TIMESTAMP)",
      [pnr, header.total_amount]
    );

    await client.query('COMMIT');

    return res.json({
      success: true,
      message: `Successfully cancelled ${ticketsToCancel.rows.length} passenger ticket(s).`,
      cancelledCount: ticketsToCancel.rows.length,
      promotions: promotionSummary
    });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Cancellation error:', error);
    return res.status(500).json({ success: false, message: 'Database transaction error: ' + error.message });
  } finally {
    client.release();
  }
});

module.exports = router;
