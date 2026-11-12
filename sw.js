/* 誰與爭鋒 V185 Service Worker - approved production release */
const CACHE_NAME='mahjong-pwa-V185-20261112';
const APP_SHELL=['/','/manifest.webmanifest'];


self.addEventListener('install',event=>{
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache=>cache.addAll(APP_SHELL)).catch(()=>{})
  );
});


self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{
    const keys=await caches.keys();
    await Promise.all(keys.filter(k=>k!==CACHE_NAME && k.startsWith('mahjong-pwa-')).map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});


self.addEventListener('message',event=>{
  if(event.data && event.data.type==='SKIP_WAITING') self.skipWaiting();
});


self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET') return;
  const url=new URL(req.url);
  if(url.origin!==self.location.origin) return;


  // HTML / navigation：永遠先拿 Vercel 最新版，離線時才用快取。
  if(req.mode==='navigate'){
    event.respondWith((async()=>{
      try{
        const fresh=await fetch(req,{cache:'no-store'});
        if(fresh && fresh.ok){
          const cache=await caches.open(CACHE_NAME);
          cache.put('/',fresh.clone()).catch(()=>{});
        }
        return fresh;
      }catch(e){
        return (await caches.match(req)) || (await caches.match('/')) || Response.error();
      }
    })());
    return;
  }


  // manifest / icons 等靜態檔：先回快取，同時背景更新。sw.js 本身不攔截。
  if(url.pathname==='/sw.js') return;
  event.respondWith((async()=>{
    const cached=await caches.match(req);
    const network=fetch(req).then(async res=>{
      if(res && res.ok){
        const cache=await caches.open(CACHE_NAME);
        cache.put(req,res.clone()).catch(()=>{});
      }
      return res;
    }).catch(()=>null);
    return cached || (await network) || Response.error();
  })());
});
