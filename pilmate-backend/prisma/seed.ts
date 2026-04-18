import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding predefined roles...');

  const roles = [
    { roleName: 'Owner' },
    { roleName: 'Manager' },
    { roleName: 'Pharmacist' },
    { roleName: 'Staff' },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { roleName: role.roleName },
      update: {},
      create: role,
    });
    console.log(`  ✅ Role "${role.roleName}" ready`);
  }

  console.log('🌱 Seeding subscription plans...');
  const plans = [
    {
      name: 'Basic',
      price: 0,
      durationMonths: 1,
      maxMedicines: 50,
      maxUsers: 2,
      features: { reports: false, inventory_alerts: true },
    },
    {
      name: 'Professional',
      price: 29.99,
      durationMonths: 1,
      maxMedicines: 1000,
      maxUsers: 10,
      features: { reports: true, inventory_alerts: true },
    },
    {
      name: 'Enterprise',
      price: 99.99,
      durationMonths: 1,
      maxMedicines: 100000,
      maxUsers: 100,
      features: { reports: true, inventory_alerts: true, analytics: true },
    },
  ];

  for (const plan of plans) {
    await prisma.subscriptionPlan.upsert({
      where: { name: plan.name },
      update: plan,
      create: plan,
    });
    console.log(`  ✅ Plan "${plan.name}" ready`);
  }

  console.log('🌱 Seed successful!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });