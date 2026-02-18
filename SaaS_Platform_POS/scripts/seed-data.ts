import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database with sample data...\n');

  // Clear existing data
  await prisma.billItem.deleteMany({});
  await prisma.bill.deleteMany({});
  await prisma.kOTItem.deleteMany({});
  await prisma.kOT.deleteMany({});
  await prisma.inventoryBatch.deleteMany({});
  await prisma.item.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.tenant.deleteMany({});

  console.log('✅ Cleared existing data\n');

  // Create tenant
  const tenant = await prisma.tenant.create({
    data: {
      name: 'Test Restaurant',
      businessType: 'RESTAURANT',
      email: 'admin@restaurant.com',
      phone: '+919876543210',
      address: '123 Main Street, City Center',
      gstNumber: '29ABCDE1234F1Z5',
    },
  });

  console.log(`✅ Created tenant: ${tenant.name}`);

  // Create admin user
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

  console.log(`✅ Created admin user: ${adminUser.username}\n`);

  // Create Categories
  console.log('Creating categories...');
  
  const beverages = await prisma.category.create({
    data: {
      tenantId: tenant.id,
      name: 'Beverages',
      description: 'Cold and hot drinks',
      sortOrder: 1,
    },
  });

  const food = await prisma.category.create({
    data: {
      tenantId: tenant.id,
      name: 'Main Course',
      description: 'Main dishes and meals',
      sortOrder: 2,
    },
  });

  const starters = await prisma.category.create({
    data: {
      tenantId: tenant.id,
      name: 'Starters',
      description: 'Appetizers and starters',
      sortOrder: 3,
    },
  });

  const desserts = await prisma.category.create({
    data: {
      tenantId: tenant.id,
      name: 'Desserts',
      description: 'Sweet dishes and desserts',
      sortOrder: 4,
    },
  });

  console.log('✅ Created 4 categories\n');

  // Create Items - Beverages
  console.log('Creating items...');
  
  const items = [];

  // Beverages
  items.push(await prisma.item.create({
    data: {
      tenantId: tenant.id,
      categoryId: beverages.id,
      name: 'Coca Cola',
      description: '330ml bottle',
      sku: 'BEV001',
      itemType: 'SIMPLE',
      price: 40,
      gstRate: 12,
      unit: 'PCS',
    },
  }));

  items.push(await prisma.item.create({
    data: {
      tenantId: tenant.id,
      categoryId: beverages.id,
      name: 'Fresh Lime Soda',
      description: 'Fresh lime with soda',
      sku: 'BEV002',
      itemType: 'SIMPLE',
      price: 60,
      gstRate: 5,
      unit: 'PCS',
    },
  }));

  items.push(await prisma.item.create({
    data: {
      tenantId: tenant.id,
      categoryId: beverages.id,
      name: 'Coffee',
      description: 'Hot coffee',
      sku: 'BEV003',
      itemType: 'SIMPLE',
      price: 80,
      gstRate: 5,
      unit: 'PCS',
    },
  }));

  items.push(await prisma.item.create({
    data: {
      tenantId: tenant.id,
      categoryId: beverages.id,
      name: 'Mango Juice',
      description: 'Fresh mango juice',
      sku: 'BEV004',
      itemType: 'SIMPLE',
      price: 100,
      gstRate: 12,
      unit: 'PCS',
    },
  }));

  // Main Course
  items.push(await prisma.item.create({
    data: {
      tenantId: tenant.id,
      categoryId: food.id,
      name: 'Chicken Biryani',
      description: 'Hyderabadi style chicken biryani',
      sku: 'FOOD001',
      itemType: 'SIMPLE',
      price: 250,
      gstRate: 5,
      unit: 'PCS',
    },
  }));

  items.push(await prisma.item.create({
    data: {
      tenantId: tenant.id,
      categoryId: food.id,
      name: 'Paneer Butter Masala',
      description: 'Rich creamy paneer curry',
      sku: 'FOOD002',
      itemType: 'SIMPLE',
      price: 200,
      gstRate: 5,
      unit: 'PCS',
    },
  }));

  items.push(await prisma.item.create({
    data: {
      tenantId: tenant.id,
      categoryId: food.id,
      name: 'Dal Tadka',
      description: 'Yellow lentils with spices',
      sku: 'FOOD003',
      itemType: 'SIMPLE',
      price: 150,
      gstRate: 5,
      unit: 'PCS',
    },
  }));

  items.push(await prisma.item.create({
    data: {
      tenantId: tenant.id,
      categoryId: food.id,
      name: 'Butter Naan',
      description: 'Indian bread with butter',
      sku: 'FOOD004',
      itemType: 'SIMPLE',
      price: 40,
      gstRate: 5,
      unit: 'PCS',
    },
  }));

  // Starters
  items.push(await prisma.item.create({
    data: {
      tenantId: tenant.id,
      categoryId: starters.id,
      name: 'Chicken 65',
      description: 'Spicy fried chicken',
      sku: 'START001',
      itemType: 'SIMPLE',
      price: 180,
      gstRate: 5,
      unit: 'PCS',
    },
  }));

  items.push(await prisma.item.create({
    data: {
      tenantId: tenant.id,
      categoryId: starters.id,
      name: 'Paneer Tikka',
      description: 'Grilled cottage cheese',
      sku: 'START002',
      itemType: 'SIMPLE',
      price: 160,
      gstRate: 5,
      unit: 'PCS',
    },
  }));

  items.push(await prisma.item.create({
    data: {
      tenantId: tenant.id,
      categoryId: starters.id,
      name: 'French Fries',
      description: 'Crispy potato fries',
      sku: 'START003',
      itemType: 'SIMPLE',
      price: 100,
      gstRate: 5,
      unit: 'PCS',
    },
  }));

  // Desserts
  items.push(await prisma.item.create({
    data: {
      tenantId: tenant.id,
      categoryId: desserts.id,
      name: 'Gulab Jamun',
      description: '2 pieces',
      sku: 'DESSERT001',
      itemType: 'SIMPLE',
      price: 60,
      gstRate: 5,
      unit: 'PCS',
    },
  }));

  items.push(await prisma.item.create({
    data: {
      tenantId: tenant.id,
      categoryId: desserts.id,
      name: 'Ice Cream',
      description: 'Vanilla ice cream',
      sku: 'DESSERT002',
      itemType: 'SIMPLE',
      price: 80,
      gstRate: 18,
      unit: 'PCS',
    },
  }));

  items.push(await prisma.item.create({
    data: {
      tenantId: tenant.id,
      categoryId: desserts.id,
      name: 'Kulfi',
      description: 'Traditional Indian frozen dessert',
      sku: 'DESSERT003',
      itemType: 'SIMPLE',
      price: 70,
      gstRate: 5,
      unit: 'PCS',
    },
  }));

  console.log(`✅ Created ${items.length} items\n`);

  // Create Inventory Batches
  console.log('Creating inventory batches...');
  
  const batches = [];
  const now = new Date();
  const futureDate = new Date();
  futureDate.setMonth(futureDate.getMonth() + 6); // 6 months from now

  for (const item of items) {
    const batch = await prisma.inventoryBatch.create({
      data: {
        tenantId: tenant.id,
        itemId: item.id,
        batchNumber: `BATCH-${item.sku}-001`,
        initialQuantity: 100,
        currentQuantity: 100,
        costPrice: Number(item.price) * 0.6, // 40% margin
        purchaseDate: now,
        expiryDate: futureDate,
      },
    });
    batches.push(batch);
  }

  console.log(`✅ Created ${batches.length} inventory batches\n`);

  console.log('🎉 Database seeded successfully!\n');
  console.log('Login credentials:');
  console.log('  Username: admin');
  console.log('  Password: Admin@123\n');
  console.log('Summary:');
  console.log(`  - 1 Tenant: ${tenant.name}`);
  console.log(`  - 1 User: ${adminUser.username}`);
  console.log(`  - 4 Categories`);
  console.log(`  - ${items.length} Items`);
  console.log(`  - ${batches.length} Inventory Batches`);
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
