import dotenv from 'dotenv';
dotenv.config();

const API_KEY = process.env.SMS_API_KEY;
const SENDER_ID = process.env.SMS_SENDER_ID || 'BRIQ';
const API_URL = 'https://karibu.briq.tz/v1/message/send-instant';

console.log('=== BRIQ SMS Debug Test ===');
console.log('API Key:', API_KEY ? `${API_KEY.substring(0, 8)}...` : 'NOT SET');
console.log('Sender ID:', SENDER_ID);
console.log('API URL:', API_URL);
console.log('SMS_ENABLED:', process.env.SMS_ENABLED);
console.log('SMS_PROVIDER:', process.env.SMS_PROVIDER);
console.log('');

const testPhone = '255768828247';

const payload = {
    content: 'MHEMA Test OTP: 123456',
    sender_id: SENDER_ID,
    recipients: [testPhone]
};

console.log('Payload:', JSON.stringify(payload, null, 2));
console.log('');

async function test() {
    try {
        console.log('Sending request...');
        const start = Date.now();

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': API_KEY
            },
            body: JSON.stringify(payload)
        });

        const elapsed = Date.now() - start;
        console.log(`Response received in ${elapsed}ms`);
        console.log('HTTP Status:', response.status, response.statusText);
        console.log('Headers:', Object.fromEntries(response.headers.entries()));

        const text = await response.text();
        console.log('Raw Response Body:', text);

        try {
            const json = JSON.parse(text);
            console.log('Parsed JSON:', JSON.stringify(json, null, 2));
        } catch (e) {
            console.log('(Response is not JSON)');
        }
    } catch (error) {
        console.error('Fetch Error:', error.message);
        console.error('Full Error:', error);
    }
}

test();
