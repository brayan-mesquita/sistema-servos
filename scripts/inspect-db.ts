import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.voluntario.count();
  console.log('Total volunteers in DB:', count);
  if (count > 0) {
    const firstFive = await prisma.voluntario.findMany({ take: 5 });
    console.log('Sample volunteers:', JSON.stringify(firstFive, null, 2));
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
