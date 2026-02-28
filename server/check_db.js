import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const transportMethods = await prisma.transportMethod.findMany();
    console.log('---START---');
    console.log(JSON.stringify(transportMethods, null, 2));
    console.log('---END---');
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
