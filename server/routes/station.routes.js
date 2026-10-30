const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');

// GET /api/stations
// List all stations ordered alphabetically by Name
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT "station_id" AS "Station_ID", "station_code" AS "Station_Code", "name" AS "Name", "city" AS "City", "state" AS "State" FROM "station" ORDER BY "name" ASC'
    );
    return res.json({ success: true, count: result.rows.length, stations: result.rows });
  } catch (error) {
    console.error('Fetch stations error:', error);
    return res.status(500).json({ success: false, message: 'Database error fetching stations: ' + error.message });
  }
});

// POST /api/stations (Admin only)
// Creates a new railway station
router.post('/', authenticate, requireAdmin, async (req, res) => {
  const { stationCode, name, city, state } = req.body;

  if (!stationCode || !name || !city || !state) {
    return res.status(400).json({ success: false, message: 'All station fields (code, name, city, state) are required.' });
  }

  const cleanCode = stationCode.toUpperCase().trim();
  const cleanName = name.trim();
  const cleanCity = city.trim();
  const cleanState = state.trim();

  try {
    // Check for duplicate station code
    const existing = await pool.query('SELECT "station_id" FROM "station" WHERE "station_code" = $1', [cleanCode]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, message: `Station Code '${cleanCode}' is already registered.` });
    }

    const result = await pool.query(
      'INSERT INTO "station" ("station_code", "name", "city", "state") VALUES ($1, $2, $3, $4) RETURNING "station_id"',
      [cleanCode, cleanName, cleanCity, cleanState]
    );

    // Audit log
    await pool.query(
      'INSERT INTO "audit_log" ("action_type", "table_affected", "user_id") VALUES ($1, $2, $3)',
      ['STATION_CREATED', 'Station', req.user.userId]
    ).catch(() => {});

    return res.status(201).json({
      success: true,
      message: 'Station created successfully.',
      station: {
        stationId: result.rows[0].station_id,
        stationCode: cleanCode,
        name: cleanName,
        city: cleanCity,
        state: cleanState
      }
    });
  } catch (error) {
    console.error('Create station error:', error);
    return res.status(500).json({ success: false, message: 'Database error: ' + error.message });
  }
});

// PUT /api/stations/:id (Admin only)
// Updates station metadata
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  const stationId = parseInt(req.params.id, 10);
  const { stationCode, name, city, state } = req.body;

  if (!stationId) {
    return res.status(400).json({ success: false, message: 'Invalid station ID.' });
  }

  const cleanCode = stationCode ? stationCode.toUpperCase().trim() : null;
  const cleanName = name ? name.trim() : null;
  const cleanCity = city ? city.trim() : null;
  const cleanState = state ? state.trim() : null;

  try {
    if (cleanCode) {
      const duplicate = await pool.query(
        'SELECT "station_id" FROM "station" WHERE "station_code" = $1 AND "station_id" <> $2',
        [cleanCode, stationId]
      );
      if (duplicate.rows.length > 0) {
        return res.status(409).json({ success: false, message: `Station Code '${cleanCode}' is already used by another station.` });
      }
    }

    const result = await pool.query(
      'UPDATE "station" SET "station_code" = COALESCE($1, "station_code"), "name" = COALESCE($2, "name"), "city" = COALESCE($3, "city"), "state" = COALESCE($4, "state") WHERE "station_id" = $5',
      [cleanCode, cleanName, cleanCity, cleanState, stationId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Station not found.' });
    }

    await pool.query(
      'INSERT INTO "audit_log" ("action_type", "table_affected", "user_id") VALUES ($1, $2, $3)',
      ['STATION_UPDATED', 'Station', req.user.userId]
    ).catch(() => {});

    return res.json({ success: true, message: 'Station updated successfully.' });
  } catch (error) {
    console.error('Update station error:', error);
    return res.status(500).json({ success: false, message: 'Database error: ' + error.message });
  }
});

// DELETE /api/stations/:id (Admin only)
// Safely deletes a station if not bound to active trains or route schedules
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  const stationId = parseInt(req.params.id, 10);

  if (!stationId) {
    return res.status(400).json({ success: false, message: 'Invalid station ID.' });
  }

  try {
    const trainRefs = await pool.query(
      'SELECT "train_id" FROM "train" WHERE "source_id" = $1 OR "destination_id" = $1 LIMIT 1',
      [stationId]
    );
    if (trainRefs.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete station: It is defined as Source or Destination for an active train.'
      });
    }

    const routeRefs = await pool.query(
      'SELECT "schedule_id" FROM "route_schedule" WHERE "station_id" = $1 LIMIT 1',
      [stationId]
    );
    if (routeRefs.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete station: It is included in train route schedules.'
      });
    }

    const result = await pool.query('DELETE FROM "station" WHERE "station_id" = $1', [stationId]);
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Station not found.' });
    }

    await pool.query(
      'INSERT INTO "audit_log" ("action_type", "table_affected", "user_id") VALUES ($1, $2, $3)',
      ['STATION_DELETED', 'Station', req.user.userId]
    ).catch(() => {});

    return res.json({ success: true, message: 'Station deleted successfully.' });
  } catch (error) {
    console.error('Delete station error:', error);
    return res.status(500).json({ success: false, message: 'Database error: ' + error.message });
  }
});

module.exports = router;
