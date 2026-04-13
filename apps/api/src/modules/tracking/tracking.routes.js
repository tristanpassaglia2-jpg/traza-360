// apps/api/src/modules/tracking/tracking.routes.js
const router = require('express').Router();
const prisma = require('../../common/utils/prisma');
const { authenticate } = require('../../common/middleware/auth');
const { logAudit } = require('../../common/utils/audit');

// POST /api/tracking/start — start a tracking session
router.post('/start', authenticate, async (req, res, next) => {
  try {
    const { type, destination, destLat, destLng, durationMin, latitude, longitude } = req.body;

    const session = await prisma.locationSession.create({
      data: {
        userId: req.user.id,
        type: type || 'ROUTE',
        destination,
        destLat,
        destLng,
        durationMin,
        expiresAt: durationMin ? new Date(Date.now() + durationMin * 60 * 1000) : null,
        points: latitude ? {
          create: [{ latitude, longitude, battery: req.body.battery, networkType: req.body.networkType }],
        } : undefined,
      },
    });

    await logAudit('TRACKING_STARTED', req.user.id, { sessionId: session.id, type }, req);
    res.status(201).json(session);
  } catch (err) { next(err); }
});

// POST /api/tracking/:sessionId/point — push a location point
router.post('/:sessionId/point', authenticate, async (req, res, next) => {
  try {
    const point = await prisma.locationPoint.create({
      data: {
        sessionId: req.params.sessionId,
        latitude: req.body.latitude,
        longitude: req.body.longitude,
        accuracy: req.body.accuracy,
        battery: req.body.battery,
        networkType: req.body.networkType,
      },
    });
    res.status(201).json(point);
  } catch (err) { next(err); }
});

// POST /api/tracking/:sessionId/stop — stop a session
router.post('/:sessionId/stop', authenticate, async (req, res, next) => {
  try {
    await prisma.locationSession.updateMany({
      where: { id: req.params.sessionId, userId: req.user.id },
      data: { status: 'COMPLETED', endedAt: new Date() },
    });
    await logAudit('TRACKING_STOPPED', req.user.id, { sessionId: req.params.sessionId }, req);
    res.json({ message: 'Trayecto finalizado' });
  } catch (err) { next(err); }
});

// GET /api/tracking/last-signal — get user's last known location
router.get('/last-signal', authenticate, async (req, res, next) => {
  try {
    const point = await prisma.locationPoint.findFirst({
      where: { session: { userId: req.user.id } },
      orderBy: { recordedAt: 'desc' },
      include: { session: { select: { type: true, destination: true } } },
    });

    if (!point) {
      return res.json({ available: false });
    }

    res.json({
      available: true,
      latitude: point.latitude,
      longitude: point.longitude,
      battery: point.battery,
      networkType: point.networkType,
      recordedAt: point.recordedAt,
      sessionType: point.session?.type,
      destination: point.session?.destination,
    });
  } catch (err) { next(err); }
});

// GET /api/tracking/active — get active sessions
router.get('/active', authenticate, async (req, res, next) => {
  try {
    const sessions = await prisma.locationSession.findMany({
      where: { userId: req.user.id, status: 'ACTIVE' },
      include: { points: { orderBy: { recordedAt: 'desc' }, take: 1 } },
    });
    res.json(sessions);
  } catch (err) { next(err); }
});

// GET /api/tracking/history — recent sessions
router.get('/history', authenticate, async (req, res, next) => {
  try {
    const sessions = await prisma.locationSession.findMany({
      where: { userId: req.user.id },
      orderBy: { startedAt: 'desc' },
      take: 20,
      include: { _count: { select: { points: true } } },
    });
    res.json(sessions);
  } catch (err) { next(err); }
});

module.exports = router;
