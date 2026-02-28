import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load env from the server directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

import smsService from './src/services/smsService.js';

async function test() {
    const phone = '255768828247';
    const message = 'MHEMA Logistics Test Message. Please confirm if received.';

    console.log(`Attempting to send SMS to ${phone}...`);
    try {
        const result = await smsService.sendSms(phone, message);
        console.log('Result:', JSON.stringify(result, null, 2));

        if (result.success) {
            console.log('✅ SMS sent successfully according to the API.');
        } else {
            console.log('❌ SMS failed to send.');
        }
    } catch (error) {
        console.error('Error during test:', error.message);
    }
}

test();
