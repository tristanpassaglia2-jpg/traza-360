// prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ── Plans ──
  await prisma.plan.upsert({
    where: { id: 'FREE' },
    update: {},
    create: {
      id: 'FREE',
      name: 'Gratis',
      description: 'Lo esencial para cuidarte',
      priceMonthly: 0,
      features: {
        create: [
          { feature: 'maxContacts', value: '2' },
          { feature: 'evidenceCloud', value: 'false' },
          { feature: 'fullHistory', value: 'false' },
          { feature: 'extendedTracking', value: 'false' },
          { feature: 'camouflage', value: 'false' },
          { feature: 'unlimitedReminders', value: 'false' },
          { feature: 'familyPanel', value: 'false' },
          { feature: 'maxReminders', value: '5' },
          { feature: 'maxMedications', value: '3' },
          { feature: 'historyDays', value: '7' },
        ],
      },
    },
  });

  await prisma.plan.upsert({
    where: { id: 'PREMIUM_PERSONAL' },
    update: {},
    create: {
      id: 'PREMIUM_PERSONAL',
      name: 'Premium Personal',
      description: 'Más seguimiento, más respaldo',
      priceMonthly: 4.99,
      features: {
        create: [
          { feature: 'maxContacts', value: 'unlimited' },
          { feature: 'evidenceCloud', value: 'true' },
          { feature: 'fullHistory', value: 'true' },
          { feature: 'extendedTracking', value: 'true' },
          { feature: 'camouflage', value: 'true' },
          { feature: 'unlimitedReminders', value: 'true' },
          { feature: 'familyPanel', value: 'false' },
          { feature: 'maxReminders', value: 'unlimited' },
          { feature: 'maxMedications', value: 'unlimited' },
          { feature: 'historyDays', value: '365' },
        ],
      },
    },
  });

  await prisma.plan.upsert({
    where: { id: 'PREMIUM_FAMILIAR' },
    update: {},
    create: {
      id: 'PREMIUM_FAMILIAR',
      name: 'Premium Familiar',
      description: 'Para cuidarte en red',
      priceMonthly: 9.99,
      features: {
        create: [
          { feature: 'maxContacts', value: 'unlimited' },
          { feature: 'evidenceCloud', value: 'true' },
          { feature: 'fullHistory', value: 'true' },
          { feature: 'extendedTracking', value: 'true' },
          { feature: 'camouflage', value: 'true' },
          { feature: 'unlimitedReminders', value: 'true' },
          { feature: 'familyPanel', value: 'true' },
          { feature: 'maxReminders', value: 'unlimited' },
          { feature: 'maxMedications', value: 'unlimited' },
          { feature: 'historyDays', value: '365' },
          { feature: 'maxCaregivers', value: '5' },
          { feature: 'maxProtected', value: '5' },
        ],
      },
    },
  });

  // ── Feature Flags ──
  const flags = [
    { key: 'geofences_enabled', value: false, description: 'Geocercas habilitadas (próximamente)' },
    { key: 'biometric_auth', value: false, description: 'Autenticación biométrica' },
    { key: 'whatsapp_notifications', value: false, description: 'Notificaciones por WhatsApp' },
    { key: 'sms_notifications', value: false, description: 'Notificaciones por SMS' },
    { key: 'sound_monitoring', value: false, description: 'Monitoreo de sonido ambiental' },
  ];

  for (const flag of flags) {
    await prisma.featureFlag.upsert({
      where: { key: flag.key },
      update: {},
      create: flag,
    });
  }

  console.log('✅ Seed complete');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
