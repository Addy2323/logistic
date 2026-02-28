import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        const logs = await prisma.$queryRaw`SELECT * FROM sms_logs ORDER BY created_at DESC LIMIT 20`;
        console.log('Raw SMS Logs:');
        console.log(JSON.stringify(logs, null, 2));
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
