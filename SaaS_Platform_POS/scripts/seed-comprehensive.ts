import { PrismaClient, Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

async function clearDatabase() {
  console.log('🗑️  Clearing existing data...\n');
  
  await prisma.billItemBatch.deleteMany({});
  await prisma.billItem.deleteMany({});
  await prisma.bill.deleteMany({});
  await prisma.kOTItem.deleteMany({});
  await prisma.kOT.deleteMany({});
  await prisma.inventoryBatch.deleteMany({});
  await prisma.purchaseItem.deleteMany({});
  await prisma.purchase.deleteMany({});
  await prisma.item.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.tenant.deleteMany({});

  console.log('✅ Database cleared\n');
}

async function createRestaurant() {
  console.log('🍽️  Creating RESTAURANT tenant...\n');

  const tenant = await prisma.tenant.create({
    data: {
      name: 'Golden Fork Restaurant',
      businessType: 'RESTAURANT',
      email: 'admin@goldenfork.com',
      phone: '+919876543210',
      address: '123 Main Street, City Center',
      gstNumber: '29ABCDE1234F1Z5',
      settings: {
        kotEnabled: true,
        autoGenerateKOT: true,
        requireTableNumber: true,
        enableThermalPrinter: false,
      },
    },
  });

  // Create users
  const hashedPassword = await bcrypt.hash('Admin@123', 10);
  
  const owner = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      username: 'restaurant_owner',
      password: hashedPassword,
      email: 'owner@goldenfork.com',
      name: 'Restaurant Owner',
      phone: '+919876543210',
      role: 'OWNER',
    },
  });

  const manager = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      username: 'restaurant_manager',
      password: hashedPassword,
      email: 'manager@goldenfork.com',
      name: 'Restaurant Manager',
      phone: '+919876543211',
      role: 'MANAGER',
    },
  });

  const staff = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      username: 'restaurant_staff',
      password: hashedPassword,
      email: 'staff@goldenfork.com',
      name: 'Restaurant Staff',
      phone: '+919876543212',
      role: 'CASHIER',
    },
  });

  console.log(`✅ Created tenant: ${tenant.name}`);
  console.log(`✅ Created 3 users: ${owner.username}, ${manager.username}, ${staff.username}\n`);

  // Create categories
  const categories = await Promise.all([
    prisma.category.create({
      data: {
        tenantId: tenant.id,
        name: 'Starters',
        description: 'Appetizers and starters',
        sortOrder: 1,
      },
    }),
    prisma.category.create({
      data: {
        tenantId: tenant.id,
        name: 'Main Course',
        description: 'Main dishes',
        sortOrder: 2,
      },
    }),
    prisma.category.create({
      data: {
        tenantId: tenant.id,
        name: 'Beverages',
        description: 'Drinks and beverages',
        sortOrder: 3,
      },
    }),
    prisma.category.create({
      data: {
        tenantId: tenant.id,
        name: 'Desserts',
        description: 'Sweet dishes',
        sortOrder: 4,
      },
    }),
  ]);

  console.log(`✅ Created ${categories.length} categories\n`);

  // Create items
  const items = await Promise.all([
    // Starters
    prisma.item.create({
      data: {
        tenantId: tenant.id,
        categoryId: categories[0].id,
        name: 'Chicken Wings',
        description: 'Spicy grilled chicken wings',
        price: new Prisma.Decimal(250),
        gstRate: new Prisma.Decimal(5),
        unit: 'PLATE',
        itemType: 'SIMPLE',
        trackInventory: true,
      },
    }),
    prisma.item.create({
      data: {
        tenantId: tenant.id,
        categoryId: categories[0].id,
        name: 'Paneer Tikka',
        description: 'Grilled cottage cheese',
        price: new Prisma.Decimal(220),
        gstRate: new Prisma.Decimal(5),
        unit: 'PLATE',
        itemType: 'SIMPLE',
        trackInventory: true,
      },
    }),
    // Main Course
    prisma.item.create({
      data: {
        tenantId: tenant.id,
        categoryId: categories[1].id,
        name: 'Butter Chicken',
        description: 'Creamy chicken curry',
        price: new Prisma.Decimal(350),
        gstRate: new Prisma.Decimal(5),
        unit: 'PLATE',
        itemType: 'SIMPLE',
        trackInventory: true,
      },
    }),
    prisma.item.create({
      data: {
        tenantId: tenant.id,
        categoryId: categories[1].id,
        name: 'Biryani',
        description: 'Fragrant rice dish',
        price: new Prisma.Decimal(300),
        gstRate: new Prisma.Decimal(5),
        unit: 'PLATE',
        itemType: 'SIMPLE',
        trackInventory: true,
      },
    }),
    // Beverages
    prisma.item.create({
      data: {
        tenantId: tenant.id,
        categoryId: categories[2].id,
        name: 'Fresh Lime Soda',
        description: 'Refreshing drink',
        price: new Prisma.Decimal(80),
        gstRate: new Prisma.Decimal(12),
        unit: 'PCS',
        itemType: 'SIMPLE',
        trackInventory: true,
      },
    }),
    prisma.item.create({
      data: {
        tenantId: tenant.id,
        categoryId: categories[2].id,
        name: 'Mango Lassi',
        description: 'Yogurt-based drink',
        price: new Prisma.Decimal(100),
        gstRate: new Prisma.Decimal(12),
        unit: 'PCS',
        itemType: 'SIMPLE',
        trackInventory: true,
      },
    }),
    // Desserts
    prisma.item.create({
      data: {
        tenantId: tenant.id,
        categoryId: categories[3].id,
        name: 'Gulab Jamun',
        description: 'Sweet fried dumplings',
        price: new Prisma.Decimal(120),
        gstRate: new Prisma.Decimal(5),
        unit: 'PLATE',
        itemType: 'SIMPLE',
        trackInventory: true,
      },
    }),
  ]);

  console.log(`✅ Created ${items.length} items\n`);

  // Add inventory batches
  for (const item of items) {
    await prisma.inventoryBatch.create({
      data: {
        tenantId: tenant.id,
        itemId: item.id,
        batchNumber: `BATCH-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        initialQuantity: new Prisma.Decimal(50),
        currentQuantity: new Prisma.Decimal(50),
        costPrice: new Prisma.Decimal(Number(item.price) * 0.4),
        purchaseDate: new Date(),
      },
    });
  }

  console.log(`✅ Created inventory batches for all items\n`);

  return { tenant, users: [owner, manager, staff], categories, items };
}

async function createRetailStore() {
  console.log('🛒 Creating RETAIL store tenant...\n');

  const tenant = await prisma.tenant.create({
    data: {
      name: 'Fashion Hub Store',
      businessType: 'RETAIL',
      email: 'admin@fashionhub.com',
      phone: '+919876543220',
      address: '456 Shopping Plaza, Mall Road',
      gstNumber: '29XYZAB5678G2W6',
      settings: {
        kotEnabled: false,
        autoGenerateKOT: false,
        requireTableNumber: false,
        enableThermalPrinter: true,
      },
    },
  });

  const hashedPassword = await bcrypt.hash('Admin@123', 10);
  
  const owner = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      username: 'retail_owner',
      password: hashedPassword,
      email: 'owner@fashionhub.com',
      name: 'Store Owner',
      phone: '+919876543220',
      role: 'OWNER',
    },
  });

  const cashier = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      username: 'retail_cashier',
      password: hashedPassword,
      email: 'cashier@fashionhub.com',
      name: 'Store Cashier',
      phone: '+919876543221',
      role: 'CASHIER',
    },
  });

  console.log(`✅ Created tenant: ${tenant.name}`);
  console.log(`✅ Created 2 users: ${owner.username}, ${cashier.username}\n`);

  // Create categories
  const categories = await Promise.all([
    prisma.category.create({
      data: {
        tenantId: tenant.id,
        name: 'Shirts',
        description: 'Casual and formal shirts',
        sortOrder: 1,
      },
    }),
    prisma.category.create({
      data: {
        tenantId: tenant.id,
        name: 'Jeans',
        description: 'Denim jeans',
        sortOrder: 2,
      },
    }),
    prisma.category.create({
      data: {
        tenantId: tenant.id,
        name: 'Accessories',
        description: 'Belts, wallets, etc.',
        sortOrder: 3,
      },
    }),
  ]);

  // Create items
  const items = await Promise.all([
    prisma.item.create({
      data: {
        tenantId: tenant.id,
        categoryId: categories[0].id,
        name: 'Formal Shirt - White',
        description: 'Cotton formal shirt',
        sku: 'SHT-WHT-001',
        price: new Prisma.Decimal(1299),
        gstRate: new Prisma.Decimal(12),
        unit: 'PCS',
        itemType: 'SIMPLE',
        trackInventory: true,
      },
    }),
    prisma.item.create({
      data: {
        tenantId: tenant.id,
        categoryId: categories[0].id,
        name: 'Casual Shirt - Blue',
        description: 'Cotton casual shirt',
        sku: 'SHT-BLU-002',
        price: new Prisma.Decimal(999),
        gstRate: new Prisma.Decimal(12),
        unit: 'PCS',
        itemType: 'SIMPLE',
        trackInventory: true,
      },
    }),
    prisma.item.create({
      data: {
        tenantId: tenant.id,
        categoryId: categories[1].id,
        name: 'Slim Fit Jeans',
        description: 'Dark blue denim',
        sku: 'JNS-SLM-001',
        price: new Prisma.Decimal(1799),
        gstRate: new Prisma.Decimal(12),
        unit: 'PCS',
        itemType: 'SIMPLE',
        trackInventory: true,
      },
    }),
    prisma.item.create({
      data: {
        tenantId: tenant.id,
        categoryId: categories[2].id,
        name: 'Leather Belt',
        description: 'Genuine leather belt',
        sku: 'BLT-LTR-001',
        price: new Prisma.Decimal(599),
        gstRate: new Prisma.Decimal(18),
        unit: 'PCS',
        itemType: 'SIMPLE',
        trackInventory: true,
      },
    }),
  ]);

  console.log(`✅ Created ${categories.length} categories and ${items.length} items\n`);

  // Add inventory
  for (const item of items) {
    await prisma.inventoryBatch.create({
      data: {
        tenantId: tenant.id,
        itemId: item.id,
        batchNumber: `BATCH-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        initialQuantity: new Prisma.Decimal(30),
        currentQuantity: new Prisma.Decimal(30),
        costPrice: new Prisma.Decimal(Number(item.price) * 0.5),
        purchaseDate: new Date(),
      },
    });
  }

  console.log(`✅ Created inventory batches\n`);

  return { tenant, users: [owner, cashier], categories, items };
}

