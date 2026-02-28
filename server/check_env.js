import dotenv from 'dotenv';
dotenv.config();

const dbUrl = process.env.DATABASE_URL || 'NOT SET';
console.log(`DATABASE_URL: ${dbUrl.substring(0, 20)}...`);
