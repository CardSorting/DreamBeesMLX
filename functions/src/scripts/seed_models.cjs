
const admin = require('firebase-admin');

// Use Application Default Credentials (gcloud auth application-default login)
admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: 'dreambees-alchemist'
});

const db = admin.firestore();

const MODELS = [

    {
        id: 'nova-furry-xl',
        name: 'Nova Furry XL',
        description: 'Optimized for furry art and anthropomorphic characters. Auto-tags quality prompts.',
        type: 'SDXL',
        order: 3,
        isActive: true,
        image: '/models/nova-furry-xl.png',
        thumbnail: '/models/nova-furry-xl.png',
        previewImages: ['/models/nova-furry-xl.png']
    },
    {
        id: 'scyrax-pastel',
        name: 'Scyrax Pastel',
        description: 'Soft, pastel color palettes and dreamy atmospheres.',
        type: 'SDXL',
        order: 6,
        isActive: true,
        image: '/models/scyrax-pastel.png',
        thumbnail: '/models/scyrax-pastel.png',
        previewImages: ['/models/scyrax-pastel.png']
    },

    {
        id: 'wai-illustrious',
        name: 'Wai Illustrious',
        description: 'High-quality illustrations with enforced quality tags and custom High-Res Fix workflow.',
        type: 'SDXL',
        order: 12,
        isActive: true,
        image: '/models/wai-illustrious.png',
        thumbnail: '/models/wai-illustrious.png',
        previewImages: ['/models/wai-illustrious.png']
    },
    {
        id: 'rin-anime-blend',
        name: 'Rin Anime Blend',
        description: 'A smooth blend of popular anime models for high-quality results.',
        type: 'SDXL',
        order: 14,
        isActive: true,
        image: '/models/rin-anime-blend.png',
        thumbnail: '/models/rin-anime-blend.png',
        previewImages: ['/models/rin-anime-blend.png']
    },
    {
        id: 'rin-anime-popcute',
        name: 'Rin Anime Popcute',
        description: 'Bright, vibrant, and cute anime style with popping colors.',
        type: 'SDXL',
        order: 15,
        isActive: true,
        image: '/models/rin-anime-popcute.png',
        thumbnail: '/models/rin-anime-popcute.png',
        previewImages: ['/models/rin-anime-popcute.png']
    },
    {
        id: 'z-image-turbo-rtx6000',
        name: 'Z-Image Turbo RTX 6000',
        description: 'Ultra-fast anime & general image generation powered by Z-Image-Turbo on RTX 6000.',
        type: 'Image',
        order: 16,
        isActive: true,
        image: '/models/z-image-turbo-rtx6000.png',
        thumbnail: '/models/z-image-turbo-rtx6000.png',
        previewImages: ['/models/z-image-turbo-rtx6000.png']
    },
    {
        id: 'z-image-base-rtx6000',
        name: 'Z-Image Base RTX 6000',
        description: 'High-quality image generation powered by Z-Image Base on RTX 6000.',
        type: 'Image',
        order: 17,
        isActive: true,
        image: '/models/z-image-base-rtx6000.png',
        thumbnail: '/models/z-image-base-rtx6000.png',
        previewImages: ['/models/z-image-base-rtx6000.png']
    },
    {
        id: 'anima',
        name: 'Anima',
        description: 'Anime illustration model powered by circlestone-labs/Anima Base v1.0.',
        type: 'Image',
        order: 18,
        isActive: true,
        image: '/models/anima.png',
        thumbnail: '/models/anima.png',
        previewImages: ['/models/anima.png']
    },
    {
        id: 'hassaku',
        name: 'Hassaku',
        description: 'Hassaku illustration style with clean lines and classical anime rendering.',
        type: 'Image',
        order: 19,
        isActive: true,
        image: '/models/hassaku.png',
        thumbnail: '/models/hassaku.png',
        previewImages: ['/models/hassaku.png']
    },
    {
        id: 'kiwimix',
        name: 'Kiwimix',
        description: 'Vibrant anime illustration blend with bright colors and cheerful aesthetics.',
        type: 'Image',
        order: 20,
        isActive: true,
        image: '/models/kiwimix.png',
        thumbnail: '/models/kiwimix.png',
        previewImages: ['/models/kiwimix.png']
    },
    {
        id: 'crystal-cuteness',
        name: 'Crystal Cuteness',
        description: 'Adorable and sparkling aesthetics for high-quality cute art.',
        type: 'SDXL',
        order: 21,
        isActive: true,
        image: '/models/crystal-cuteness.png',
        thumbnail: '/models/crystal-cuteness.png',
        previewImages: ['/models/crystal-cuteness.png']
    },
    {
        id: 'veretoon-v10',
        name: 'Veretoon V1.0',
        description: 'Vibrant toon-style illustrations with clean outlines.',
        type: 'SDXL',
        order: 22,
        isActive: true,
        image: '/models/veretoon-v10.png',
        thumbnail: '/models/veretoon-v10.png',
        previewImages: ['/models/veretoon-v10.png']
    },
    {
        id: 'nova-3d-cg-xl',
        name: 'Nova 3D CG XL',
        description: 'Premium SDXL model optimized for high-quality 3D and CGI art with extreme detail.',
        type: 'Generator',
        order: 23,
        isActive: true,
        image: '/models/nova-3d-cg-xl.png',
        thumbnail: '/models/nova-3d-cg-xl.png',
        previewImages: ['/models/nova-3d-cg-xl.png']
    },
    {
        id: 'flux-2-dev',
        name: 'Flux 2 Dev',
        description: 'Highly realistic and detailed images with state-of-the-art prompt adherence and multi-reference support.',
        type: 'Generator',
        order: 24,
        isActive: true,
        image: '/models/flux-2-dev.png',
        thumbnail: '/models/flux-2-dev.png',
        previewImages: ['/models/flux-2-dev.png']
    },
    {
        id: 'flux-2-klein-9b',
        name: 'Flux 2 Klein 9B',
        description: 'Ultra-fast distilled image model unifies image generation and editing in a single model with state-of-the-art speed.',
        type: 'Image',
        order: 25,
        isActive: true,
        image: '/models/flux-2-klein-9b.png',
        thumbnail: '/models/flux-2-klein-9b.png',
        previewImages: ['/models/flux-2-klein-9b.png']
    }
];

async function seedModels() {
    const collectionRef = db.collection('models');

    console.log(`Starting seed of ${MODELS.length} models...`);

    const activeIds = new Set(MODELS.map(m => m.id));

    for (const model of MODELS) {
        const docRef = collectionRef.doc(model.id);
        const doc = await docRef.get();

        if (!doc.exists) {
            await docRef.set(model);
            console.log(`✓ Created model: ${model.name} (${model.id})`);
        } else {
            // Update existing model with new config
            await docRef.set(model, { merge: true });
            console.log(`↻ Updated model: ${model.name} (${model.id})`);
        }
    }

    // Deactivate retired models not in the active list
    const snapshot = await collectionRef.get();
    for (const doc of snapshot.docs) {
        if (!activeIds.has(doc.id)) {
            const data = doc.data();
            if (data.isActive !== false) {
                await doc.ref.update({ isActive: false });
                console.log(`ø Deactivated retired model: ${data.name || doc.id} (${doc.id})`);
            }
        }
    }

    console.log('Seed complete.');
}

seedModels().catch(console.error);