async function createGroceryStore() {
  console.log('🥬 Creating GROCERY store tenant...\n');

  const tenant = await prisma.tenant.create({
    data: {
      name: 'Fresh Mart Grocery',
      businessType: 'GROCERY',
      email: 'admin@freshmart.com',
      phone: '+919876543230',
      address: '789 Market Street, Downtown',
      gstNumber: '29PQRST9012H3X7',
      settings: {
        kotEnabled: false,
        autoGenerateKOT: false,
        requireTableNumber: false,
        enableThermalPrinter: true,
      },
    },
  });

  const hashedPassword = await bcrypt.hash('Admin@123', 10);
  
  const owner = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      username: 'grocery_owner',
      password: hashedPassword,
      email: 'owner@freshmart.com',
      name: 'Grocery Owner',
      phone: '+919876543230',
      role: 'OWNER',
    },
  });

  const manager = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      username: 'grocery_manager',
      password: hashedPassword,
      email: 'manager@freshmart.com',
      name: 'Store Manager',
      phone: '+919876543231',
      role: 'MANAGER',
    },
  });

  const staff = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      username: 'grocery_staff',
      password: hashedPassword,
      email: 'staff@freshmart.com',
      name: 'Counter Staff',
      phone: '+919876543232',
      role: 'CASHIER',
    },
  });

  console.log(`✅ Created tenant: ${tenant.name}`);
  console.log(`✅ Created 3 users: ${owner.username}, ${manager.username}, ${staff.username}\n`);

  // Create categories
  const categories = await Promise.all([
    prisma.category.create({
      data: {
        tenantId: tenant.id,
        name: 'Vegetables',
        description: 'Fresh vegetables',
        sortOrder: 1,
      },
    }),
    prisma.category.create({
      data: {
        tenantId: tenant.id,
        name: 'Fruits',
        description: 'Fresh fruits',
        sortOrder: 2,
      },
    }),
    prisma.category.create({
      data: {
        tenantId: tenant.id,
        name: 'Dairy',
        description: 'Milk and dairy products',
        sortOrder: 3,
      },
    }),
    prisma.category.create({
      data: {
        tenantId: tenant.id,
        name: 'Grains',
        description: 'Rice, wheat, lentils',
        sortOrder: 4,
      },
    }),
  ]);

  // Create items
  const items = await Promise.all([
    prisma.item.create({
      data: {
        tenantId: tenant.id,
        categoryId: categories[0].id,
        name: 'Tomatoes',
        description: 'Fresh red tomatoes',
        price: new Prisma.Decimal(40),
        gstRate: new Prisma.Decimal(0),
        unit: 'KG',
        itemType: 'WEIGHTED',
        trackInventory: true,
      },
    }),
    prisma.item.create({
      data: {
        tenantId: tenant.id,
        categoryId: categories[0].id,
        name: 'Onions',
        description: 'Fresh onions',
        price: new Prisma.Decimal(30),
        gstRate: new Prisma.Decimal(0),
        unit: 'KG',
        itemType: 'WEIGHTED',
        trackInventory: true,
      },
    }),
    prisma.item.create({
      data: {
        tenantId: tenant.id,
        categoryId: categories[1].id,
        name: 'Apples',
        description: 'Fresh red apples',
        price: new Prisma.Decimal(150),
        gstRate: new Prisma.Decimal(0),
        unit: 'KG',
        itemType: 'WEIGHTED',
        trackInventory: true,
      },
    }),
    prisma.item.create({
      data: {
        tenantId: tenant.id,
        categoryId: categories[1].id,
        name: 'Bananas',
        description: 'Fresh bananas',
        price: new Prisma.Decimal(60),
        gstRate: new Prisma.Decimal(0),
        unit: 'KG',
        itemType: 'WEIGHTED',
        trackInventory: true,
      },
    }),
    prisma.item.create({
      data: {
        tenantId: tenant.id,
        categoryId: categories[2].id,
        name: 'Milk - Full Cream',
        description: 'Fresh cow milk',
        price: new Prisma.Decimal(60),
        gstRate: new Prisma.Decimal(0),
        unit: 'L',
        itemType: 'WEIGHTED',
        trackInventory: true,
      },
    }),
    prisma.item.create({
      data: {
        tenantId: tenant.id,
        categoryId: categories[3].id,
        name: 'Basmati Rice',
        description: 'Premium long grain rice',
        price: new Prisma.Decimal(120),
        gstRate: new Prisma.Decimal(5),
        unit: 'KG',
        itemType: 'WEIGHTED',
        trackInventory: true,
      },
    }),
  ]);

  console.log(`✅ Created ${categories.length} categories and ${items.length} items\n`);

  // Add inventory
  for (const item of items) {
    await prisma.inventoryBatch.create({
      data: {
        tenantId: tenant.id,
        itemId: item.id,
        batchNumber: `BATCH-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        initialQuantity: new Prisma.Decimal(100),
        currentQuantity: new Prisma.Decimal(100),
        costPrice: new Prisma.Decimal(Number(item.price) * 0.7),
        purchaseDate: new Date(),
      },
    });
  }

  console.log(`✅ Created inventory batches\n`);

  return { tenant, users: [owner, manager, staff], categories, items };
}

async function main() {
  console.log('🌱 Starting comprehensive database seeding...\n');
  console.log('=' .repeat(60) + '\n');

  await clearDatabase();

  const restaurant = await createRestaurant();
  console.log('=' .repeat(60) + '\n');

  const retail = await createRetailStore();
  console.log('=' .repeat(60) + '\n');

  const grocery = await createGroceryStore();
  console.log('=' .repeat(60) + '\n');

  console.log('✨ Seeding complete!\n');
  console.log('📝 LOGIN CREDENTIALS');
  console.log('=' .repeat(60));
  console.log('\n🍽️  RESTAURANT - Golden Fork Restaurant');
  console.log('   Owner:   restaurant_owner    | Password: Admin@123');
  console.log('   Manager: restaurant_manager  | Password: Admin@123');
  console.log('   Cashier: restaurant_staff    | Password: Admin@123');
  
  console.log('\n🛒 RETAIL - Fashion Hub Store');
  console.log('   Owner:   retail_owner        | Password: Admin@123');
  console.log('   Cashier: retail_cashier      | Password: Admin@123');
  
  console.log('\n🥬 GROCERY - Fresh Mart Grocery');
  console.log('   Owner:   grocery_owner       | Password: Admin@123');
  console.log('   Manager: grocery_manager     | Password: Admin@123');
  console.log('   Cashier: grocery_staff       | Password: Admin@123');
  
  console.log('\n' + '=' .repeat(60));
  console.log('\n📊 DATABASE SUMMARY');
  console.log('=' .repeat(60));
  console.log(`✅ ${3} Tenants created`);
  console.log(`✅ ${8} Users created`);
  console.log(`✅ ${11} Categories created`);
  console.log(`✅ ${17} Items created`);
  console.log(`✅ ${17} Inventory batches created`);
  console.log('\n' + '=' .repeat(60));
  
  console.log('\n💡 FEATURES BY BUSINESS TYPE');
  console.log('=' .repeat(60));
  console.log('RESTAURANT   | ✅ KOT | ✅ Tables | ❌ Weight');
  console.log('RETAIL       | ❌ KOT | ❌ Tables | ❌ Weight');
  console.log('GROCERY      | ❌ KOT | ❌ Tables | ✅ Weight');
  console.log('=' .repeat(60) + '\n');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
