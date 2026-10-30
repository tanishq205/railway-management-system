const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');

// GET /api/runs
router.get('/', async (req, res) => {
  const { date, trainId } = req.query;

  try {
    let whereClauses = [];
    let params = [];

    if (date) {
      params.push(date);
      whereClauses.push(`tr.service_date = $${params.length}`);
    }

    if (trainId) {
      params.push(parseInt(trainId, 10));
      whereClauses.push(`tr.train_id = $${params.length}`);
    }

    const whereSql = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

    const query = `
      SELECT 
        tr.run_id AS "Run_ID",
        tr.train_id AS "Train_ID",
        TO_CHAR(tr.service_date, 'YYYY-MM-DD') AS "Service_Date",
        tr.run_status AS "Run_Status",
        t.name AS "Train_Name",
        t.type AS "Train_Type",
        s1.station_code AS "Source_Code",
        s1.name AS "Source_Name",
        s2.station_code AS "Dest_Code",
        s2.name AS "Dest_Name",
        COALESCE(stats.total_seats, 0)::int AS "Total_Seats",
        COALESCE(stats.available_seats, 0)::int AS "Available_Seats",
        COALESCE(stats.booked_seats, 0)::int AS "Booked_Seats",
        COALESCE(stats.blocked_seats, 0)::int AS "Blocked_Seats"
      FROM "train_run" tr
      JOIN "train" t ON tr.train_id = t.train_id
      JOIN "station" s1 ON t.source_id = s1.station_id
      JOIN "station" s2 ON t.destination_id = s2.station_id
      LEFT JOIN (
        SELECT 
          sa.run_id,
          COUNT(sa.allocation_id) AS total_seats,
          SUM(CASE WHEN sa.booking_status = 'AVAILABLE' THEN 1 ELSE 0 END) AS available_seats,
          SUM(CASE WHEN sa.booking_status = 'BOOKED' THEN 1 ELSE 0 END) AS booked_seats,
          SUM(CASE WHEN sa.booking_status = 'BLOCKED' THEN 1 ELSE 0 END) AS blocked_seats
        FROM "seat_allocation" sa
        GROUP BY sa.run_id
      ) stats ON tr.run_id = stats.run_id
      ${whereSql}
      ORDER BY tr.service_date DESC, tr.run_id DESC
    `;

    const result = await pool.query(query, params);
    return res.json({ success: true, count: result.rows.length, runs: result.rows });
  } catch (error) {
    console.error('Fetch train runs error:', error);
    return res.status(500).json({ success: false, message: 'Database error fetching train runs: ' + error.message });
  }
});

// POST /api/runs (Admin only)
// Creates a new train run on a specified date and automatically generates Seat_Allocation
// records for every seat in the train's coaches!
router.post('/', authenticate, requireAdmin, async (req, res) => {
  const { trainId, serviceDate } = req.body;

  if (!trainId || !serviceDate) {
    return res.status(400).json({ success: false, message: 'trainId and serviceDate are required.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check if a run already exists for this train on this date
    const existing = await client.query(
      'SELECT "run_id" FROM "train_run" WHERE "train_id" = $1 AND "service_date" = $2',
      [trainId, serviceDate]
    );

    if (existing.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        message: `A train run for Train ID ${trainId} on ${serviceDate} already exists.`
      });
    }

    const runResult = await client.query(
      'INSERT INTO "train_run" ("train_id", "service_date", "run_status") VALUES ($1, $2, $3) RETURNING "run_id"',
      [trainId, serviceDate, 'SCHEDULED']
    );

    const runId = runResult.rows[0].run_id;

    // Fetch all physical seats belonging to this train
    const seats = await client.query(
      `SELECT s."seat_id", s."physical_condition" 
       FROM "seat" s 
       JOIN "coach" c ON s."coach_id" = c."coach_id" 
       WHERE c."train_id" = $1`,
      [trainId]
    );

    if (seats.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Cannot schedule run: No seats found for this train. Please add coaches and seats first.'
      });
    }

    // Insert Seat_Allocations for each seat
    for (const seat of seats.rows) {
      const initialStatus = seat.physical_condition === 'UNDER_REPAIR' ? 'BLOCKED' : 'AVAILABLE';
      await client.query(
        'INSERT INTO "seat_allocation" ("run_id", "seat_id", "booking_status") VALUES ($1, $2, $3)',
        [runId, seat.seat_id, initialStatus]
      );
    }

    // Audit log
    await client.query(
      'INSERT INTO "audit_log" ("action_type", "table_affected", "user_id") VALUES ($1, $2, $3)',
      ['TRAIN_RUN_CREATED', 'Train_Run', req.user.userId]
    );

    await client.query('COMMIT');

    return res.status(201).json({
      success: true,
      message: `Train run successfully created with ${seats.rows.length} seat allocations initialized.`,
      runId,
      totalSeats: seats.rows.length
    });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Create train run error:', error);
    return res.status(500).json({ success: false, message: 'Database error: ' + error.message });
  } finally {
    client.release();
  }
});

// PUT /api/runs/:runId/status (Admin only)
router.put('/:runId/status', authenticate, requireAdmin, async (req, res) => {
  const runId = parseInt(req.params.runId, 10);
  const { status, delayNotes } = req.body;

  if (!runId || !status) {
    return res.status(400).json({ success: false, message: 'runId and status are required.' });
  }

  const validStatuses = ['SCHEDULED', 'RUNNING', 'DELAYED', 'COMPLETED', 'CANCELLED'];
  const cleanStatus = status.toUpperCase().trim();

  if (!validStatuses.includes(cleanStatus)) {
    return res.status(400).json({
      success: false,
      message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
    });
  }

  try {
    const result = await pool.query(
      'UPDATE "train_run" SET "run_status" = $1 WHERE "run_id" = $2',
      [cleanStatus, runId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Train run not found.' });
    }

    await pool.query(
      'INSERT INTO "audit_log" ("action_type", "table_affected", "user_id") VALUES ($1, $2, $3)',
      [`TRAIN_RUN_STATUS_${cleanStatus}`, 'Train_Run', req.user.userId]
    ).catch(() => {});

    return res.json({
      success: true,
      message: `Train run status updated to ${cleanStatus}.` + (delayNotes ? ` (${delayNotes})` : '')
    });
  } catch (error) {
    console.error('Update run status error:', error);
    return res.status(500).json({ success: false, message: 'Database error: ' + error.message });
  }
});

module.exports = router;
