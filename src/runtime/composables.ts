import type {
  CaptureExceptionOptions,
  CurrencyCode,
  ErrorPayload,
  EventData,
  EventPayload,
  FetchResult,
  IdentifyPayload,
  PerformancePayload,
  PreflightResult,
  StaticPayload,
  ViewPayload,
} from '../types';
import { buildPathUrl, collect, config, getIdentity, logger, setIdentity } from '#build/umami.config.mjs';
import { earlyPromise, flattenObject, isValidString } from './utils';

let configChecks: PreflightResult | undefined;
let staticPayload: StaticPayload | undefined;
let queryRef: string | undefined;

function hasDoNotTrack(): boolean {
  const w = window as Window & { doNotTrack?: string | number | null };
  const nav = navigator as Navigator & { msDoNotTrack?: string | number | null };
  const dnt = w.doNotTrack ?? nav.doNotTrack ?? nav.msDoNotTrack;
  return dnt === 1 || dnt === '1' || dnt === 'yes';
}

function runPreflight(): PreflightResult {
  if (typeof window === 'undefined')
    return 'ssr';

  // Disable tracking when umami.disabled=1 in localStorage
  if (window.localStorage.getItem('umami.disabled') === '1')
    return 'local-storage';

  if (configChecks)
    return configChecks;

  configChecks = (function (): PreflightResult {
    const { ignoreLocalhost, domains, doNotTrack } = config;
    const hostname = window.location.hostname;

    if (ignoreLocalhost && hostname === 'localhost')
      return 'localhost';

    if (domains && !domains.includes(hostname))
      return 'domain';

    if (doNotTrack && hasDoNotTrack())
      return 'do-not-track';

    return true;
  })();

  return configChecks;
};

function getStaticPayload(): StaticPayload {
  if (staticPayload)
    return staticPayload;

  const {
    location: { hostname },
    screen: { width, height },
    navigator: { language },
  } = window;

  const { tag } = config;

  staticPayload = {
    hostname,
    language,
    screen: `${width}x${height}`,
    ...(tag ? { tag } : null),
  };

  return staticPayload;
}

function getQueryRef(): string {
  if (typeof queryRef === 'string')
    return queryRef;

  const params = new URL(window.location.href).searchParams;
  queryRef = params.get('referrer') || params.get('ref') || '';

  return queryRef;
}

function getPayload(): ViewPayload {
  const { referrer, title } = window.document;
  const { origin, href } = window.location;

  const url = buildPathUrl(href);
  const tag = window.localStorage.getItem('umami.tag');
  const ref = referrer && !referrer.startsWith(origin) ? referrer : getQueryRef();
  const id = getIdentity();

  return {
    ...getStaticPayload(),
    ...(tag ? { tag } : null),
    ...(id ? { id } : null),
    url,
    title,
    referrer: ref,
  };
};

/**
 * Track page views
 *
 * Both params are optional and will be automatically inferred
 * @param path url being tracked, eg `/about`, `/contact?by=phone#office`
 * @param referrer page referrer, `document.referrer`
 */
function umTrackView(path?: string, referrer?: string): FetchResult {
  const check = runPreflight();

  if (check === 'ssr')
    return earlyPromise(false);

  if (check !== true) {
    logger(check);
    return earlyPromise(false);
  }

  const url = buildPathUrl(isValidString(path) ? path : null);

  return collect({
    type: 'event',
    payload: {
      ...getPayload(),
      ...(isValidString(url) && { url }),
      ...(isValidString(referrer) && { referrer }),
    } satisfies ViewPayload,
  });
}

/**
 * Tracks an event with a custom event type.
 *
 * @param eventName event name, eg 'CTA-button-click'
 * @param eventData additional data for the event, provide an object in the format
 * `{key: value}`, where `key` = `string`, `value` = `string | number | boolean`.
 */
function umTrackEvent(eventName: string, eventData?: EventData): FetchResult {
  const check = runPreflight();

  if (check === 'ssr')
    return earlyPromise(false);

  if (check !== true) {
    logger(check);
    return earlyPromise(false);
  }

  const data = flattenObject(eventData);
  let name = eventName;

  if (!isValidString(eventName)) {
    logger('event-name');
    name = '#unknown-event';
  }

  return collect({
    type: 'event',
    payload: {
      name,
      ...getPayload(),
      ...(data && { data }),
    } satisfies EventPayload,
  });
}

/**
 * Save data about the current session / set Distinct ID.
 *
 * @see [v2.13.0 release](https://github.com/umami-software/umami/releases/tag/v2.13.0)
 *
 * @example umIdentify({ plan: 'pro' })
 * @example umIdentify('user-123')
 * @example umIdentify('user-123', { plan: 'pro' })
 * @example umIdentify({ id: 'user-123', plan: 'pro' })
 */
function umIdentify(sessionData?: EventData): FetchResult;
function umIdentify(id: string, data?: EventData): FetchResult;
function umIdentify(data: EventData & { id?: string }): FetchResult;
function umIdentify(
  idOrData?: string | (EventData & { id?: string }) | EventData,
  data?: EventData,
): FetchResult {
  const check = runPreflight();

  if (check === 'ssr')
    return earlyPromise(false);

  if (check !== true) {
    logger(check);
    return earlyPromise(false);
  }

  let sessionData: EventData | (EventData & { id?: string }) | undefined;

  if (typeof idOrData === 'string') {
    setIdentity(idOrData);
    sessionData = data;
  }
  else if (idOrData && typeof idOrData === 'object') {
    const maybeId = (idOrData as { id?: unknown }).id;
    if (typeof maybeId === 'string')
      setIdentity(maybeId);
    sessionData = idOrData;
  }

  const flat = flattenObject(sessionData ?? undefined);

  return collect({
    type: 'identify',
    payload: {
      ...getPayload(),
      ...(flat && { data: flat }),
    } satisfies IdentifyPayload,
  });
}

