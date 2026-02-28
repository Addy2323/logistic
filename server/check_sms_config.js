import dotenv from 'dotenv';
dotenv.config();

console.log('SMS Config:');
console.log(`SMS_API_KEY: ${process.env.SMS_API_KEY ? 'SET' : 'NOT SET'}`);
console.log(`SMS_SECRET: ${process.env.SMS_SECRET ? 'SET' : 'NOT SET'}`);
console.log(`SMS_SENDER_ID: ${process.env.SMS_SENDER_ID || 'NOT SET'}`);
console.log(`SMS_ENABLED: ${process.env.SMS_ENABLED}`);
