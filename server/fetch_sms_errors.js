import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        const logs = await prisma.smsLog.findMany({
            orderBy: { createdAt: 'desc' },
            take: 50
        });

        console.log(`Found ${logs.length} logs.`);
        logs.forEach(log => {
            console.log(`[${log.createdAt}] ${log.phone}: ${log.status} - Error: ${log.error}`);
            console.log(`Message: ${log.message.substring(0, 50)}...`);
            console.log('---');
        });
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
