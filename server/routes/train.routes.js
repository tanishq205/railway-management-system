const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');

// GET /api/trains/search
// Search trains by origin, destination, and journey date
router.get('/search', async (req, res) => {
  const { from, to, date } = req.query;

  if (!from || !to || !date) {
    return res.status(400).json({
      success: false,
      message: 'Please provide origin station (from), destination station (to), and journey date (date).'
    });
  }

  const fromId = parseInt(from, 10);
  const toId = parseInt(to, 10);

  if (isNaN(fromId) || isNaN(toId)) {
    return res.status(400).json({ success: false, message: 'Invalid origin or destination station identifier.' });
  }

  if (fromId === toId) {
    return res.status(400).json({ success: false, message: 'Origin and destination stations must be different.' });
  }

  try {
    // 1. Find all trains serving this route in correct direction
    const routeMatches = await pool.query(
      `SELECT DISTINCT t.train_id
       FROM "train" t
       JOIN "route_schedule" rs1 ON t.train_id = rs1.train_id AND rs1.station_id = $1
       JOIN "route_schedule" rs2 ON t.train_id = rs2.train_id AND rs2.station_id = $2
       WHERE rs1.stop_sequence < rs2.stop_sequence`,
      [fromId, toId]
    );

    // 2. Auto-provision scheduled runs & seat allocations for this date if not already created
    for (const match of routeMatches.rows) {
      const runCheck = await pool.query(
        'SELECT run_id FROM "train_run" WHERE train_id = $1 AND service_date = $2',
        [match.train_id, date]
      );
      if (runCheck.rows.length === 0) {
        try {
          const newRun = await pool.query(
            'INSERT INTO "train_run" ("train_id", "service_date", "run_status") VALUES ($1, $2, $3) RETURNING run_id',
            [match.train_id, date, 'SCHEDULED']
          );
          const newRunId = newRun.rows[0].run_id;
          await pool.query(
            `INSERT INTO "seat_allocation" ("run_id", "seat_id", "booking_status")
             SELECT $1, s.seat_id, CASE WHEN s.physical_condition = 'UNDER_REPAIR' THEN 'BLOCKED' ELSE 'AVAILABLE' END
             FROM "seat" s
             JOIN "coach" c ON s.coach_id = c.coach_id
             WHERE c.train_id = $2`,
            [newRunId, match.train_id]
          );
        } catch (e) {
          // Ignore concurrent insert collisions
        }
      }
    }

    const query = `
      SELECT 
        t.train_id AS "Train_ID",
        t.name AS "Train_Name",
        t.type AS "Train_Type",
        rs1.stop_sequence AS "Origin_Sequence",
        rs1.departure_time AS "Departure_Time",
        rs2.stop_sequence AS "Dest_Sequence",
        rs2.arrival_time AS "Arrival_Time",
        st1.station_id AS "Origin_ID",
        st1.station_code AS "Origin_Code",
        st1.name AS "Origin_Name",
        st2.station_id AS "Dest_ID",
        st2.station_code AS "Dest_Code",
        st2.name AS "Dest_Name",
        tr.run_id AS "Run_ID",
        TO_CHAR(tr.service_date, 'YYYY-MM-DD') AS "Service_Date",
        tr.run_status AS "Run_Status",
        COALESCE(seat_stats.total_operational_seats, 0)::int AS "Total_Seats",
        COALESCE(seat_stats.available_seats, 0)::int AS "Available_Seats",
        COALESCE(seat_stats.booked_seats, 0)::int AS "Booked_Seats"
      FROM "train" t
      JOIN "route_schedule" rs1 ON t.train_id = rs1.train_id AND rs1.station_id = $1
      JOIN "route_schedule" rs2 ON t.train_id = rs2.train_id AND rs2.station_id = $2
      JOIN "station" st1 ON rs1.station_id = st1.station_id
      JOIN "station" st2 ON rs2.station_id = st2.station_id
      JOIN "train_run" tr ON t.train_id = tr.train_id AND tr.service_date = $3
      LEFT JOIN (
        SELECT 
          sa.run_id,
          COUNT(sa.allocation_id) AS total_operational_seats,
          SUM(CASE WHEN sa.booking_status = 'AVAILABLE' THEN 1 ELSE 0 END) AS available_seats,
          SUM(CASE WHEN sa.booking_status = 'BOOKED' THEN 1 ELSE 0 END) AS booked_seats
        FROM "seat_allocation" sa
        JOIN "seat" s ON sa.seat_id = s.seat_id AND s.physical_condition = 'OPERATIONAL'
        GROUP BY sa.run_id
      ) seat_stats ON tr.run_id = seat_stats.run_id
      WHERE rs1.stop_sequence < rs2.stop_sequence
      ORDER BY rs1.departure_time ASC
    `;

    const result = await pool.query(query, [fromId, toId, date]);

    const enhancedResults = result.rows.map((train) => {
      const stopsDifference = Math.max(1, train.Dest_Sequence - train.Origin_Sequence);
      const baseFare = train.Train_Type === 'VANDE_BHARAT' ? 650 : train.Train_Type === 'RAJDHANI' ? 550 : 350;
      const calculatedFare = baseFare + stopsDifference * 220;

      return {
        ...train,
        stopsDifference,
        demoFarePerPassenger: calculatedFare,
        waitlistAvailable: train.Available_Seats === 0,
        waitlistCount: 5
      };
    });

    return res.json({
      success: true,
      count: enhancedResults.length,
      searchCriteria: { fromId, toId, date },
      trains: enhancedResults
    });
  } catch (error) {
    console.error('Search trains error:', error);
    return res.status(500).json({ success: false, message: 'Database error searching trains: ' + error.message });
  }
});

