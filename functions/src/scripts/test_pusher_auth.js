
import fetch from 'node-fetch';

/**
 * MOCK TEST for Pusher Auth
 * This script demonstrates how to call the new auth endpoint.
 * In a real environment, you'd need a valid Firebase ID Token.
 */

const AUTH_URL = 'http://localhost:5001/[PROJECT_ID]/us-central1/servePusherAuth'; // Update with your local emulator URL
const MOCK_TOKEN = 'your_id_token_here';
const SOCKET_ID = '1234.5678';
const CHANNEL_NAME = 'private-chat-image123-user456';

async function testAuth() {
    console.log(`[TEST] Authenticating for channel: ${CHANNEL_NAME}`);

    try {
        const response = await fetch(AUTH_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${MOCK_TOKEN}`
            },
            body: JSON.stringify({
                socket_id: SOCKET_ID,
                channel_name: CHANNEL_NAME
            })
        });

        const data = await response.text();
        console.log(`[RESULT] Status: ${response.status}`);
        console.log(`[RESULT] Data: ${data}`);

        if (response.status === 403) {
            console.log('[INFO] Received 403. This is expected if the token is invalid or missing.');
        }

    } catch (error) {
        console.error('[ERROR] Request failed:', error);
    }
}

testAuth();
