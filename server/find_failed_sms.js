import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        const logs = await prisma.smsLog.findMany({
            where: {
                status: {
                    contains: 'FAILED',
                    mode: 'insensitive'
                }
            }
        });
        console.log(`Found ${logs.length} FAILED logs.`);
        console.log(JSON.stringify(logs, null, 2));
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
