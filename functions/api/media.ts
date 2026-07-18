import type { Env } from '../types';

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

function sanitizeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '-').toLowerCase();
}

export const onRequestOptions: PagesFunction<Env> = async () =>
  new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,PUT,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const bucket = context.env.MEDIA;
  if (!bucket) {
    return json({ error: 'R2 binding MEDIA missing' }, 500);
  }

  const form = await context.request.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    return json({ error: 'file field required' }, 400);
  }

  const key = `uploads/${Date.now()}-${sanitizeName(file.name || 'image.bin')}`;
  const bytes = await file.arrayBuffer();

  await bucket.put(key, bytes, {
    httpMetadata: {
      contentType: file.type || 'application/octet-stream',
      cacheControl: 'public, max-age=31536000, immutable',
    },
  });

  const base =
    context.env.MEDIA_PUBLIC_BASE?.replace(/\/$/, '') ||
    `${new URL(context.request.url).origin}/api/media`;

  return json({
    url: `${base}/${key}`,
    key,
  });
};

export const onRequestGet: PagesFunction<Env> = async () =>
  json({ ok: true, message: 'POST multipart file to upload' });
