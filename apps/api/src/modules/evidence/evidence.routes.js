// apps/api/src/modules/evidence/evidence.routes.js
const router = require('express').Router();
const prisma = require('../../common/utils/prisma');
const { authenticate } = require('../../common/middleware/auth');
const { logAudit } = require('../../common/utils/audit');

// POST /api/evidence — upload evidence metadata
router.post('/', authenticate, async (req, res, next) => {
  try {
    const { type, title, description, fileUrl, fileKey, fileSizeKb, mimeType,
            latitude, longitude, durationSec, alertId } = req.body;

    const item = await prisma.evidenceItem.create({
      data: {
        userId: req.user.id,
        type: type || 'NOTE',
        title,
        description,
        fileUrl,
        fileKey,
        fileSizeKb,
        mimeType,
        latitude,
        longitude,
        durationSec,
        alertId,
        isEncrypted: true,
      },
    });

    await logAudit('EVIDENCE_UPLOADED', req.user.id, { evidenceId: item.id, type }, req);
    res.status(201).json(item);
  } catch (err) { next(err); }
});

// GET /api/evidence
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { type, limit = 20 } = req.query;
    const where = { userId: req.user.id };
    if (type) where.type = type;

    const items = await prisma.evidenceItem.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
    });
    res.json(items);
  } catch (err) { next(err); }
});

// DELETE /api/evidence/:id
router.delete('/:id', authenticate, async (req, res, next) => {
  try {
    const item = await prisma.evidenceItem.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!item) return res.status(404).json({ error: 'No encontrado' });

    // TODO: delete from external storage (S3/Supabase) using item.fileKey
    await prisma.evidenceItem.delete({ where: { id: req.params.id } });
    await logAudit('EVIDENCE_DELETED', req.user.id, { evidenceId: req.params.id }, req);
    res.json({ message: 'Evidencia eliminada' });
  } catch (err) { next(err); }
});

// PATCH /api/evidence/:id/link — associate to alert
router.patch('/:id/link', authenticate, async (req, res, next) => {
  try {
    await prisma.evidenceItem.updateMany({
      where: { id: req.params.id, userId: req.user.id },
      data: { alertId: req.body.alertId },
    });
    res.json({ message: 'Evidencia vinculada a alerta' });
  } catch (err) { next(err); }
});

module.exports = router;
