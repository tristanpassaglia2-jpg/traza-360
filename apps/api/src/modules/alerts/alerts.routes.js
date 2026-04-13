// apps/api/src/modules/alerts/alerts.routes.js
const router = require('express').Router();
const prisma = require('../../common/utils/prisma');
const { authenticate } = require('../../common/middleware/auth');
const { logAudit } = require('../../common/utils/audit');

// POST /api/alerts — create any alert type
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { type, latitude, longitude, address, notes, module } = req.body;

    // Get user's alert-receiving contacts
    const contacts = await prisma.contact.findMany({
      where: { userId: req.user.id, isActive: true, receivesAlerts: true },
    });

    const alert = await prisma.alert.create({
      data: {
        userId: req.user.id,
        type: type || 'PANIC',
        latitude,
        longitude,
        address,
        notes,
        module,
        recipients: {
          create: contacts.map(c => ({ contactId: c.id })),
        },
      },
      include: { recipients: { include: { contact: true } } },
    });

    await logAudit('ALERT_CREATED', req.user.id, { type, alertId: alert.id }, req);

    // TODO: send notifications (push, SMS, WhatsApp) to recipients
    // This is where you'd integrate Twilio, Firebase Cloud Messaging, etc.

    res.status(201).json(alert);
  } catch (err) { next(err); }
});

// GET /api/alerts — list user's alerts
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { limit = 20, offset = 0, status } = req.query;
    const where = { userId: req.user.id };
    if (status) where.status = status;

    const alerts = await prisma.alert.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset),
      include: {
        recipients: { include: { contact: { select: { name: true } } } },
        _count: { select: { evidence: true } },
      },
    });
    res.json(alerts);
  } catch (err) { next(err); }
});

// GET /api/alerts/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const alert = await prisma.alert.findFirst({
      where: { id: req.params.id, userId: req.user.id },
      include: {
        recipients: { include: { contact: true } },
        evidence: true,
      },
    });
    if (!alert) return res.status(404).json({ error: 'Alerta no encontrada' });
    res.json(alert);
  } catch (err) { next(err); }
});

// PATCH /api/alerts/:id/resolve
router.patch('/:id/resolve', authenticate, async (req, res, next) => {
  try {
    const alert = await prisma.alert.updateMany({
      where: { id: req.params.id, userId: req.user.id },
      data: { status: 'RESOLVED', resolvedAt: new Date() },
    });
    await logAudit('ALERT_RESOLVED', req.user.id, { alertId: req.params.id }, req);
    res.json({ resolved: alert.count > 0 });
  } catch (err) { next(err); }
});

module.exports = router;
