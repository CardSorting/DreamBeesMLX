import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env
const envPath = path.resolve(__dirname, '../../.env');
dotenv.config({ path: envPath });

const SDXL_ENDPOINT = 'https://mariecoderinc--sdxl-multi-model-rtx6000-omniinferencertx-dad1ae.modal.run';
const ZIT_TURBO_ENDPOINT = 'https://mariecoderinc--zit-rtx6000-stable-fastapi-app.modal.run';
const ZIT_BASE_ENDPOINT = 'https://mariecoderinc--zit-rtx6000-stable-base-fastapi-app.modal.run';
const ANIMA_ENDPOINT = 'https://mariecoderinc--anima-inference-animainference-web.modal.run';

const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

const MODELS = [
    {
        id: 'nova-furry-xl',
        endpoint: SDXL_ENDPOINT,
        type: 'modal',
        prompt: 'A cool anthropomorphic red fox character wearing a stylish bomber jacket, digital art style, vibrant background.',
        steps: 30
    },
    {
        id: 'scyrax-pastel',
        endpoint: SDXL_ENDPOINT,
        type: 'modal',
        prompt: 'A dreamy, whimsical cottage floating on a fluffy cloud, soft pastel colors, watercolor painting style.',
        steps: 30
    },
    {
        id: 'wai-illustrious',
        endpoint: SDXL_ENDPOINT,
        type: 'modal',
        prompt: 'An epic fantasy anime illustration of a young wizard casting a glowing spell in an ancient library, dramatic lighting.',
        steps: 30
    },
    {
        id: 'rin-anime-blend',
        endpoint: SDXL_ENDPOINT,
        type: 'modal',
        prompt: 'A beautiful anime girl with long flowing silver hair and blue eyes, smiling gently, highly detailed face, clean lines, portrait shot.',
        steps: 30
    },
    {
        id: 'rin-anime-popcute',
        endpoint: SDXL_ENDPOINT,
        type: 'modal',
        prompt: 'A cute anime girl with neon pink and blue hair, colorful accessories, pop art style, bright and vibrant background.',
        steps: 30
    },
    {
        id: 'z-image-turbo-rtx6000',
        endpoint: ZIT_TURBO_ENDPOINT,
        type: 'modal-zit',
        prompt: 'A cute, friendly cartoon bee mascot character smiling and waving, clean vector art style, simple colorful background.',
        steps: 8
    },
    {
        id: 'z-image-base-rtx6000',
        endpoint: ZIT_BASE_ENDPOINT,
        type: 'modal-zit',
        prompt: 'A stunning fantasy valley with a winding river and glowing crystals, majestic mountains in the background, highly detailed.',
        steps: 28
    },
    {
        id: 'anima',
        endpoint: ANIMA_ENDPOINT,
        type: 'modal-anima',
        prompt: 'A classic anime schoolgirl standing in a classroom near the window with sunbeams filtering in, soft anime rendering.',
        steps: 30
    },
    {
        id: 'hassaku',
        endpoint: ANIMA_ENDPOINT,
        type: 'modal-anima',
        prompt: 'Retro 90s anime style drawing of a character looking up at the starry night sky from a balcony, hand-drawn look.',
        steps: 30
    },
    {
        id: 'kiwimix',
        endpoint: ANIMA_ENDPOINT,
        type: 'modal-anima',
        prompt: 'A cute magical forest creature with big eyes playing in a garden filled with giant colorful flowers, happy anime style.',
        steps: 30
    },
    {
        id: 'crystal-cuteness',
        endpoint: SDXL_ENDPOINT,
        type: 'modal',
        prompt: 'An  adorable chibi kitten with sparkling crystal eyes, glowing star details, cute pastel colors, magical girl aesthetic.',
        steps: 30
    },
    {
        id: 'veretoon-v10',
        endpoint: SDXL_ENDPOINT,
        type: 'modal',
        prompt: 'A fun, playful cartoon puppy dog playing with a red ball in a grassy yard, bold outlines, vibrant colors.',
        steps: 30
    },
    {
        id: 'nova-3d-cg-xl',
        endpoint: SDXL_ENDPOINT,
        type: 'modal',
        prompt: 'A high-quality 3D render of a friendly round helper robot, glossy plastic textures, studio lighting, octane render style.',
        steps: 30
    },
    {
        id: 'flux-2-dev',
        type: 'cloudflare',
        prompt: 'A highly realistic close-up portrait of a woman with freckles, smiling gently in natural golden hour sunlight, 35mm film photography.',
        steps: 25
    },
    {
        id: 'flux-2-klein-9b',
        type: 'cloudflare',
        prompt: 'A beautiful landscape photo of a serene mountain lake reflecting the orange and purple sunset sky, crisp and clear.',
        steps: 25
    }
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function getCloudflareImage(modelId, prompt, steps) {
    if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_API_TOKEN) {
        throw new Error('Cloudflare credentials missing in environment.');
    }
    const endpoint = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/ai/run/@cf/black-forest-labs/${modelId}`;
    const form = new FormData();
    form.append('prompt', prompt);
    form.append('width', '1024');
    form.append('height', '1024');
    form.append('steps', String(steps));

    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${CLOUDFLARE_API_TOKEN}`
        },
        body: form
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Cloudflare API error: ${response.status} ${text}`);
    }

    const payloadJson = await response.json();
    const base64Data = payloadJson.result?.image;
    if (!base64Data) {
        throw new Error(`Cloudflare API did not return image data: ${JSON.stringify(payloadJson)}`);
    }

    return Buffer.from(base64Data, 'base64');
}

async function getModalImage(model, prompt, steps) {
    const payload = model.type === 'modal-zit' 
        ? {
            prompt,
            negative_prompt: 'low quality, blurry, watermark',
            steps,
            aspect_ratio: '1:1',
            width: 1024,
            height: 1024
          }
        : model.type === 'modal-anima'
        ? {
            prompt,
            negative_prompt: 'low quality, blurry, watermark',
            model: model.id,
            steps,
            cfg: 4.5,
            scheduler: 'FlowMatchEuler',
            width: 1024,
            height: 1024
          }
        : {
            prompt,
            negative_prompt: 'low quality, blurry, watermark',
            model: model.id,
            steps,
            cfg: 4,
            scheduler: 'DPM++ 2M Karras',
            width: 1024,
            height: 1024
          };

    console.log(`[${model.id}] Submitting generation job...`);
    const submit = await fetch(`${model.endpoint}/generate`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'DreamBees/1.1'
        },
        body: JSON.stringify(payload)
    });

    if (!submit.ok) {
        const text = await submit.text();
        throw new Error(`Submit failed (${submit.status}): ${text}`);
    }

    const { job_id } = await submit.json();
    if (!job_id) throw new Error('No job_id returned');
    console.log(`[${model.id}] Job ID: ${job_id}. Polling...`);

    for (let poll = 0; poll < 100; poll++) {
        await sleep(poll === 0 ? 1000 : 3000);

        for (const route of ['/result/', '/jobs/']) {
            const res = await fetch(`${model.endpoint}${route}${job_id}`, {
                headers: { 'User-Agent': 'DreamBees/1.1' }
            });
            if (res.status === 202 || res.status === 404) continue;

            const contentType = res.headers.get('content-type') || '';
            if (res.ok && contentType.includes('image/')) {
                return Buffer.from(await res.arrayBuffer());
            }

            if (contentType.includes('application/json')) {
                const payloadJson = await res.json();
                const status = (payloadJson.status || '').toLowerCase();
                if (['failed', 'error', 'cancelled', 'canceled'].includes(status)) {
                    throw new Error(`Generation failed: ${payloadJson.error || JSON.stringify(payloadJson)}`);
                }
            }
        }
    }

    throw new Error('Timeout waiting for job completion');
}

async function saveImage(modelId, buffer) {
    const publicModelsDir = path.resolve(__dirname, '../../../public/models');
    const webPublicModelsDir = path.resolve(__dirname, '../../../web/public/models');

    fs.mkdirSync(publicModelsDir, { recursive: true });
    fs.mkdirSync(webPublicModelsDir, { recursive: true });

    // Save PNG
    const pngLocalPath = path.join(publicModelsDir, `${modelId}.png`);
    const pngWebPath = path.join(webPublicModelsDir, `${modelId}.png`);
    fs.writeFileSync(pngLocalPath, buffer);
    fs.writeFileSync(pngWebPath, buffer);
    console.log(`✓ Saved PNG to local and web models folders.`);

    // Convert and save JPG
    const jpgLocalPath = path.join(publicModelsDir, `${modelId}.jpg`);
    const jpgWebPath = path.join(webPublicModelsDir, `${modelId}.jpg`);
    
    const jpgBuffer = await sharp(buffer).jpeg({ quality: 90 }).toBuffer();
    fs.writeFileSync(jpgLocalPath, jpgBuffer);
    fs.writeFileSync(jpgWebPath, jpgBuffer);
    console.log(`✓ Saved JPG to local and web models folders.`);
}

async function main() {
    console.log(`Starting generation of generic previews for ${MODELS.length} models...`);

    const specificModel = process.argv[2];
    const targets = specificModel ? MODELS.filter(m => m.id === specificModel) : MODELS;

    if (targets.length === 0) {
        console.error(`No matching models found for: ${specificModel}`);
        process.exit(1);
    }

    for (const model of targets) {
        console.log(`\n========================================`);
        console.log(`Generating preview for: ${model.id}`);
        console.log(`Prompt: "${model.prompt}"`);
        console.log(`========================================`);

        try {
            let buffer;
            if (model.type === 'cloudflare') {
                buffer = await getCloudflareImage(model.id, model.prompt, model.steps);
            } else {
                buffer = await getModalImage(model, model.prompt, model.steps);
            }

            await saveImage(model.id, buffer);
            console.log(`✓ Completed: ${model.id}`);
        } catch (error) {
            console.error(`✗ Failed preview generation for ${model.id}:`, error);
        }
    }

    console.log('\nAll done!');
}

main().catch(console.error);
