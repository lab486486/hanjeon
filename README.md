# 한전넷 (hanjeon.net)

전기요금·에너지 지원금을 모아 안내하는 정적 사이트입니다.

- **Frontend**: Astro (Cloudflare Pages)
- **CMS**: Decap CMS (`/admin`) + GitHub backend
- **Media**: Cloudflare R2 (`MEDIA` binding)
- **Auth**: GitHub OAuth via Pages Functions (`/api/auth`, `/api/callback`)

> 민간 안내 사이트입니다. 한국전력·정부 공식 사이트가 아닙니다.

## 로컬 개발

```bash
npm install
npm run dev
```

정적 페이지만 확인할 때는 `astro dev`로 충분합니다. OAuth/R2 Functions까지 보려면:

```bash
cp .dev.vars.example .dev.vars
# .dev.vars에 GITHUB_CLIENT_SECRET 입력

npm run build
npx wrangler pages dev dist
```

## Cloudflare Pages 설정

1. GitHub 저장소 `lab486486/hanjeon` 연결
2. Build command: `npm run build`
3. Build output directory: `dist`
4. Environment variables (Production):
   - `GITHUB_CLIENT_ID`
   - `GITHUB_CLIENT_SECRET` (Secret)
   - `MEDIA_PUBLIC_BASE` (선택, 예: `https://media.hanjeon.net` 또는 비워두면 `/api/media/...`)
5. R2 버킷 `hanjeon-media` 생성 후 Pages 프로젝트에 `MEDIA` 바인딩
6. 커스텀 도메인 `hanjeon.net` 연결

## GitHub OAuth App

[GitHub Developer Settings](https://github.com/settings/developers)에서:

- Homepage URL: `https://hanjeon.net`
- Authorization callback URL: `https://hanjeon.net/api/callback`

미리보기 도메인(`*.pages.dev`)에서도 CMS 로그인이 필요하면 callback URL을 해당 origin으로 추가하거나, 프로덕션 도메인만 사용하세요.

## Decap CMS

배포 후 `https://hanjeon.net/admin/` 접속 → GitHub 로그인 → 혜택/가이드 편집.

콘텐츠 경로:

- `src/content/benefits/*.md`
- `src/content/guides/*.md`

## 보안 메모

- `GITHUB_CLIENT_SECRET`은 저장소에 커밋하지 마세요 (`.dev.vars`는 gitignore).
- Client secret이 노출된 적 있으면 GitHub에서 즉시 재발급하세요.
