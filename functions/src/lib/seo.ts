/**
 * Server-side SEO utilities for cloud function HTML shells.
 * Keep canonical URLs and pricing copy in sync with web/src/lib/seo.ts
 */

export const SITE_URL = 'https://dreambeesai.com';
export const SITE_NAME_FULL = 'DreamBeesAI';
/** Keep in sync with web/src/lib/seo.ts CONTENT_LAST_REVIEWED */
export const MARKETING_CONTENT_LASTMOD = '2026-06-17T00:00:00.000Z';
export const INDEXNOW_KEY = 'dreambeesai-indexnow-2026';
export const TWITTER_HANDLE = '@dreambeesai';
export const DEFAULT_OG_IMAGE = `${SITE_URL}/assets/hero_background_bee_1777509577091.png`;
export const ORG_ID = `${SITE_URL}/#organization`;
export const WEBSITE_ID = `${SITE_URL}/#website`;

/** Paths that must not be indexed (auth, billing, admin). */
export const NOINDEX_PREFIXES = ['/account', '/auth', '/dashboard', '/generator', '/admin', '/tasks'];

export interface SeoPageConfig {
    title: string;
    desc: string;
    image: string;
    skeletonH1: string;
    skeletonP: string;
    robots?: string;
    structuredData?: Record<string, unknown>[];
}

/** Escape user-generated text before embedding in HTML attributes or body. */
export function escapeHtml(raw: string): string {
    return raw
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export function escapeXml(raw: string): string {
    return raw
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

/** Combine schema.org nodes into a single @graph document. */
export function schemaGraph(...nodes: Record<string, unknown>[]): Record<string, unknown> {
    const graph = nodes.map((node) => {
        const { '@context': _ctx, ...rest } = node;
        return rest;
    });
    return { '@context': 'https://schema.org', '@graph': graph };
}

export function isNoIndexPath(path: string): boolean {
    return NOINDEX_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

export function resolveOgImage(image: string, baseUrl = SITE_URL): string {
    return image.startsWith('http') ? image : `${baseUrl}${image}`;
}

function breadcrumb(...items: { name: string; item: string }[]) {
    return {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((entry, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: entry.name,
            item: entry.item,
        })),
    };
}

export const ORGANIZATION_SCHEMA = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': ORG_ID,
    name: SITE_NAME_FULL,
    url: SITE_URL,
    logo: { '@type': 'ImageObject', url: `${SITE_URL}/dreambees_icon.png` },
    sameAs: ['https://twitter.com/dreambeesai'],
};

export const WEBSITE_SCHEMA = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    name: SITE_NAME_FULL,
    url: SITE_URL,
    publisher: { '@id': ORG_ID },
    potentialAction: {
        '@type': 'SearchAction',
        target: {
            '@type': 'EntryPoint',
            urlTemplate: `${SITE_URL}/discovery?q={search_term_string}`,
        },
        'query-input': 'required name=search_term_string',
    },
};

