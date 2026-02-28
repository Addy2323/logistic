import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        const logs = await prisma.smsLog.findMany();
        console.log(`Total Logs found: ${logs.length}`);
        logs.forEach(log => {
            console.log(JSON.stringify(log));
        });
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
