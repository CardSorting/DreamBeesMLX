import { LLMS_TXT } from '../../lib/seo.js';

const CACHE_MS = 24 * 60 * 60 * 1000;
let cached: { body: string; expiresAt: number } | null = null;

export const handleLlms = (_req: unknown, res: { set: (k: string, v: string) => void; status: (n: number) => { send: (b: string) => void } }) => {
    if (!cached || cached.expiresAt < Date.now()) {
        cached = { body: LLMS_TXT, expiresAt: Date.now() + CACHE_MS };
    }
    res.set('Content-Type', 'text/plain; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=86400, s-maxage=86400');
    res.status(200).send(cached.body);
};
