// apps/api/src/modules/auth/auth.routes.js
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../../common/utils/prisma');
const { authenticate } = require('../../common/middleware/auth');
const { logAudit } = require('../../common/utils/audit');

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const { email, password, displayName, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son obligatorios' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    }

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      return res.status(409).json({ error: 'Ya existe una cuenta con ese email' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        role: role === 'CAREGIVER' ? 'CAREGIVER' : 'PROTECTED',
        profile: {
          create: { displayName: displayName || email.split('@')[0] },
        },
        subscription: {
          create: { planId: 'FREE' },
        },
      },
      include: { profile: true },
    });

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });

    await logAudit('LOGIN', user.id, 'Registro exitoso', req);

    res.status(201).json({
      user: { id: user.id, email: user.email, role: user.role, displayName: user.profile?.displayName },
      token,
    });
  } catch (err) { next(err); }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña requeridos' });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { profile: true, subscription: { include: { plan: true } } },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });

    await logAudit('LOGIN', user.id, 'Login exitoso', req);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        displayName: user.profile?.displayName,
        plan: user.subscription?.plan?.id || 'FREE',
      },
      token,
    });
  } catch (err) { next(err); }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        profile: true,
        subscription: { include: { plan: true } },
      },
    });

    res.json({
      id: user.id,
      email: user.email,
      role: user.role,
      displayName: user.profile?.displayName,
      phone: user.profile?.phone,
      primaryModule: user.profile?.primaryModule,
      homeAddress: user.profile?.homeAddress,
      homeLat: user.profile?.homeLat,
      homeLng: user.profile?.homeLng,
      plan: user.subscription?.plan?.id || 'FREE',
    });
  } catch (err) { next(err); }
});

// POST /api/auth/logout
router.post('/logout', authenticate, async (req, res) => {
  await logAudit('LOGOUT', req.user.id, null, req);
  res.json({ message: 'Sesión cerrada' });
});

module.exports = router;
