import { db } from "../../firebaseInit.js";
import { logger } from "../../lib/utils.js";
import {
    SITE_URL,
    DEFAULT_OG_IMAGE,
    PRICING_PAGE_SEO,
    ALTERNATIVES_PAGE_SEO,
    GUIDES_PAGE_SEO,
    USE_CASES_PAGE_SEO,
    ORGANIZATION_SCHEMA,
    WEBSITE_SCHEMA,
    buildMetaTags,
    escapeHtml,
    isNoIndexPath,
    type SeoPageConfig,
} from "../../lib/seo.js";

const APP_PAGE_CACHE_MS = 60 * 60 * 1000;
const pageCache = new Map<string, { html: string; statusCode: number; expiresAt: number }>();

const BLOG_POSTS: Record<string, { title: string; desc: string; skeletonH1: string; image?: string; date: string }> = {
    'prompt-director-drift-evaluation': {
        title: 'Prompt Director Drift Evaluation | DreamBeesAI',
        desc: 'Evaluating the impact of prompt director models on image variance and quality.',
        skeletonH1: 'Prompt Director Drift Evaluation',
        date: '2026-01-03',
    },
    'elon-musk-docket-case': {
        title: 'OpenAI vs Elon Musk: Analysis | DreamBeesAI',
        desc: 'Analyzing the legal and governance implications of the OpenAI vs Elon Musk docket.',
        skeletonH1: 'OpenAI vs Elon Musk',
        image: '/assets/blog/openai_vs_elon_musk.png',
        date: '2026-01-16',
    },
};

function pricingBreadcrumb(path: string, canonicalUrl: string) {
    const pathLabel = path.replace('/pricing/', '').replace(/^\w/, (c) => c.toUpperCase());
    return {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
            { '@type': 'ListItem', position: 2, name: 'Pricing', item: `${SITE_URL}/pricing` },
            { '@type': 'ListItem', position: 3, name: pathLabel, item: canonicalUrl },
        ],
    };
}

function applyPageConfig(
    cfg: SeoPageConfig,
    path: string,
    canonicalUrl: string,
    structuredData: Record<string, unknown>[],
) {
    return {
        title: cfg.title,
        desc: cfg.desc,
        image: cfg.image,
        skeletonH1: cfg.skeletonH1,
        skeletonP: cfg.skeletonP,
        structuredData: [
            ...(cfg.structuredData ?? []),
            ...(path !== '/pricing' ? [pricingBreadcrumb(path, canonicalUrl)] : []),
        ],
    };
}

