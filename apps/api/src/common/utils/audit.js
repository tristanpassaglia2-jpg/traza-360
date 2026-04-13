// apps/api/src/common/utils/audit.js
const prisma = require('./prisma');

async function logAudit(action, userId, details, req) {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        userId: userId || null,
        details: typeof details === 'string' ? details : JSON.stringify(details),
        ipAddress: req?.ip || null,
        userAgent: req?.headers?.['user-agent']?.substring(0, 255) || null,
      },
    });
  } catch (err) {
    console.error('Audit log error:', err.message);
  }
}

module.exports = { logAudit };
