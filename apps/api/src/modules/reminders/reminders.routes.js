// apps/api/src/modules/reminders/reminders.routes.js
const router = require('express').Router();
const prisma = require('../../common/utils/prisma');
const { authenticate } = require('../../common/middleware/auth');

// GET /api/reminders
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { module, status } = req.query;
    const where = { userId: req.user.id };
    if (module) where.module = module;
    if (status) where.status = status;

    const reminders = await prisma.reminder.findMany({
      where,
      orderBy: { scheduledAt: 'asc' },
    });
    res.json(reminders);
  } catch (err) { next(err); }
});

// POST /api/reminders
router.post('/', authenticate, async (req, res, next) => {
  try {
    const reminder = await prisma.reminder.create({
      data: {
        userId: req.user.id,
        title: req.body.title,
        description: req.body.description,
        emoji: req.body.emoji,
        scheduledAt: new Date(req.body.scheduledAt),
        repeatRule: req.body.repeatRule || 'NONE',
        module: req.body.module,
      },
    });
    res.status(201).json(reminder);
  } catch (err) { next(err); }
});

// PUT /api/reminders/:id
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const reminder = await prisma.reminder.updateMany({
      where: { id: req.params.id, userId: req.user.id },
      data: {
        title: req.body.title,
        description: req.body.description,
        emoji: req.body.emoji,
        scheduledAt: req.body.scheduledAt ? new Date(req.body.scheduledAt) : undefined,
        repeatRule: req.body.repeatRule,
      },
    });
    res.json({ updated: reminder.count });
  } catch (err) { next(err); }
});

// PATCH /api/reminders/:id/complete
router.patch('/:id/complete', authenticate, async (req, res, next) => {
  try {
    await prisma.reminder.updateMany({
      where: { id: req.params.id, userId: req.user.id },
      data: { status: 'DONE', completedAt: new Date() },
    });
    await prisma.reminderLog.create({
      data: { reminderId: req.params.id, action: 'COMPLETED' },
    });
    res.json({ message: 'Completado' });
  } catch (err) { next(err); }
});

// PATCH /api/reminders/:id/snooze
router.patch('/:id/snooze', authenticate, async (req, res, next) => {
  try {
    const snoozeTo = new Date(Date.now() + (req.body.minutes || 15) * 60 * 1000);
    await prisma.reminder.updateMany({
      where: { id: req.params.id, userId: req.user.id },
      data: { status: 'SNOOZED', snoozedTo: snoozeTo },
    });
    await prisma.reminderLog.create({
      data: { reminderId: req.params.id, action: 'SNOOZED' },
    });
    res.json({ message: 'Pospuesto', snoozedTo: snoozeTo });
  } catch (err) { next(err); }
});

// DELETE /api/reminders/:id
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    await prisma.reminder.deleteMany({ where: { id: req.params.id, userId: req.user.id } });
    res.json({ message: 'Eliminado' });
  } catch (err) { next(err); }
});

module.exports = router;
