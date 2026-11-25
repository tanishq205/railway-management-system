const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');

// GET /api/audit-logs (Admin only)
router.get('/', authenticate, requireAdmin, async (req, res) => {
  const { action, table, limit, source } = req.query;

  try {
    let whereClauses = [];
    let params = [];

    if (action) {
      params.push(`%${action.trim()}%`);
      whereClauses.push(`al.action_type ILIKE $${params.length}`);
    }

    if (table) {
      params.push(table.trim());
      whereClauses.push(`al.table_affected = $${params.length}`);
    }

    if (source === 'triggers') {
      whereClauses.push(`al.user_id IS NULL`);
    } else if (source === 'users') {
      whereClauses.push(`al.user_id IS NOT NULL`);
    }

    const whereSql = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';
    const rowLimit = Math.min(parseInt(limit, 10) || 50, 200);
    params.push(rowLimit);

    const query = `
      SELECT 
        al.log_id AS "Log_ID",
        al.action_type AS "Action_Type",
        al.table_affected AS "Table_Affected",
        al.created_at AS "Created_At",
        al.user_id AS "User_ID",
        ua.email AS "User_Email",
        ua.role AS "User_Role"
      FROM "audit_log" al
      LEFT JOIN "user_account" ua ON al.user_id = ua.user_id
      ${whereSql}
      ORDER BY al.created_at DESC
      LIMIT $${params.length}
    `;

    const result = await pool.query(query, params);
    return res.json({ success: true, count: result.rows.length, logs: result.rows });
  } catch (error) {
    console.error('Fetch audit logs error:', error);
    return res.status(500).json({ success: false, message: 'Database error fetching audit logs: ' + error.message });
  }
});

module.exports = router;
