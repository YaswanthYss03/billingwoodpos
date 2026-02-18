import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateTenantBusinessType() {
  try {
    // Get the first tenant
    const tenant = await prisma.tenant.findFirst();
    
    if (!tenant) {
      console.log('No tenant found. Please run seed-data.ts first.');
      return;
    }

    console.log('\n📋 Current Tenant:');
    console.log(`  ID: ${tenant.id}`);
    console.log(`  Name: ${tenant.name}`);
    console.log(`  Current Business Type: ${tenant.businessType}`);

    // Ask what business type to set
    console.log('\n🔄 Updating business type...');
    
    // You can change this value to test different business types:
    // RESTAURANT, SWEET_SHOP, SUPERMARKET, CAFE, RETAIL, OTHER
    const newBusinessType = 'SWEET_SHOP';
    
    const updated = await prisma.tenant.update({
      where: { id: tenant.id },
      data: { businessType: newBusinessType },
    });

    console.log(`\n✅ Updated tenant business type to: ${updated.businessType}`);
    console.log('\nHow this affects the UI:');
    
    const features = {
      RESTAURANT: '✅ KOT enabled, Table management enabled',
      SWEET_SHOP: '❌ KOT disabled, Weight-based items enabled',
      SUPERMARKET: '❌ KOT disabled, Barcode scanning enabled',
      CAFE: '✅ KOT enabled, No table requirement',
      RETAIL: '❌ KOT disabled, Barcode scanning enabled',
      OTHER: '❌ KOT disabled, Basic features only',
    };

    console.log(`  ${features[newBusinessType as keyof typeof features]}`);
    console.log('\n💡 Login to the frontend to see the changes in the sidebar!');
    console.log('   - RESTAURANT/CAFE: Will see KOT menu');
    console.log('   - SWEET_SHOP/SUPERMARKET/RETAIL: KOT menu will be hidden');
    
  } catch (error) {
    console.error('Error updating tenant:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateTenantBusinessType();