/**
 * Tracks financial performance
 * @see [Umami Docs](https://umami.is/docs/reports/report-revenue)
 *
 * @param eventName [revenue] event name
 * @param revenue revenue / amount
 * @param currency currency code (defaults to USD)
 * ([ISO 4217](https://en.wikipedia.org/wiki/ISO_4217#List_of_ISO_4217_currency_codes))
 */
function umTrackRevenue(
  eventName: string,
  revenue: number,
  currency: CurrencyCode = 'USD',
): FetchResult {
  const $rev = typeof revenue === 'number' ? revenue : Number(revenue);

  if (Number.isNaN($rev) || !Number.isFinite(revenue)) {
    // if you ever run into troubles with isFinite (or not),
    // please buy me a coffee ;) bmc.link/ijkml
    logger('revenue', revenue);
    return earlyPromise(false);
  }

  let $cur: string | null = null;

  if (typeof currency === 'string' && /^[A-Z]{3}$/i.test(currency.trim()))
    $cur = currency.trim();
  else
    logger('currency', `Got: ${currency}`);

  return umTrackEvent(eventName, {
    revenue: $rev,
    ...($cur ? { currency: $cur } : null),
  });
}

function toErrorLike(error: unknown): { name: string; message: string; stack: string } {
  if (error instanceof Error) {
    return {
      name: error.name || 'Error',
      message: error.message || 'Error',
      stack: error.stack || '',
    };
  }

  if (typeof error === 'string') {
    return { name: 'Error', message: error, stack: '' };
  }

  if (error && typeof error === 'object') {
    const obj = error as { name?: unknown; message?: unknown; stack?: unknown };
    return {
      name: typeof obj.name === 'string' ? obj.name : 'Error',
      message: typeof obj.message === 'string'
        ? obj.message
        : 'Non-Error exception',
      stack: typeof obj.stack === 'string' ? obj.stack : '',
    };
  }

  return { name: 'Error', message: 'Non-Error exception', stack: '' };
}

function createEventId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    crypto.getRandomValues(bytes);
  }
  else {
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }

  bytes[6] = (bytes[6] & 0x0F) | 0x40;
  bytes[8] = (bytes[8] & 0x3F) | 0x80;
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Report a caught error. Requires `errors: true` in module config.
 */
function umCaptureException(
  error: unknown,
  opts: CaptureExceptionOptions = {},
  handled = true,
): FetchResult {
  if (!config.errors) {
    logger('errors-disabled');
    return earlyPromise(false);
  }

  const check = runPreflight();

  if (check === 'ssr')
    return earlyPromise(false);

  if (check !== true) {
    logger(check);
    return earlyPromise(false);
  }

  const err = toErrorLike(error);
  const { screen, language } = getStaticPayload();
  const id = getIdentity();

  const release = (opts.release ?? config.release ?? '').slice(0, 100);
  const environment = (opts.environment ?? config.environment ?? 'production').slice(0, 50);

  let tags: Record<string, string> | undefined;
  if (opts.tags && typeof opts.tags === 'object') {
    tags = Object.fromEntries(
      Object.entries(opts.tags)
        .filter((entry): entry is [string, string] => typeof entry[1] === 'string')
        .slice(0, 20),
    );
    if (!Object.keys(tags).length)
      tags = undefined;
  }

  const fingerprint = Array.isArray(opts.fingerprint)
    ? opts.fingerprint.filter(v => typeof v === 'string').slice(0, 5).map(v => v.slice(0, 200))
    : undefined;

  const payload = {
    version: 1 as const,
    eventId: createEventId(),
    timestamp: Date.now(),
    name: err.name.slice(0, 200) || 'Error',
    message: err.message.slice(0, 500),
    stack: err.stack.slice(0, 16000),
    handled,
    url: buildPathUrl(window.location.href) || window.location.href,
    screen,
    language,
    ...(id ? { id } : null),
    ...(release ? { release } : null),
    ...(environment ? { environment } : null),
    ...(tags ? { tags } : null),
    ...(fingerprint?.length ? { fingerprint } : null),
  } satisfies ErrorPayload;

  return collect({
    type: 'error',
    payload,
  });
}

/** Send Core Web Vitals / performance metrics (used by plugin). */
function umTrackPerformance(metrics: Record<string, number>): FetchResult {
  const check = runPreflight();

  if (check === 'ssr')
    return earlyPromise(false);

  if (check !== true) {
    logger(check);
    return earlyPromise(false);
  }

  if (!config.performance)
    return earlyPromise(false);

  return collect({
    type: 'performance',
    payload: {
      ...getPayload(),
      ...metrics,
    } satisfies PerformancePayload,
  });
}

export {
  umCaptureException,
  umIdentify,
  umTrackEvent,
  umTrackPerformance,
  umTrackRevenue,
  umTrackView,
};