export const PRICING_PAGE_SEO: Record<string, SeoPageConfig> = {
    '/pricing': {
        title: 'DreamBees Pricing | AI Art Plans, Credit Packs & Enterprise',
        desc: 'Flexible pricing for every creator. Choose the Alchemist plan for daily generation power, the Architect plan for API scale, or grab one-time credit packs. Zaps never expire.',
        image: '/assets/zap_market_preview.png',
        skeletonH1: 'DreamBees Pricing — Plans, Credits & Enterprise',
        skeletonP: 'Compare plans, credit packs, and enterprise options for AI art generation on DreamBees.',
        structuredData: [
            {
                '@context': 'https://schema.org',
                '@type': 'Product',
                name: 'DreamBees Alchemist Plan',
                description: 'Unlimited AI image generation with dedicated high-speed GPUs.',
                brand: { '@type': 'Brand', name: 'DreamBees' },
                offers: {
                    '@type': 'Offer',
                    price: '29.00',
                    priceCurrency: 'USD',
                    priceValidUntil: '2027-12-31',
                    availability: 'https://schema.org/InStock',
                    url: `${SITE_URL}/pricing/plans`,
                },
            },
            breadcrumb(
                { name: 'Home', item: SITE_URL },
                { name: 'Pricing', item: `${SITE_URL}/pricing` },
            ),
        ],
    },
    '/pricing/plans': {
        title: 'AI Art Subscription Plans | Alchemist & Architect Tiers | DreamBees',
        desc: 'Pick the right AI image generation plan. Alchemist ($29/mo) for daily creators, Architect ($99/mo) for production scale and API access. Annual billing saves 20%.',
        image: '/assets/zap_market_preview.png',
        skeletonH1: 'DreamBees Plans — Alchemist & Architect',
        skeletonP: 'Subscription plans for AI image generation. Compare features and pricing across all tiers.',
        structuredData: [
            {
                '@context': 'https://schema.org',
                '@type': 'FAQPage',
                mainEntity: [
                    {
                        '@type': 'Question',
                        name: 'What is included in the Alchemist plan?',
                        acceptedAnswer: {
                            '@type': 'Answer',
                            text: 'The Alchemist plan ($29/month or $23/month billed annually) includes 500 monthly Zaps, 100 daily free Fast/Standard runs, 100 daily free Anima runs, and a 25% discount on Premium/Ultra runs.',
                        },
                    },
                    {
                        '@type': 'Question',
                        name: 'What does the Architect plan offer?',
                        acceptedAnswer: {
                            '@type': 'Answer',
                            text: 'The Architect plan ($99/month or $79/month billed annually) includes 2,500 monthly Zaps, 300 daily free Fast/Standard runs, 500 daily free Anima runs, a 60% developer discount, and full API access with a 99.9% uptime SLA.',
                        },
                    },
                    {
                        '@type': 'Question',
                        name: 'Can I cancel anytime?',
                        acceptedAnswer: {
                            '@type': 'Answer',
                            text: 'Yes. You can cancel, pause, or downgrade your subscription at any time from your account settings. Unused monthly Zaps expire at the end of your billing cycle.',
                        },
                    },
                ],
            },
        ],
    },
    '/pricing/credits': {
        title: 'Buy AI Generation Credits | Zap Packs from $1.99 | DreamBees',
        desc: 'One-time credit packs starting at $1.99. 15 to 2,500 Zaps for AI image generation. Zaps never expire and carry over month to month. Best value with bulk packs.',
        image: '/assets/zap_launchpad_preview.png',
        skeletonH1: 'Buy Zaps — Credit Packs for AI Generation',
        skeletonP: 'Top up your creative power with one-time credit packs. Choose from 7 tiers to fit any workflow.',
        structuredData: [
            {
                '@context': 'https://schema.org',
                '@type': 'Product',
                name: 'DreamBees Credit Packs',
                description: 'One-time credit packs for AI image generation. Zaps never expire.',
                brand: { '@type': 'Brand', name: 'DreamBees' },
                offers: [
                    { '@type': 'Offer', name: 'Taste Test', price: '1.99', priceCurrency: 'USD', availability: 'https://schema.org/InStock' },
                    { '@type': 'Offer', name: 'Starter Pack', price: '4.99', priceCurrency: 'USD', availability: 'https://schema.org/InStock' },
                    { '@type': 'Offer', name: 'Pro Booster', price: '9.99', priceCurrency: 'USD', availability: 'https://schema.org/InStock' },
                    { '@type': 'Offer', name: 'Studio Vault', price: '19.99', priceCurrency: 'USD', availability: 'https://schema.org/InStock' },
                    { '@type': 'Offer', name: 'Infinite Source', price: '49.99', priceCurrency: 'USD', availability: 'https://schema.org/InStock' },
                    { '@type': 'Offer', name: 'Mystic Bulk', price: '99.99', priceCurrency: 'USD', availability: 'https://schema.org/InStock' },
                ],
            },
        ],
    },
    '/pricing/compare': {
        title: 'AI Art Generator Comparison | DreamBees vs Midjourney vs Leonardo',
        desc: 'Side-by-side feature and pricing comparison of DreamBees, Midjourney, Leonardo AI, and Adobe Firefly for AI image generation. Honest, no-fluff comparison.',
        image: '/assets/zap_market_preview.png',
        skeletonH1: 'AI Art Generator Comparison',
        skeletonP: 'Compare DreamBees to leading AI image generators on price, features, and creator-friendly terms.',
        structuredData: [
            {
                '@context': 'https://schema.org',
                '@type': 'ItemList',
                name: 'AI Art Generator Comparison',
                itemListElement: [
                    { '@type': 'ListItem', position: 1, name: 'DreamBees', url: SITE_URL },
                    { '@type': 'ListItem', position: 2, name: 'Midjourney', url: 'https://midjourney.com' },
                    { '@type': 'ListItem', position: 3, name: 'Leonardo AI', url: 'https://leonardo.ai' },
                    { '@type': 'ListItem', position: 4, name: 'Adobe Firefly', url: 'https://firefly.adobe.com' },
                ],
            },
        ],
    },
    '/pricing/enterprise': {
        title: 'DreamBees Enterprise | Dedicated GPU Clusters & Custom AI Art API',
        desc: 'Production-grade AI image generation for teams. Dedicated A100/H100 clusters, custom model fine-tuning, 99.9% uptime SLA, and priority support. Talk to our enterprise team.',
        image: '/assets/zap_market_preview.png',
        skeletonH1: 'DreamBees Enterprise Solutions',
        skeletonP: 'Dedicated GPU infrastructure, custom model hosting, and SLA-backed support for production AI art workflows.',
    },
    '/pricing/calculator': {
        title: 'AI Generation Cost Calculator | Estimate Your Monthly Spend | DreamBees',
        desc: 'Calculate your monthly AI image generation costs. Compare pay-as-you-go, Alchemist subscription, and Architect plan pricing to find your best value.',
        image: '/assets/zap_market_preview.png',
        skeletonH1: 'AI Generation Cost Calculator',
        skeletonP: 'Estimate monthly AI art generation costs across all DreamBees plans.',
    },
    '/downloads': {
        title: 'Download DreamBees Lite | Free Desktop AI Art for macOS, Windows & Linux',
        desc: 'Download DreamBees Lite — unlimited local AI image generation on your desktop. Native apps for macOS, Windows, and Linux.',
        image: '/assets/hero_background_bee_1777509577091.png',
        skeletonH1: 'Download DreamBees Lite',
        skeletonP: 'Free desktop AI art studio for macOS, Windows, and Linux. Local-first generation with optional cloud boost.',
        structuredData: [
            {
                '@context': 'https://schema.org',
                '@type': 'SoftwareApplication',
                name: 'DreamBees Lite',
                applicationCategory: 'DesignApplication',
                operatingSystem: 'macOS, Windows, Linux',
                offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
                downloadUrl: `${SITE_URL}/downloads`,
            },
        ],
    },
};

