const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');

// GET /api/routes/:trainId
router.get('/:trainId', async (req, res) => {
  const trainId = parseInt(req.params.trainId, 10);
  if (!trainId) return res.status(400).json({ success: false, message: 'Invalid train ID.' });

  try {
    const result = await pool.query(
      `SELECT rs.schedule_id AS "Schedule_ID", rs.train_id AS "Train_ID", rs.station_id AS "Station_ID", 
              rs.stop_sequence AS "Stop_Sequence", rs.arrival_time AS "Arrival_Time", rs.departure_time AS "Departure_Time",
              s.station_code AS "Station_Code", s.name AS "Station_Name", s.city AS "City", s.state AS "State"
       FROM "route_schedule" rs
       JOIN "station" s ON rs.station_id = s.station_id
       WHERE rs.train_id = $1
       ORDER BY rs.stop_sequence ASC`,
      [trainId]
    );

    return res.json({ success: true, count: result.rows.length, routeStops: result.rows });
  } catch (error) {
    console.error('Fetch route error:', error);
    return res.status(500).json({ success: false, message: 'Database error: ' + error.message });
  }
});

// POST /api/routes/:trainId (Admin only)
router.post('/:trainId', authenticate, requireAdmin, async (req, res) => {
  const trainId = parseInt(req.params.trainId, 10);
  const { stationId, stopSequence, arrivalTime, departureTime } = req.body;

  if (!trainId || !stationId || !stopSequence) {
    return res.status(400).json({
      success: false,
      message: 'trainId, stationId, and stopSequence are required.'
    });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existing = await client.query(
      'SELECT "schedule_id" FROM "route_schedule" WHERE "train_id" = $1 AND ("stop_sequence" = $2 OR "station_id" = $3)',
      [trainId, stopSequence, stationId]
    );

    if (existing.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        message: 'This stop sequence or station already exists in the route. Adjust sequences or select another station.'
      });
    }

    const result = await client.query(
      'INSERT INTO "route_schedule" ("train_id", "station_id", "stop_sequence", "arrival_time", "departure_time") VALUES ($1, $2, $3, $4, $5) RETURNING "schedule_id"',
      [trainId, stationId, stopSequence, arrivalTime || null, departureTime || null]
    );

    await client.query(
      'INSERT INTO "audit_log" ("action_type", "table_affected", "user_id") VALUES ($1, $2, $3)',
      ['ROUTE_STOP_ADDED', 'Route_Schedule', req.user.userId]
    );

    await client.query('COMMIT');

    return res.status(201).json({
      success: true,
      message: 'Route stop added successfully.',
      scheduleId: result.rows[0].schedule_id
    });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Add route stop error:', error);
    return res.status(500).json({ success: false, message: 'Database error: ' + error.message });
  } finally {
    client.release();
  }
});

// PUT /api/routes/stop/:scheduleId (Admin only)
router.put('/stop/:scheduleId', authenticate, requireAdmin, async (req, res) => {
  const scheduleId = parseInt(req.params.scheduleId, 10);
  const { stopSequence, arrivalTime, departureTime } = req.body;

  if (!scheduleId) return res.status(400).json({ success: false, message: 'Invalid schedule ID.' });

  try {
    const result = await pool.query(
      `UPDATE "route_schedule" 
       SET "stop_sequence" = COALESCE($1, "stop_sequence"), 
           "arrival_time" = COALESCE($2, "arrival_time"), 
           "departure_time" = COALESCE($3, "departure_time") 
       WHERE "schedule_id" = $4`,
      [stopSequence || null, arrivalTime || null, departureTime || null, scheduleId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Route schedule stop not found.' });
    }

    await pool.query(
      'INSERT INTO "audit_log" ("action_type", "table_affected", "user_id") VALUES ($1, $2, $3)',
      ['ROUTE_STOP_UPDATED', 'Route_Schedule', req.user.userId]
    ).catch(() => {});

    return res.json({ success: true, message: 'Route stop updated successfully.' });
  } catch (error) {
    console.error('Update route stop error:', error);
    return res.status(500).json({ success: false, message: 'Database error: ' + error.message });
  }
});

// DELETE /api/routes/stop/:scheduleId (Admin only)
router.delete('/stop/:scheduleId', authenticate, requireAdmin, async (req, res) => {
  const scheduleId = parseInt(req.params.scheduleId, 10);
  if (!scheduleId) return res.status(400).json({ success: false, message: 'Invalid schedule ID.' });

  try {
    const result = await pool.query('DELETE FROM "route_schedule" WHERE "schedule_id" = $1', [scheduleId]);
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Route schedule stop not found.' });
    }

    await pool.query(
      'INSERT INTO "audit_log" ("action_type", "table_affected", "user_id") VALUES ($1, $2, $3)',
      ['ROUTE_STOP_DELETED', 'Route_Schedule', req.user.userId]
    ).catch(() => {});

    return res.json({ success: true, message: 'Route stop removed successfully.' });
  } catch (error) {
    console.error('Delete route stop error:', error);
    return res.status(500).json({ success: false, message: 'Database error: ' + error.message });
  }
});

module.exports = router;
