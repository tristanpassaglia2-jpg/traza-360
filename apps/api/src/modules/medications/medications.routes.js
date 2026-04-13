// apps/api/src/modules/medications/medications.routes.js
const router = require('express').Router();
const prisma = require('../../common/utils/prisma');
const { authenticate } = require('../../common/middleware/auth');

// GET /api/medications
router.get('/', authenticate, async (req, res, next) => {
  try {
    const meds = await prisma.medication.findMany({
      where: { userId: req.user.id, isActive: true },
      include: { schedules: { where: { isActive: true } } },
    });
    res.json(meds);
  } catch (err) { next(err); }
});

// POST /api/medications
router.post('/', authenticate, async (req, res, next) => {
  try {
    const med = await prisma.medication.create({
      data: {
        userId: req.user.id,
        name: req.body.name,
        dosage: req.body.dosage,
        notes: req.body.notes,
        schedules: {
          create: (req.body.schedules || []).map(s => ({
            timeOfDay: s.timeOfDay,
            daysOfWeek: s.daysOfWeek,
          })),
        },
      },
      include: { schedules: true },
    });
    res.status(201).json(med);
  } catch (err) { next(err); }
});

// PUT /api/medications/:id
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    await prisma.medication.updateMany({
      where: { id: req.params.id, userId: req.user.id },
      data: { name: req.body.name, dosage: req.body.dosage, notes: req.body.notes },
    });
    res.json({ message: 'Actualizado' });
  } catch (err) { next(err); }
});

// POST /api/medications/:id/dose — confirm a dose
router.post('/:id/dose', authenticate, async (req, res, next) => {
  try {
    const log = await prisma.medicationLog.create({
      data: {
        medicationId: req.params.id,
        scheduledTime: req.body.scheduledTime,
        scheduledDate: new Date(req.body.scheduledDate || new Date().toISOString().split('T')[0]),
        status: 'TAKEN',
        takenAt: new Date(),
      },
    });
    res.status(201).json(log);
  } catch (err) { next(err); }
});

// POST /api/medications/:id/miss — mark missed
router.post('/:id/miss', authenticate, async (req, res, next) => {
  try {
    const log = await prisma.medicationLog.create({
      data: {
        medicationId: req.params.id,
        scheduledTime: req.body.scheduledTime,
        scheduledDate: new Date(req.body.scheduledDate || new Date().toISOString().split('T')[0]),
        status: 'MISSED',
      },
    });
    res.status(201).json(log);
  } catch (err) { next(err); }
});

// GET /api/medications/:id/logs — dose history
router.get('/:id/logs', authenticate, async (req, res, next) => {
  try {
    const logs = await prisma.medicationLog.findMany({
      where: { medicationId: req.params.id },
      orderBy: { scheduledDate: 'desc' },
      take: 30,
    });
    res.json(logs);
  } catch (err) { next(err); }
});

// DELETE /api/medications/:id
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    await prisma.medication.updateMany({
      where: { id: req.params.id, userId: req.user.id },
      data: { isActive: false },
    });
    res.json({ message: 'Medicamento eliminado' });
  } catch (err) { next(err); }
});

module.exports = router;