/** Competitive alternative landing pages — sync with web/src/lib/alternatives.ts */
export const ALTERNATIVES_PAGE_SEO: Record<string, SeoPageConfig> = {
    '/alternatives': {
        title: 'AI Art Generator Alternatives (2026) | Compare DreamBees',
        desc: 'Explore DreamBees as an alternative to Midjourney, Leonardo AI, Adobe Firefly, and self-hosted Stable Diffusion.',
        image: '/assets/zap_market_preview.png',
        skeletonH1: 'AI Art Generator Alternatives',
        skeletonP: 'Honest guides comparing DreamBees to leading AI image generators.',
    },
    '/alternatives/midjourney': {
        title: 'Best Midjourney Alternative (2026) | DreamBees — Desktop + Web AI Art',
        desc: 'Looking for a Midjourney alternative? Free desktop app, non-expiring credits, subscription pause, and public gallery on every tier.',
        image: '/assets/zap_market_preview.png',
        skeletonH1: 'The best Midjourney alternative for creators who want control',
        skeletonP: 'Compare DreamBees vs Midjourney on pricing, desktop app, credit expiry, and privacy.',
    },
    '/alternatives/leonardo-ai': {
        title: 'Leonardo AI Alternative | DreamBees — Simpler AI Art Studio',
        desc: 'Compare DreamBees vs Leonardo AI. Free desktop client, non-expiring Zap packs, and local-first generation.',
        image: '/assets/zap_market_preview.png',
        skeletonH1: 'A Leonardo AI alternative built for focus',
        skeletonP: 'See how DreamBees compares to Leonardo AI on pricing, desktop support, and workflow simplicity.',
    },
    '/alternatives/adobe-firefly': {
        title: 'Adobe Firefly Alternative | DreamBees — No Creative Cloud Required',
        desc: 'Need an Adobe Firefly alternative without Creative Cloud? Standalone AI art with a free desktop app.',
        image: '/assets/zap_market_preview.png',
        skeletonH1: 'An Adobe Firefly alternative without the Creative Cloud tax',
        skeletonP: 'Compare DreamBees vs Adobe Firefly for standalone AI art generation.',
    },
    '/alternatives/stable-diffusion': {
        title: 'Stable Diffusion Alternative | DreamBees — Managed + Local Hybrid',
        desc: 'Stable Diffusion power without ComfyUI setup. DreamBees Lite runs locally with optional cloud GPUs.',
        image: '/assets/zap_market_preview.png',
        skeletonH1: 'Stable Diffusion power without the setup headache',
        skeletonP: 'A hybrid alternative to pure self-hosted Stable Diffusion workflows.',
    },
    '/alternatives/dall-e-3': {
        title: 'DALL·E 3 Alternative | DreamBees — No ChatGPT Plus Required',
        desc: 'DALL·E 3 alternative with standalone studio, free desktop app, and credit packs from $1.99.',
        image: '/assets/zap_market_preview.png',
        skeletonH1: 'A DALL·E 3 alternative outside the ChatGPT ecosystem',
        skeletonP: 'Compare DreamBees vs DALL·E 3 on pricing, desktop app, and credit policies.',
    },
    '/alternatives/comfyui': {
        title: 'ComfyUI Alternative | DreamBees — AI Art Without Node Graphs',
        desc: 'ComfyUI alternative with polished UI, local generation, and optional cloud GPUs.',
        image: '/assets/zap_market_preview.png',
        skeletonH1: 'ComfyUI power without the node graph learning curve',
        skeletonP: 'Compare DreamBees vs ComfyUI for ease of use and daily workflows.',
    },
    '/alternatives/ideogram': {
        title: 'Ideogram Alternative (2026) | DreamBees — Text-in-Image + Desktop Studio',
        desc: 'Ideogram alternative with text-in-image generation, free desktop app, and non-expiring credits.',
        image: '/assets/zap_market_preview.png',
        skeletonH1: 'An Ideogram alternative with a full studio',
        skeletonP: 'Compare DreamBees vs Ideogram for typography, models, and desktop workflow.',
    },
    '/alternatives/civitai': {
        title: 'Civitai Alternative (2026) | DreamBees — Curated Models + Studio UI',
        desc: 'Civitai alternative with curated SD models, polished studio UI, and free desktop app.',
        image: '/assets/zap_market_preview.png',
        skeletonH1: 'A Civitai alternative with a studio UI',
        skeletonP: 'Curated models without endless checkpoint browsing.',
    },
    '/alternatives/bing-image-creator': {
        title: 'Bing Image Creator Alternative (2026) | DreamBees — Desktop Studio + Credits',
        desc: 'Bing Image Creator (Microsoft Designer) alternative with free desktop app, curated models, and non-expiring credits.',
        image: '/assets/zap_market_preview.png',
        skeletonH1: 'A Bing Image Creator alternative with a full creative studio',
        skeletonP: 'Desktop studio and curated models beyond DALL·E integration.',
    },
    '/alternatives/canva-ai': {
        title: 'Canva AI Alternative (2026) | DreamBees — Dedicated AI Art Studio + Desktop',
        desc: 'Canva AI (Magic Media) alternative with curated SDXL and Flux models, free desktop app, and non-expiring credits.',
        image: '/assets/zap_market_preview.png',
        skeletonH1: 'A Canva AI alternative for serious image generation',
        skeletonP: 'Dedicated AI art studio beyond Canva template workflows.',
    },
    '/alternatives/playground-ai': {
        title: 'Playground AI Alternative (2026) | DreamBees — Desktop Studio + Non-Expiring Credits',
        desc: 'Playground AI alternative with free desktop app, curated SDXL and Flux models, and local prompt history.',
        image: '/assets/zap_market_preview.png',
        skeletonH1: 'A Playground AI alternative with local-first creative control',
        skeletonP: 'Desktop studio and curated models beyond web-only filter boards.',
    },
    '/alternatives/nightcafe': {
        title: 'NightCafe Alternative (2026) | DreamBees — Desktop Studio + Non-Expiring Credits',
        desc: 'NightCafe alternative with free desktop app, curated models, local prompt history, and credit packs that never expire.',
        image: '/assets/zap_market_preview.png',
        skeletonH1: 'A NightCafe alternative with a private creative studio',
        skeletonP: 'Local-first studio beyond web-only style presets and credit anxiety.',
    },
    '/alternatives/starryai': {
        title: 'StarryAI Alternative (2026) | DreamBees — Desktop Studio + Curated Models',
        desc: 'StarryAI alternative with free desktop app, curated SDXL and Flux models, and local prompt history.',
        image: '/assets/zap_market_preview.png',
        skeletonH1: 'A StarryAI alternative with deeper creative control',
        skeletonP: 'Desktop studio beyond mobile-first style packs.',
    },
    '/alternatives/getimg-ai': {
        title: 'GetImg.ai Alternative (2026) | DreamBees — Desktop Studio + Non-Expiring Credits',
        desc: 'GetImg.ai alternative with free desktop app, curated models, local history, and optional Architect API.',
        image: '/assets/zap_market_preview.png',
        skeletonH1: 'A GetImg.ai alternative with a full creative studio',
        skeletonP: 'Creator studio beyond API-only image pipelines.',
    },
    '/alternatives/novelai': {
        title: 'NovelAI Alternative (2026) | DreamBees — Anime Models + Desktop Studio',
        desc: 'NovelAI alternative with curated anime SDXL models, free desktop app, and non-expiring credits.',
        image: '/assets/zap_market_preview.png',
        skeletonH1: 'A NovelAI alternative with a full anime creative studio',
        skeletonP: 'Desktop studio and curated anime models beyond web-only workflows.',
    },
    '/alternatives/fotor': {
        title: 'Fotor Alternative (2026) | DreamBees — AI Art Studio Beyond Photo Editing',
        desc: 'Fotor alternative with curated SDXL and Flux models, free desktop app, and non-expiring credits.',
        image: '/assets/zap_market_preview.png',
        skeletonH1: 'A Fotor alternative built for AI art creation',
        skeletonP: 'Dedicated AI art studio beyond browser-based photo editors.',
    },
    '/alternatives/deepai': {
        title: 'DeepAI Alternative (2026) | DreamBees — Desktop Studio + Curated Models',
        desc: 'DeepAI alternative with curated Flux and SDXL models, free desktop app, and non-expiring credits.',
        image: '/assets/zap_market_preview.png',
        skeletonH1: 'A DeepAI alternative with a full creative studio',
        skeletonP: 'Creator studio beyond simple web generators and API-only workflows.',
    },
};

