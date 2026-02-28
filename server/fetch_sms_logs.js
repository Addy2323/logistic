import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        const logs = await prisma.smsLog.findMany({
            orderBy: { createdAt: 'desc' },
            take: 50
        });

        console.log('Last 50 SMS Logs:');
        logs.forEach(log => {
            console.log(`ID: ${log.id}`);
            console.log(`Phone: ${log.phone}`);
            console.log(`Status: ${log.status}`);
            console.log(`Error: ${log.error}`);
            console.log(`Message: ${log.message}`);
            console.log(`Date: ${log.createdAt}`);
            console.log('---');
        });
    } catch (error) {
        console.error('Error fetching logs:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
