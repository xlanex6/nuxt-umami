import type { ModuleOptions } from '../options';
import type {
  ErrorPayload,
  EventPayload,
  FetchResult,
  NormalizedModuleOptions,
  PayloadTypes,
  PerformancePayload,
  ServerPayload,
  ViewPayload,
} from '../types';

function earlyPromise(ok: boolean): FetchResult {
  return Promise.resolve({ ok });
}

function isRecord(value: unknown, optional = false): value is Record<string, unknown> {
  if (optional && value === undefined)
    return true;
  return typeof value === 'object' && !Array.isArray(value) && value !== null;
}

function isValidString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

function includes<T extends U, U>(arr: ReadonlyArray<T>, el: U): el is T {
  return arr.includes(el as T);
}

function normalizeConfig(options: ModuleOptions = {}): NormalizedModuleOptions {
  const {
    host = '',
    id = '',
    domains = null,
    customEndpoint = null,
    proxy = false,
    ignoreLocalhost = false,
    autoTrack = true,
    useDirective = false,
    logErrors = false,
    enabled = true,
    tag = undefined,
    excludeQueryParams = false,
    trailingSlash = 'any',
    urlOptions,
    distinctId = null,
    doNotTrack = false,
    performance = false,
    errors = false,
    release = null,
    environment = null,
    beforeSend = null,
  } = options;

  return {
    host: isValidString(host) && URL.canParse(host) ? host.trim() : '',
    id: isValidString(id) ? id.trim() : '',
    domains: (function () {
      if (Array.isArray(domains) && domains.length)
        return Array.from(domains.filter(isValidString).map(d => d.trim()));
      return null;
    })(),
    customEndpoint: (function () {
      const customEP = isValidString(customEndpoint) ? customEndpoint.trim() : '';
      return (customEP && customEP !== '/')
        ? customEP.startsWith('/')
          ? customEP as `/${string}`
          : `/${customEP}`
        : null;
    })(),
    proxy: (function () {
      if (isValidString(proxy) && ['direct', 'cloak'].includes(proxy.trim()))
        return proxy.trim() as typeof proxy;
      return false;
    })(),
    urlOptions: {
      trailingSlash: (function () {
        const opt = urlOptions?.trailingSlash ?? trailingSlash;

        if (isValidString(opt) && ['always', 'never'].includes(opt.trim()))
          return opt.trim() as typeof opt;

        return 'any' as typeof opt;
      })(),
      excludeSearch: (urlOptions?.excludeSearch ?? excludeQueryParams) === true,
      excludeHash: urlOptions?.excludeHash === true,
    },
    tag: isValidString(tag) ? tag.trim() : null,
    ignoreLocalhost: ignoreLocalhost === true,
    autoTrack: autoTrack !== false,
    useDirective: useDirective === true,
    logErrors: logErrors === true,
    enabled: enabled !== false,
    distinctId: isValidString(distinctId) ? distinctId.trim().slice(0, 50) : null,
    doNotTrack: doNotTrack === true,
    performance: performance === true,
    errors: errors === true,
    release: isValidString(release) ? release.trim().slice(0, 100) : null,
    environment: isValidString(environment) ? environment.trim().slice(0, 50) : null,
    beforeSend: isValidString(beforeSend) ? beforeSend.trim() : null,
  };
}

function flattenObject(obj?: Record<string, unknown> | null, prefix = '') {
  try {
    if (typeof obj !== 'object' || obj === null)
      throw new TypeError(`Not an object.`);

    return Object.keys(obj).reduce((acc: Record<string, unknown>, k) => {
      const pre = prefix.length ? `${prefix}.` : '';
      if (
        typeof obj[k] === 'object'
        && obj[k] !== null
        && Object.keys(obj[k]).length > 0
      ) {
        Object.assign(acc, flattenObject(obj[k] as Record<string, unknown>, pre + k));
      }
      else {
        acc[pre + k] = obj[k];
      }
      return acc;
    }, {});
  }
  catch {
    return undefined;
  }
}

const validatorFns = {
  nonempty: isValidString,
  string: (value: unknown) => typeof value === 'string',
  number: (value: unknown) => typeof value === 'number' && Number.isFinite(value),
  boolean: (value: unknown) => typeof value === 'boolean',
  data: (value: unknown) => isRecord(value, true),
  tags: (value: unknown) => {
    if (!isRecord(value))
      return false;
    const keys = Object.keys(value);
    if (keys.length > 20)
      return false;
    return keys.every(k => typeof value[k] === 'string');
  },
  fingerprint: (value: unknown) => {
    if (!Array.isArray(value) || value.length > 5)
      return false;
    return value.every(v => typeof v === 'string');
  },
  skip: () => true,
} as const;

type PropertyValidator = keyof typeof validatorFns;
type TrackPayload = ViewPayload & EventPayload;

const _payloadProps: Record<keyof TrackPayload, PropertyValidator> = {
  hostname: 'nonempty',
  language: 'nonempty',
  screen: 'nonempty',
  url: 'nonempty',
  referrer: 'string',
  title: 'string',
  tag: 'skip',
  name: 'skip',
  data: 'skip',
  id: 'skip',
} as const;