export const GUIDES_PAGE_SEO: Record<string, SeoPageConfig> = {
    '/guides': {
        title: 'AI Art Guides (2026) | DreamBees — Comparisons & Free Tier Picks',
        desc: 'Expert guides for choosing AI image generators: best overall picks, free tier comparisons, and competitor alternatives.',
        image: '/assets/zap_market_preview.png',
        skeletonH1: 'AI art guides',
        skeletonP: 'Honest buying guides for AI image generators in 2026.',
    },
    '/guides/best-ai-image-generator': {
        title: 'Best AI Image Generator (2026) — Honest Picks for Every Workflow',
        desc: 'Our 2026 guide to the best AI image generators: DreamBees, Midjourney, Leonardo AI, Adobe Firefly, and ComfyUI.',
        image: '/assets/zap_market_preview.png',
        skeletonH1: 'Best AI image generator (2026)',
        skeletonP: 'Honest roundup comparing the top AI art tools for every creator workflow.',
    },
    '/guides/free-ai-image-generator': {
        title: 'Free AI Image Generator (2026) — Best Free Tiers Compared',
        desc: 'Compare free AI image generators: daily limits, watermarks, desktop apps, and credit expiry.',
        image: '/assets/zap_market_preview.png',
        skeletonH1: 'Best free AI image generators (2026)',
        skeletonP: 'Honest comparison of free tiers across leading AI art tools.',
    },
    '/guides/stable-diffusion-for-beginners': {
        title: 'Stable Diffusion for Beginners (2026) | Easy Setup Guide | DreamBees',
        desc: 'Learn Stable Diffusion without ComfyUI complexity. Beginner guide to your first AI image.',
        image: '/assets/hero_background_bee_1777509577091.png',
        skeletonH1: 'Stable Diffusion for beginners',
        skeletonP: 'The fastest path to your first Stable Diffusion image.',
    },
    '/guides/ai-art-commercial-use': {
        title: 'AI Art Commercial Use (2026) — Rights, Tiers & Platform Comparison',
        desc: 'Compare commercial use policies for DreamBees, Midjourney, Leonardo AI, and Adobe Firefly.',
        image: '/assets/zap_market_preview.png',
        skeletonH1: 'AI art commercial use',
        skeletonP: 'Commercial rights and tier comparison for AI image generators.',
    },
    '/guides/how-to-write-ai-art-prompts': {
        title: 'How to Write AI Art Prompts (2026) | DreamBees Prompt Guide',
        desc: 'Learn how to write AI art prompts: subject, style, lighting, and iteration tips.',
        image: '/assets/zap_market_preview.png',
        skeletonH1: 'How to write AI art prompts',
        skeletonP: 'Practical prompt structure for better AI images.',
    },
    '/guides/flux-vs-sdxl': {
        title: 'Flux vs SDXL (2026) — Which AI Image Model to Use | DreamBees',
        desc: 'Flux vs SDXL explained: photorealism vs illustration, speed, and when to use each on DreamBees.',
        image: '/assets/hero_background_bee_1777509577091.png',
        skeletonH1: 'Flux vs SDXL',
        skeletonP: 'Model comparison for photorealism, illustration, and workflow fit.',
    },
    '/guides/best-anime-ai-image-generator': {
        title: 'Best Anime AI Image Generator (2026) — Honest Picks | DreamBees',
        desc: 'Best anime AI image generators: DreamBees, NovelAI, Midjourney, Leonardo AI, and SDXL compared.',
        image: '/assets/hero_background_bee_1777509577091.png',
        skeletonH1: 'Best anime AI image generator (2026)',
        skeletonP: 'Honest anime AI art generator comparison.',
    },
    '/guides/best-photorealistic-ai-image-generator': {
        title: 'Best Photorealistic AI Image Generator (2026) — Honest Picks | DreamBees',
        desc: 'Best photorealistic AI image generators: DreamBees, Adobe Firefly, Midjourney, Leonardo AI, and DeepAI compared.',
        image: '/assets/hero_background_bee_1777509577091.png',
        skeletonH1: 'Best photorealistic AI image generator (2026)',
        skeletonP: 'Honest photorealistic AI art generator comparison.',
    },
};

