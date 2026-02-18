import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Checking for user: admin@gmail.com\n');

  const user = await prisma.user.findFirst({
    where: { email: 'admin@gmail.com' },
    include: {
      tenant: true,
    },
  });

  if (!user) {
    console.log('❌ User not found in database');
    
    // Check all users
    const allUsers = await prisma.user.findMany({
      select: {
        email: true,
        name: true,
        role: true,
        isActive: true,
      },
    });
    
    console.log('\n📝 All users in database:');
    console.table(allUsers);
  } else {
    console.log('✅ User found:');
    console.log(JSON.stringify(user, null, 2));
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('Error:', e);
  process.exit(1);
});
