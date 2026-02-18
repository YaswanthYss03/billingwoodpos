import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

async function main() {
  console.log('=== Checking Database ===\n');
  
  const tenants = await prisma.tenant.findMany();
  console.log(`Tenants: ${tenants.length}`);
  tenants.forEach(t => console.log(`  - ${t.name} (${t.id})`));
  
  const users = await prisma.user.findMany();
  console.log(`\nUsers: ${users.length}`);
  users.forEach(u => console.log(`  - ${u.username} (tenantId: ${u.tenantId})`));
  
  const categories = await prisma.category.findMany();
  console.log(`\nCategories: ${categories.length}`);
  categories.forEach(c => console.log(`  - ${c.name} (tenantId: ${c.tenantId})`));
  
  const items = await prisma.item.findMany();
  console.log(`\nItems: ${items.length}`);
  items.forEach(i => console.log(`  - ${i.name} (tenantId: ${i.tenantId})`));
}

main()
  .catch(e => console.error('Error:', e))
  .finally(() => prisma.$disconnect());
