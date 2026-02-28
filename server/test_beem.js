import dotenv from 'dotenv';
dotenv.config();

const SMS_CONFIG = {
    apiKey: process.env.SMS_API_KEY || '',
    secretKey: process.env.SMS_SECRET || '',
    senderId: process.env.SMS_SENDER_ID || 'Rodway Shop',
    apiUrl: 'https://apisms.beem.africa/v1/send'
};

async function testBeem() {
    console.log('Testing Beem Africa API...');
    console.log(`Sender ID: ${SMS_CONFIG.senderId}`);

    const payload = {
        source_addr: SMS_CONFIG.senderId,
        encoding: 0,
        schedule_time: '',
        message: 'Thank you for choosing mhema logistics.',
        recipients: [
            {
                recipient_id: 1,
                dest_addr: '255712345678' // Fake but valid format
            }
        ]
    };

    const authString = Buffer.from(`${SMS_CONFIG.apiKey}:${SMS_CONFIG.secretKey}`).toString('base64');

    try {
        const response = await fetch(SMS_CONFIG.apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${authString}`
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        console.log(`HTTP Status: ${response.status}`);
        console.log('Response Body:');
        console.log(JSON.stringify(result, null, 2));
    } catch (error) {
        console.error('Fetch Error:', error.message);
    }
}

testBeem();
