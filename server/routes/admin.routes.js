const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');

// GET /api/admin/dashboard
router.get('/dashboard', authenticate, requireAdmin, async (req, res) => {
  try {
    const trainCount = await pool.query('SELECT COUNT(*)::int AS total FROM "train"');
    const stationCount = await pool.query('SELECT COUNT(*)::int AS total FROM "station"');
    const userCount = await pool.query("SELECT COUNT(*)::int AS total FROM \"user_account\" WHERE \"role\" = 'PASSENGER'");

    const today = new Date().toISOString().slice(0, 10);
    const todayRuns = await pool.query(
      'SELECT COUNT(*)::int AS total FROM "train_run" WHERE service_date = $1',
      [today]
    );

    const passengerStats = await pool.query(`
      SELECT 
        COUNT(*)::int AS "Total_Tickets",
        SUM(CASE WHEN current_status = 'CONFIRMED' THEN 1 ELSE 0 END)::int AS "Confirmed_Passengers",
        SUM(CASE WHEN current_status = 'WAITLIST' THEN 1 ELSE 0 END)::int AS "Waitlisted_Passengers",
        SUM(CASE WHEN current_status = 'CANCELLED' THEN 1 ELSE 0 END)::int AS "Cancelled_Passengers"
      FROM "ticket_detail"
    `);

    const revenueStats = await pool.query(`
      SELECT 
        COALESCE(SUM(amount), 0.00)::numeric AS "Total_Revenue",
        COUNT(transaction_id)::int AS "Total_Successful_Transactions"
      FROM "payment"
      WHERE payment_status = 'SUCCESS'
    `);

    const occupancyStats = await pool.query(`
      SELECT 
        COUNT(sa.allocation_id)::int AS "Total_Allocations",
        SUM(CASE WHEN sa.booking_status = 'BOOKED' THEN 1 ELSE 0 END)::int AS "Booked_Seats",
        SUM(CASE WHEN sa.booking_status = 'AVAILABLE' THEN 1 ELSE 0 END)::int AS "Available_Seats",
        SUM(CASE WHEN sa.booking_status = 'BLOCKED' THEN 1 ELSE 0 END)::int AS "Blocked_Seats",
        ROUND((SUM(CASE WHEN sa.booking_status = 'BOOKED' THEN 1 ELSE 0 END) * 100.0) / 
              NULLIF(COUNT(sa.allocation_id), 0), 2)::numeric AS "Overall_Occupancy_Pct"
      FROM "seat_allocation" sa
    `);

    const recentBookings = await pool.query(`
      SELECT 
        th.pnr AS "PNR",
        th.booking_date AS "Booking_Date",
        th.total_amount AS "Total_Amount",
        ua.email AS "Booker_Email",
        t.name AS "Train_Name",
        TO_CHAR(tr.service_date, 'YYYY-MM-DD') AS "Service_Date",
        COUNT(td.detail_id)::int AS "Passenger_Count",
        COALESCE(p.payment_status, 'PENDING') AS "Payment_Status"
      FROM "ticket_header" th
      JOIN "user_account" ua ON th.user_id = ua.user_id
      JOIN "train_run" tr ON th.run_id = tr.run_id
      JOIN "train" t ON tr.train_id = t.train_id
      LEFT JOIN "ticket_detail" td ON th.pnr = td.pnr
      LEFT JOIN (
        SELECT p1.pnr, p1.payment_status FROM "payment" p1
        WHERE (p1.pnr, p1.transaction_id) IN (SELECT pnr, MAX(transaction_id) FROM "payment" GROUP BY pnr)
      ) p ON th.pnr = p.pnr
      GROUP BY th.pnr, th.booking_date, th.total_amount, ua.email, t.name, tr.service_date, p.payment_status
      ORDER BY th.booking_date DESC
      LIMIT 8
    `);

    return res.json({
      success: true,
      data: {
        totalTrains: trainCount.rows[0].total,
        totalStations: stationCount.rows[0].total,
        totalUsers: userCount.rows[0].total,
        todayRuns: todayRuns.rows[0].total,
        confirmedPassengers: passengerStats.rows[0].Confirmed_Passengers || 0,
        waitlistedPassengers: passengerStats.rows[0].Waitlisted_Passengers || 0,
        cancelledPassengers: passengerStats.rows[0].Cancelled_Passengers || 0,
        totalRevenue: parseFloat(revenueStats.rows[0].Total_Revenue || 0),
        successfulTransactions: revenueStats.rows[0].Total_Successful_Transactions || 0,
        occupancyPercentage: parseFloat(occupancyStats.rows[0].Overall_Occupancy_Pct || 0),
        seatBreakdown: {
          total: occupancyStats.rows[0].Total_Allocations || 0,
          booked: occupancyStats.rows[0].Booked_Seats || 0,
          available: occupancyStats.rows[0].Available_Seats || 0,
          blocked: occupancyStats.rows[0].Blocked_Seats || 0
        },
        recentBookings: recentBookings.rows
      }
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    return res.status(500).json({ success: false, message: 'Database error fetching dashboard metrics: ' + error.message });
  }
});

// GET /api/admin/reports/occupancy
router.get('/reports/occupancy', authenticate, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        "run_id",
        TO_CHAR("service_date", 'YYYY-MM-DD') AS "service_date",
        "run_status",
        "train_id",
        "train_name",
        "train_type",
        "total_seats"::int,
        "booked_seats"::int,
        "available_seats"::int,
        "blocked_seats"::int,
        COALESCE("occupancy_percentage", 0)::numeric AS "occupancy_percentage"
      FROM vw_train_occupancy
      ORDER BY "service_date" DESC, "run_id" DESC
    `);
    return res.json({ success: true, count: result.rows.length, reports: result.rows });
  } catch (error) {
    console.error('Occupancy report error:', error);
    return res.status(500).json({ success: false, message: 'Database error: ' + error.message });
  }
});

// GET /api/admin/reports/revenue
router.get('/reports/revenue', authenticate, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        "train_id",
        "train_name",
        "train_type",
        TO_CHAR("service_date", 'YYYY-MM-DD') AS "service_date",
        "confirmed_bookings_count"::int,
        "total_revenue"::numeric,
        "refunded_amount"::numeric,
        "net_revenue"::numeric
      FROM vw_revenue_summary
      ORDER BY "service_date" DESC, "total_revenue" DESC
    `);
    return res.json({ success: true, count: result.rows.length, reports: result.rows });
  } catch (error) {
    console.error('Revenue report error:', error);
    return res.status(500).json({ success: false, message: 'Database error: ' + error.message });
  }
});

