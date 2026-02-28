import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        const stats = await prisma.smsLog.groupBy({
            by: ['status'],
            _count: {
                status: true
            }
        });

        console.log('SMS Log Stats:');
        console.log(JSON.stringify(stats, null, 2));

        const failedLogs = await prisma.smsLog.findMany({
            where: { status: 'FAILED' },
            orderBy: { createdAt: 'desc' },
            take: 10
        });

        console.log('\nLatest Failed Logs:');
        console.log(JSON.stringify(failedLogs, null, 2));
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
