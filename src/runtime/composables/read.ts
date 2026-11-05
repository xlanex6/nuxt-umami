import type { MaybeRefOrGetter } from 'vue';
import { toValue, useFetch } from '#imports';

type Id = MaybeRefOrGetter<string>;

function websitePath(websiteId: Id, suffix = '') {
  return () => {
    const id = toValue(websiteId);
    if (!id)
      throw new Error('[umami] websiteId is required');
    return `/api/_umami/websites/${id}${suffix}`;
  };
}

/**
 * List websites (GET /api/_umami/websites).
 * Requires server `apiUrl` + `apiKey`; returns fetch error if unset.
 */
// Explicit `any` return: module d.ts must stay portable (no deep ofetch paths).
function useUmamiWebsites(opts?: Record<string, unknown>): any {
  return useFetch('/api/_umami/websites', opts as any);
}

/**
 * Single website (GET /api/_umami/websites/:websiteId).
 */
function useUmamiWebsite(websiteId: Id, opts?: Record<string, unknown>): any {
  return useFetch(websitePath(websiteId), opts as any);
}

/**
 * Website stats (GET /api/_umami/websites/:websiteId/stats).
 */
function useUmamiStats(websiteId: Id, opts?: Record<string, unknown>): any {
  return useFetch(websitePath(websiteId, '/stats'), opts as any);
}

/**
 * Active visitors (GET /api/_umami/websites/:websiteId/active).
 */
function useUmamiActive(websiteId: Id, opts?: Record<string, unknown>): any {
  return useFetch(websitePath(websiteId, '/active'), opts as any);
}

/**
 * Pageviews series (GET /api/_umami/websites/:websiteId/pageviews).
 */
function useUmamiPageviews(websiteId: Id, opts?: Record<string, unknown>): any {
  return useFetch(websitePath(websiteId, '/pageviews'), opts as any);
}

/**
 * Events series (GET /api/_umami/websites/:websiteId/events/series).
 */
function useUmamiEventsSeries(websiteId: Id, opts?: Record<string, unknown>): any {
  return useFetch(websitePath(websiteId, '/events/series'), opts as any);
}

/**
 * Ranked metrics (GET /api/_umami/websites/:websiteId/metrics).
 */
function useUmamiMetrics(websiteId: Id, opts?: Record<string, unknown>): any {
  return useFetch(websitePath(websiteId, '/metrics'), opts as any);
}

/**
 * Expanded metrics (GET /api/_umami/websites/:websiteId/metrics/expanded).
 */
function useUmamiMetricsExpanded(websiteId: Id, opts?: Record<string, unknown>): any {
  return useFetch(websitePath(websiteId, '/metrics/expanded'), opts as any);
}

/**
 * Realtime activity (GET /api/_umami/realtime/:websiteId).
 */
function useUmamiRealtime(websiteId: Id, opts?: Record<string, unknown>): any {
  return useFetch(() => {
    const id = toValue(websiteId);
    if (!id)
      throw new Error('[umami] websiteId is required');
    return `/api/_umami/realtime/${id}`;
  }, opts as any);
}

export {
  useUmamiActive,
  useUmamiEventsSeries,
  useUmamiMetrics,
  useUmamiMetricsExpanded,
  useUmamiPageviews,
  useUmamiRealtime,
  useUmamiStats,
  useUmamiWebsite,
  useUmamiWebsites,
};
