self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open('my-cache').then((cache) => {
            return cache.addAll([
                '/pwa/manifest.json',
                '/icons/loop.svg',
                '/icons/loopone.svg',
                '/icons/noloop.svg',
                '/icons/pause.svg',
                '/icons/play.svg',
                '/icons/queue.svg',
                '/icons/searchicon.svg',
                '/icons/share.svg',
                '/icons/unautheduser.svg',
            ]);
        })
    );
});

self.addEventListener('fetch', (e) => {
    e.respondWith(
        caches.match(e.request).then((response) => {
            return response || fetch(e.request);
        })
    );
});