export const USE_CASES_PAGE_SEO: Record<string, SeoPageConfig> = {
    '/use-cases': {
        title: 'AI Art Use Cases | DreamBees — Anime, Realism, Privacy & More',
        desc: 'Explore DreamBees for anime art, photorealistic images, furry character work, private local generation, and Discord-free AI art workflows.',
        image: '/assets/hero_background_bee_1777509577091.png',
        skeletonH1: 'AI art use cases',
        skeletonP: 'Purpose-built guides for illustrators, photorealism seekers, and privacy-focused creators.',
    },
    '/use-cases/anime-ai-art': {
        title: 'Anime AI Art Generator | DreamBees — Styles, Models & Desktop Studio',
        desc: 'Generate anime AI art with curated models. Free desktop app, local history, and optional cloud GPUs.',
        image: '/assets/hero_background_bee_1777509577091.png',
        skeletonH1: 'Anime AI art generator',
        skeletonP: 'Curated anime models with a simple studio UI and local-first desktop app.',
    },
    '/use-cases/furry-ai-art': {
        title: 'Furry AI Art Generator | DreamBees — Nova Furry XL & Niche Models',
        desc: 'Create furry AI art with Nova Furry XL and character-focused models on DreamBees.',
        image: '/assets/hero_background_bee_1777509577091.png',
        skeletonH1: 'Furry AI art generator',
        skeletonP: 'Character-focused models with local-first privacy and community gallery.',
    },
    '/use-cases/private-local-ai-art': {
        title: 'Private Local AI Art Generator | DreamBees — Offline-First Studio',
        desc: 'Generate AI art privately on your desktop. Local history with optional cloud boost.',
        image: '/assets/hero_background_bee_1777509577091.png',
        skeletonH1: 'Private local AI art',
        skeletonP: 'Local-first AI art studio — prompts stay on your machine.',
    },
    '/use-cases/photorealistic-ai-art': {
        title: 'Photorealistic AI Art Generator | DreamBees — Flux & Realism Models',
        desc: 'Create photorealistic AI images with Flux and SDXL realism checkpoints on DreamBees.',
        image: '/assets/hero_background_bee_1777509577091.png',
        skeletonH1: 'Photorealistic AI art',
        skeletonP: 'Realism models with a simple studio UI — no ComfyUI required.',
    },
    '/use-cases/ai-art-without-discord': {
        title: 'AI Art Without Discord | DreamBees — Browser & Desktop Studio',
        desc: 'Generate AI art without Discord. Browser and desktop studio — no chat server required.',
        image: '/assets/hero_background_bee_1777509577091.png',
        skeletonH1: 'AI art without Discord',
        skeletonP: 'A proper studio instead of Discord chat commands.',
    },
    '/use-cases/game-concept-art': {
        title: 'Game Concept Art AI Generator | DreamBees — Characters, Environments & Props',
        desc: 'Generate game concept art with local desktop workflow and optional cloud GPUs.',
        image: '/assets/hero_background_bee_1777509577091.png',
        skeletonH1: 'Game concept art AI',
        skeletonP: 'Rapid visual exploration for indie and AA game teams.',
    },
    '/use-cases/flux-ai-art': {
        title: 'Flux AI Image Generator | DreamBees — Photorealism & Typography',
        desc: 'Generate images with Flux AI models — photorealism, detail, and text-in-image on DreamBees.',
        image: '/assets/hero_background_bee_1777509577091.png',
        skeletonH1: 'Flux AI art',
        skeletonP: 'Flux-class photorealism without ComfyUI node graphs.',
    },
    '/use-cases/api-ai-image-generation': {
        title: 'AI Image Generation API | DreamBees Architect — 99.9% SLA',
        desc: 'Production AI image API with REST endpoints, SLA, and enterprise GPU options.',
        image: '/assets/zap_market_preview.png',
        skeletonH1: 'AI image generation API',
        skeletonP: 'Architect tier API for production apps and teams.',
    },
    '/use-cases/product-photography-ai': {
        title: 'AI Product Photography Generator | DreamBees — E-commerce & Mockups',
        desc: 'Generate AI product photos and mockups for e-commerce with Flux realism on DreamBees.',
        image: '/assets/hero_background_bee_1777509577091.png',
        skeletonH1: 'AI product photography',
        skeletonP: 'E-commerce and mockup workflows with photoreal models.',
    },
    '/use-cases/social-media-ai-art': {
        title: 'AI Social Media Art Generator | DreamBees — Posts, Thumbnails & Stories',
        desc: 'Create AI art for Instagram, TikTok, YouTube thumbnails, and social posts with DreamBees Flux and illustration models.',
        image: '/assets/hero_background_bee_1777509577091.png',
        skeletonH1: 'AI art for social media',
        skeletonP: 'Thumbnails, feed posts, and story assets with local prompt history.',
    },
    '/use-cases/logo-branding-ai': {
        title: 'AI Logo & Branding Generator | DreamBees — Concepts, Mood Boards & Assets',
        desc: 'Generate AI logo concepts, brand mood boards, and marketing visuals with DreamBees illustration and Flux models.',
        image: '/assets/hero_background_bee_1777509577091.png',
        skeletonH1: 'AI logo and branding',
        skeletonP: 'Brand exploration with curated models and local desktop history.',
    },
    '/use-cases/book-cover-ai-art': {
        title: 'AI Book Cover Generator | DreamBees — Fiction, Nonfiction & KDP Art',
        desc: 'Create AI book cover art for KDP, self-publishing, and client projects with DreamBees illustration and Flux models.',
        image: '/assets/hero_background_bee_1777509577091.png',
        skeletonH1: 'AI book cover art',
        skeletonP: 'Cover concepts for fiction, nonfiction, and self-publishing workflows.',
    },
    '/use-cases/print-on-demand-ai-art': {
        title: 'AI Print-on-Demand Art Generator | DreamBees — Etsy, Redbubble & Merch',
        desc: 'Create AI art for print-on-demand — Etsy, Redbubble, tees, and posters with DreamBees commercial tiers and Flux models.',
        image: '/assets/hero_background_bee_1777509577091.png',
        skeletonH1: 'AI art for print-on-demand',
        skeletonP: 'POD merch and marketplace art with commercial use on paid tiers.',
    },
    '/use-cases/interior-design-ai-art': {
        title: 'AI Interior Design Generator | DreamBees — Room Mockups & Staging',
        desc: 'Generate AI interior design mockups, room staging, and decor concepts with DreamBees Flux photorealism.',
        image: '/assets/hero_background_bee_1777509577091.png',
        skeletonH1: 'AI interior design',
        skeletonP: 'Room mockups and staging with photoreal Flux models.',
    },
};

