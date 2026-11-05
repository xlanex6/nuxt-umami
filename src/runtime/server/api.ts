import { createError, defineEventHandler, getQuery, getRequestURL } from 'h3';
import { createUmamiApiClient } from './api-client';

const READ_PATH = /^(?:websites(?:\/[^/]+(?:\/(?:stats|active|pageviews|metrics(?:\/expanded)?|events\/series))?)?)?$|^realtime\/[^/]+$/;

export default defineEventHandler(async (event) => {
  if (event.method !== 'GET') {
    throw createError({
      statusCode: 405,
      statusMessage: 'Method Not Allowed',
    });
  }

  const url = getRequestURL(event);
  const subpath = url.pathname
    .replace(/^\/api\/_umami\/?/, '')
    .replace(/\/+$/, '');

  // Never proxy the tracker cloak alias through the Read API handler
  if (!subpath || subpath === 'send' || subpath.startsWith('send/')) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Not Found',
    });
  }

  if (!READ_PATH.test(subpath)) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Not Found',
    });
  }

  const client = createUmamiApiClient();
  const upstream = `/api/${subpath}`;

  try {
    return await client(upstream, {
      method: 'GET',
      query: getQuery(event),
    });
  }
  catch (error) {
    let statusCode = 502;
    let message = 'Umami API request failed.';

    if (error && typeof error === 'object') {
      if ('statusCode' in error && typeof error.statusCode === 'number')
        statusCode = error.statusCode;
      else if ('status' in error && typeof error.status === 'number')
        statusCode = error.status;

      if ('data' in error && typeof error.data === 'string')
        message = error.data;
      else if (error instanceof Error)
        message = error.message;
    }

    throw createError({
      name: 'Umami API Error',
      statusCode,
      statusMessage: message,
      data: message,
      message,
    });
  }
});
