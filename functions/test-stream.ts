import { WorkerAiService } from './src/lib/workerAi';
import { logger } from './src/lib/utils';
import http from 'http';

// We override the static un-modifiable CF_URL directly for testing
(WorkerAiService as any).CF_URL = 'http://localhost:9999/mock-stream';

// Start a local mock HTTP server
const server = http.createServer((req, res) => {
    if (req.url === '/mock-stream' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });

        req.on('end', () => {
            try {
                const requestData = JSON.parse(body);
                const mockType = requestData.messages.find((m: any) => m.role === 'user')?.content; // We use the user message to decide the behavior

                if (mockType === 'SCENARIO_A') {
                    // Scenario A: Perfect Stream
                    console.log('Server: Generating Perfect Stream...');
                    res.writeHead(200, {
                        'Content-Type': 'text/event-stream',
                        'Cache-Control': 'no-cache',
                        'Connection': 'keep-alive',
                    });

                    const chunks = ['Hello ', 'from ', 'the ', 'mock ', 'provider!'];
                    let i = 0;
                    const interval = setInterval(() => {
                        if (i < chunks.length) {
                            res.write(`data: ${JSON.stringify({ response: chunks[i] })}\n\n`);
                            i++;
                        } else {
                            res.write('data: [DONE]\n\n');
                            res.end();
                            clearInterval(interval);
                        }
                    }, 100);

                } else if (mockType === 'SCENARIO_B') {
                    // Scenario B: Abrupt Disconnect
                    console.log('Server: Dropping connection mid-stream...');
                    res.writeHead(200, {
                        'Content-Type': 'text/event-stream',
                        'Cache-Control': 'no-cache',
                        'Connection': 'keep-alive',
                    });

                    res.write(`data: ${JSON.stringify({ response: 'I am about to ' })}\n\n`);
                    setTimeout(() => {
                        // Destroy the underlying socket forcefully
                        res.destroy();
                    }, 200);

                } else if (mockType === 'SCENARIO_C') {
                    // Scenario C: Malformed JSON
                    console.log('Server: Emitting Garbage JSON payload...');
                    res.writeHead(200, {
                        'Content-Type': 'text/event-stream',
                        'Cache-Control': 'no-cache',
                        'Connection': 'keep-alive',
                    });

                    res.write(`data: { "response": "Valid Chunk" }\n\n`);
                    setTimeout(() => {
                        res.write(`data: { invalid_json_garbage_format.. }\n\n`);
                        res.write('data: [DONE]\n\n');
                        res.end();
                    }, 200);

                } else {
                    res.writeHead(400);
                    res.end('Unknown mock type');
                }
            } catch (e) {
                res.writeHead(400);
                res.end('Bad Request');
            }
        });
    } else {
        res.writeHead(404);
        res.end();
    }
});


async function runTests() {
    server.listen(9999, async () => {
        console.log('\n--- Mock Server Running on :9999 ---\n');

        try {
            console.log('>>> SCENARIO A: Perfect Stream');
            try {
                const resultA = await WorkerAiService.streamChatCompletion([{ role: 'user', content: 'SCENARIO_A' }], (chunk) => {
                    process.stdout.write(chunk);
                });
                console.log('\nResult A:', resultA);
            } catch (err: any) {
                console.error('\nSCENARIO A FAILED:', err.message);
            }
            console.log('------------------------------------\n');

            console.log('>>> SCENARIO B: Abrupt Disconnect (Should Throw & Default Tokens to 1)');
            try {
                await WorkerAiService.streamChatCompletion([{ role: 'user', content: 'SCENARIO_B' }], (chunk) => {
                    process.stdout.write(chunk);
                });
            } catch (e: any) {
                // This simulates the handler catch block tearing down the UI
                console.log(`\nClient successfully caught TCP Drop Error: ${e.message}`);
                console.log('This would trigger broadcastWorkerAiChunk(..., isFinal: true) on the UI.');
            }
            console.log('------------------------------------\n');

            console.log('>>> SCENARIO C: Malformed JSON (Should Ignore Garbage Chunk/Continue)');
            try {
                const resultC = await WorkerAiService.streamChatCompletion([{ role: 'user', content: 'SCENARIO_C' }], (chunk) => {
                    process.stdout.write(chunk);
                });
                console.log('\nResult C:', resultC);
            } catch (err: any) {
                console.error('\nSCENARIO C FAILED:', err.message);
            }
            console.log('------------------------------------\n');

        } finally {
            server.close();
            console.log('Test Suite Finished. Exiting.');
            process.exit(0);
        }
    });
}

runTests();
