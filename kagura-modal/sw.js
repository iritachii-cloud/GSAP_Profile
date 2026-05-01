// ─────────────────────────────────────────────────────────────────────────────
//  Kagura – Cherry Blossom Shrine  |  Service Worker
//
//  Strategy:
//    • GLB models + audio  → Cache-first  (large, rarely change)
//    • JS / CSS / HTML     → Network-first (deploy updates land immediately)
//
//  To force a cache refresh after uploading new model files:
//    bump CACHE_VERSION below (e.g. 'kagura-v2'), redeploy, done.
// ─────────────────────────────────────────────────────────────────────────────

const CACHE_VERSION = 'kagura-v1';   // ← bump this when models/audio change

const ASSET_CACHE  = `${CACHE_VERSION}-assets`;   // GLB + MP3 (cache-first)
const SHELL_CACHE  = `${CACHE_VERSION}-shell`;    // HTML + JS + CSS (network-first)

// Files to pre-warm on first SW install (keeps the critical path short –
// only warm the two biggest files so install doesn't stall).
const PRECACHE_ASSETS = [
    'kagura-v1.glb',
    'hayabusa-v1.glb',
    'theme.mp3',
    'jump.mp3',
    'spin.mp3',
    'attack.mp3',
];

// ── Install: pre-warm the asset cache ────────────────────────────────────────
self.addEventListener('install', event => {
    // Skip waiting so the new SW activates immediately even with open tabs
    self.skipWaiting();

    event.waitUntil(
        caches.open(ASSET_CACHE).then(cache => {
            // addAll would fail the whole install if any file 404s.
            // Instead we fetch each individually and ignore failures.
            return Promise.allSettled(
                PRECACHE_ASSETS.map(url =>
                    cache.add(url).catch(err =>
                        console.warn(`[SW] Pre-cache skipped (${url}):`, err)
                    )
                )
            );
        })
    );
});

// ── Activate: delete stale caches from old versions ──────────────────────────
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys
                    .filter(k => k !== ASSET_CACHE && k !== SHELL_CACHE)
                    .map(k => {
                        console.log('[SW] Deleting stale cache:', k);
                        return caches.delete(k);
                    })
            )
        ).then(() => self.clients.claim())  // take control of open tabs instantly
    );
});

// ── Fetch: route requests to the right strategy ───────────────────────────────
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);

    // Only handle same-origin + http/https requests
    if (url.origin !== self.location.origin) return;
    if (!url.protocol.startsWith('http'))    return;

    const path = url.pathname;

    // ── Cache-first: binary assets (GLB models, audio) ───────────────────
    if (/\.(glb|mp3|wav|ogg)(\?.*)?$/.test(path)) {
        event.respondWith(cacheFirst(request, ASSET_CACHE));
        return;
    }

    // ── Cache-first: images / fonts (stable) ─────────────────────────────
    if (/\.(png|jpg|jpeg|webp|svg|woff2?|ttf)(\?.*)?$/.test(path)) {
        event.respondWith(cacheFirst(request, ASSET_CACHE));
        return;
    }

    // ── Network-first: JS, CSS, HTML (deploy updates must land fast) ──────
    if (/\.(js|css|html?|json)(\?.*)?$/.test(path) || path.endsWith('/')) {
        event.respondWith(networkFirst(request, SHELL_CACHE));
        return;
    }

    // Everything else: just pass through
});

// ─────────────────────────────────────────────────────────────────────────────
//  Strategy helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Cache-first:
 *   1. Return cached response immediately if present  ← instant on return visit
 *   2. Otherwise fetch from network, cache it, return it
 */
async function cacheFirst(request, cacheName) {
    const cache  = await caches.open(cacheName);
    const cached = await cache.match(request);
    if (cached) return cached;

    try {
        const response = await fetch(request);
        // Only cache valid responses (avoid caching 404s etc.)
        if (response.ok) {
            cache.put(request, response.clone());   // fire-and-forget, don't block
        }
        return response;
    } catch (err) {
        console.error('[SW] Network fetch failed and no cache for:', request.url);
        throw err;
    }
}

/**
 * Network-first:
 *   1. Try network (fresh code on every deploy)
 *   2. On failure fall back to cache (offline resilience)
 */
async function networkFirst(request, cacheName) {
    const cache = await caches.open(cacheName);
    try {
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
    } catch (_) {
        const cached = await cache.match(request);
        if (cached) return cached;
        throw new Error(`[SW] Offline and no cache for ${request.url}`);
    }
}