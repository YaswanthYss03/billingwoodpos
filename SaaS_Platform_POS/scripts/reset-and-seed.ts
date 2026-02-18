import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Cleaning up old users and preparing for new auth system...\n');

  // Delete all existing users
  await prisma.user.deleteMany({});
  console.log('✅ Cleared all existing users');

  // Delete all tenants
  await prisma.tenant.deleteMany({});
  console.log('✅ Cleared all tenants\n');

  console.log('Creating default admin user and tenant...\n');

  // Create a default tenant
  const tenant = await prisma.tenant.create({
    data: {
      name: 'Test Restaurant',
      businessType: 'RESTAURANT',
      email: 'admin@restaurant.com',
      phone: '+919876543210',
      address: '123 Main Street',
    },
  });

  console.log(`✅ Created tenant: ${tenant.name} (ID: ${tenant.id})`);

  // Create admin user with hashed password
  const hashedPassword = await bcrypt.hash('Admin@123', 10);
  
  const adminUser = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      username: 'admin',
      password: hashedPassword,
      email: 'admin@restaurant.com',
      name: 'Admin User',
      phone: '+919876543210',
      role: 'OWNER',
    },
  });

  console.log(`✅ Created admin user:`);
  console.log(`   Username: ${adminUser.username}`);
  console.log(`   Password: Admin@123`);
  console.log(`   Email: ${adminUser.email}`);
  console.log(`   Role: ${adminUser.role}\n`);

  console.log('🎉 Database ready! You can now login with:');
  console.log('   Username: admin');
  console.log('   Password: Admin@123');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