export interface MetaTagInput {
    title: string;
    desc: string;
    canonicalUrl: string;
    image: string;
    path: string;
    robots: string;
    structuredData: Record<string, unknown>[];
    articlePublishedTime?: string;
    articleModifiedTime?: string;
}

/** Build production-grade meta tags (Open Graph, Twitter Cards, canonical, robots). */
export function buildMetaTags(input: MetaTagInput): string {
    const ogImage = resolveOgImage(input.image);
    const safeTitle = escapeHtml(input.title);
    const safeDesc = escapeHtml(input.desc);
    const safeCanonical = escapeHtml(input.canonicalUrl);
    const safeOgImage = escapeHtml(ogImage);
    const pageUrl = escapeHtml(`${SITE_URL}${input.path}`);
    const isArticle = Boolean(input.articleModifiedTime || input.articlePublishedTime);
    const ogType = isArticle ? 'article' : 'website';
    const articleMeta = [
        input.articlePublishedTime
            ? `<meta property="article:published_time" content="${escapeHtml(input.articlePublishedTime)}" />`
            : '',
        input.articleModifiedTime
            ? `<meta property="article:modified_time" content="${escapeHtml(input.articleModifiedTime)}" />`
            : '',
    ].filter(Boolean).join('\n  ');

    const jsonLd = input.structuredData.length > 0
        ? `<script type="application/ld+json">${JSON.stringify(
            input.structuredData.length > 1
                ? schemaGraph(...input.structuredData)
                : input.structuredData[0],
        )}</script>`
        : '';

    return `
  <title>${safeTitle}</title>
  <meta name="description" content="${safeDesc}" />
  <meta name="robots" content="${input.robots}" />
  <meta name="author" content="${SITE_NAME_FULL}" />
  <link rel="canonical" href="${safeCanonical}" />
  <meta property="og:site_name" content="${SITE_NAME_FULL}" />
  <meta property="og:locale" content="en_US" />
  <meta property="og:type" content="${ogType}" />
  <meta property="og:title" content="${safeTitle}" />
  <meta property="og:description" content="${safeDesc}" />
  <meta property="og:image" content="${safeOgImage}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:url" content="${pageUrl}" />
  ${articleMeta}
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:site" content="${TWITTER_HANDLE}" />
  <meta name="twitter:creator" content="${TWITTER_HANDLE}" />
  <meta name="twitter:title" content="${safeTitle}" />
  <meta name="twitter:description" content="${safeDesc}" />
  <meta name="twitter:image" content="${safeOgImage}" />
  ${jsonLd}`.trim();
}

