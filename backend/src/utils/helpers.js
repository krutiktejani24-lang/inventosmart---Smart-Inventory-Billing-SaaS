/**
 * helpers.js — InventoSmart
 * Reusable utility functions
 */

/**
 * Round to 2 decimal places
 */
const round2 = (n) => Math.round(n * 100) / 100;

/**
 * Format number as Indian currency string
 * e.g. 1234567.89 → "12,34,567.89"
 */
const formatINR = (n) =>
  new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n || 0);

/**
 * Generate sequential reference number
 * e.g. prefix=INV, year=2025, count=5 → "INV-2025-0005"
 */
const generateRefNo = (prefix, year, count) =>
  `${prefix}-${year}-${String(count).padStart(4, '0')}`;

/**
 * Paginate — return skip + take for Prisma
 */
const paginate = (page = 1, limit = 20) => ({
  skip: (Number(page) - 1) * Number(limit),
  take: Number(limit),
});

/**
 * Build pagination response meta
 */
const paginationMeta = (total, page, limit) => ({
  total,
  page:       Number(page),
  limit:      Number(limit),
  totalPages: Math.ceil(total / Number(limit)),
});

/**
 * Parse date range from query string
 * Defaults to last 30 days
 */
const parseDateRange = (from, to) => ({
  start: from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  end:   to   ? new Date(new Date(to).setHours(23, 59, 59, 999)) : new Date(),
});

/**
 * Sanitize string — trim + lowercase for search
 */
const sanitize = (str) => (str || '').trim().toLowerCase();

/**
 * Check if a string is a valid GSTIN
 */
const isValidGSTIN = (gstin) =>
  /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gstin || '');

/**
 * Check if a string is a valid Indian mobile number
 */
const isValidPhone = (phone) => /^[6-9]\d{9}$/.test((phone || '').replace(/\D/g, ''));

/**
 * Sleep (for rate limiting / retries)
 */
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

module.exports = {
  round2,
  formatINR,
  generateRefNo,
  paginate,
  paginationMeta,
  parseDateRange,
  sanitize,
  isValidGSTIN,
  isValidPhone,
  sleep,
};