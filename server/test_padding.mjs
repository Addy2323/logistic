import 'dotenv/config';

// The key provided:
const apiKey = 'fd939602333ecad7';
const secretKeyWithoutPadding = 'ZGJkNzI3ZGI4ZDI3N2QwMDc0ZGVkMzI0ZTkxZjljYjNhYWFjMTYxYmFmOWVmMWU';
const secretKeyWithPadding = secretKeyWithoutPadding + '=';

async function testBeem(secret) {
    const authString = Buffer.from(`${apiKey}:${secret}`).toString('base64');
    console.log(`Testing with secret (length ${secret.length}): ${secret}`);
    
    try {
        const response = await fetch('https://apisms.beem.africa/v1/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${authString}`
            },
            body: JSON.stringify({
                source_addr: 'MHEMA CARGO',
                schedule_time: '',
                encoding: 0,
                message: 'Test message',
                recipients: [ { recipient_id: 1, dest_addr: '255768828247' } ]
            })
        });
        
        const result = await response.json();
        console.log(`Response:` , result);
    } catch(e) {
        console.log(`Error:` , e.message);
    }
}

async function main() {
    await testBeem(secretKeyWithoutPadding);
    console.log('\n--------------------\n');
    await testBeem(secretKeyWithPadding);
}

main();
