require('dotenv').config();
const express = require('express');
const cors    = require('cors');

const app = express();

// ── Core Middleware ───────────────────────────────────────────────────
app.use(cors({
  origin:      process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
  methods:     ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Routes ────────────────────────────────────────────────────────────
app.use('/api/auth',      require('./src/routes/authRoutes'));
app.use('/api/products',  require('./src/routes/inventoryRoutes'));
app.use('/api/inventory', require('./src/routes/inventoryRoutes'));
app.use('/api/invoices',  require('./src/routes/billingRoutes'));
app.use('/api/reports',   require('./src/routes/reportRoutes'));
// CRM — customers + vendors + purchase-orders ekj file ma badhaj che
app.use('/api',           require('./src/routes/crmRoutes'));

// ── Health Check ──────────────────────────────────────────────────────
app.get('/health', (_, res) =>
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
);

// ── 404 Handler ───────────────────────────────────────────────────────
app.use((req, res) =>
  res.status(404).json({ message: `Route ${req.method} ${req.path} not found` })
);

// ── Global Error Handler ──────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Global Error]', err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
  });
});

// ── Start ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`✅ InventoSmart server running → http://localhost:${PORT}`)
);