import type { Env } from '../types';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const code = url.searchParams.get('code');
  const clientId = context.env.GITHUB_CLIENT_ID;
  const clientSecret = context.env.GITHUB_CLIENT_SECRET;

  if (!code) {
    return new Response('Missing code', { status: 400 });
  }
  if (!clientId || !clientSecret) {
    return new Response('GitHub OAuth env vars missing', { status: 500 });
  }

  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
    }),
  });

  const tokenJson = (await tokenRes.json()) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  };

  if (!tokenJson.access_token) {
    return new Response(
      `OAuth failed: ${tokenJson.error_description || tokenJson.error || 'unknown'}`,
      { status: 400 },
    );
  }

  const content = `
<!doctype html>
<html lang="ko">
  <body>
    <script>
      (function () {
        function receiveMessage(event) {
          if (event.origin !== ${JSON.stringify(url.origin)}) return;
          window.opener.postMessage(
            'authorization:github:success:${JSON.stringify({ token: tokenJson.access_token, provider: 'github' })}',
            event.origin
          );
          window.removeEventListener('message', receiveMessage, false);
        }
        window.addEventListener('message', receiveMessage, false);
        window.opener.postMessage('authorizing:github', '*');
      })();
    </script>
    <p>GitHub 로그인 완료. 이 창을 닫아도 됩니다.</p>
  </body>
</html>`;

  return new Response(content, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
};
