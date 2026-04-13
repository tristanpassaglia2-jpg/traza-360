// apps/api/src/modules/subscriptions/subscriptions.routes.js
const router = require('express').Router();
const prisma = require('../../common/utils/prisma');
const { authenticate } = require('../../common/middleware/auth');
const { logAudit } = require('../../common/utils/audit');

// GET /api/subscriptions/plans — list available plans
router.get('/plans', async (req, res, next) => {
  try {
    const plans = await prisma.plan.findMany({
      where: { isActive: true },
      include: { features: true },
      orderBy: { priceMonthly: 'asc' },
    });
    res.json(plans);
  } catch (err) { next(err); }
});

// GET /api/subscriptions/me — get current user subscription
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const sub = await prisma.subscription.findUnique({
      where: { userId: req.user.id },
      include: { plan: { include: { features: true } } },
    });
    if (!sub) {
      return res.json({ planId: 'FREE', plan: null });
    }
    res.json(sub);
  } catch (err) { next(err); }
});

// POST /api/subscriptions/upgrade — upgrade plan (placeholder for payment)
router.post('/upgrade', authenticate, async (req, res, next) => {
  try {
    const { planId } = req.body;
    if (!planId) return res.status(400).json({ error: 'planId requerido' });

    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) return res.status(404).json({ error: 'Plan no encontrado' });

    // TODO: integrate real payment provider (Stripe / MercadoPago)
    // For now, upgrade directly
    await prisma.subscription.upsert({
      where: { userId: req.user.id },
      update: { planId, startedAt: new Date(), isActive: true },
      create: { userId: req.user.id, planId, isActive: true },
    });

    await logAudit('SUBSCRIPTION_CHANGED', req.user.id, { planId }, req);
    res.json({ message: 'Plan actualizado', planId });
  } catch (err) { next(err); }
});

// GET /api/subscriptions/check-feature/:feature — check if user has access
router.get('/check-feature/:feature', authenticate, async (req, res, next) => {
  try {
    const sub = await prisma.subscription.findUnique({
      where: { userId: req.user.id },
      include: { plan: { include: { features: true } } },
    });

    const planFeatures = sub?.plan?.features || [];
    const feature = planFeatures.find(f => f.feature === req.params.feature);

    let hasAccess = false;
    if (feature) {
      hasAccess = feature.value === 'true' || feature.value === 'unlimited' || parseInt(feature.value) > 0;
    }

    res.json({ feature: req.params.feature, hasAccess, value: feature?.value || null });
  } catch (err) { next(err); }
});

module.exports = router;
