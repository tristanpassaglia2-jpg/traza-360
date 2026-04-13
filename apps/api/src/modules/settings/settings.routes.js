// apps/api/src/modules/settings/settings.routes.js
const router = require('express').Router();
const prisma = require('../../common/utils/prisma');
const { authenticate } = require('../../common/middleware/auth');
const { logAudit } = require('../../common/utils/audit');

// GET /api/settings — get all user settings
router.get('/', authenticate, async (req, res, next) => {
  try {
    const settings = await prisma.appSetting.findMany({
      where: { userId: req.user.id },
    });
    // Convert to key-value object
    const obj = {};
    settings.forEach(s => { obj[s.key] = s.value; });
    res.json(obj);
  } catch (err) { next(err); }
});

// PUT /api/settings — update settings (batch)
router.put('/', authenticate, async (req, res, next) => {
  try {
    const entries = Object.entries(req.body);
    const ops = entries.map(([key, value]) =>
      prisma.appSetting.upsert({
        where: { userId_key: { userId: req.user.id, key } },
        update: { value: String(value) },
        create: { userId: req.user.id, key, value: String(value) },
      })
    );
    await prisma.$transaction(ops);
    await logAudit('SETTINGS_CHANGED', req.user.id, { keys: entries.map(e => e[0]) }, req);
    res.json({ message: 'Configuración actualizada' });
  } catch (err) { next(err); }
});

// GET /api/settings/profile — get full profile
router.get('/profile', authenticate, async (req, res, next) => {
  try {
    const profile = await prisma.userProfile.findUnique({
      where: { userId: req.user.id },
    });
    res.json(profile || {});
  } catch (err) { next(err); }
});

// PUT /api/settings/profile — update profile
router.put('/profile', authenticate, async (req, res, next) => {
  try {
    const profile = await prisma.userProfile.upsert({
      where: { userId: req.user.id },
      update: {
        displayName: req.body.displayName,
        phone: req.body.phone,
        birthDate: req.body.birthDate ? new Date(req.body.birthDate) : undefined,
        primaryModule: req.body.primaryModule,
        medicalNotes: req.body.medicalNotes,
        homeAddress: req.body.homeAddress,
        homeLat: req.body.homeLat,
        homeLng: req.body.homeLng,
      },
      create: {
        userId: req.user.id,
        displayName: req.body.displayName,
        phone: req.body.phone,
      },
    });
    res.json(profile);
  } catch (err) { next(err); }
});

module.exports = router;