export const ROBOTS_TXT = `# https://www.robotstxt.org/robotstxt.html
User-agent: *
Allow: /

Allow: /pricing
Allow: /pricing/
Allow: /downloads
Allow: /alternatives
Allow: /guides
Allow: /use-cases

Disallow: /account
Disallow: /auth
Disallow: /dashboard
Disallow: /generator
Disallow: /admin
Disallow: /tasks
Disallow: /api/

Sitemap: ${SITE_URL}/sitemap.xml
`;

export const LLMS_TXT = `# DreamBees — AI Image Studio
> Local-first desktop and web AI image generation. Optional cloud GPU boost.

DreamBees is an AI art studio for creators who want Stable Diffusion–class generation without complex setup. Free desktop app for macOS, Windows, and Linux.

## Key pages
- [Home](${SITE_URL}/): Product overview and getting started
- [Downloads](${SITE_URL}/downloads): Free DreamBees Lite desktop app
- [Pricing](${SITE_URL}/pricing): Plans, credits, and enterprise
- [Plans](${SITE_URL}/pricing/plans): Alchemist ($29/mo) and Architect ($99/mo) subscriptions
- [Credits](${SITE_URL}/pricing/credits): One-time Zap packs from $1.99 — never expire
- [Compare](${SITE_URL}/pricing/compare): DreamBees vs Midjourney, Leonardo AI, Adobe Firefly
- [Enterprise](${SITE_URL}/pricing/enterprise): Dedicated GPU clusters and API SLA
- [Calculator](${SITE_URL}/pricing/calculator): Monthly cost estimator
- [Discovery](${SITE_URL}/discovery): Community AI art gallery

## Alternatives (competitive guides)
- [Alternatives hub](${SITE_URL}/alternatives): All competitor comparison guides
- [Midjourney alternative](${SITE_URL}/alternatives/midjourney)
- [Leonardo AI alternative](${SITE_URL}/alternatives/leonardo-ai)
- [Adobe Firefly alternative](${SITE_URL}/alternatives/adobe-firefly)
- [Stable Diffusion alternative](${SITE_URL}/alternatives/stable-diffusion)
- [DALL·E 3 alternative](${SITE_URL}/alternatives/dall-e-3)
- [ComfyUI alternative](${SITE_URL}/alternatives/comfyui)
- [Ideogram alternative](${SITE_URL}/alternatives/ideogram)
- [Civitai alternative](${SITE_URL}/alternatives/civitai)
- [Bing Image Creator alternative](${SITE_URL}/alternatives/bing-image-creator)
- [Canva AI alternative](${SITE_URL}/alternatives/canva-ai)
- [Playground AI alternative](${SITE_URL}/alternatives/playground-ai)
- [NightCafe alternative](${SITE_URL}/alternatives/nightcafe)
- [StarryAI alternative](${SITE_URL}/alternatives/starryai)
- [GetImg.ai alternative](${SITE_URL}/alternatives/getimg-ai)
- [NovelAI alternative](${SITE_URL}/alternatives/novelai)
- [Fotor alternative](${SITE_URL}/alternatives/fotor)
- [DeepAI alternative](${SITE_URL}/alternatives/deepai)

## Guides
- [Guides hub](${SITE_URL}/guides): All AI art buying guides
- [Best AI image generator 2026](${SITE_URL}/guides/best-ai-image-generator)
- [Free AI image generator 2026](${SITE_URL}/guides/free-ai-image-generator)
- [Stable Diffusion for beginners](${SITE_URL}/guides/stable-diffusion-for-beginners)
- [AI art commercial use](${SITE_URL}/guides/ai-art-commercial-use)
- [How to write AI art prompts](${SITE_URL}/guides/how-to-write-ai-art-prompts)
- [Flux vs SDXL guide](${SITE_URL}/guides/flux-vs-sdxl)
- [Best anime AI generator](${SITE_URL}/guides/best-anime-ai-image-generator)
- [Best photorealistic AI generator](${SITE_URL}/guides/best-photorealistic-ai-image-generator)

## Use cases
- [Use cases hub](${SITE_URL}/use-cases): All creator workflow guides
- [Anime AI art generator](${SITE_URL}/use-cases/anime-ai-art)
- [Furry AI art generator](${SITE_URL}/use-cases/furry-ai-art)
- [Private local AI art](${SITE_URL}/use-cases/private-local-ai-art)
- [Photorealistic AI art](${SITE_URL}/use-cases/photorealistic-ai-art)
- [AI art without Discord](${SITE_URL}/use-cases/ai-art-without-discord)
- [Game concept art AI](${SITE_URL}/use-cases/game-concept-art)
- [Flux AI art](${SITE_URL}/use-cases/flux-ai-art)
- [AI image generation API](${SITE_URL}/use-cases/api-ai-image-generation)
- [AI product photography](${SITE_URL}/use-cases/product-photography-ai)
- [AI social media art](${SITE_URL}/use-cases/social-media-ai-art)
- [AI logo & branding](${SITE_URL}/use-cases/logo-branding-ai)
- [AI book cover art](${SITE_URL}/use-cases/book-cover-ai-art)
- [AI print-on-demand art](${SITE_URL}/use-cases/print-on-demand-ai-art)
- [AI interior design](${SITE_URL}/use-cases/interior-design-ai-art)

## Differentiators
- Credit packs (Zaps) never expire on one-time purchases
- Free native desktop client with local-first history
- Subscription pause without losing tier benefits
- 14-day refund on credit pack purchases
- Public gallery on every tier

## Optional
- [Sitemap](${SITE_URL}/sitemap.xml)
- [Robots](${SITE_URL}/robots.txt)
- [Guides RSS](${SITE_URL}/guides/rss.xml)
`;
