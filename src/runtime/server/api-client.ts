import type { UmamiApiConfig } from '../../types';
import { useRuntimeConfig } from '#imports';
import { createError } from 'h3';
import { ofetch } from 'ofetch';

function getUmamiApiConfig(): UmamiApiConfig {
  const config = useRuntimeConfig()._umamiApi as UmamiApiConfig | undefined;
  const apiUrl = typeof config?.apiUrl === 'string' ? config.apiUrl.trim() : '';
  const apiKey = typeof config?.apiKey === 'string' ? config.apiKey.trim() : '';

  if (!apiUrl || !apiKey) {
    throw createError({
      statusCode: 501,
      statusMessage: 'Umami Read API is not configured. Set umami.apiUrl and umami.apiKey.',
    });
  }

  return { apiUrl, apiKey };
}

/**
 * Server-only ofetch client for the Umami Read API.
 * Uses private runtimeConfig (`_umamiApi`); never expose apiKey to the client.
 */
function createUmamiApiClient() {
  const { apiUrl, apiKey } = getUmamiApiConfig();

  return ofetch.create({
    baseURL: apiUrl.replace(/\/+$/, ''),
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });
}

export { createUmamiApiClient, getUmamiApiConfig };
