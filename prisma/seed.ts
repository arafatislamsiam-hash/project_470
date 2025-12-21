import { PrismaClient } from '@prisma/client';
import { hashPassword, SYSTEM_ADMIN_PERMISSIONS } from '../lib/auth';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create System Admin Role
  const systemAdminRole = await prisma.role.upsert({
    where: { name: 'System Admin' },
    update: {},
    create: {
      name: 'System Admin',
      description: 'Full system access with all permissions',
      permissions: JSON.stringify(SYSTEM_ADMIN_PERMISSIONS),
    },
  });

  // Create Default Category
  const defaultCategory = await prisma.category.upsert({
    where: { title: 'Uncategorised' },
    update: {},
    create: {
      title: 'Uncategorised',
      description: 'Default category for products',
      isDefault: true,
    },
  });

  // Create System Admin User
  const hashedPassword = await hashPassword('admin123');
  const systemAdmin = await prisma.user.upsert({
    where: { email: 'admin@clinic.com' },
    update: {},
    create: {
      email: 'admin@clinic.com',
      name: 'System Administrator',
      password: hashedPassword,
    },
  });

  // Assign System Admin Role to User
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: systemAdmin.id,
        roleId: systemAdminRole.id,
      },
    },
    update: {},
    create: {
      userId: systemAdmin.id,
      roleId: systemAdminRole.id,
    },
  });

  // Create some sample roles
  const doctorRole = await prisma.role.upsert({
    where: { name: 'Doctor' },
    update: {},
    create: {
      name: 'Doctor',
      description: 'Can create invoices and manage products',
      permissions: JSON.stringify({
        CREATE_USER: false,
        MANAGE_PRODUCTS: true,
        CREATE_INVOICE: true,
        MANAGE_CATEGORIES: true,
        VIEW_ALL_INVOICES: false,
        SYSTEM_ADMIN: false,
      }),
    },
  });

  const receptionistRole = await prisma.role.upsert({
    where: { name: 'Receptionist' },
    update: {},
    create: {
      name: 'Receptionist',
      description: 'Can create invoices',
      permissions: JSON.stringify({
        CREATE_USER: false,
        MANAGE_PRODUCTS: false,
        CREATE_INVOICE: true,
        MANAGE_CATEGORIES: false,
        VIEW_ALL_INVOICES: false,
        SYSTEM_ADMIN: false,
      }),
    },
  });

  // Create some sample products
  await prisma.product.createMany({
    data: [
      {
        name: 'General Consultation',
        price: 50.00,
        description: 'General medical consultation',
        categoryId: defaultCategory.id,
      },
      {
        name: 'Blood Test',
        price: 25.00,
        description: 'Basic blood work analysis',
        categoryId: defaultCategory.id,
      },
      {
        name: 'X-Ray',
        price: 75.00,
        description: 'X-Ray imaging service',
        categoryId: defaultCategory.id,
      },
    ],
    skipDuplicates: true,
  });

  console.log('✅ Database seeded successfully!');
  console.log('🔑 System Admin Login:');
  console.log('   Email: admin@clinic.com');
  console.log('   Password: admin123');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
