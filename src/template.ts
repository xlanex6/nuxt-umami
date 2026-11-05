import type { ModuleMode, UmPublicConfig } from './types';

interface TemplateOptions {
  options: {
    mode: ModuleMode;
    config: UmPublicConfig & { logErrors: boolean };
    path: {
      utils: string;
      types: string;
      logger: string;
    };
  };
};

const fn_faux = `if (enabled) {
    if (!endpoint)
      logger('endpoint', load.payload);
    if (!website)
      logger('id', load.payload);

    return Promise.resolve({ ok: false });
  }
    
  logger('enabled');
  return Promise.resolve({ ok: true });`;

const fn_proxy = `return ofetch('/api/savory', {
    method: 'POST',
    body: { ...load, cache },
  })
    .then(handleSuccess)
    .catch(handleError);`;

const fn_direct = `return ofetch(endpoint, {
    method: 'POST',
    headers: { ...(cache && { 'x-umami-cache': cache }) },
    body: { type: load.type, payload: { ...load.payload, website } },
    credentials: 'omit',
  })
    .then(handleSuccess)
    .catch(handleError);`;

const collectFn: Record<`fn_${ModuleMode}`, string> = { fn_direct, fn_faux, fn_proxy };

function generateTemplate({
  options: { mode, path, config: { logErrors, ...config } },
}: TemplateOptions) {
  return `// template-generated
import { ofetch } from 'ofetch';
import { ${logErrors ? 'logger' : 'fauxLogger'} as $logger } from "${path.logger}";

/**
 * @typedef {import("${path.types}").FetchFn} FetchFn
 * 
 * @typedef {import("${path.types}").BuildPathUrlFn} BuildPathUrlFn
 * 
 * @typedef {import("${path.types}").UmPublicConfig} UmPublicConfig
 */

export const logger = $logger;

/**
 * @type UmPublicConfig
*/
export const config = ${JSON.stringify(config, null, 2)};

const { endpoint, website, enabled, beforeSend: beforeSendName } = config;
let cache = '';
let identity = typeof config.distinctId === 'string' ? config.distinctId : '';

function handleError(err) {
  try {
    const cause = typeof err.data === 'string' ? err.data : err.data.data;
    if (cause && typeof cause === 'string')
      logger('collect', cause);
    else throw new Error('Unknown error');
  }
  catch {
    logger('collect', err);
  }
  return { ok: false };
}

function handleSuccess(response) {
  if (typeof response === 'string') {
    cache = response;
  }
  else if (response && typeof response === 'object' && typeof response.cache === 'string') {
    cache = response.cache;
  }
  else {
    cache = '';
  }
  return { ok: true };
}

/**
 * Remember Distinct ID for subsequent collects. Clears session cache.
 * @param {string | null | undefined} id
 */
export function setIdentity(id) {
  identity = typeof id === 'string' ? id : '';
  cache = '';
}

/**
 * @returns {string}
 */
export function getIdentity() {
  return identity;
}

/**
 * @type BuildPathUrlFn
 */
export function buildPathUrl(loc) {
  try {
    if (loc === null)
      throw new Error('null value');

    const url = new URL(loc, window.location.href);
    const path = url.pathname;
  
    ${config.urlOptions.excludeHash && `url.hash = '';`}
    ${config.urlOptions.excludeSearch && `url.search = '';`}
  
    url.pathname = ${config.urlOptions.trailingSlash === 'always'
      ? `path.endsWith('/') ? path : path + '/'`
      : config.urlOptions.trailingSlash === 'never'
        ? `path.endsWith('/') ? path.slice(0, -1) : path`
        : `path`};
  
    return url.toString();
  } catch {
    return '';
  }
}

/**
 * @param {string} type
 * @param {Record<string, unknown>} payload
 */
async function applyBeforeSend(type, payload) {
  if (!beforeSendName || typeof window === 'undefined')
    return payload;

  const callback = window[beforeSendName];
  if (typeof callback !== 'function') {
    logger('before-send', beforeSendName);
    return payload;
  }

  try {
    const next = await Promise.resolve(callback(type, payload));
    return next || null;
  }
  catch (err) {
    logger('before-send', err);
    return null;
  }
}

/**
 * @type FetchFn 
 * 
 * @variation ${mode}
 */
export async function collect(load) {
  let payload = { ...load.payload };
  if (identity)
    payload.id = identity;

  const next = await applyBeforeSend(load.type, payload);
  if (!next)
    return { ok: false };

  load = { ...load, payload: next };

  ${collectFn[`fn_${mode}`]}
}
`;
}

export { generateTemplate };
