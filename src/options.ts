type ModuleOptions = Partial<{
  /**
   * Whether to enable the module
   *
   * @default true
   */
  enabled: boolean;
  /**
   * Your umami endpoint. This is where you would
   * normally load the script from.
   *
   * @required true
   * @example 'https://ijkml.xyz/'
   * @see [How to find?](https://umami.nuxt.dev/api/configuration#finding-config-options).
   */
  host: string;
  /**
   * Unique identifier provided by Umami
   *
   * @required true
   * @example `3c255b6d-678a-42dd-8074-272ee5b78484`
   */
  id: string;
  /**
   * Configure the tracker to only run on specific domains.
   * Provide an array or comma delimited list of domains (without 'http').
   * Leave as `undefined` to run on all domains.
   *
   * @example 'mywebsite.com, mywebsite2.com'
   * @example ['mywebsite.com', 'mywebsite2.com']
   * @default undefined
   */
  domains: string[] | null;
  /**
   * Option to automatically track page views.
   *
   * @default true
   */
  autoTrack: boolean;
  /**
   * Whether or not to track during development (localhost).
   *
   * @default false
   */
  ignoreLocalhost: boolean;
  /**
   * Self-hosted Umami lets you set a COLLECT_API_ENDPOINT, which is:
   * - `/api/collect` by default in Umami v1
   * - `/api/send` by default in Umami v2.
   * See [Umami Docs](https://umami.is/docs/environment-variables).
   */
  customEndpoint: string | null;
  /**
   * Use Umami tags for A/B testing or to group events.
   *
   * See [Documentation](https://umami.nuxt.dev/api/configuration#umami-tag).
   */
  tag: string | null;
  /**
   * Enable `v-umami` directive
   *
   * @default false
   */
  useDirective: boolean;
  /**
   * Enable warning and error logs in production
   *
   * @default false
   */
  logErrors: boolean;
  /**
   * API proxy mode
   *
   * @see [Documentation](https://umami.nuxt.dev/api/configuration#proxy-mode).
   *
   * @default false
   */
  proxy: false | 'direct' | 'cloak';
  /**
   * Distinct ID attached as `payload.id` on every collect.
   *
   * @default null
   */
  distinctId: string | null;
  /**
   * Disable tracking when the browser Do Not Track signal is enabled.
   *
   * @default false
   */
  doNotTrack: boolean;
  /**
   * Collect Core Web Vitals (LCP/INP/CLS/FCP/TTFB) as `type: 'performance'`.
   *
   * @default false
   */
  performance: boolean;
  /**
   * Capture JS errors (`window` error / unhandledrejection) and allow `umCaptureException`.
   *
   * @default false
   */
  errors: boolean;
  /**
   * Default release label for captured errors (max 100 chars).
   *
   * @default null
   */
  release: string | null;
  /**
   * Default environment label for captured errors (max 50 chars).
   *
   * @default null
   */
  environment: string | null;
  /**
   * Name of a `window` function called before each send: `(type, payload) => payload | falsy`.
   * Falsy return cancels the send.
   *
   * @default null
   */
  beforeSend: string | null;
  /**
   * Umami instance origin for the server-only Read API.
   * Kept private — never shipped to the client.
   *
   * Override with `NUXT_UMAMI_API_URL`.
   *
   * @example 'https://umami.example.com'
   * @default null
   */
  apiUrl: string | null;
  /**
   * Umami API key (`umami_…`) for the server-only Read API.
   * Kept private — never shipped to the client.
   *
   * Override with `NUXT_UMAMI_API_KEY`.
   *
   * @default null
   */
  apiKey: string | null;
  /**
   * Consistent trailing slash
   *
   * @default 'any'
   * @deprecated use `urlOptions` (DOCX)
   */
  trailingSlash: 'any' | 'always' | 'never';
  /**
   * Exclude query/search params from tracked urls
   *
   * false: `/page/link?search=product-abc&filter=asc`
   *
   * true: `/page/link`
   *
   * @default false
   * @deprecated use `urlOptions` (DOCX)
   */
  excludeQueryParams: boolean;
  /**
   * Configure how urls are sent to the server
   */
  urlOptions?: Partial<{
  /**
   * Enforce consistent trailing slash
   *
   * @default 'any'
   */
    trailingSlash: 'any' | 'always' | 'never';
    /**
     * Exclude query/search params from tracked urls
     *
     * false: `/page/link?search=product-abc&filter=asc`
     *
     * true: `/page/link`
     *
     * @default false
     */
    excludeSearch: boolean;
    /**
     * Exclude hash from tracked urls
     *
     * false: `/page/link#contact`
     *
     * true: `/page/link`
     *
     * @default false
     */
    excludeHash: boolean;
  }>;
}>;

export type { ModuleOptions };
