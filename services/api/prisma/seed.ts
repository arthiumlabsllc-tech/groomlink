import { PrismaClient, UserRole, SalonType, SalonStatus, BookingStatus, PaymentStatus, PaymentProvider } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { phoneNumber: '+233200000000' },
    update: {},
    create: {
      phoneNumber: '+233200000000',
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@groomlink.com',
      password: adminPassword,
      role: UserRole.ADMIN,
      isVerified: true,
      status: 'ACTIVE',
    },
  });
  console.log('✅ Admin user created:', admin.id);

  // Create sample salon owner
  const ownerPassword = await bcrypt.hash('owner123', 12);
  const owner = await prisma.user.upsert({
    where: { phoneNumber: '+233241234567' },
    update: {},
    create: {
      phoneNumber: '+233241234567',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      password: ownerPassword,
      role: UserRole.SALON_OWNER,
      isVerified: true,
      status: 'ACTIVE',
    },
  });
  console.log('✅ Salon owner created:', owner.id);

  // Create sample customer
  const customerPassword = await bcrypt.hash('customer123', 12);
  const customer = await prisma.user.upsert({
    where: { phoneNumber: '+233249876543' },
    update: {},
    create: {
      phoneNumber: '+233249876543',
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane@example.com',
      password: customerPassword,
      role: UserRole.CUSTOMER,
      isVerified: true,
      status: 'ACTIVE',
    },
  });
  console.log('✅ Customer created:', customer.id);

  // Create sample salons
  const salon1 = await prisma.salon.upsert({
    where: { id: 'salon-1' },
    update: {},
    create: {
      id: 'salon-1',
      name: 'Elite Barbershop',
      description: 'Premium barbershop in the heart of Accra',
      type: SalonType.BARBERSHOP,
      status: SalonStatus.APPROVED,
      phoneNumber: '+233302123456',
      email: 'elite@example.com',
      address: '123 Independence Avenue',
      city: 'Accra',
      region: 'Greater Accra',
      latitude: 5.6037,
      longitude: -0.1870,
      openingTime: '08:00',
      closingTime: '20:00',
      workingDays: ['1', '2', '3', '4', '5', '6'], // Mon-Sat
      hasParking: true,
      hasWifi: true,
      hasAC: true,
      acceptsWalkIns: true,
      rating: 4.5,
      reviewCount: 12,
      ownerId: owner.id,
    },
  });
  console.log('✅ Salon 1 created:', salon1.id);

  const salon2 = await prisma.salon.upsert({
    where: { id: 'salon-2' },
    update: {},
    create: {
      id: 'salon-2',
      name: 'Glamour Hair Studio',
      description: 'Professional hair styling and treatments',
      type: SalonType.HAIR_SALON,
      status: SalonStatus.APPROVED,
      phoneNumber: '+233302789012',
      email: 'glamour@example.com',
      address: '456 Oxford Street, Osu',
      city: 'Accra',
      region: 'Greater Accra',
      latitude: 5.6148,
      longitude: -0.1760,
      openingTime: '09:00',
      closingTime: '19:00',
      workingDays: ['1', '2', '3', '4', '5', '6'],
      hasParking: false,
      hasWifi: true,
      hasAC: true,
      acceptsWalkIns: false,
      rating: 4.8,
      reviewCount: 8,
      ownerId: owner.id,
    },
  });
  console.log('✅ Salon 2 created:', salon2.id);

  // Create workers
  const worker1 = await prisma.worker.create({
    data: {
      firstName: 'Michael',
      lastName: 'Brown',
      phoneNumber: '+233201111111',
      bio: 'Expert barber with 10 years experience',
      specialties: ['Haircuts', 'Beard Trimming', 'Hot Towel Shave'],
      yearsOfExperience: 10,
      rating: 4.9,
      reviewCount: 25,
      salonId: salon1.id,
    },
  });
  console.log('✅ Worker 1 created:', worker1.id);

  const worker2 = await prisma.worker.create({
    data: {
      firstName: 'Sarah',
      lastName: 'Johnson',
      phoneNumber: '+233202222222',
      bio: 'Master stylist specializing in braids and weaves',
      specialties: ['Braids', 'Weaves', 'Hair Treatment'],
      yearsOfExperience: 8,
      rating: 4.7,
      reviewCount: 18,
      salonId: salon2.id,
    },
  });
  console.log('✅ Worker 2 created:', worker2.id);

  // Create services
  const service1 = await prisma.service.create({
    data: {
      name: 'Classic Haircut',
      description: 'Traditional haircut with precision styling',
      category: 'Haircut',
      duration: 30,
      price: 50.00,
      salonId: salon1.id,
    },
  });
  console.log('✅ Service 1 created:', service1.id);

  const service2 = await prisma.service.create({
    data: {
      name: 'Beard Trim',
      description: 'Professional beard shaping and trimming',
      category: 'Beard',
      duration: 15,
      price: 25.00,
      salonId: salon1.id,
    },
  });
  console.log('✅ Service 2 created:', service2.id);

  const service3 = await prisma.service.create({
    data:
      {
      name: 'Box Braids',
      description: 'Beautiful box braids with extensions',
      category: 'Braids',
      duration: 180,
      price: 300.00,
      salonId: salon2.id,
    },
  });
  console.log('✅ Service 3 created:', service3.id);

  const service4 = await prisma.service.create({
    data: {
      name: 'Hair Treatment',
      description: 'Deep conditioning and hair treatment',
      category: 'Treatment',
      duration: 60,
      price: 150.00,
      salonId: salon2.id,
    },
  });
  console.log('✅ Service 4 created:', service4.id);

  // Create availabilities
  await prisma.availability.createMany({
    data: [
      { workerId: worker1.id, dayOfWeek: 1, startTime: '08:00', endTime: '20:00' },
      { workerId: worker1.id, dayOfWeek: 2, startTime: '08:00', endTime: '20:00' },
      { workerId: worker1.id, dayOfWeek: 3, startTime: '08:00', endTime: '20:00' },
      { workerId: worker1.id, dayOfWeek: 4, startTime: '08:00', endTime: '20:00' },
      { workerId: worker1.id, dayOfWeek: 5, startTime: '08:00', endTime: '20:00' },
      { workerId: worker1.id, dayOfWeek: 6, startTime: '08:00', endTime: '18:00' },
      { workerId: worker2.id, dayOfWeek: 1, startTime: '09:00', endTime: '19:00' },
      { workerId: worker2.id, dayOfWeek: 2, startTime: '09:00', endTime: '19:00' },
      { workerId: worker2.id, dayOfWeek: 3, startTime: '09:00', endTime: '19:00' },
      { workerId: worker2.id, dayOfWeek: 4, startTime: '09:00', endTime: '19:00' },
      { workerId: worker2.id, dayOfWeek: 5, startTime: '09:00', endTime: '19:00' },
      { workerId: worker2.id, dayOfWeek: 6, startTime: '09:00', endTime: '17:00' },
    ],
  });
  console.log('✅ Availabilities created');

  console.log('\n✨ Database seed completed!');
  console.log('\nTest Accounts:');
  console.log('Admin: +233200000000 / admin123');
  console.log('Owner: +233241234567 / owner123');
  console.log('Customer: +233249876543 / customer123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