// GET /api/admin/reports/timetable
router.get('/reports/timetable', authenticate, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM vw_route_timetable');
    return res.json({ success: true, count: result.rows.length, stops: result.rows });
  } catch (error) {
    console.error('Timetable view error:', error);
    return res.status(500).json({ success: false, message: 'Database error: ' + error.message });
  }
});

// GET /api/admin/db-objects
// Live PostgreSQL catalog inspection of deployed Views, Triggers, and recent Trigger Audit Logs
router.get('/db-objects', authenticate, requireAdmin, async (req, res) => {
  try {
    const viewsRes = await pool.query(`
      SELECT
        v.viewname AS name,
        pg_get_viewdef(c.oid, true) AS definition
      FROM pg_views v
      JOIN pg_class c ON c.relname = v.viewname
      JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = v.schemaname
      WHERE v.schemaname = 'public'
      ORDER BY v.viewname ASC
    `);

    const triggersRes = await pool.query(`
      SELECT
        t.tgname AS trigger_name,
        cls.relname AS table_name,
        p.proname AS function_name,
        pg_get_triggerdef(t.oid, true) AS definition
      FROM pg_trigger t
      JOIN pg_class cls ON t.tgrelid = cls.oid
      JOIN pg_namespace n ON cls.relnamespace = n.oid
      JOIN pg_proc p ON t.tgfoid = p.oid
      WHERE NOT t.tgisinternal AND n.nspname = 'public'
      ORDER BY cls.relname ASC, t.tgname ASC
    `);

    const triggerLogsRes = await pool.query(`
      SELECT
        log_id AS "Log_ID",
        action_type AS "Action_Type",
        table_affected AS "Table_Affected",
        created_at AS "Created_At"
      FROM "audit_log"
      WHERE "user_id" IS NULL
      ORDER BY "created_at" DESC
      LIMIT 15
    `);

    return res.json({
      success: true,
      views: viewsRes.rows,
      triggers: triggersRes.rows,
      recentTriggerLogs: triggerLogsRes.rows
    });
  } catch (error) {
    console.error('Inspect DB objects error:', error);
    return res.status(500).json({ success: false, message: 'Database error inspecting views/triggers: ' + error.message });
  }
});

module.exports = router;
