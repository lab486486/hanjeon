import type { Env } from '../../types';

export const onRequestGet: PagesFunction<Env, 'path'> = async (context) => {
  const bucket = context.env.MEDIA;
  if (!bucket) {
    return new Response('R2 binding MEDIA missing', { status: 500 });
  }

  const parts = context.params.path;
  const key = Array.isArray(parts) ? parts.join('/') : parts;
  if (!key) {
    return new Response('Missing key', { status: 400 });
  }

  const object = await bucket.get(key);
  if (!object) {
    return new Response('Not found', { status: 404 });
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('Cache-Control', 'public, max-age=31536000, immutable');

  return new Response(object.body, { headers });
};
