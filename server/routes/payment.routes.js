const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');

// GET /api/payments
router.get('/', authenticate, async (req, res) => {
  try {
    let query = `
      SELECT 
        p.transaction_id AS "Transaction_ID",
        p.pnr AS "PNR",
        p.amount AS "Amount",
        p.payment_status AS "Payment_Status",
        p.timestamp AS "Timestamp",
        th.user_id AS "User_ID",
        ua.email AS "Payer_Email",
        t.name AS "Train_Name",
        TO_CHAR(tr.service_date, 'YYYY-MM-DD') AS "Service_Date"
      FROM "payment" p
      JOIN "ticket_header" th ON p.pnr = th.pnr
      JOIN "user_account" ua ON th.user_id = ua.user_id
      JOIN "train_run" tr ON th.run_id = tr.run_id
      JOIN "train" t ON tr.train_id = t.train_id
    `;

    const params = [];
    if (req.user.role !== 'ADMIN') {
      params.push(req.user.userId);
      query += ` WHERE th.user_id = $${params.length}`;
    }

    query += ' ORDER BY p.timestamp DESC LIMIT 100';

    const result = await pool.query(query, params);
    return res.json({ success: true, count: result.rows.length, payments: result.rows });
  } catch (error) {
    console.error('Fetch payments error:', error);
    return res.status(500).json({ success: false, message: 'Database error fetching payments: ' + error.message });
  }
});

// POST /api/payments/retry
router.post('/retry', authenticate, async (req, res) => {
  const { pnr, amount, simulateFailure } = req.body;

  if (!pnr) {
    return res.status(400).json({ success: false, message: 'PNR is required for payment retry.' });
  }

  try {
    const header = await pool.query('SELECT "pnr", "user_id", "total_amount" FROM "ticket_header" WHERE "pnr" = $1', [pnr]);
    if (header.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Ticket not found for this PNR.' });
    }

    if (req.user.role !== 'ADMIN' && header.rows[0].user_id !== req.user.userId) {
      return res.status(403).json({ success: false, message: 'Unauthorized.' });
    }

    const payAmount = amount || header.rows[0].total_amount;
    const paymentStatus = simulateFailure ? 'FAILED' : 'SUCCESS';

    const result = await pool.query(
      'INSERT INTO "payment" ("pnr", "amount", "payment_status", "timestamp") VALUES ($1, $2, $3, CURRENT_TIMESTAMP) RETURNING "transaction_id"',
      [pnr, payAmount, paymentStatus]
    );

    return res.status(201).json({
      success: paymentStatus === 'SUCCESS',
      message: paymentStatus === 'SUCCESS' ? 'Payment processed successfully!' : 'Payment attempt declined by simulated bank.',
      transactionId: result.rows[0].transaction_id,
      pnr,
      status: paymentStatus
    });
  } catch (error) {
    console.error('Payment retry error:', error);
    return res.status(500).json({ success: false, message: 'Database error: ' + error.message });
  }
});

module.exports = router;
