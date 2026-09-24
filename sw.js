/* Tichu-Sprechstunde Service Worker
   Strategie: "Netzwerk zuerst, Zwischenspeicher als Rueckfall".
   -> Online wird IMMER die aktuelle Version vom Server geholt (Updates kommen sofort an).
   -> Ohne Verbindung wird die zuletzt gespeicherte Version ausgeliefert (App startet trotzdem).
*/

var CACHE = "tichu-sprechstunde-v1";
var ASSETS = [
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png"
];

self.addEventListener("install", function(event){
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then(function(cache){
      return cache.addAll(ASSETS).catch(function(){});
    })
  );
});

self.addEventListener("activate", function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.map(function(key){
        if(key !== CACHE){ return caches.delete(key); }
      }));
    }).then(function(){
      return self.clients.claim();
    })
  );
});

self.addEventListener("fetch", function(event){
  var req = event.request;
  if(req.method !== "GET"){ return; }

  var url;
  try { url = new URL(req.url); } catch(e) { return; }
  if(url.origin !== self.location.origin){ return; }

  event.respondWith(
    fetch(req).then(function(res){
      if(res && res.status === 200 && res.type === "basic"){
        var clone = res.clone();
        caches.open(CACHE).then(function(cache){
          cache.put(req, clone).catch(function(){});
        });
      }
      return res;
    }).catch(function(){
      return caches.match(req).then(function(cached){
        if(cached){ return cached; }
        if(req.mode === "navigate"){
          return caches.match("./index.html");
        }
        return new Response("", {status:503, statusText:"Offline"});
      });
    })
  );
});
