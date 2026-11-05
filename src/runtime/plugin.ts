import { defineNuxtPlugin } from '#app';
import { config } from '#build/umami.config.mjs';
import { umCaptureException, umTrackPerformance, umTrackView } from './composables';
import { directive } from './directive';

const { useDirective, autoTrack, errors, performance: trackPerformance } = config;

type MetricEntry = PerformanceEntry & {
  activationStart?: number;
  duration: number;
  hadRecentInput?: boolean;
  interactionId?: number;
  responseStart?: number;
  startTime: number;
  value?: number;
};

function initErrorListeners() {
  window.addEventListener('error', (event) => {
    if (!event.message)
      return;

    umCaptureException(
      event.error || {
        name: 'Error',
        message: event.message,
        stack: event.filename
          ? `at ${event.filename}:${event.lineno}:${event.colno}`
          : '',
      },
      {},
      false,
    );
  });

  window.addEventListener('unhandledrejection', (event) => {
    umCaptureException(event.reason, {}, false);
  });
}

function initPerformanceTracking() {
  const metrics: Record<string, number> = {};
  let sent = false;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let isInitialLoad = true;
  let activationStart = 0;
  let pageStartTime = performance.now();

  let clsSessionValue = 0;
  let clsSessionEntries: MetricEntry[] = [];
  let interactions: Record<number, number> = {};
  let inpObserver: PerformanceObserver | undefined;

  const observe = (type: string, callback: (entry: MetricEntry) => void) => {
    try {
      const observer = new PerformanceObserver((list) => {
        (list.getEntries() as MetricEntry[]).forEach(callback);
      });
      observer.observe({ type, buffered: true });
    }
    catch {
      /* not supported */
    }
  };

  observe('navigation', (entry) => {
    activationStart = entry.activationStart || 0;
    metrics.ttfb = Math.max((entry.responseStart || 0) - activationStart, 0);
  });

  observe('paint', (entry) => {
    if (entry.name === 'first-contentful-paint')
      metrics.fcp = Math.max(entry.startTime - activationStart, 0);
  });

  observe('largest-contentful-paint', (entry) => {
    metrics.lcp = Math.max(entry.startTime - activationStart, 0);
  });

  observe('layout-shift', (entry) => {
    if (entry.hadRecentInput)
      return;

    const lastEntry = clsSessionEntries[clsSessionEntries.length - 1];
    const firstEntry = clsSessionEntries[0];
    if (
      lastEntry
      && entry.startTime - lastEntry.startTime - lastEntry.duration < 1000
      && firstEntry
      && entry.startTime - firstEntry.startTime < 5000
    ) {
      clsSessionValue += entry.value || 0;
      clsSessionEntries.push(entry);
    }
    else {
      clsSessionValue = entry.value || 0;
      clsSessionEntries = [entry];
    }

    if (clsSessionValue > (metrics.cls || 0))
      metrics.cls = clsSessionValue;
  });

  const recordInteractions = (entries: PerformanceEntryList) => {
    (entries as MetricEntry[]).forEach((entry) => {
      if (!entry.interactionId)
        return;
      const existing = interactions[entry.interactionId];
      if (!existing || entry.duration > existing)
        interactions[entry.interactionId] = entry.duration;
    });
  };

  try {
    inpObserver = new PerformanceObserver(list => recordInteractions(list.getEntries()));
    inpObserver.observe({
      type: 'event',
      buffered: true,
      durationThreshold: 40,
    } as PerformanceObserverInit);
  }
  catch {
    /* not supported */
  }

  const computeInp = () => {
    if (inpObserver)
      recordInteractions(inpObserver.takeRecords());
    const values = Object.values(interactions).sort((a, b) => b - a);
    if (values.length) {
      const p98Index = Math.floor(Math.max(values.length, 10) * 0.02);
      metrics.inp = values[Math.min(p98Index, values.length - 1)];
    }
  };

  const getEntriesByType = (type: string): MetricEntry[] => {
    try {
      return (performance.getEntriesByType?.(type) as MetricEntry[]) || [];
    }
    catch {
      return [];
    }
  };

  const applyFallbackMetrics = () => {
    if (!isInitialLoad)
      return;

    if (metrics.ttfb === undefined) {
      const navigation = getEntriesByType('navigation')[0];
      if (navigation) {
        metrics.ttfb = Math.max(
          (navigation.responseStart || 0) - (navigation.activationStart || 0),
          0,
        );
      }
    }

    if (metrics.fcp === undefined) {
      const fcpEntry = getEntriesByType('paint')
        .find(entry => entry.name === 'first-contentful-paint');
      if (fcpEntry)
        metrics.fcp = Math.max(fcpEntry.startTime - activationStart, 0);
    }

    if (metrics.lcp === undefined) {
      const lcpEntries = getEntriesByType('largest-contentful-paint');
      const lcpEntry = lcpEntries[lcpEntries.length - 1];
      if (lcpEntry)
        metrics.lcp = Math.max(lcpEntry.startTime - activationStart, 0);
    }
  };

  const sendPerformance = () => {
    if (sent)
      return;

    applyFallbackMetrics();
    computeInp();
    metrics.duration = Math.round(performance.now() - pageStartTime);

    sent = true;
    if (timeoutId)
      clearTimeout(timeoutId);

    umTrackPerformance({ ...metrics });
  };

  const flushPerformance = () => {
    sendPerformance();
    isInitialLoad = false;
    Object.keys(metrics).forEach((k) => {
      delete metrics[k];
    });
    activationStart = 0;
    pageStartTime = performance.now();
    clsSessionValue = 0;
    clsSessionEntries = [];
    interactions = {};
    sent = false;
    if (timeoutId)
      clearTimeout(timeoutId);
    timeoutId = setTimeout(sendPerformance, 10000);
  };

  timeoutId = setTimeout(sendPerformance, 10000);

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden')
      sendPerformance();
  });
  window.addEventListener('pagehide', sendPerformance);

  return flushPerformance;
}

export default defineNuxtPlugin({
  name: 'umami-tracker',
  parallel: true,
  async setup(nuxtApp) {
    if (useDirective)
      nuxtApp.vueApp.directive('umami', directive);

    let flushPerformance: (() => void) | undefined;

    if (typeof window !== 'undefined') {
      if (errors)
        initErrorListeners();
      if (trackPerformance)
        flushPerformance = initPerformanceTracking();
    }

    let isFirstPage = true;

    if (autoTrack || flushPerformance) {
      nuxtApp.hook('page:finish', () => {
        // Flush prior page CWV on client navigations (not the initial load).
        if (flushPerformance) {
          if (isFirstPage)
            isFirstPage = false;
          else
            flushPerformance();
        }

        if (autoTrack) {
          setTimeout(umTrackView, 250);

          // TODO: fix
          // `useHead()` updates the DOM's head using this hook
          // currently, there is no hook we can watch, so we need
          // to wait for the update to finish, to capture title

          // TODO: update
          // `page:loading:end` hook sounds like the fix for this,
          // but the hook currently runs twice [bug: #26535]

          // TODO: also
          // injectHead().hooks.hook('dom:rendered', () => {})
          // works flawlessly as long as the page is having its head
          // rendered, if only there was a way to ALWAYS call that hook ;)
        }
      });
    }
  },
});
