const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');
const { authenticate, JWT_SECRET } = require('../middleware/auth');

// POST /api/auth/register
// Registers a new user account and creates an initial passenger profile if passenger details are provided
router.post('/register', async (req, res) => {
  const { email, password, name, age, gender } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check if email already exists
    const existing = await client.query('SELECT "user_id" FROM "user_account" WHERE LOWER("email") = LOWER($1)', [email.trim()]);
    if (existing.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Insert user
    const userResult = await client.query(
      'INSERT INTO "user_account" ("email", "password_hash", "role") VALUES ($1, $2, $3) RETURNING "user_id"',
      [email.toLowerCase().trim(), passwordHash, 'PASSENGER']
    );

    const userId = userResult.rows[0].user_id;

    // Create passenger profile if name is provided
    let passengerId = null;
    if (name && name.trim()) {
      const passengerResult = await client.query(
        'INSERT INTO "passenger" ("user_id", "name", "age", "gender") VALUES ($1, $2, $3, $4) RETURNING "passenger_id"',
        [userId, name.trim(), parseInt(age, 10) || 25, gender || 'OTHER']
      );
      passengerId = passengerResult.rows[0].passenger_id;
    }

    // Log registration in Audit_Log
    await client.query(
      'INSERT INTO "audit_log" ("action_type", "table_affected", "user_id") VALUES ($1, $2, $3)',
      ['USER_REGISTERED', 'User_Account', userId]
    );

    await client.query('COMMIT');

    const token = jwt.sign(
      { userId, email: email.toLowerCase().trim(), role: 'PASSENGER' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      success: true,
      message: 'Registration successful!',
      token,
      user: {
        userId,
        email: email.toLowerCase().trim(),
        role: 'PASSENGER',
        passenger: name ? { passengerId, name: name.trim(), age: parseInt(age, 10) || 25, gender: gender || 'OTHER' } : null
      }
    });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('Registration error:', error);
    return res.status(500).json({ success: false, message: 'Database error during registration: ' + error.message });
  } finally {
    client.release();
  }
});

// POST /api/auth/login
// Verifies user credentials and generates JWT token
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required.' });
  }

  try {
    const result = await pool.query(
      'SELECT "user_id", "email", "password_hash", "role", "created_at" FROM "user_account" WHERE LOWER("email") = LOWER($1)',
      [email.trim()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const user = result.rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    // Fetch passenger profile if present
    const passengerResult = await pool.query(
      'SELECT "passenger_id", "name", "age", "gender" FROM "passenger" WHERE "user_id" = $1 LIMIT 1',
      [user.user_id]
    );

    // Audit log
    await pool.query(
      'INSERT INTO "audit_log" ("action_type", "table_affected", "user_id") VALUES ($1, $2, $3)',
      [user.role === 'ADMIN' ? 'ADMIN_LOGIN' : 'USER_LOGIN', 'User_Account', user.user_id]
    ).catch(() => {});

    const token = jwt.sign(
      { userId: user.user_id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      success: true,
      message: 'Login successful!',
      token,
      user: {
        userId: user.user_id,
        email: user.email,
        role: user.role,
        passenger: passengerResult.rows.length > 0 ? passengerResult.rows[0] : null
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'Database error during login: ' + error.message });
  }
});

// GET /api/auth/me
// Returns current authenticated user and profile information
router.get('/me', authenticate, async (req, res) => {
  try {
    const users = await pool.query(
      'SELECT "user_id", "email", "role", "created_at" FROM "user_account" WHERE "user_id" = $1',
      [req.user.userId]
    );

    if (users.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const passengers = await pool.query(
      'SELECT "passenger_id", "name", "age", "gender" FROM "passenger" WHERE "user_id" = $1',
      [req.user.userId]
    );

    return res.json({
      success: true,
      user: {
        userId: users.rows[0].user_id,
        email: users.rows[0].email,
        role: users.rows[0].role,
        passengers: passengers.rows
      }
    });
  } catch (error) {
    console.error('Auth /me error:', error);
    return res.status(500).json({ success: false, message: 'Database error: ' + error.message });
  }
});

module.exports = router;
