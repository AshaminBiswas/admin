import React, { lazy } from "react";

const RELOAD_STORAGE_KEY = "prc_admin_chunk_reload_active";

/**
 * Enhanced React.lazy wrapper that handles stale Vite deployment chunks.
 * When a user opens a tab and a new version is deployed to Vercel, older chunks
 * are removed, causing dynamic imports to fail with MIME type or network errors.
 * This wrapper catches that error and automatically triggers a window reload
 * (with an anti-loop guard) to seamlessly load the latest deployed version.
 */
export function lazyWithRetry<T extends React.ComponentType<any>>(
  importer: () => Promise<{ default: T }>
): React.LazyExoticComponent<T> {
  return lazy(async () => {
    try {
      const component = await importer();
      // Reset the reload state on successful load
      try {
        sessionStorage.removeItem(RELOAD_STORAGE_KEY);
      } catch {}
      return component;
    } catch (error: any) {
      const errorMessage = error?.message || String(error);
      const isChunkError =
        errorMessage.includes("dynamically imported module") ||
        errorMessage.includes("Failed to load module script") ||
        errorMessage.includes("Strict MIME type checking") ||
        errorMessage.includes("Loading chunk") ||
        errorMessage.includes("error loading dynamically imported module");

      let alreadyReloaded = false;
      try {
        alreadyReloaded = sessionStorage.getItem(RELOAD_STORAGE_KEY) === "true";
      } catch {}

      if (isChunkError && !alreadyReloaded) {
        console.warn("[PRC LazyLoad] Stale deployment chunk detected. Auto-refreshing console to latest version...", error);
        try {
          sessionStorage.setItem(RELOAD_STORAGE_KEY, "true");
        } catch {}
        window.location.reload();
        // Return a promise that stays pending while the browser reloads
        return new Promise<{ default: T }>(() => {});
      }

      try {
        sessionStorage.removeItem(RELOAD_STORAGE_KEY);
      } catch {}
      throw error;
    }
  });
}
