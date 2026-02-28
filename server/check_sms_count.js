import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        const count = await prisma.smsLog.count();
        console.log(`Total SMS Logs: ${count}`);

        const lastLog = await prisma.smsLog.findFirst({
            orderBy: { createdAt: 'desc' }
        });

        if (lastLog) {
            console.log('Latest Log:');
            console.log(JSON.stringify(lastLog, null, 2));
        }
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
