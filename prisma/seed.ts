import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const defaultSectors = [
    'Eventos',
    'Segurança',
    'Logística',
    'DIP',
    'ADM',
    'Hakunas',
    'Mídia',
    'QAP',
    'Comunicação'
  ];

  console.log('Seeding default sectors...');

  for (const sectorName of defaultSectors) {
    const sector = await prisma.setor.upsert({
      where: { name: sectorName },
      update: {},
      create: { name: sectorName }
    });
    console.log(`- Sector: ${sector.name} (${sector.id})`);
  }

  console.log('Seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
