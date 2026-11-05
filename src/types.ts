import type { ModuleOptions } from './options';

// !IMPORTANT: Sync with example.ts

interface _NormalizedOpts extends Required<Omit<ModuleOptions, 'apiUrl' | 'apiKey'>> {
  domains: Array<string> | null;
  customEndpoint: `/${string}` | null;
  urlOptions: Required<Required<ModuleOptions>['urlOptions']>;
  distinctId: string | null;
  release: string | null;
  environment: string | null;
  beforeSend: string | null;
}

type NormalizedModuleOptions = Prettify<
  Omit<
    _NormalizedOpts,
    'excludeQueryParams' | 'trailingSlash'
  >
>;

type _PublicConfig = Omit<
  NormalizedModuleOptions,
  'id' | 'host' | 'proxy' | 'customEndpoint' | 'logErrors'
>;

interface UmPublicConfig extends _PublicConfig {
  website: string;
  endpoint: string;
}

interface UmPrivateConfig {
  website: string;
  endpoint: string;
}

interface UmamiApiConfig {
  apiUrl: string;
  apiKey: string;
}

type PreflightResult = true | 'ssr' | 'domain' | 'localhost' | 'local-storage' | 'do-not-track';
type ModuleMode = 'faux' | 'proxy' | 'direct';

type EventData = Record<string, string | number | boolean> | null;

type PayloadTypes = ['event', 'identify', 'performance', 'error'];

interface StaticPayload {
  screen: string;
  language: string;
  hostname: string;
  tag?: string;
  id?: string;
}

interface ViewPayload extends StaticPayload {
  url: string;
  title: string;
  referrer: string;
};

interface EventPayload extends ViewPayload {
  name: string;
  data?: Record<string, unknown>;
};

interface IdentifyPayload extends ViewPayload {
  data?: Record<string, unknown>;
}

interface PerformancePayload extends ViewPayload {
  ttfb?: number;
  fcp?: number;
  lcp?: number;
  cls?: number;
  inp?: number;
  duration?: number;
}

interface ErrorPayload {
  version: 1;
  eventId: string;
  timestamp: number;
  name: string;
  message: string;
  stack: string;
  handled: boolean;
  url: string;
  screen: string;
  language: string;
  id?: string;
  release?: string;
  environment?: string;
  tags?: Record<string, string>;
  fingerprint?: string[];
}

interface CaptureExceptionOptions {
  release?: string;
  environment?: string;
  tags?: Record<string, string>;
  fingerprint?: string[];
}

interface ServerPayload {
  cache?: string;
  type: PayloadTypes[number];
  payload: ViewPayload | EventPayload | IdentifyPayload | PerformancePayload | ErrorPayload;
};

type FetchResult = Promise<{ ok: boolean }>;
type FetchFn = (load: ServerPayload) => FetchResult;
type BuildPathUrlFn = (loc: string | null) => string;

type _Letter = `${'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H'
  | 'I' | 'J' | 'K' | 'M' | 'L' | 'N' | 'O' | 'P' | 'Q' | 'R' | 'S'
  | 'T' | 'U' | 'V' | 'W' | 'X' | 'Y' | 'Z'}`;

type CurrencyCode = Uppercase<`${_Letter}${_Letter}${_Letter}`>;

type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

export type {
  BuildPathUrlFn,
  CaptureExceptionOptions,
  CurrencyCode,
  ErrorPayload,
  EventData,
  EventPayload,
  FetchFn,
  FetchResult,
  IdentifyPayload,
  ModuleMode,
  NormalizedModuleOptions,
  PayloadTypes,
  PerformancePayload,
  PreflightResult,
  ServerPayload,
  StaticPayload,
  UmamiApiConfig,
  UmPrivateConfig,
  UmPublicConfig,
  ViewPayload,
};