// GET /api/trains
// List all registered trains with source & destination station metadata
router.get('/', async (req, res) => {
  try {
    const query = `
      SELECT 
        t.train_id AS "Train_ID",
        t.name AS "Name",
        t.type AS "Type",
        t.source_id AS "Source_ID",
        s_src.station_code AS "Source_Code",
        s_src.name AS "Source_Name",
        t.destination_id AS "Destination_ID",
        s_dest.station_code AS "Destination_Code",
        s_dest.name AS "Destination_Name",
        COUNT(DISTINCT c.coach_id)::int AS "Total_Coaches",
        COUNT(DISTINCT s.seat_id)::int AS "Total_Seats"
      FROM "train" t
      JOIN "station" s_src ON t.source_id = s_src.station_id
      JOIN "station" s_dest ON t.destination_id = s_dest.station_id
      LEFT JOIN "coach" c ON t.train_id = c.train_id
      LEFT JOIN "seat" s ON c.coach_id = s.coach_id
      GROUP BY t.train_id, t.name, t.type, t.source_id, s_src.station_code, s_src.name, t.destination_id, s_dest.station_code, s_dest.name
      ORDER BY t.train_id ASC
    `;

    const result = await pool.query(query);
    return res.json({ success: true, count: result.rows.length, trains: result.rows });
  } catch (error) {
    console.error('Get trains error:', error);
    return res.status(500).json({ success: false, message: 'Database error fetching trains: ' + error.message });
  }
});

// GET /api/trains/:id
router.get('/:id', async (req, res) => {
  const trainId = parseInt(req.params.id, 10);
  if (!trainId) return res.status(400).json({ success: false, message: 'Invalid train ID.' });

  try {
    const trains = await pool.query(
      `SELECT t.train_id AS "Train_ID", t.name AS "Name", t.type AS "Type", t.source_id AS "Source_ID", 
              s1.name AS "Source_Name", s1.station_code AS "Source_Code",
              t.destination_id AS "Destination_ID", s2.name AS "Dest_Name", s2.station_code AS "Dest_Code"
       FROM "train" t
       JOIN "station" s1 ON t.source_id = s1.station_id
       JOIN "station" s2 ON t.destination_id = s2.station_id
       WHERE t.train_id = $1`,
      [trainId]
    );

    if (trains.rows.length === 0) return res.status(404).json({ success: false, message: 'Train not found.' });

    const stops = await pool.query(
      `SELECT rs.schedule_id AS "Schedule_ID", rs.stop_sequence AS "Stop_Sequence", rs.arrival_time AS "Arrival_Time", rs.departure_time AS "Departure_Time",
              s.station_id AS "Station_ID", s.station_code AS "Station_Code", s.name AS "Station_Name", s.city AS "City", s.state AS "State"
       FROM "route_schedule" rs
       JOIN "station" s ON rs.station_id = s.station_id
       WHERE rs.train_id = $1
       ORDER BY rs.stop_sequence ASC`,
      [trainId]
    );

    const coaches = await pool.query(
      `SELECT c.coach_id AS "Coach_ID", c.coach_type AS "Coach_Type",
              COUNT(s.seat_id)::int AS "Total_Seats",
              SUM(CASE WHEN s.physical_condition = 'OPERATIONAL' THEN 1 ELSE 0 END)::int AS "Operational_Seats",
              SUM(CASE WHEN s.physical_condition = 'UNDER_REPAIR' THEN 1 ELSE 0 END)::int AS "Under_Repair_Seats"
       FROM "coach" c
       LEFT JOIN "seat" s ON c.coach_id = s.coach_id
       WHERE c.train_id = $1
       GROUP BY c.coach_id, c.coach_type
       ORDER BY c.coach_id ASC`,
      [trainId]
    );

    return res.json({
      success: true,
      train: {
        ...trains.rows[0],
        routeStops: stops.rows,
        coaches: coaches.rows
      }
    });
  } catch (error) {
    console.error('Get train detail error:', error);
    return res.status(500).json({ success: false, message: 'Database error: ' + error.message });
  }
});

