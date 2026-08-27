import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Apple App Review demo account for the customer app.
// Sign in via "Use email instead" with demo@groomlinkgh.com + code 123456
// (fixed-code bypass lives in src/controllers/auth.controller.ts).
// Email-only on purpose: App Review must never be forced to provide a
// phone number (App Store guideline 5.1.1(v)).
async function main() {
  const user = await prisma.user.upsert({
    where: { email: 'demo@groomlinkgh.com' },
    update: {
      firstName: 'Demo',
      lastName: 'Reviewer',
      role: 'CUSTOMER',
      status: 'ACTIVE',
      isVerified: true,
    },
    create: {
      email: 'demo@groomlinkgh.com',
      firstName: 'Demo',
      lastName: 'Reviewer',
      role: 'CUSTOMER',
      status: 'ACTIVE',
      isVerified: true,
      city: 'Accra',
      region: 'Greater Accra',
    },
  });

  console.log(`Demo review user ready: ${user.email} (id ${user.id}, role ${user.role})`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
