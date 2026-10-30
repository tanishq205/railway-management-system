const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const { testConnection } = require('./db');

dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// Health check endpoint with PostgreSQL connectivity report
app.get('/api/health', async (req, res) => {
  const dbStatus = await testConnection();
  return res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    database: dbStatus
  });
});

// Mount modular API routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/stations', require('./routes/station.routes'));
app.use('/api/trains', require('./routes/train.routes'));
app.use('/api/routes', require('./routes/route.routes'));
app.use('/api/coaches', require('./routes/coach.routes'));
app.use('/api/runs', require('./routes/run.routes'));
app.use('/api/bookings', require('./routes/booking.routes'));
app.use('/api/payments', require('./routes/payment.routes'));
app.use('/api/admin', require('./routes/admin.routes'));
app.use('/api/audit-logs', require('./routes/audit.routes'));

// Serve static frontend build in production
const clientDistPath = path.join(__dirname, '../client/dist');
const publicDistPath = path.join(__dirname, 'public');

if (require('fs').existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.originalUrl.startsWith('/api')) return next();
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
} else if (require('fs').existsSync(publicDistPath)) {
  app.use(express.static(publicDistPath));
  app.get('*', (req, res, next) => {
    if (req.originalUrl.startsWith('/api')) return next();
    res.sendFile(path.join(publicDistPath, 'index.html'));
  });
}

// 404 handler for unmatched API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found.` });
});

// Centralized error handling
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Start Express server
const server = app.listen(PORT, async () => {
  console.log('========================================================');
  console.log(`🚄 Railway Management System Backend (Supabase PostgreSQL)`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`⏰ Time: ${new Date().toLocaleString()}`);

  const dbStatus = await testConnection();
  if (dbStatus.connected) {
    console.log(`✅ Supabase PostgreSQL Connected: ${dbStatus.database} (${dbStatus.version})`);
  } else {
    console.warn(`⚠️  Database Offline: ${dbStatus.message}`);
    console.warn(`💡 Tip: ${dbStatus.suggestion}`);
  }
  console.log('========================================================');
});

module.exports = { app, server };
