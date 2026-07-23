import { db } from "../../firebaseInit.js";
import { logger, slugify } from "../../lib/utils.js";
import { escapeXml, SITE_URL, MARKETING_CONTENT_LASTMOD } from "../../lib/seo.js";

/** Marketing SEO routes use content review date — honest lastmod vs dynamic "now". */
const MARKETING_SITEMAP_PREFIXES = [
    '/downloads', '/pricing', '/alternatives', '/guides', '/use-cases',
];

function resolveStaticLastmod(path: string, fallback: string): string {
    if (path === '' || MARKETING_SITEMAP_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))) {
        return MARKETING_CONTENT_LASTMOD;
    }
    return fallback;
}

interface SitemapEntry {
    loc: string;
    changefreq: string;
    priority: number;
    lastmod: string;
    image?: {
        loc: string;
        title: string;
    } | null;
}

let cachedSitemap: { xml: string; expiresAt: number } | null = null;
const SITEMAP_CACHE_MS = 60 * 60 * 1000;

/** Utility/auth routes excluded from sitemap to preserve crawl budget. */
const SITEMAP_EXCLUDED_PREFIXES = ['/account', '/auth', '/dashboard', '/generator', '/admin', '/tasks', '/api'];

export const handleSitemap = async (req: any, res: any) => {
    try {
        if (cachedSitemap && cachedSitemap.expiresAt > Date.now()) {
            res.set('Content-Type', 'application/xml');
            res.set('Cache-Control', 'public, max-age=86400, s-maxage=86400');
            res.status(200).send(cachedSitemap.xml);
            return;
        }

        const baseUrl = SITE_URL;
        const now = new Date().toISOString();
        const urlMap = new Map<string, SitemapEntry>();

        const staticPages: { path: string; priority: number; changefreq: string }[] = [
            { path: '', priority: 1.0, changefreq: 'daily' },
            { path: '/downloads', priority: 0.9, changefreq: 'weekly' },
            { path: '/discovery', priority: 0.9, changefreq: 'daily' },
            { path: '/models', priority: 0.8, changefreq: 'weekly' },
            { path: '/live/browse', priority: 0.8, changefreq: 'daily' },
            { path: '/pricing', priority: 0.9, changefreq: 'weekly' },
            { path: '/pricing/plans', priority: 0.9, changefreq: 'weekly' },
            { path: '/pricing/credits', priority: 0.9, changefreq: 'weekly' },
            { path: '/pricing/compare', priority: 0.85, changefreq: 'monthly' },
            { path: '/pricing/enterprise', priority: 0.8, changefreq: 'monthly' },
            { path: '/pricing/calculator', priority: 0.75, changefreq: 'monthly' },
            { path: '/alternatives', priority: 0.88, changefreq: 'weekly' },
            { path: '/alternatives/midjourney', priority: 0.87, changefreq: 'monthly' },
            { path: '/alternatives/leonardo-ai', priority: 0.86, changefreq: 'monthly' },
            { path: '/alternatives/adobe-firefly', priority: 0.85, changefreq: 'monthly' },
            { path: '/alternatives/stable-diffusion', priority: 0.84, changefreq: 'monthly' },
            { path: '/alternatives/dall-e-3', priority: 0.83, changefreq: 'monthly' },
            { path: '/alternatives/comfyui', priority: 0.82, changefreq: 'monthly' },
            { path: '/alternatives/ideogram', priority: 0.81, changefreq: 'monthly' },
            { path: '/alternatives/civitai', priority: 0.8, changefreq: 'monthly' },
            { path: '/alternatives/bing-image-creator', priority: 0.79, changefreq: 'monthly' },
            { path: '/alternatives/canva-ai', priority: 0.78, changefreq: 'monthly' },
            { path: '/alternatives/playground-ai', priority: 0.77, changefreq: 'monthly' },
            { path: '/alternatives/nightcafe', priority: 0.76, changefreq: 'monthly' },
            { path: '/alternatives/starryai', priority: 0.75, changefreq: 'monthly' },
            { path: '/alternatives/getimg-ai', priority: 0.74, changefreq: 'monthly' },
            { path: '/alternatives/novelai', priority: 0.73, changefreq: 'monthly' },
            { path: '/alternatives/fotor', priority: 0.72, changefreq: 'monthly' },
            { path: '/alternatives/deepai', priority: 0.71, changefreq: 'monthly' },
            { path: '/guides/best-ai-image-generator', priority: 0.9, changefreq: 'weekly' },
            { path: '/guides', priority: 0.86, changefreq: 'weekly' },
            { path: '/guides/free-ai-image-generator', priority: 0.91, changefreq: 'weekly' },
            { path: '/guides/stable-diffusion-for-beginners', priority: 0.89, changefreq: 'weekly' },
            { path: '/guides/ai-art-commercial-use', priority: 0.87, changefreq: 'monthly' },
            { path: '/guides/how-to-write-ai-art-prompts', priority: 0.88, changefreq: 'weekly' },
            { path: '/guides/flux-vs-sdxl', priority: 0.87, changefreq: 'weekly' },
            { path: '/guides/best-anime-ai-image-generator', priority: 0.86, changefreq: 'weekly' },
            { path: '/guides/best-photorealistic-ai-image-generator', priority: 0.85, changefreq: 'weekly' },
            { path: '/use-cases', priority: 0.84, changefreq: 'weekly' },
            { path: '/use-cases/anime-ai-art', priority: 0.82, changefreq: 'monthly' },
            { path: '/use-cases/furry-ai-art', priority: 0.81, changefreq: 'monthly' },
            { path: '/use-cases/private-local-ai-art', priority: 0.83, changefreq: 'monthly' },
            { path: '/use-cases/photorealistic-ai-art', priority: 0.82, changefreq: 'monthly' },
            { path: '/use-cases/ai-art-without-discord', priority: 0.84, changefreq: 'monthly' },
            { path: '/use-cases/game-concept-art', priority: 0.81, changefreq: 'monthly' },
            { path: '/use-cases/flux-ai-art', priority: 0.83, changefreq: 'monthly' },
            { path: '/use-cases/api-ai-image-generation', priority: 0.85, changefreq: 'monthly' },
            { path: '/use-cases/product-photography-ai', priority: 0.82, changefreq: 'monthly' },
            { path: '/use-cases/social-media-ai-art', priority: 0.81, changefreq: 'monthly' },
            { path: '/use-cases/logo-branding-ai', priority: 0.8, changefreq: 'monthly' },
            { path: '/use-cases/book-cover-ai-art', priority: 0.79, changefreq: 'monthly' },
            { path: '/use-cases/print-on-demand-ai-art', priority: 0.78, changefreq: 'monthly' },
            { path: '/use-cases/interior-design-ai-art', priority: 0.77, changefreq: 'monthly' },
            { path: '/features', priority: 0.6, changefreq: 'monthly' },
            { path: '/contact', priority: 0.5, changefreq: 'monthly' },
            { path: '/terms', priority: 0.3, changefreq: 'monthly' },
            { path: '/privacy', priority: 0.3, changefreq: 'monthly' },
            { path: '/cookies', priority: 0.3, changefreq: 'monthly' },
            { path: '/safety', priority: 0.5, changefreq: 'monthly' },
            { path: '/brand', priority: 0.4, changefreq: 'monthly' },
            { path: '/careers', priority: 0.4, changefreq: 'monthly' },
            { path: '/showcase', priority: 0.6, changefreq: 'weekly' },
            { path: '/generations', priority: 0.7, changefreq: 'daily' },
            { path: '/blog', priority: 0.7, changefreq: 'weekly' },
            { path: '/landing', priority: 0.8, changefreq: 'monthly' },
        ];

        staticPages.forEach((page) => {
            if (SITEMAP_EXCLUDED_PREFIXES.some((p) => page.path === p || page.path.startsWith(`${p}/`))) {
                return;
            }
            const loc = `${baseUrl}${page.path}`;
            urlMap.set(loc, {
                loc,
                changefreq: page.changefreq,
                priority: page.priority,
                lastmod: resolveStaticLastmod(page.path, now),
            });
        });

        try {
            const modelsSnapshot = await db.collection('models').get();
            modelsSnapshot.forEach(doc => {
                const data = doc.data() as any;
                const loc = `${baseUrl}/model/${doc.id}`;
                urlMap.set(loc, {
                    loc,
                    changefreq: 'weekly',
                    priority: 0.7,
                    lastmod: data.updatedAt?.toDate?.()?.toISOString() || now,
                });
            });
        } catch (e: any) { logger.warn("Sitemap: Failed to fetch models", e); }

        const blogPostsData = [
            { id: 'prompt-director-drift-evaluation', date: '2026-01-03' },
            { id: 'elon-musk-docket-case', date: '2026-01-16' },
        ];
        blogPostsData.forEach(post => {
            const loc = `${baseUrl}/blog/${post.id}`;
            urlMap.set(loc, {
                loc,
                changefreq: 'monthly',
                priority: 0.7,
                lastmod: new Date(post.date).toISOString(),
            });
        });

        try {
            const showcaseSnapshot = await db.collection('model_showcase_images')
                .orderBy('createdAt', 'desc')
                .limit(200)
                .get();

            showcaseSnapshot.forEach(doc => {
                const data = doc.data() as any;
                const slug = slugify(data.prompt?.slice(0, 40) || 'artwork');
                const loc = `${baseUrl}/discovery/${slug}-${doc.id}`;
                const imgUrl = data.thumbnailUrl || data.url || data.imageUrl;
                urlMap.set(loc, {
                    loc,
                    changefreq: 'monthly',
                    priority: 0.6,
                    lastmod: data.createdAt?.toDate?.()?.toISOString() || now,
                    image: imgUrl ? {
                        loc: imgUrl,
                        title: data.prompt?.slice(0, 100) || 'AI Artwork',
                    } : null,
                });
            });
        } catch (e: any) { logger.warn("Sitemap: Failed to fetch showcase", e); }

        try {
            const generationsSnapshot = await db.collection('generations')
                .where('isPublic', '==', true)
                .orderBy('createdAt', 'desc')
                .limit(300)
                .get();

            generationsSnapshot.forEach(doc => {
                const data = doc.data() as any;
                const slug = slugify(data.prompt?.slice(0, 40) || 'artwork');
                const loc = `${baseUrl}/discovery/${slug}-${doc.id}`;
                if (!urlMap.has(loc)) {
                    const imgUrl = data.thumbnailUrl || data.url || data.imageUrl;
                    urlMap.set(loc, {
                        loc,
                        changefreq: 'monthly',
                        priority: 0.5,
                        lastmod: data.createdAt?.toDate?.()?.toISOString() || now,
                        image: imgUrl ? {
                            loc: imgUrl,
                            title: data.prompt?.slice(0, 100) || 'AI Artwork',
                        } : null,
                    });
                }
            });
        } catch (e: any) { logger.warn("Sitemap: Failed to fetch generations", e); }

        const sorted = [...urlMap.values()].sort((a, b) => b.priority - a.priority);

        let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">`;

        sorted.forEach((url) => {
            const loc = escapeXml(url.loc);
            const lastmod = escapeXml(url.lastmod);
            const changefreq = escapeXml(url.changefreq);
            const priority = url.priority.toFixed(2);
            xml += `
  <url>
    <loc>${loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>`;
            if (url.image) {
                xml += `
    <image:image>
      <image:loc>${escapeXml(url.image.loc)}</image:loc>
      <image:title>${escapeXml(url.image.title)}</image:title>
    </image:image>`;
            }
            xml += `
  </url>`;
        });

        xml += `
</urlset>`;

        res.set('Content-Type', 'application/xml');
        res.set('Cache-Control', 'public, max-age=86400, s-maxage=86400');
        cachedSitemap = { xml, expiresAt: Date.now() + SITEMAP_CACHE_MS };
        res.status(200).send(xml);
    } catch (error: any) {
        logger.error("Error generating sitemap", error);
        res.status(500).send("Error generating sitemap");
    }
};
