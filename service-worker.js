const CACHE='iqraa-ui-v2';
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const name of await caches.keys()) if(name!==CACHE && (name.startsWith('iqraa') || name.startsWith('library'))) await caches.delete(name);await self.clients.claim();})()));
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 // Never cache API responses, writes, sessions, or external resources.
 if(request.method!=='GET' || url.origin!==self.location.origin) return;
 if(!(/\.(html|css|js|png|jpg|json)$/.test(url.pathname)||request.mode==='navigate')) return;
 event.respondWith((async()=>{try{const response=await fetch(request,{cache:'no-cache'});if(response.ok){const cache=await caches.open(CACHE);await cache.put(request,response.clone());}return response;}catch(error){const cached=await caches.match(request);if(cached)return cached;throw error;}})());
});
