import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, RuntimeCaching, SerwistGlobalConfig } from "serwist";
import { NetworkOnly, Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

/**
 * defaultCache caches GET /api/* with NetworkFirst for 24h. That is wrong for
 * this app: `/api/auth` would serve a stale "authenticated: true" after logging
 * out, and the library list would hide newly added songs. API responses are
 * never useful offline (the database isn't reachable anyway), so bypass the SW.
 * Page navigations still fall through to defaultCache, keeping viewed lyrics
 * readable offline.
 */
const apiNetworkOnly: RuntimeCaching = {
  matcher: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith("/api/"),
  handler: new NetworkOnly(),
};

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [apiNetworkOnly, ...defaultCache],
});

serwist.addEventListeners();
