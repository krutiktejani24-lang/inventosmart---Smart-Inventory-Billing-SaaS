const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { validationResult } = require('express-validator');

const prisma = new PrismaClient();

/**
 * Token generate karo
 * @param {string} userId
 * @param {string} businessId
 * @param {string} role
 * @returns {string} JWT token
 */
const generateToken = (userId, businessId, role) =>
  jwt.sign(
    { userId, businessId, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );

/* ─────────────────────────────────────────────────────────────────────
   POST /api/auth/register
   New business + ADMIN user create karo
───────────────────────────────────────────────────────────────────── */
const register = async (req, res) => {
  try {
    // Validation errors check
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(422).json({ message: 'Validation failed', errors: errors.array() });

    const { businessName, gstin, phone, address, email, password, name } = req.body;

    // Email already exist che?
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser)
      return res.status(409).json({ message: 'Email already registered' });

    // Password hash karo
    const hashedPassword = await bcrypt.hash(password, 12);

    // Business + Admin user ek saath Prisma transaction ma banavo
    const result = await prisma.$transaction(async (tx) => {
      const business = await tx.business.create({
        data: {
          name: businessName,
          gstin: gstin || null,
          phone: phone || null,
          address: address || null,
          email,
        },
      });

      const user = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role: 'ADMIN',
          business_id: business.id,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          business_id: true,
          created_at: true,
        },
      });

      return { business, user };
    });

    const token = generateToken(result.user.id, result.business.id, result.user.role);

    return res.status(201).json({
      message: 'Registration successful',
      token,
      user: result.user,
      business: {
        id: result.business.id,
        name: result.business.name,
        gstin: result.business.gstin,
      },
    });
  } catch (err) {
    console.error('[register]', err);
    return res.status(500).json({ message: 'Server error during registration' });
  }
};

/* ─────────────────────────────────────────────────────────────────────
   POST /api/auth/login
   Email + password check karo, JWT return karo
───────────────────────────────────────────────────────────────────── */
const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(422).json({ message: 'Validation failed', errors: errors.array() });

    const { email, password } = req.body;

    // User + business sathe fetch karo
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        business: {
          select: { id: true, name: true, gstin: true, logo_url: true },
        },
      },
    });

    if (!user)
      return res.status(401).json({ message: 'Invalid email or password' });

    if (!user.is_active)
      return res.status(403).json({ message: 'Account is deactivated. Contact admin.' });

    // Password match check
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ message: 'Invalid email or password' });

    const token = generateToken(user.id, user.business_id, user.role);

    return res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        business_id: user.business_id,
      },
      business: user.business,
    });
  } catch (err) {
    console.error('[login]', err);
    return res.status(500).json({ message: 'Server error during login' });
  }
};

/* ─────────────────────────────────────────────────────────────────────
   POST /api/auth/logout
   Client side token remove kare — server stateless che
───────────────────────────────────────────────────────────────────── */
const logout = async (req, res) => {
  // JWT stateless — client localStorage/cookie clear kare
  return res.status(200).json({ message: 'Logged out successfully' });
};

/* ─────────────────────────────────────────────────────────────────────
   GET /api/auth/me
   Current logged-in user info return karo
───────────────────────────────────────────────────────────────────── */
const getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        is_active: true,
        created_at: true,
        business: {
          select: {
            id: true,
            name: true,
            gstin: true,
            phone: true,
            address: true,
            logo_url: true,
            plan: true,
          },
        },
      },
    });

    if (!user)
      return res.status(404).json({ message: 'User not found' });

    return res.status(200).json({ user });
  } catch (err) {
    console.error('[getMe]', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

/* ─────────────────────────────────────────────────────────────────────
   POST /api/auth/change-password  (bonus)
───────────────────────────────────────────────────────────────────── */
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch)
      return res.status(400).json({ message: 'Current password is incorrect' });

    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: req.user.userId },
      data: { password: hashed },
    });

    return res.status(200).json({ message: 'Password changed successfully' });
  } catch (err) {
    console.error('[changePassword]', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { register, login, logout, getMe, changePassword };