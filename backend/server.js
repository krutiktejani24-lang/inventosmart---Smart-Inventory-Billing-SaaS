require('dotenv').config();
const express = require('express');
const cors    = require('cors');

const app = express();
const subscriptionRoutes = require('./src/routes/subscriptionRoutes');

const notificationRoutes =
require('./src/routes/notificationRoutes');

const auditLogRoutes =
require('./src/routes/auditLogRoutes');
const paymentRoutes = require("./src/routes/paymentRoutes");  

// ── Core Middleware ───────────────────────────────────────────────────
const allowedOrigins = [
  "http://localhost:5173",
  /\.vercel\.app$/
];

app.use(cors({
  origin: (origin, callback) => {
    if (
      !origin ||
      origin.includes("vercel.app") ||
      origin === "http://localhost:5173"
    ) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Routes ────────────────────────────────────────────────────────────
app.use('/api/auth',      require('./src/routes/authRoutes'));
app.use('/api/products',  require('./src/routes/inventoryRoutes'));
app.use('/api/inventory', require('./src/routes/inventoryRoutes'));
app.use('/api/invoices',  require('./src/routes/billingRoutes'));
app.use('/api/reports',   require('./src/routes/reportRoutes'));
app.use('/api/portal',    require('./src/routes/portalRoutes'));   
app.use('/api/subscriptions', subscriptionRoutes);
app.use(
  '/api/notifications',
  notificationRoutes
);

app.use(
  '/api/auditlogs',
  auditLogRoutes
); 
app.use("/api/payments", paymentRoutes);

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

