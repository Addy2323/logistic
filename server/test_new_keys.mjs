import 'dotenv/config';

// The NEW key provided:
const apiKey = '5ab658980dd12068';
const secretKey = 'YmE1YjhjZjcyYzc5ZmE1YzcwM2YwZGMzODBmNTBmZmJlN2UwZTc4NzYxMzBlNTU4NzZlMzc1ZWI3MWFkNGQzMg==';

async function testBeem() {
    const authString = Buffer.from(`${apiKey}:${secretKey}`).toString('base64');
    console.log(`Testing with new secret...`);
    
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
                message: 'Test message with new key!',
                recipients: [ { recipient_id: 1, dest_addr: '255768828247' } ]
            })
        });
        
        const result = await response.json();
        console.log(`Response:` , result);
    } catch(e) {
        console.log(`Error:` , e.message);
    }
}

testBeem();
