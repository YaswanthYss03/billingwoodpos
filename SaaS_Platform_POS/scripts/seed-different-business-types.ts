import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding different business types...\n');

  // Create different business type tenants
  const businessTypes = [
    {
      type: 'RESTAURANT',
      name: 'Golden Fork Restaurant',
      username: 'restaurant_admin',
      email: 'admin@goldenfork.com',
      phone: '+919876543210',
    },
    {
      type: 'SWEET_SHOP',
      name: 'Sweet Delights',
      username: 'sweetshop_admin',
      email: 'admin@sweetdelights.com',
      phone: '+919876543211',
    },
    {
      type: 'SUPERMARKET',
      name: 'Fresh Market Superstore',
      username: 'supermarket_admin',
      email: 'admin@freshmarket.com',
      phone: '+919876543212',
    },
    {
      type: 'CAFE',
      name: 'Coffee Corner Cafe',
      username: 'cafe_admin',
      email: 'admin@coffeecorner.com',
      phone: '+919876543213',
    },
  ];

  for (const business of businessTypes) {
    console.log(`📦 Creating ${business.type}: ${business.name}`);

    // Create tenant
    const tenant = await prisma.tenant.create({
      data: {
        name: business.name,
        businessType: business.type,
        email: business.email,
        phone: business.phone,
        address: '123 Business Street',
      },
    });

    console.log(`   ✅ Tenant created: ${tenant.id}`);

    // Create admin user
    const hashedPassword = await bcrypt.hash('Admin@123', 10);
    const user = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        username: business.username,
        password: hashedPassword,
        email: business.email,
        name: `${business.name} Admin`,
        phone: business.phone,
        role: 'OWNER',
      },
    });

    console.log(`   ✅ Admin user created: ${user.username}`);
    console.log(`   🔑 Password: Admin@123\n`);
  }

  console.log('✨ Seeding complete!\n');
  console.log('📝 Login Credentials:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  businessTypes.forEach((business) => {
    console.log(`${business.type.padEnd(15)} | Username: ${business.username.padEnd(20)} | Password: Admin@123`);
  });
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('🎯 Features by Business Type:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('RESTAURANT     | ✅ KOT | ✅ Tables | ❌ Weight | ❌ Barcode');
  console.log('SWEET_SHOP     | ❌ KOT | ❌ Tables | ✅ Weight | ❌ Barcode');
  console.log('SUPERMARKET    | ❌ KOT | ❌ Tables | ✅ Weight | ✅ Barcode');
  console.log('CAFE           | ✅ KOT | ✅ Tables | ❌ Weight | ❌ Barcode');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('💡 To test different business types:');
  console.log('   1. Login with any of the credentials above');
  console.log('   2. Notice the sidebar menu changes based on business type');
  console.log('   3. RESTAURANT & CAFE will show "KOT" menu');
  console.log('   4. SWEET_SHOP & SUPERMARKET will NOT show "KOT" menu\n');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
