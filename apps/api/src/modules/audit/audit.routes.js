// apps/api/src/modules/audit/audit.routes.js
const router = require('express').Router();
const prisma = require('../../common/utils/prisma');
const { authenticate } = require('../../common/middleware/auth');

// GET /api/audit — recent activity for the user
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { limit = 30 } = req.query;
    const logs = await prisma.auditLog.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
    });
    res.json(logs);
  } catch (err) { next(err); }
});

module.exports = router;
