import { PrismaClient, UserRole, SalonType, SalonStatus, UserStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { Decimal } from '@prisma/client/runtime/library';

const prisma = new PrismaClient();

const DEFAULT_PASSWORD = 'Password123!';

// Realistic Ghana customer data
const customers = [
  {
    firstName: 'Kwame',
    lastName: 'Asante',
    email: 'kwame.asante@gmail.com',
    phoneNumber: '+233241234567',
    city: 'Accra',
    region: 'Greater Accra',
  },
  {
    firstName: 'Ama',
    lastName: 'Mensah',
    email: 'ama.mensah@gmail.com',
    phoneNumber: '+233551234568',
    city: 'Kumasi',
    region: 'Ashanti',
  },
  {
    firstName: 'Kofi',
    lastName: 'Boateng',
    email: 'kofi.boateng@gmail.com',
    phoneNumber: '+233201234569',
    city: 'Tema',
    region: 'Greater Accra',
  },
  {
    firstName: 'Abena',
    lastName: 'Osei',
    email: 'abena.osei@gmail.com',
    phoneNumber: '+233271234570',
    city: 'Takoradi',
    region: 'Western',
  },
  {
    firstName: 'Yaw',
    lastName: 'Darko',
    email: 'yaw.darko@gmail.com',
    phoneNumber: '+233541234571',
    city: 'Cape Coast',
    region: 'Central',
  },
];

// Realistic Ghana salon/barbershop data
const salonsData = [
  {
    businessName: "King's Cut Barbershop",
    description: 'Premium barbershop offering classic cuts and modern styles in the heart of Osu. Our experienced barbers deliver precision cuts every time.',
    type: SalonType.BARBERSHOP,
    address: 'Oxford Street, Osu',
    city: 'Accra',
    region: 'Greater Accra',
    latitude: 5.5560,
    longitude: -0.1820,
    rating: 4.8,
    phoneNumber: '+233241000001',
    email: 'kingscut@gmail.com',
    hasParking: true,
    hasWifi: true,
    hasAC: true,
    acceptsWalkIns: true,
  },
  {
    businessName: "Queenie's Hair Studio",
    description: 'Elegant hair studio specializing in African braids, weaves, and natural hair care. Located in the upscale East Legon area.',
    type: SalonType.HAIR_SALON,
    address: 'A&C Mall Area, East Legon',
    city: 'Accra',
    region: 'Greater Accra',
    latitude: 5.6350,
    longitude: -0.1580,
    rating: 4.6,
    phoneNumber: '+233241000002',
    email: 'queenieshair@gmail.com',
    hasParking: true,
    hasWifi: true,
    hasAC: true,
    acceptsWalkIns: false,
  },
  {
    businessName: 'Sharp Edge Barbers',
    description: 'Traditional barbershop with modern techniques. Expert fades, beard grooming, and hot towel shaves in Kumasi Central.',
    type: SalonType.BARBERSHOP,
    address: 'Adum Road, Kumasi Central',
    city: 'Kumasi',
    region: 'Ashanti',
    latitude: 6.6885,
    longitude: -1.6244,
    rating: 4.5,
    phoneNumber: '+233241000003',
    email: 'sharpedge@gmail.com',
    hasParking: false,
    hasWifi: true,
    hasAC: true,
    acceptsWalkIns: true,
  },
  {
    businessName: 'Glamour Touch Salon',
    description: 'Full-service beauty salon offering hair styling, nail care, and spa treatments. Premium services at Airport Residential.',
    type: SalonType.BEAUTY_SALON,
    address: 'Airport Residential Area, Accra',
    city: 'Accra',
    region: 'Greater Accra',
    latitude: 5.6050,
    longitude: -0.1730,
    rating: 4.9,
    phoneNumber: '+233241000004',
    email: 'glamourtouch@gmail.com',
    hasParking: true,
    hasWifi: true,
    hasAC: true,
    acceptsWalkIns: false,
  },
  {
    businessName: "The Gentlemen's Lounge",
    description: 'Upscale barbershop experience for the modern gentleman. Premium grooming services in a sophisticated environment at Labone.',
    type: SalonType.BARBERSHOP,
    address: 'Labone Crescent, Labone',
    city: 'Accra',
    region: 'Greater Accra',
    latitude: 5.5630,
    longitude: -0.1680,
    rating: 4.7,
    phoneNumber: '+233241000005',
    email: 'gentlemenlounge@gmail.com',
    hasParking: true,
    hasWifi: true,
    hasAC: true,
    acceptsWalkIns: true,
  },
  {
    businessName: 'Natural Beauty Hair',
    description: 'Specializing in natural hair care, locs, and protective styles. Embracing and celebrating African hair textures at Asylum Down.',
    type: SalonType.HAIR_SALON,
    address: 'Asylum Down, Accra',
    city: 'Accra',
    region: 'Greater Accra',
    latitude: 5.5720,
    longitude: -0.2050,
    rating: 4.4,
    phoneNumber: '+233241000006',
    email: 'naturalbeauty@gmail.com',
    hasParking: false,
    hasWifi: false,
    hasAC: true,
    acceptsWalkIns: true,
  },
  {
    businessName: 'Blade Masters Barbershop',
    description: 'Expert barbers delivering fresh cuts and fades. Walk-ins welcome at Tema Community 1.',
    type: SalonType.BARBERSHOP,
    address: 'Community 1 Market Area, Tema',
    city: 'Tema',
    region: 'Greater Accra',
    latitude: 5.6700,
    longitude: -0.0170,
    rating: 4.6,
    phoneNumber: '+233241000007',
    email: 'blademasters@gmail.com',
    hasParking: true,
    hasWifi: false,
    hasAC: true,
    acceptsWalkIns: true,
  },
  {
    businessName: 'Crowned Glory Salon',
    description: 'Your crown deserves the best. Specializing in braids, weaves, and hair treatments in Dansoman.',
    type: SalonType.HAIR_SALON,
    address: 'Dansoman High Street, Accra',
    city: 'Accra',
    region: 'Greater Accra',
    latitude: 5.5200,
    longitude: -0.2700,
    rating: 4.3,
    phoneNumber: '+233241000008',
    email: 'crownedglory@gmail.com',
    hasParking: false,
    hasWifi: false,
    hasAC: false,
    acceptsWalkIns: true,
  },
  {
    businessName: 'Supreme Cuts',
    description: 'Where style meets precision. Professional barbershop services at Achimota with experienced stylists.',
    type: SalonType.BARBERSHOP,
    address: 'Achimota Mile 7, Accra',
    city: 'Accra',
    region: 'Greater Accra',
    latitude: 5.6120,
    longitude: -0.2340,
    rating: 4.8,
    phoneNumber: '+233241000009',
    email: 'supremecuts@gmail.com',
    hasParking: true,
    hasWifi: true,
    hasAC: true,
    acceptsWalkIns: true,
  },
  {
    businessName: 'Elegance Hair & Beauty',
    description: 'Complete beauty experience in Takoradi. Hair styling, nails, and beauty treatments at Market Circle.',
    type: SalonType.BEAUTY_SALON,
    address: 'Market Circle, Takoradi',
    city: 'Takoradi',
    region: 'Western',
    latitude: 4.8840,
    longitude: -1.7590,
    rating: 4.5,
    phoneNumber: '+233241000010',
    email: 'elegancebeauty@gmail.com',
    hasParking: false,
    hasWifi: true,
    hasAC: true,
    acceptsWalkIns: true,
  },
  {
    businessName: 'Fresh Fades Barbershop',
    description: 'Modern fades and classic cuts. Clean, professional barbershop in Madina with skilled stylists.',
    type: SalonType.BARBERSHOP,
    address: 'Madina Zongo Junction, Accra',
    city: 'Accra',
    region: 'Greater Accra',
    latitude: 5.6730,
    longitude: -0.1650,
    rating: 4.7,
    phoneNumber: '+233241000011',
    email: 'freshfades@gmail.com',
    hasParking: false,
    hasWifi: false,
    hasAC: true,
    acceptsWalkIns: true,
  },
  {
    businessName: 'Adinkra Hair Lounge',
    description: 'Luxury hair experience on Spintex Road. Specializing in braids, weaves, and premium hair treatments.',
    type: SalonType.HAIR_SALON,
    address: 'Spintex Road, Accra',
    city: 'Accra',
    region: 'Greater Accra',
    latitude: 5.6300,
    longitude: -0.1000,
    rating: 4.6,
    phoneNumber: '+233241000012',
    email: 'adinkrahl@gmail.com',
    hasParking: true,
    hasWifi: true,
    hasAC: true,
    acceptsWalkIns: false,
  },
  {
    businessName: 'City Barbers',
    description: 'Professional grooming in Koforidua. Quality haircuts and beard styling at affordable prices.',
    type: SalonType.BARBERSHOP,
    address: 'Jubilee Park Area, Koforidua',
    city: 'Koforidua',
    region: 'Eastern',
    latitude: 6.0940,
    longitude: -0.2620,
    rating: 4.4,
    phoneNumber: '+233241000013',
    email: 'citybarbers@gmail.com',
    hasParking: false,
    hasWifi: false,
    hasAC: false,
    acceptsWalkIns: true,
  },
  {
    businessName: 'Royal Scissors Salon',
    description: 'Treat yourself like royalty. Full hair and beauty services in Kasoa with experienced stylists.',
    type: SalonType.HAIR_SALON,
    address: 'Kasoa Market Road, Kasoa',
    city: 'Kasoa',
    region: 'Central',
    latitude: 5.5350,
    longitude: -0.4240,
    rating: 4.2,
    phoneNumber: '+233241000014',
    email: 'royalscissors@gmail.com',
    hasParking: false,
    hasWifi: false,
    hasAC: true,
    acceptsWalkIns: true,
  },
  {
    businessName: 'Precision Cuts',
    description: 'Every cut is a work of art. Skilled barbers at Circle delivering perfect fades and styles.',
    type: SalonType.BARBERSHOP,
    address: 'Kaneshie Circle, Accra',
    city: 'Accra',
    region: 'Greater Accra',
    latitude: 5.5740,
    longitude: -0.2470,
    rating: 4.5,
    phoneNumber: '+233241000015',
    email: 'precisioncuts@gmail.com',
    hasParking: false,
    hasWifi: true,
    hasAC: true,
    acceptsWalkIns: true,
  },
  {
    businessName: "Nana Ama's Braids & Beauty",
    description: 'Expert braiding studio in Kumasi Adum. All braid styles, weaves, and natural hair care.',
    type: SalonType.HAIR_SALON,
    address: 'Adum Road, Kumasi',
    city: 'Kumasi',
    region: 'Ashanti',
    latitude: 6.6900,
    longitude: -1.6230,
    rating: 4.8,
    phoneNumber: '+233241000016',
    email: 'nanaamasbraids@gmail.com',
    hasParking: true,
    hasWifi: true,
    hasAC: true,
    acceptsWalkIns: true,
  },
  {
    businessName: 'Edge Up Barbershop',
    description: 'Clean cuts and sharp edges. Modern barbershop serving Tema Community 25 with style.',
    type: SalonType.BARBERSHOP,
    address: 'Community 25, Tema',
    city: 'Tema',
    region: 'Greater Accra',
    latitude: 5.6400,
    longitude: 0.0300,
    rating: 4.3,
    phoneNumber: '+233241000017',
    email: 'edgeupbarbers@gmail.com',
    hasParking: true,
    hasWifi: false,
    hasAC: true,
    acceptsWalkIns: true,
  },
  {
    businessName: 'Divine Touch Salon',
    description: 'Heavenly hair transformations in Sunyani. Braids, weaves, treatments, and styling for all hair types.',
    type: SalonType.HAIR_SALON,
    address: 'Sunyani Central, Sunyani',
    city: 'Sunyani',
    region: 'Bono',
    latitude: 7.2000,
    longitude: -2.3270,
    rating: 4.6,
    phoneNumber: '+233241000018',
    email: 'divinetouch@gmail.com',
    hasParking: true,
    hasWifi: false,
    hasAC: true,
    acceptsWalkIns: true,
  },
  {
    businessName: 'Classic Gents Barbershop',
    description: 'Sophisticated grooming in Cantonments. Premium cuts, beard care, and traditional shaves.',
    type: SalonType.BARBERSHOP,
    address: 'Cantonments, Accra',
    city: 'Accra',
    region: 'Greater Accra',
    latitude: 5.5830,
    longitude: -0.1630,
    rating: 4.9,
    phoneNumber: '+233241000019',
    email: 'classicgents@gmail.com',
    hasParking: true,
    hasWifi: true,
    hasAC: true,
    acceptsWalkIns: false,
  },
  {
    businessName: 'Golden Hands Hair Studio',
    description: 'Expert hands, golden results. Professional hair care and styling services in Ho, Volta Region.',
    type: SalonType.HAIR_SALON,
    address: 'Ho Central, Ho',
    city: 'Ho',
    region: 'Volta',
    latitude: 6.6000,
    longitude: 0.4700,
    rating: 4.4,
    phoneNumber: '+233241000020',
    email: 'goldenhands@gmail.com',
    hasParking: false,
    hasWifi: false,
    hasAC: true,
    acceptsWalkIns: true,
  },
];

// Ghana first names for generating realistic names
const ghanaFirstNames = {
  male: ['Kwame', 'Kofi', 'Kwesi', 'Kojo', 'Yaw', 'Kwabena', 'Kwaku', 'Yaw', 'Daniel', 'Samuel', 'Michael', 'Emmanuel', 'David', 'Joseph', 'Joshua', 'Isaac', 'Benjamin', 'Nana', 'Kwabena', 'Ernest'],
  female: ['Ama', 'Akua', 'Adwoa', 'Akosua', 'Yaa', 'Afia', 'Ama', 'Abena', 'Efua', 'Adwoa', 'Grace', 'Ruth', 'Mary', 'Patricia', 'Dorothy', 'Esther', 'Rose', 'Charlotte', 'Patience', 'Faustina'],
};

const ghanaLastNames = ['Asante', 'Mensah', 'Boateng', 'Osei', 'Darko', 'Owusu', 'Agyeman', 'Owusu', 'Appiah', 'Adu', 'Boakye', 'Anim', 'Adjei', 'Fosu', 'Boateng', 'Amponsah', 'Antwi', 'Owusu-Ansah', 'Agyare', 'Manu'];

// Barbershop services with prices
const barbershopServices = [
  { name: 'Classic Haircut', description: 'Traditional haircut with precision styling', category: 'Haircut', duration: 30, minPrice: 30, maxPrice: 50 },
  { name: 'Skin Fade', description: 'Modern skin fade with expert blending', category: 'Haircut', duration: 45, minPrice: 40, maxPrice: 60 },
  { name: 'Beard Trim & Shape', description: 'Professional beard shaping and trimming', category: 'Beard', duration: 15, minPrice: 15, maxPrice: 25 },
  { name: 'Hot Towel Shave', description: 'Traditional straight razor shave with hot towel treatment', category: 'Shave', duration: 30, minPrice: 25, maxPrice: 40 },
  { name: 'Hair Wash', description: 'Refreshing hair wash and conditioning', category: 'Treatment', duration: 15, minPrice: 10, maxPrice: 20 },
  { name: 'Hair Coloring', description: 'Professional hair coloring service', category: 'Color', duration: 60, minPrice: 50, maxPrice: 80 },
  { name: 'Kids Haircut', description: 'Gentle haircut for children under 12', category: 'Haircut', duration: 20, minPrice: 20, maxPrice: 35 },
  { name: 'Line Up & Edge', description: 'Clean line up and edge work', category: 'Detailing', duration: 15, minPrice: 10, maxPrice: 20 },
];

// Salon services with prices
const salonServices = [
  { name: 'Box Braids', description: 'Beautiful box braids with quality extensions', category: 'Braids', duration: 240, minPrice: 150, maxPrice: 300 },
  { name: 'Ghana Braids', description: 'Traditional Ghana braiding style', category: 'Braids', duration: 180, minPrice: 80, maxPrice: 150 },
  { name: 'Weave Install', description: 'Professional weave/wig installation', category: 'Weave', duration: 120, minPrice: 100, maxPrice: 250 },
  { name: 'Relaxer Treatment', description: 'Professional hair relaxing treatment', category: 'Treatment', duration: 90, minPrice: 60, maxPrice: 120 },
  { name: 'Natural Hair Styling', description: 'Styling for natural hair textures', category: 'Styling', duration: 60, minPrice: 50, maxPrice: 100 },
  { name: 'Wash & Set', description: 'Professional wash and roller set', category: 'Styling', duration: 45, minPrice: 40, maxPrice: 70 },
  { name: 'Deep Conditioning', description: 'Intensive hair conditioning treatment', category: 'Treatment', duration: 30, minPrice: 30, maxPrice: 60 },
  { name: 'Manicure', description: 'Professional nail care and polish', category: 'Nails', duration: 45, minPrice: 30, maxPrice: 50 },
  { name: 'Pedicure', description: 'Professional foot care and nail treatment', category: 'Nails', duration: 60, minPrice: 40, maxPrice: 60 },
  { name: 'Cornrows', description: 'Classic cornrow braiding style', category: 'Braids', duration: 120, minPrice: 60, maxPrice: 120 },
];

// Worker specialties
const barbershopSpecialties = ['Fades', 'Beard Grooming', 'Hot Towel Shave', 'Line Ups', 'Kids Cuts', 'Hair Coloring', 'Designs', 'Classic Cuts'];
const salonSpecialties = ['Braids', 'Weaves', 'Natural Hair', 'Relaxers', 'Cornrows', 'Twists', 'Hair Treatments', 'Blowouts', 'Manicure', 'Pedicure'];

// Review comments
const reviewComments = [
  "Excellent service! The stylist was very professional and my hair looks amazing.",
  "Great experience! Clean environment and skilled barbers. Will definitely be back.",
  "I love my new hairstyle! The stylist really understood what I wanted.",
  "Quick and efficient service. The fade was perfect!",
  "Very happy with my braids. They lasted for weeks and looked great.",
  "The best barbershop in town! Friendly staff and great prices.",
  "Amazing attention to detail. My beard has never looked better.",
  "Professional service and beautiful salon. Highly recommend!",
  "The stylist was patient and gave me exactly what I wanted.",
  "Good service, clean environment. The wait time was minimal.",
  "Excellent customer service and skilled stylists. My go-to place now!",
  "Great value for money. Will recommend to friends and family.",
  "The hot towel shave was amazing! Best grooming experience.",
  "Love my new look! The stylist was creative and talented.",
  "Professional and efficient. Great atmosphere in the salon.",
];

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generatePhoneNumber(): string {
  const prefixes = ['+23320', '+23324', '+23327', '+23355', '+23354', '+23350', '+23326', '+23323', '+23353', '+23359'];
  const prefix = randomElement(prefixes);
  const number = Math.floor(Math.random() * 9000000) + 1000000;
  return `${prefix}${number}`;
}

async function main() {
  const adminOnly = process.argv.includes('--admin-only');
  console.log(adminOnly
    ? '🌱 Starting admin-only seed (no demo data)...\n'
    : '🌱 Starting production database seed...\n');

  // Step 1: Clean existing data (respect foreign key constraints)
  console.log('🧹 Cleaning existing data...');
  
  await prisma.review.deleteMany({});
  await prisma.booking.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.availability.deleteMany({});
  await prisma.workerService.deleteMany({});
  await prisma.service.deleteMany({});
  await prisma.worker.deleteMany({});
  await prisma.document.deleteMany({});
  await prisma.favorite.deleteMany({});
  await prisma.favoriteStaff.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.salon.deleteMany({});
  
  // Delete all users (including admin users - we'll recreate them)
  await prisma.user.deleteMany({});
  await prisma.otp.deleteMany({});
  
  console.log('✅ Data cleanup complete\n');

  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 12);

  // Step 2: Create admin and super admin users
  console.log('👤 Creating admin users...');
  
  const admin = await prisma.user.create({
    data: {
      phoneNumber: '+233200000000',
      email: 'admin@groomlinkgh.com',
      firstName: 'Admin',
      lastName: 'User',
      password: hashedPassword,
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      isVerified: true,
    },
  });

  const superAdmin = await prisma.user.create({
    data: {
      phoneNumber: '+233200000001',
      email: 'superadmin@groomlinkgh.com',
      firstName: 'Super',
      lastName: 'Admin',
      password: hashedPassword,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      isVerified: true,
    },
  });

  console.log(`✅ Super Admin: ${admin.email}`);
  console.log(`✅ Admin: ${superAdmin.email}\n`);

  if (!adminOnly) {
  // Step 3: Create customers
  console.log('👥 Creating customers...');
  const customerUsers = [];

  for (const customer of customers) {
    const user = await prisma.user.create({
      data: {
        phoneNumber: customer.phoneNumber,
        email: customer.email,
        firstName: customer.firstName,
        lastName: customer.lastName,
        password: hashedPassword,
        role: UserRole.CUSTOMER,
        status: UserStatus.ACTIVE,
        isVerified: true,
        city: customer.city,
        region: customer.region,
      },
    });
    customerUsers.push(user);
    console.log(`✅ Customer: ${user.firstName} ${user.lastName} (${user.email})`);
  }
  console.log('');

  // Step 4: Create salons with owners, workers, services, and reviews
  console.log('🏪 Creating salons, workers, services, and reviews...');
  const allWorkers: { id: string; salonId: string; specialties: string[] }[] = [];

  for (let i = 0; i < salonsData.length; i++) {
    const salonData = salonsData[i];
    // Create salon owner
    const isFemaleOwner = Math.random() > 0.4;
    const ownerFirstName = randomElement(isFemaleOwner ? ghanaFirstNames.female : ghanaFirstNames.male);
    const ownerLastName = randomElement(ghanaLastNames);
    const ownerEmail = `${ownerFirstName.toLowerCase()}.${ownerLastName.toLowerCase()}${i}@gmail.com`;

    const owner = await prisma.user.create({
      data: {
        phoneNumber: generatePhoneNumber(),
        email: ownerEmail,
        firstName: ownerFirstName,
        lastName: ownerLastName,
        password: hashedPassword,
        role: UserRole.SALON_OWNER,
        status: UserStatus.ACTIVE,
        isVerified: true,
      },
    });

    // Create salon
    const salon = await prisma.salon.create({
      data: {
        businessName: salonData.businessName,
        description: salonData.description,
        type: salonData.type,
        status: SalonStatus.APPROVED,
        phoneNumber: salonData.phoneNumber,
        email: salonData.email,
        address: salonData.address,
        city: salonData.city,
        region: salonData.region,
        latitude: salonData.latitude,
        longitude: salonData.longitude,
        openingTime: '08:00',
        closingTime: '19:00',
        workingDays: ['1', '2', '3', '4', '5', '6'], // Monday to Saturday
        hasParking: salonData.hasParking,
        hasWifi: salonData.hasWifi,
        hasAC: salonData.hasAC,
        acceptsWalkIns: salonData.acceptsWalkIns,
        rating: salonData.rating,
        reviewCount: 0, // Will be updated after reviews
        ownerId: owner.id,
      },
    });

    console.log(`✅ Salon: ${salon.businessName} (${salon.city})`);

    // Create services based on salon type
    const isBarbershop = salonData.type === SalonType.BARBERSHOP;
    const serviceTemplates = isBarbershop ? barbershopServices : salonServices;
    const numServices = randomInt(3, 5);
    const selectedServices = serviceTemplates.sort(() => Math.random() - 0.5).slice(0, numServices);

    const salonServices_created = [];
    for (const serviceTemplate of selectedServices) {
      const price = randomInt(serviceTemplate.minPrice, serviceTemplate.maxPrice);
      const service = await prisma.service.create({
        data: {
          name: serviceTemplate.name,
          description: serviceTemplate.description,
          category: serviceTemplate.category,
          duration: serviceTemplate.duration,
          price: new Decimal(price),
          salonId: salon.id,
          isActive: true,
        },
      });
      salonServices_created.push(service);
    }

    // Create workers (2-3 per salon)
    const numWorkers = randomInt(2, 3);
    const workerSpecialties = isBarbershop ? barbershopSpecialties : salonSpecialties;

    for (let w = 0; w < numWorkers; w++) {
      const isFemale = !isBarbershop && Math.random() > 0.3;
      const workerFirstName = randomElement(isFemale ? ghanaFirstNames.female : ghanaFirstNames.male);
      const workerLastName = randomElement(ghanaLastNames);
      
      // Select 2-3 specialties
      const workerSpecs = workerSpecialties.sort(() => Math.random() - 0.5).slice(0, randomInt(2, 3));
      
      const worker = await prisma.worker.create({
        data: {
          fullName: `${workerFirstName} ${workerLastName}`,
          phoneNumber: generatePhoneNumber(),
          bio: `Experienced ${isBarbershop ? 'barber' : 'stylist'} specializing in ${workerSpecs.join(', ')}.`,
          specialties: workerSpecs,
          yearsOfExperience: randomInt(2, 15),
          rating: salonData.rating - randomInt(0, 3) / 10, // Slight variation from salon rating
          reviewCount: 0,
          totalBookings: randomInt(50, 500),
          isActive: true,
          salonId: salon.id,
        },
      });

      allWorkers.push({ id: worker.id, salonId: salon.id, specialties: workerSpecs });

      // Create worker availability (Monday to Saturday)
      for (let day = 1; day <= 6; day++) {
        await prisma.availability.create({
          data: {
            workerId: worker.id,
            dayOfWeek: day,
            startTime: '08:00',
            endTime: '19:00',
            isAvailable: true,
          },
        });
      }

      // Assign services to worker
      for (const service of salonServices_created) {
        await prisma.workerService.create({
          data: {
            workerId: worker.id,
            serviceId: service.id,
          },
        });
      }
    }

    // Create 3-5 reviews per salon
    const numReviews = randomInt(3, 5);
    for (let r = 0; r < numReviews; r++) {
      const customer = customerUsers[r % customerUsers.length];
      const rating = Math.max(3, Math.min(5, Math.round(salonData.rating + (Math.random() - 0.5) * 2)));
      
      // Create a booking for the review
      const randomService = randomElement(salonServices_created);
      const randomWorker = allWorkers.find(w => w.salonId === salon.id);
      const bookingDate = new Date();
      bookingDate.setDate(bookingDate.getDate() - randomInt(1, 30));

      const booking = await prisma.booking.create({
        data: {
          customerId: customer.id,
          salonId: salon.id,
          workerId: randomWorker?.id,
          serviceId: randomService.id,
          date: bookingDate,
          startTime: '10:00',
          endTime: '10:30',
          totalAmount: randomService.price,
          finalAmount: randomService.price,
          status: 'COMPLETED',
          completedAt: bookingDate,
        },
      });

      await prisma.review.create({
        data: {
          rating,
          comment: randomElement(reviewComments),
          customerId: customer.id,
          salonId: salon.id,
          workerId: randomWorker?.id,
          bookingId: booking.id,
        },
      });
    }

    // Update salon review count
    const reviewCount = await prisma.review.count({ where: { salonId: salon.id } });
    await prisma.salon.update({
      where: { id: salon.id },
      data: { reviewCount },
    });
  }
  } else {
    console.log('⏭️  Skipping demo customers/salons/bookings/reviews (admin-only mode)');
  }

  // Step 5: Create/update site settings
  console.log('\n⚙️  Creating site settings...');
  await prisma.siteSettings.upsert({
    where: { id: 'default' },
    update: {
      siteName: 'GroomLink',
      email: 'support@groomlink.com',
      phoneNumber: '+233200000000',
      address: 'Accra, Ghana',
      maintenanceMode: false,
      paymentGateway: 'paystack',
      isPaymentTestMode: true,
      transactionFeePercent: new Decimal(3.5),
    },
    create: {
      id: 'default',
      siteName: 'GroomLink',
      email: 'support@groomlink.com',
      phoneNumber: '+233200000000',
      address: 'Accra, Ghana',
      maintenanceMode: false,
      paymentGateway: 'paystack',
      isPaymentTestMode: true,
      transactionFeePercent: new Decimal(3.5),
    },
  });
  console.log('✅ Site settings configured');

  // Step 6: Seed platform policies
  console.log('\n📋 Seeding platform policies...');
  const policies = [
    { policyName: 'platform_fee_percentage', policyValue: '10', description: 'DEPRECATED: Use platform_booking_fee + partner_commission_percentage instead' },
    { policyName: 'platform_booking_fee', policyValue: '2', description: 'Flat booking fee charged to customers (GHS)' },
    { policyName: 'partner_commission_percentage', policyValue: '5', description: 'Commission percentage charged to partners on completed services' },
    { policyName: 'free_cancellation_hours', policyValue: '48', description: 'Hours before booking when free cancellation is allowed' },
    { policyName: 'full_refund_hours', policyValue: '48', description: 'Hours before booking for 100% refund eligibility' },
    { policyName: 'partial_refund_75_hours', policyValue: '24', description: 'Hours before booking for 75% refund eligibility' },
    { policyName: 'partial_refund_50_hours', policyValue: '12', description: 'Hours before booking for 50% refund eligibility' },
    { policyName: 'cancellation_processing_fee', policyValue: '2.00', description: 'Fixed processing fee deducted from refunds (GHS)' },
    { policyName: 'no_show_restriction_threshold', policyValue: '3', description: 'Number of no-shows before account restriction' },
    { policyName: 'no_show_restriction_days', policyValue: '30', description: 'Days of account restriction after exceeding no-show threshold' },
    { policyName: 'free_reschedule_hours', policyValue: '12', description: 'Hours before booking when free rescheduling is allowed' },
    { policyName: 'provider_cancel_penalty_days', policyValue: '7', description: 'Number of days visibility penalty for provider cancellations' },
    { policyName: 'provider_cancel_search_penalty', policyValue: '0.5', description: 'Search rank penalty amount for provider cancellations' },
    { policyName: 'auto_noshow_grace_minutes', policyValue: '60', description: 'Minutes after appointment end time before auto-marking as no-show' },
  ];

  for (const policy of policies) {
    await prisma.platformPolicy.upsert({
      where: { policyName: policy.policyName },
      update: {
        policyValue: policy.policyValue,
        description: policy.description,
      },
      create: {
        policyName: policy.policyName,
        policyValue: policy.policyValue,
        description: policy.description,
      },
    });
    console.log(`✅ Policy: ${policy.policyName} = ${policy.policyValue}`);
  }

  // Step 7: Seed default subscription plans
  console.log('\n📦 Seeding subscription plans...');
  const subscriptionPlans = [
    {
      name: 'Free',
      slug: 'free',
      priceMonthlyGhs: new Decimal(0),
      priceYearlyGhs: new Decimal(0),
      transactionFeePercentage: new Decimal(5.0),
      maxStaff: 1,
      maxLocations: 1,
      features: {
        instant_payouts: false,
        analytics: false,
        marketing_tools: false,
        api_access: false,
        priority_support: false,
        custom_branding: false,
      },
      isActive: true,
      sortOrder: 1,
    },
    {
      name: 'Pro',
      slug: 'pro',
      priceMonthlyGhs: new Decimal(99),
      priceYearlyGhs: new Decimal(990),
      transactionFeePercentage: new Decimal(3.0),
      maxStaff: 5,
      maxLocations: 1,
      features: {
        instant_payouts: true,
        analytics: true,
        marketing_tools: false,
        api_access: false,
        priority_support: false,
        custom_branding: false,
      },
      isActive: true,
      sortOrder: 2,
    },
    {
      name: 'Premium',
      slug: 'premium',
      priceMonthlyGhs: new Decimal(299),
      priceYearlyGhs: new Decimal(2990),
      transactionFeePercentage: new Decimal(1.0),
      maxStaff: 20,
      maxLocations: 5,
      features: {
        instant_payouts: true,
        analytics: true,
        marketing_tools: true,
        api_access: true,
        priority_support: true,
        custom_branding: true,
      },
      isActive: true,
      sortOrder: 3,
    },
  ];

  for (const plan of subscriptionPlans) {
    const { slug, ...planData } = plan;
    await prisma.subscriptionPlan.upsert({
      where: { slug },
      update: planData,
      create: plan,
    });
    console.log(`✅ Subscription Plan: ${plan.name} (${slug})`);
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('✨ Production database seed completed!\n');
  
  const userCount = await prisma.user.count();
  const salonCount = await prisma.salon.count();
  const workerCount = await prisma.worker.count();
  const serviceCount = await prisma.service.count();
  const reviewCount = await prisma.review.count();
  const policyCount = await prisma.platformPolicy.count();

  const subscriptionPlanCount = await prisma.subscriptionPlan.count();

  console.log('📊 Summary:');
  console.log(`   Users: ${userCount} (5 customers + 20 salon owners + 2 admins)`);
  console.log(`   Salons: ${salonCount}`);
  console.log(`   Workers: ${workerCount}`);
  console.log(`   Services: ${serviceCount}`);
  console.log(`   Reviews: ${reviewCount}`);
  console.log(`   Platform Policies: ${policyCount}`);
  console.log(`   Subscription Plans: ${subscriptionPlanCount}`);
  
  console.log('\n🔐 Test Accounts (Password: Password123!):');
  console.log('   Super Admin: admin@groomlinkgh.com');
  console.log('   Admin: superadmin@groomlinkgh.com');
  console.log('   Customer 1: kwame.asante@gmail.com');
  console.log('   Customer 2: ama.mensah@gmail.com');
  console.log('   Customer 3: kofi.boateng@gmail.com');
  console.log('   Customer 4: abena.osei@gmail.com');
  console.log('   Customer 5: yaw.darko@gmail.com');
  console.log('='.repeat(60));

  // Seed FAQ Bot data
  console.log('\n🤖 Seeding FAQ Bot...');
  const faqData = [
    {
      keyword: 'hours',
      patterns: ['hours', 'open', 'close', 'time', 'schedule', 'when'],
      response: 'Our partner salons typically operate Monday-Saturday, 8AM-8PM. Sunday hours vary by location. You can check specific salon hours on their profile page!',
      priority: 10,
      category: 'general',
    },
    {
      keyword: 'pricing',
      patterns: ['price', 'cost', 'how much', 'pricing', 'rates', 'fee'],
      response: 'Pricing varies by salon and service. You can browse salons and see their exact prices before booking. We also offer special discounts for first-time customers!',
      priority: 10,
      category: 'pricing',
    },
    {
      keyword: 'booking',
      patterns: ['book', 'appointment', 'reserve', 'schedule', 'how to book'],
      response: 'To book an appointment: 1) Browse salons near you, 2) Select a service, 3) Choose your preferred time, 4) Confirm your booking. You\'ll receive a confirmation instantly!',
      priority: 10,
      category: 'booking',
    },
    {
      keyword: 'location',
      patterns: ['where', 'location', 'address', 'near me', 'find', 'closest'],
      response: 'We have partner salons across Ghana! Enable location access or enter your city to see salons near you. You can also browse by region using our search filters.',
      priority: 8,
      category: 'general',
    },
    {
      keyword: 'payment',
      patterns: ['payment', 'pay', 'mobile money', 'momo', 'card', 'cash'],
      response: 'We accept Mobile Money (MTN, Vodafone, AirtelTigo), Visa/Mastercard, and cash at some salons. All online payments are secure and processed through our trusted payment partners.',
      priority: 9,
      category: 'payment',
    },
    {
      keyword: 'cancel',
      patterns: ['cancel', 'refund', 'change', 'reschedule', 'modify'],
      response: 'You can cancel or reschedule bookings from your account under "My Bookings". Cancellation policies vary by salon. Please contact us directly if you need assistance with a specific booking.',
      priority: 9,
      category: 'support',
    },
    {
      keyword: 'register_customer',
      patterns: ['register as customer', 'customer registration', 'sign up customer', 'create customer account', 'customer account', 'register customer'],
      response: 'Want to join GroomLink as a customer? Great choice! Click here to create your account: https://my.groomlinkgh.com/register\n\nYou\'ll be able to browse salons, book appointments, and manage your grooming needs all in one place!',
      priority: 10,
      category: 'registration',
    },
    {
      keyword: 'register_freelancer',
      patterns: ['register as freelancer', 'freelancer registration', 'sign up freelancer', 'mobile groom', 'freelance groomer', 'freelancer account', 'register freelancer'],
      response: 'Ready to grow your grooming business as a freelancer? Join us at: https://partners.groomlinkgh.com/register\n\nYou\'ll get your own profile, manage bookings, and reach more customers across Ghana!',
      priority: 10,
      category: 'registration',
    },
    {
      keyword: 'register_business',
      patterns: ['register as business', 'business registration', 'sign up salon', 'salon owner', 'business owner', 'register salon', 'shop owner', 'register business', 'own a salon', 'own a shop'],
      response: 'Looking to register your salon or grooming business? Sign up here: https://partners.groomlinkgh.com/register\n\nGet your business listed, manage appointments, attract more customers, and grow your brand with GroomLink Ghana!',
      priority: 10,
      category: 'registration',
    },
    {
      keyword: 'support',
      patterns: ['help', 'support', 'contact', 'talk', 'human', 'agent'],
      response: 'I\'m connecting you with a support agent now. They\'ll be with you shortly! In the meantime, feel free to describe your issue so they can assist you faster.',
      priority: 5,
      category: 'support',
    },
  ];

  for (const faq of faqData) {
    await prisma.fAQBot.upsert({
      where: { keyword: faq.keyword },
      update: faq,
      create: faq,
    });
  }
  console.log(`   ✅ Seeded ${faqData.length} FAQ entries`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