// POST /api/trains (Admin only)
router.post('/', authenticate, requireAdmin, async (req, res) => {
  const { name, type, sourceId, destinationId } = req.body;

  if (!name || !type || !sourceId || !destinationId) {
    return res.status(400).json({ success: false, message: 'Name, Type, Source_ID, and Destination_ID are required.' });
  }

  if (parseInt(sourceId, 10) === parseInt(destinationId, 10)) {
    return res.status(400).json({ success: false, message: 'Source and Destination stations must be distinct.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const stations = await client.query(
      'SELECT "station_id" FROM "station" WHERE "station_id" IN ($1, $2)',
      [sourceId, destinationId]
    );

    if (stations.rows.length < 2) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'One or both specified stations do not exist.' });
    }

    const trainResult = await client.query(
      'INSERT INTO "train" ("name", "type", "source_id", "destination_id") VALUES ($1, $2, $3, $4) RETURNING "train_id"',
      [name.trim(), type.trim().toUpperCase(), sourceId, destinationId]
    );

    const trainId = trainResult.rows[0].train_id;

    // Automatically add initial Origin (Seq 1) and Destination (Seq 2) in Route_Schedule
    await client.query(
      'INSERT INTO "route_schedule" ("train_id", "station_id", "stop_sequence", "arrival_time", "departure_time") VALUES ($1, $2, 1, NULL, $3)',
      [trainId, sourceId, '08:00:00']
    );

    await client.query(
      'INSERT INTO "route_schedule" ("train_id", "station_id", "stop_sequence", "arrival_time", "departure_time") VALUES ($1, $2, 2, $3, NULL)',
      [trainId, destinationId, '20:00:00']
    );

    await client.query(
      'INSERT INTO "audit_log" ("action_type", "table_affected", "user_id") VALUES ($1, $2, $3)',
      ['TRAIN_CREATED', 'Train', req.user.userId]
    );

    await client.query('COMMIT');

    return res.status(201).json({
      success: true,
      message: 'Train registered successfully with default route endpoints.',
      trainId
    });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Create train error:', error);
    return res.status(500).json({ success: false, message: 'Database error: ' + error.message });
  } finally {
    client.release();
  }
});

// PUT /api/trains/:id (Admin only)
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  const trainId = parseInt(req.params.id, 10);
  const { name, type } = req.body;

  if (!trainId) return res.status(400).json({ success: false, message: 'Invalid train ID.' });

  try {
    const result = await pool.query(
      'UPDATE "train" SET "name" = COALESCE($1, "name"), "type" = COALESCE($2, "type") WHERE "train_id" = $3',
      [name ? name.trim() : null, type ? type.trim().toUpperCase() : null, trainId]
    );

    if (result.rowCount === 0) return res.status(404).json({ success: false, message: 'Train not found.' });

    await pool.query(
      'INSERT INTO "audit_log" ("action_type", "table_affected", "user_id") VALUES ($1, $2, $3)',
      ['TRAIN_UPDATED', 'Train', req.user.userId]
    ).catch(() => {});

    return res.json({ success: true, message: 'Train updated successfully.' });
  } catch (error) {
    console.error('Update train error:', error);
    return res.status(500).json({ success: false, message: 'Database error: ' + error.message });
  }
});

// DELETE /api/trains/:id (Admin only)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  const trainId = parseInt(req.params.id, 10);
  if (!trainId) return res.status(400).json({ success: false, message: 'Invalid train ID.' });

  try {
    const bookings = await pool.query(
      `SELECT th."pnr" 
       FROM "ticket_header" th 
       JOIN "train_run" tr ON th."run_id" = tr."run_id" 
       WHERE tr."train_id" = $1 LIMIT 1`,
      [trainId]
    );

    if (bookings.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete train: Active bookings exist for this train.'
      });
    }

    const result = await pool.query('DELETE FROM "train" WHERE "train_id" = $1', [trainId]);
    if (result.rowCount === 0) return res.status(404).json({ success: false, message: 'Train not found.' });

    await pool.query(
      'INSERT INTO "audit_log" ("action_type", "table_affected", "user_id") VALUES ($1, $2, $3)',
      ['TRAIN_DELETED', 'Train', req.user.userId]
    ).catch(() => {});

    return res.json({ success: true, message: 'Train and associated rolling stock deleted successfully.' });
  } catch (error) {
    console.error('Delete train error:', error);
    return res.status(500).json({ success: false, message: 'Database error: ' + error.message });
  }
});

module.exports = router;
