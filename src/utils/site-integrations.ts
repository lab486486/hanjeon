import googleSearchConsoleData from "../data/site/google-search-console.json";
import naverSearchAdvisorData from "../data/site/naver-search-advisor.json";
import bingWebmasterData from "../data/site/bing-webmaster.json";
import daumWebmasterData from "../data/site/daum-webmaster.json";
import analyticsData from "../data/site/analytics.json";

function escapeAttr(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}

function toVerificationMeta(name: string, raw: string): string {
  const code = raw.trim();
  if (!code) return "";
  if (code.includes("<")) return code;
  return `<meta name="${name}" content="${escapeAttr(code)}" />`;
}

function toAnalyticsHtml(raw: string): string {
  const code = raw.trim();
  if (!code) return "";
  if (code.includes("<")) return code;
  if (/^G-[A-Z0-9]+$/i.test(code)) {
    return (
      `<script async src="https://www.googletagmanager.com/gtag/js?id=${code}"></script>` +
      `<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}` +
      `gtag('js',new Date());gtag('config','${code}');</script>`
    );
  }
  return code;
}

export function getSiteIntegrationSnippets(): string[] {
  return [
    toVerificationMeta("google-site-verification", googleSearchConsoleData.code ?? ""),
    toVerificationMeta("naver-site-verification", naverSearchAdvisorData.code ?? ""),
    toVerificationMeta("msvalidate.01", bingWebmasterData.code ?? ""),
    toVerificationMeta("daum-site-verification", daumWebmasterData.code ?? ""),
    toAnalyticsHtml(analyticsData.code ?? ""),
  ].filter(Boolean);
}
