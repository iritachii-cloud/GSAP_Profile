// Layla's Light – Service Worker
// Cache strategy:
//   - GLB + MP3 → cache-first (large assets)
//   - JS / CSS / HTML → network-first (allow updates quickly)
// Bump CACHE_VERSION when models or audio change.

const CACHE_VERSION = 'layla-v1';
const ASSET_CACHE = `${CACHE_VERSION}-assets`;   // models, audio, images
const SHELL_CACHE = `${CACHE_VERSION}-shell`;    // HTML, JS, CSS, JSON

// Pre-warm only the largest files to avoid long install
const PRECACHE_ASSETS = [
    'models/layla.glb',
    'models/nolan.glb',
    'models/lillian.glb',
    'models/clint.glb',
    'sounds/theme.mp3',
    'sounds/jump.mp3',
    'sounds/spin.mp3',
    'sounds/blast.mp3',
];

self.addEventListener('install', event => {
    self.skipWaiting(); // activate immediately
    event.waitUntil(
        caches.open(ASSET_CACHE).then(cache =>
            Promise.allSettled(
                PRECACHE_ASSETS.map(url =>
                    cache.add(url).catch(err => console.warn(`[SW] Pre-cache skipped (${url}):`, err))
                )
            )
        )
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys.filter(k => k !== ASSET_CACHE && k !== SHELL_CACHE)
                    .map(k => {
                        console.log('[SW] Deleting stale cache:', k);
                        return caches.delete(k);
                    })
            )
        ).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);
    if (url.origin !== self.location.origin) return;
    if (!url.protocol.startsWith('http')) return;

    const path = url.pathname;

    // Cache-first for binary assets
    if (/\.(glb|mp3|wav|ogg|png|jpg|jpeg|webp|svg|woff2?|ttf)(\?.*)?$/.test(path)) {
        event.respondWith(cacheFirst(request, ASSET_CACHE));
        return;
    }

    // Network-first for code and config
    if (/\.(js|css|html?|json)(\?.*)?$/.test(path) || path.endsWith('/')) {
        event.respondWith(networkFirst(request, SHELL_CACHE));
        return;
    }

    // Pass through everything else
});

async function cacheFirst(request, cacheName) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);
    if (cached) return cached;
    try {
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
    } catch (err) {
        console.error('[SW] Network fetch failed and no cache for:', request.url);
        throw err;
    }
}

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