// apps/api/src/modules/contacts/contacts.routes.js
const router = require('express').Router();
const prisma = require('../../common/utils/prisma');
const { authenticate } = require('../../common/middleware/auth');

// GET /api/contacts
router.get('/', authenticate, async (req, res, next) => {
  try {
    const contacts = await prisma.contact.findMany({
      where: { userId: req.user.id, isActive: true },
      orderBy: { priority: 'asc' },
    });
    res.json(contacts);
  } catch (err) { next(err); }
});

// POST /api/contacts
router.post('/', authenticate, async (req, res, next) => {
  try {
    // Check plan limits
    const sub = await prisma.subscription.findUnique({ where: { userId: req.user.id }, include: { plan: { include: { features: true } } } });
    const maxFeature = sub?.plan?.features?.find(f => f.feature === 'maxContacts');
    const maxContacts = maxFeature ? parseInt(maxFeature.value) : 2;

    const count = await prisma.contact.count({ where: { userId: req.user.id, isActive: true } });
    if (count >= maxContacts) {
      return res.status(403).json({ error: 'Límite de contactos alcanzado', upgrade: true });
    }

    const contact = await prisma.contact.create({
      data: {
        userId: req.user.id,
        name: req.body.name,
        relation: req.body.relation || 'OTRO',
        phone: req.body.phone,
        email: req.body.email,
        whatsapp: req.body.whatsapp,
        priority: req.body.priority || count + 1,
        receivesAlerts: req.body.receivesAlerts ?? true,
        receivesLocation: req.body.receivesLocation ?? false,
        receivesLastSignal: req.body.receivesLastSignal ?? false,
        receivesCheckins: req.body.receivesCheckins ?? false,
        receivesMedication: req.body.receivesMedication ?? false,
      },
    });
    res.status(201).json(contact);
  } catch (err) { next(err); }
});

// PUT /api/contacts/:id
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const contact = await prisma.contact.updateMany({
      where: { id: req.params.id, userId: req.user.id },
      data: {
        name: req.body.name,
        relation: req.body.relation,
        phone: req.body.phone,
        email: req.body.email,
        whatsapp: req.body.whatsapp,
        priority: req.body.priority,
        receivesAlerts: req.body.receivesAlerts,
        receivesLocation: req.body.receivesLocation,
        receivesLastSignal: req.body.receivesLastSignal,
        receivesCheckins: req.body.receivesCheckins,
        receivesMedication: req.body.receivesMedication,
      },
    });
    res.json({ updated: contact.count });
  } catch (err) { next(err); }
});

// DELETE /api/contacts/:id
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    await prisma.contact.updateMany({
      where: { id: req.params.id, userId: req.user.id },
      data: { isActive: false },
    });
    res.json({ message: 'Contacto eliminado' });
  } catch (err) { next(err); }
});

module.exports = router;