export const handleApp = async (req: { path: string }, res: {
    set: (k: string, v: string) => void;
    status: (n: number) => { send: (b: string) => void };
}) => {
    const path: string = req.path;
    const cached = pageCache.get(path);
    if (cached && cached.expiresAt > Date.now()) {
        res.set('Cache-Control', 'public, max-age=3600, s-maxage=3600');
        if (cached.statusCode === 404) {
            res.set('X-Robots-Tag', 'noindex, nofollow');
        }
        res.status(cached.statusCode).send(cached.html);
        return;
    }

    let title = 'DreamBees Lite | Unlimited Desktop AI Art Generation';
    let desc = 'Experience the power of Stable Diffusion on your desktop. Unlimited generations, blazing fast speeds, and complete creative control. Download DreamBees Lite for macOS and Windows today.';
    let image = DEFAULT_OG_IMAGE;
    const structuredData: Record<string, unknown>[] = [];
    let statusCode = 200;
    const canonicalUrl = `${SITE_URL}${path}`;
    let skeletonH1 = 'DreamBees Lite: Professional Desktop AI Art';
    let skeletonP = 'Unlimited AI image generation for artists and creators. Download the native app for macOS and Windows.';

    const robots = isNoIndexPath(path) || path.startsWith('/tasks')
        ? 'noindex, nofollow'
        : 'index, follow, max-image-preview:large, max-snippet:-1';

    try {
        if (isNoIndexPath(path)) {
            statusCode = path === '/auth' || path === '/account' ? 200 : statusCode;
        }

        // Discovery / images
        if (path.startsWith('/discovery/')) {
            const rawId = path.split('/').pop();
            const id = (rawId && rawId.includes('-')) ? rawId.split('-').pop() : rawId;

            if (id && id !== 'discovery') {
                let docSnap = await db.collection('model_showcase_images').doc(id).get();
                if (!docSnap.exists) {
                    docSnap = await db.collection('generations').doc(id).get();
                }

                if (docSnap.exists) {
                    const data = docSnap.data() as Record<string, unknown>;
                    const prompt = String(data.prompt || 'AI Artwork');
                    const safePrompt = prompt.slice(0, 60);
                    title = `${safePrompt}${prompt.length > 60 ? '...' : ''} | DreamBeesAI`;
                    desc = `Full details and prompt for this AI generation: "${prompt.slice(0, 150)}"`;
                    image = String(data.thumbnailUrl || data.url || data.imageUrl || image);
                    skeletonH1 = prompt;
                    skeletonP = `A beautiful AI generation created with DreamBeesAI. Model used: ${data.modelId || 'Stable Diffusion'}.`;

                    structuredData.push({
                        '@context': 'https://schema.org',
                        '@type': 'ImageObject',
                        name: prompt.slice(0, 100),
                        contentUrl: image,
                        description: prompt.slice(0, 200),
                        creator: { '@type': 'Person', name: data.userDisplayName || 'AI Creator' },
                    });
                    structuredData.push({
                        '@context': 'https://schema.org',
                        '@type': 'BreadcrumbList',
                        itemListElement: [
                            { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
                            { '@type': 'ListItem', position: 2, name: 'Discovery', item: `${SITE_URL}/discovery` },
                            { '@type': 'ListItem', position: 3, name: prompt.slice(0, 20), item: canonicalUrl },
                        ],
                    });
                } else {
                    statusCode = 404;
                }
            } else {
                title = 'Discover AI Generated Art | DreamBeesAI';
                desc = 'Explore the best AI art generated by the DreamBees community. Photorealistic, anime, and 3D concept art.';
                skeletonH1 = 'Discover AI Generated Art';
                skeletonP = desc;
            }
        }
        // Blog
        else if (path.startsWith('/blog/')) {
            const id = path.split('/').pop();
            const post = id ? BLOG_POSTS[id] : undefined;

            if (post) {
                title = post.title;
                desc = post.desc;
                skeletonH1 = `Blog: ${post.skeletonH1}`;
                if (post.image) image = `${SITE_URL}${post.image}`;

                structuredData.push({
                    '@context': 'https://schema.org',
                    '@type': 'Article',
                    headline: post.skeletonH1,
                    description: post.desc,
                    datePublished: post.date,
                    author: { '@type': 'Organization', name: 'DreamBeesAI' },
                    publisher: {
                        '@type': 'Organization',
                        name: 'DreamBeesAI',
                        logo: { '@type': 'ImageObject', url: `${SITE_URL}/dreambees_icon.png` },
                    },
                    mainEntityOfPage: canonicalUrl,
                });
                structuredData.push({
                    '@context': 'https://schema.org',
                    '@type': 'BreadcrumbList',
                    itemListElement: [
                        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
                        { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE_URL}/blog` },
                        { '@type': 'ListItem', position: 3, name: post.skeletonH1, item: canonicalUrl },
                    ],
                });
            } else if (id && id !== 'blog') {
                statusCode = 404;
            } else {
                title = 'AI Art & Technology Blog | DreamBeesAI';
                desc = 'Insights into stable diffusion, cloud rendering, and the future of AI art creation.';
                skeletonH1 = 'AI Art & Technology Blog';
                skeletonP = desc;
            }
        }
        // Models
        else if (path.startsWith('/model/')) {
            const id = path.split('/').pop();
            if (id && id !== 'model') {
                const modelSnap = await db.collection('models').doc(id).get();
                if (modelSnap.exists) {
                    const data = modelSnap.data() as Record<string, unknown>;
                    const name = String(data.name || 'AI Model');
                    title = `${name} AI Model - DreamBeesAI`;
                    desc = String(data.description || `Showcase feed for the ${name} AI model. High-quality trained weights for niche styles.`);
                    image = String(data.image || image);
                    skeletonH1 = `${name} AI Model Showcase`;
                    skeletonP = desc;

                    structuredData.push({
                        '@context': 'https://schema.org',
                        '@type': 'Product',
                        name,
                        description: desc,
                        image,
                        brand: { '@type': 'Brand', name: 'DreamBees' },
                    });
                    structuredData.push({
                        '@context': 'https://schema.org',
                        '@type': 'BreadcrumbList',
                        itemListElement: [
                            { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
                            { '@type': 'ListItem', position: 2, name: 'Models', item: `${SITE_URL}/models` },
                            { '@type': 'ListItem', position: 3, name, item: canonicalUrl },
                        ],
                    });
                } else {
                    statusCode = 404;
                }
            }
        }
        // Pricing & downloads (static SEO cluster)
        else if (PRICING_PAGE_SEO[path]) {
            const applied = applyPageConfig(PRICING_PAGE_SEO[path], path, canonicalUrl, structuredData);
            title = applied.title;
            desc = applied.desc;
            image = applied.image.startsWith('http') ? applied.image : `${SITE_URL}${applied.image}`;
            skeletonH1 = applied.skeletonH1;
            skeletonP = applied.skeletonP;
            structuredData.push(...applied.structuredData);
        }
        else if (ALTERNATIVES_PAGE_SEO[path]) {
            const cfg = ALTERNATIVES_PAGE_SEO[path];
            title = cfg.title;
            desc = cfg.desc;
            image = cfg.image.startsWith('http') ? cfg.image : `${SITE_URL}${cfg.image}`;
            skeletonH1 = cfg.skeletonH1;
            skeletonP = cfg.skeletonP;
            if (cfg.structuredData) structuredData.push(...cfg.structuredData);
            structuredData.push({
                '@context': 'https://schema.org',
                '@type': 'BreadcrumbList',
                itemListElement: [
                    { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
                    { '@type': 'ListItem', position: 2, name: 'Alternatives', item: `${SITE_URL}/alternatives` },
                    ...(path !== '/alternatives'
                        ? [{ '@type': 'ListItem', position: 3, name: cfg.skeletonH1.slice(0, 40), item: canonicalUrl }]
                        : []),
                ],
            });
        }
        else if (GUIDES_PAGE_SEO[path]) {
            const cfg = GUIDES_PAGE_SEO[path];
            title = cfg.title;
            desc = cfg.desc;
            image = cfg.image.startsWith('http') ? cfg.image : `${SITE_URL}${cfg.image}`;
            skeletonH1 = cfg.skeletonH1;
            skeletonP = cfg.skeletonP;
            structuredData.push({
                '@context': 'https://schema.org',
                '@type': 'BreadcrumbList',
                itemListElement: [
                    { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
                    { '@type': 'ListItem', position: 2, name: 'Guides', item: `${SITE_URL}/guides` },
                    ...(path !== '/guides'
                        ? [{ '@type': 'ListItem', position: 3, name: cfg.skeletonH1, item: canonicalUrl }]
                        : []),
                ],
            });
        }
        else if (USE_CASES_PAGE_SEO[path]) {
            const cfg = USE_CASES_PAGE_SEO[path];
            title = cfg.title;
            desc = cfg.desc;
            image = cfg.image.startsWith('http') ? cfg.image : `${SITE_URL}${cfg.image}`;
            skeletonH1 = cfg.skeletonH1;
            skeletonP = cfg.skeletonP;
            structuredData.push({
                '@context': 'https://schema.org',
                '@type': 'BreadcrumbList',
                itemListElement: [
                    { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
                    { '@type': 'ListItem', position: 2, name: 'Use Cases', item: `${SITE_URL}/use-cases` },
                    ...(path !== '/use-cases'
                        ? [{ '@type': 'ListItem', position: 3, name: cfg.skeletonH1, item: canonicalUrl }]
                        : []),
                ],
            });
        }
        // Landing / home
        else if (path === '/landing' || path === '/') {
            structuredData.push(ORGANIZATION_SCHEMA, WEBSITE_SCHEMA, {
                '@context': 'https://schema.org',
                '@type': 'SoftwareApplication',
                name: 'DreamBeesAI',
                applicationCategory: 'DesignApplication',
                operatingSystem: 'Web',
                offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
                description: desc,
            });
        }

        const pageRobots = statusCode === 404 ? 'noindex, nofollow' : robots;
        const metaTags = buildMetaTags({
            title,
            desc,
            canonicalUrl,
            image,
            path,
            robots: pageRobots,
            structuredData,
        });

        const safeH1 = escapeHtml(skeletonH1);
        const safeP = escapeHtml(skeletonP);

        const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    ${metaTags}
</head>
<body style="margin:0; background:#060608; color:#fff;">
    <main id="root">
        <article style="padding:2rem; max-width:800px; margin:0 auto; font-family:system-ui,sans-serif;">
            <h1 style="color:#fff; font-size:2rem; margin-bottom:1rem; line-height:1.2;">${safeH1}</h1>
            <p style="color:#ccc; font-size:1.125rem; line-height:1.6;">${safeP}</p>
        </article>
    </main>
    <div id="loading-fallback" style="display:flex; align-items:center; justify-content:center; height:100vh; font-family:sans-serif;">
        <p style="font-size:1.2rem; letter-spacing:0.1em; color:rgba(255,255,255,0.7);">ORCHESTRATING IMAGINATION...</p>
    </div>
    <script type="module" src="/src/main.jsx"></script>
</body>
</html>`;

        pageCache.set(path, { html, statusCode, expiresAt: Date.now() + APP_PAGE_CACHE_MS });
        res.set('Cache-Control', 'public, max-age=3600, s-maxage=3600');
        if (statusCode === 404 || pageRobots.includes('noindex')) {
            res.set('X-Robots-Tag', pageRobots);
        }
        res.status(statusCode).send(html);
    } catch (err: unknown) {
        logger.error('Error in serveApp:', err);
        res.status(500).send('Internal Server Error');
    }
};