const _perfMetricKeys = ['ttfb', 'fcp', 'lcp', 'cls', 'inp', 'duration'] as const;

const _errorProps: Record<keyof ErrorPayload, PropertyValidator> = {
  version: 'skip',
  eventId: 'nonempty',
  timestamp: 'number',
  name: 'nonempty',
  message: 'string',
  stack: 'string',
  handled: 'boolean',
  url: 'nonempty',
  screen: 'nonempty',
  language: 'nonempty',
  id: 'skip',
  release: 'skip',
  environment: 'skip',
  tags: 'skip',
  fingerprint: 'skip',
} as const;

const _payloadType: PayloadTypes = ['event', 'identify', 'performance', 'error'];
const _bodyProps: Array<keyof ServerPayload> = ['cache', 'payload', 'type'];

function isValidTrackPayload(obj: object): obj is TrackPayload {
  if (!isRecord(obj))
    return false;

  const objKeys = Object.keys(obj);

  const validators: typeof _payloadProps = { ..._payloadProps };

  const validatorKeys: Array<keyof TrackPayload> = [
    'hostname',
    'language',
    'screen',
    'url',
    'referrer',
    'title',
  ];

  if (objKeys.includes('name')) {
    validatorKeys.push('name');
    validators.name = 'nonempty';
  }

  if (objKeys.includes('data')) {
    validatorKeys.push('data');
    validators.data = 'data';
  }

  if (objKeys.includes('tag')) {
    validatorKeys.push('tag');
    validators.tag = 'string';
  }

  if (objKeys.includes('id')) {
    validatorKeys.push('id');
    validators.id = 'string';
  }

  if (
    objKeys.length !== validatorKeys.length
    || !validatorKeys.every(k => objKeys.includes(k))
  ) {
    return false;
  }

  for (const key in obj) {
    const fn = validatorFns[validators[key as keyof TrackPayload]];
    const value = obj[key];
    if (fn(value))
      continue;
    return false;
  }
  return true;
}

function isValidPerformancePayload(obj: object): obj is PerformancePayload {
  if (!isRecord(obj))
    return false;

  const base: Record<string, unknown> = {
    hostname: obj.hostname,
    language: obj.language,
    screen: obj.screen,
    url: obj.url,
    referrer: obj.referrer,
    title: obj.title,
  };

  if (typeof obj.tag === 'string')
    base.tag = obj.tag;
  if (typeof obj.id === 'string')
    base.id = obj.id;

  if (!isValidTrackPayload(base))
    return false;

  for (const key of Object.keys(obj)) {
    if (key in base)
      continue;
    if (!includes(_perfMetricKeys, key) || typeof obj[key] !== 'number')
      return false;
  }

  return true;
}

function isValidErrorPayload(obj: object): obj is ErrorPayload {
  if (!isRecord(obj))
    return false;

  const required: Array<keyof ErrorPayload> = [
    'version',
    'eventId',
    'timestamp',
    'name',
    'message',
    'stack',
    'handled',
    'url',
    'screen',
    'language',
  ];

  for (const key of required) {
    if (!(key in obj))
      return false;
  }

  if (obj.version !== 1)
    return false;

  const validators = { ..._errorProps };

  if ('id' in obj)
    validators.id = 'string';
  if ('release' in obj)
    validators.release = 'string';
  if ('environment' in obj)
    validators.environment = 'string';
  if ('tags' in obj)
    validators.tags = 'tags';
  if ('fingerprint' in obj)
    validators.fingerprint = 'fingerprint';

  const allowed = new Set(Object.keys(_errorProps));

  for (const key of Object.keys(obj)) {
    if (!allowed.has(key))
      return false;
    const fn = validatorFns[validators[key as keyof ErrorPayload]];
    if (!fn(obj[key]))
      return false;
  }

  return true;
}

type ValidatePayloadReturn =
  | { success: true; output: ServerPayload }
  | { success: false; output: unknown };

function parseEventBody(body: unknown): ValidatePayloadReturn {
  const error = {
    success: false,
    output: body,
  } satisfies ValidatePayloadReturn;

  // check: is record, no extra keys
  if (!isRecord(body) || Object.keys(body).length !== _bodyProps.length)
    return error;

  // check: top-level properties
  if (!(
    'type' in body && isValidString(body.type)
    && 'cache' in body && typeof body.cache === 'string'
    && 'payload' in body && isRecord(body.payload)
  )) {
    return error;
  }

  const { payload, cache, type } = body;

  if (!includes(_payloadType, type))
    return error;

  if (type === 'error') {
    if (!isValidErrorPayload(payload))
      return error;
  }
  else if (type === 'performance') {
    if (!isValidPerformancePayload(payload))
      return error;
  }
  else if (!isValidTrackPayload(payload)) {
    return error;
  }

  return {
    success: true,
    output: { type, cache, payload },
  };
}

export {
  earlyPromise,
  flattenObject,
  isValidString,
  normalizeConfig,
  parseEventBody,
};
