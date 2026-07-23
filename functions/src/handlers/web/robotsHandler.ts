import { ROBOTS_TXT } from '../../lib/seo.js';

const ROBOTS_CACHE_MS = 24 * 60 * 60 * 1000;
let cachedRobots: { body: string; expiresAt: number } | null = null;

export const handleRobots = (_req: unknown, res: { set: (k: string, v: string) => void; status: (n: number) => { send: (b: string) => void } }) => {
    if (!cachedRobots || cachedRobots.expiresAt < Date.now()) {
        cachedRobots = { body: ROBOTS_TXT, expiresAt: Date.now() + ROBOTS_CACHE_MS };
    }
    res.set('Content-Type', 'text/plain; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=86400, s-maxage=86400');
    res.status(200).send(cachedRobots.body);
};
