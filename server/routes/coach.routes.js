const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');

// GET /api/coaches/:trainId
router.get('/:trainId', async (req, res) => {
  const trainId = parseInt(req.params.trainId, 10);
  if (!trainId) return res.status(400).json({ success: false, message: 'Invalid train ID.' });

  try {
    const coachesResult = await pool.query(
      'SELECT "coach_id" AS "Coach_ID", "train_id" AS "Train_ID", "coach_type" AS "Coach_Type" FROM "coach" WHERE "train_id" = $1 ORDER BY "coach_id" ASC',
      [trainId]
    );

    const coachList = [];
    for (const coach of coachesResult.rows) {
      const seatsResult = await pool.query(
        'SELECT "seat_id" AS "Seat_ID", "coach_id" AS "Coach_ID", "seat_number" AS "Seat_Number", "physical_condition" AS "Physical_Condition" FROM "seat" WHERE "coach_id" = $1 ORDER BY "seat_id" ASC',
        [coach.Coach_ID]
      );
      const seats = seatsResult.rows;
      coachList.push({
        ...coach,
        seats,
        totalSeats: seats.length,
        operationalSeats: seats.filter((s) => s.Physical_Condition === 'OPERATIONAL').length,
        underRepairSeats: seats.filter((s) => s.Physical_Condition === 'UNDER_REPAIR').length
      });
    }

    return res.json({ success: true, count: coachList.length, coaches: coachList });
  } catch (error) {
    console.error('Fetch coaches error:', error);
    return res.status(500).json({ success: false, message: 'Database error: ' + error.message });
  }
});

// POST /api/coaches (Admin only)
router.post('/', authenticate, requireAdmin, async (req, res) => {
  const { trainId, coachType, seatCount } = req.body;

  if (!trainId || !coachType) {
    return res.status(400).json({ success: false, message: 'trainId and coachType are required.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const coachResult = await client.query(
      'INSERT INTO "coach" ("train_id", "coach_type") VALUES ($1, $2) RETURNING "coach_id"',
      [trainId, coachType.trim().toUpperCase()]
    );

    const coachId = coachResult.rows[0].coach_id;
    const count = parseInt(seatCount, 10) || 6;
    const prefix = coachType.slice(0, 2).toUpperCase();

    for (let i = 1; i <= count; i++) {
      const seatNum = `${prefix}-${String(i).padStart(2, '0')}`;
      await client.query(
        'INSERT INTO "seat" ("coach_id", "seat_number", "physical_condition") VALUES ($1, $2, $3)',
        [coachId, seatNum, 'OPERATIONAL']
      );
    }

    await client.query(
      'INSERT INTO "audit_log" ("action_type", "table_affected", "user_id") VALUES ($1, $2, $3)',
      ['COACH_CREATED', 'Coach', req.user.userId]
    );

    await client.query('COMMIT');

    return res.status(201).json({
      success: true,
      message: `Coach created successfully with ${count} operational seats.`,
      coachId
    });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Create coach error:', error);
    return res.status(500).json({ success: false, message: 'Database error: ' + error.message });
  } finally {
    client.release();
  }
});

// PUT /api/coaches/seats/:seatId/condition (Admin only)
router.put('/seats/:seatId/condition', authenticate, requireAdmin, async (req, res) => {
  const seatId = parseInt(req.params.seatId, 10);
  const { physicalCondition } = req.body;

  if (!seatId || !physicalCondition) {
    return res.status(400).json({ success: false, message: 'seatId and physicalCondition are required.' });
  }

  const condition = physicalCondition.toUpperCase().trim();
  if (!['OPERATIONAL', 'UNDER_REPAIR'].includes(condition)) {
    return res.status(400).json({ success: false, message: 'Condition must be OPERATIONAL or UNDER_REPAIR.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const result = await client.query(
      'UPDATE "seat" SET "physical_condition" = $1 WHERE "seat_id" = $2',
      [condition, seatId]
    );

    if (result.rowCount === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Seat not found.' });
    }

    if (condition === 'UNDER_REPAIR') {
      await client.query(
        'UPDATE "seat_allocation" SET "booking_status" = \'BLOCKED\' WHERE "seat_id" = $1 AND "booking_status" = \'AVAILABLE\'',
        [seatId]
      );
    } else {
      await client.query(
        'UPDATE "seat_allocation" SET "booking_status" = \'AVAILABLE\' WHERE "seat_id" = $1 AND "booking_status" = \'BLOCKED\'',
        [seatId]
      );
    }

    await client.query(
      'INSERT INTO "audit_log" ("action_type", "table_affected", "user_id") VALUES ($1, $2, $3)',
      [condition === 'UNDER_REPAIR' ? 'SEAT_MAINTENANCE_BLOCKED' : 'SEAT_MAINTENANCE_RESTORED', 'Seat', req.user.userId]
    );

    await client.query('COMMIT');

    return res.json({
      success: true,
      message: `Seat physical condition updated to ${condition} and active allocations synchronized.`
    });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Update seat condition error:', error);
    return res.status(500).json({ success: false, message: 'Database error: ' + error.message });
  } finally {
    client.release();
  }
});

module.exports = router;
