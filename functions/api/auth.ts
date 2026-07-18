import type { Env } from '../types';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const clientId = context.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return new Response('GITHUB_CLIENT_ID is not configured', { status: 500 });
  }

  const url = new URL(context.request.url);
  const redirectUri = `${url.origin}/api/callback`;
  const authorize = new URL('https://github.com/login/oauth/authorize');
  authorize.searchParams.set('client_id', clientId);
  authorize.searchParams.set('scope', 'repo,user');
  authorize.searchParams.set('redirect_uri', redirectUri);

  return Response.redirect(authorize.toString(), 302);
};
