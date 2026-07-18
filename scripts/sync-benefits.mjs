#!/usr/bin/env node
/**
 * Sync electricity-related public services from 행정안전부 공공서비스(혜택) API
 * into src/content/benefits/*.md for Astro + Decap CMS.
 *
 * Usage:
 *   ODCLOUD_SERVICE_KEY='...' node scripts/sync-benefits.mjs
 *   # or put key in .dev.vars / .env
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'src/content/benefits');
const API_BASE = 'https://api.odcloud.kr/api/gov24/v3';

const KEYWORDS = ['전기', '전기요금', '공동전기', '에너지바우처', '전기차', '전기자동차'];

const NOISE_RE =
  /(뮤지컬|장학금|체험|공연|소송|금융사기|발전기여|타이머콕|가스안전기기|문화시설 이용요금|생태공원 이용요금|농업발전기금|누리과정)/;

const RELEVANT_RE =
  /(전기요금|전기료|공동전기|에너지바우처|전기차|전기자동차|전기이륜|전기자전거|전기안전|전기시설|복지할인|전기설비|전기계측|전기레인지|전기운반|축사 전기|연료비 및 전기|전기 요금|충전식 전기|그린타운|발전소주변지역|주택용 전기)/;

const FEATURED_IDS = new Set([
  'B41000200003', // 전기 요금 복지할인
  'B55353000001', // 에너지바우처
  '135200005004', // 긴급복지 연료비 및 전기요금 지원
]);

async function loadEnvFile(filePath) {
  try {
    const text = await fs.readFile(filePath, 'utf8');
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const i = trimmed.indexOf('=');
      if (i < 0) continue;
      const key = trimmed.slice(0, i).trim();
      let val = trimmed.slice(i + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = val;
    }
  } catch {
    // optional
  }
}

function todayKST() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

async function apiGet(endpoint, params = {}) {
  const key = process.env.ODCLOUD_SERVICE_KEY;
  if (!key) throw new Error('ODCLOUD_SERVICE_KEY is required');

  const qs = new URLSearchParams({ serviceKey: key, ...params });
  const url = `${API_BASE}/${endpoint}?${qs}`;
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${endpoint} ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

async function fetchAllByKeyword(keyword) {
  const perPage = 100;
  let page = 1;
  const rows = [];
  while (true) {
    const data = await apiGet('serviceList', {
      page: String(page),
      perPage: String(perPage),
      'cond[서비스명::LIKE]': keyword,
    });
    const chunk = data.data || [];
    rows.push(...chunk);
    const match = data.matchCount ?? 0;
    if (rows.length >= match || chunk.length === 0) break;
    page += 1;
    if (page > 50) break;
  }
  return rows;
}

async function fetchDetail(serviceId) {
  const data = await apiGet('serviceDetail', {
    page: '1',
    perPage: '1',
    'cond[서비스ID::EQ]': serviceId,
  });
  return (data.data && data.data[0]) || null;
}

function categorize(name) {
  if (/바우처/.test(name)) return '바우처';
  if (/공동전기|공동 전기/.test(name)) return '공동전기료';
  if (/전기차|전기자동차|전기이륜|전기자전거|충전/.test(name) && !/분무기/.test(name)) {
    return '전기차';
  }
  if (/안전|점검|보안관|그린타운/.test(name)) return '안전점검';
  if (/요금|전기료|복지할인|연료비/.test(name)) return '요금할인';
  if (/시설|교체|설비|레인지|분무기|운반/.test(name)) return '시설지원';
  return '기타';
}

function inferRegion(org) {
  if (!org) return '전국';
  if (/한국전력|한국전기안전|한국중부발전|보건복지부|산업통상|환경부/.test(org)) {
    return '전국';
  }
  const m = org.match(
    /^(서울특별시|부산광역시|대구광역시|인천광역시|광주광역시|대전광역시|울산광역시|세종특별자치시|제주특별자치도|경기도|강원특별자치도|강원도|충청북도|충청남도|전북특별자치도|전라북도|전라남도|전남광주통합특별시|경상북도|경상남도)(?:\s+(.+))?/,
  );
  if (!m) return org;
  if (m[2]) return `${shortRegion(m[1])} ${m[2]}`.trim();
  return shortRegion(m[1]);
}

function shortRegion(name) {
  return name
    .replace('특별자치시', '')
    .replace('특별자치도', '')
    .replace('광역시', '')
    .replace('특별시', '')
    .replace('전남광주통합특별시', '전남')
    .replace('도', '');
}

function summarize(text, fallback = '원문 확인') {
  if (!text) return fallback;
  const cleaned = text
    .replace(/\r\n/g, '\n')
    .replace(/[○●■□]/g, '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
    .join(' ');
  return cleaned.length > 140 ? `${cleaned.slice(0, 137)}...` : cleaned;
}

function extractMaxBenefit(supportContent, supportType) {
  if (!supportContent && !supportType) return '확인 필요';
  const text = `${supportType || ''} ${supportContent || ''}`;
  const money = text.match(/([0-9]{1,3}(?:,[0-9]{3})+|\d+)\s*원/);
  if (money) return `최대 ${money[0]}대(대상별 상이 가능)`;
  if (/감면|할인/.test(text)) return '요금 할인·감면';
  if (/바우처|이용권/.test(text)) return '에너지 이용권';
  if (/현물|점검|서비스/.test(text)) return '현물·서비스';
  if (supportType) return supportType;
  return '확인 필요';
}

function isAlwaysOpen(deadline) {
  if (!deadline) return true;
  return /상시|연중|수시/.test(deadline);
}

function pickUrl(...candidates) {
  for (const raw of candidates) {
    let value = String(raw || '').trim();
    if (!value) continue;
    if (!/^https?:\/\//i.test(value) && /^[\w.-]+\.[a-z]{2,}/i.test(value)) {
      value = `https://${value}`;
    }
    try {
      const url = new URL(value);
      if (url.protocol === 'http:' || url.protocol === 'https:') return url.toString();
    } catch {
      // try next
    }
  }
  return 'https://www.gov.kr/portal/rcvfvrSvc/main';
}

function yamlEscape(value) {
  if (value == null) return '""';
  const s = String(value);
  if (/[:#{}[\],&*?|<>=!%@`'"\n]/.test(s) || s === '') {
    return JSON.stringify(s);
  }
  return s;
}

function toMarkdown({ list, detail }) {
  const id = list.서비스ID;
  const title = detail?.서비스명 || list.서비스명;
  const org = detail?.소관기관명 || list.소관기관명 || '미상';
  const category = categorize(title);
  const region = inferRegion(org);
  const target =
    summarize(detail?.지원대상 || list.지원대상 || list.서비스목적요약) || '원문 확인';
  const sourceUrl = pickUrl(
    detail?.온라인신청사이트URL,
    list.상세조회URL,
    `https://www.gov.kr/portal/rcvfvrSvc/dtlEx/${id}`,
  );
  const deadline = detail?.신청기한 || list.신청기한 || '';
  const alwaysOpen = isAlwaysOpen(deadline);
  const verifiedAt = (detail?.수정일시 || list.수정일시 || todayKST()).slice(0, 10);
  const featured = FEATURED_IDS.has(id);
  const maxBenefit = extractMaxBenefit(detail?.지원내용 || list.지원내용, detail?.지원유형 || list.지원유형);

  const bodyParts = [];
  if (list.서비스목적요약) bodyParts.push(`## 한줄 요약\n\n${list.서비스목적요약.trim()}`);
  if (detail?.지원대상 || list.지원대상) {
    bodyParts.push(`## 지원 대상\n\n${(detail?.지원대상 || list.지원대상).trim()}`);
  }
  if (detail?.지원내용 || list.지원내용) {
    bodyParts.push(`## 지원 내용\n\n${(detail?.지원내용 || list.지원내용).trim()}`);
  }
  if (detail?.신청방법 || list.신청방법) {
    bodyParts.push(`## 신청 방법\n\n${(detail?.신청방법 || list.신청방법).trim()}`);
  }
  if (detail?.구비서류) bodyParts.push(`## 구비 서류\n\n${detail.구비서류.trim()}`);
  if (detail?.문의처 || list.전화문의) {
    bodyParts.push(`## 문의\n\n${(detail?.문의처 || list.전화문의 || '').trim()}`);
  }
  bodyParts.push(
    `## 원문\n\n- 보조금24: ${list.상세조회URL || sourceUrl}\n- 서비스ID: \`${id}\``,
  );

  const fm = [
    '---',
    `title: ${yamlEscape(title)}`,
    `org: ${yamlEscape(org)}`,
    `region: ${yamlEscape(region)}`,
    `category: ${category}`,
    `maxBenefit: ${yamlEscape(maxBenefit)}`,
    `targetSummary: ${yamlEscape(target)}`,
    'gender: 제한없음',
    `alwaysOpen: ${alwaysOpen}`,
    `sourceUrl: ${yamlEscape(sourceUrl)}`,
    'sourceName: 보조금24',
    `verifiedAt: ${JSON.stringify(String(verifiedAt))}`,
    `serviceId: ${JSON.stringify(String(id))}`,
    'synced: true',
    `featured: ${featured}`,
    'draft: false',
    '---',
    '',
    bodyParts.join('\n\n'),
    '',
  ].join('\n');

  return fm;
}

function isRelevant(item) {
  const name = item.서비스명 || '';
  if (NOISE_RE.test(name)) return false;
  if (RELEVANT_RE.test(name)) return true;
  // keyword hit alone is weak; keep soft matches that still look electricity-ish
  return /전기/.test(name) && !/학비|장학금|공연/.test(name);
}

async function main() {
  await loadEnvFile(path.join(ROOT, '.dev.vars'));
  await loadEnvFile(path.join(ROOT, '.env'));

  console.log('Fetching service lists…');
  const byId = new Map();
  for (const kw of KEYWORDS) {
    const rows = await fetchAllByKeyword(kw);
    console.log(`  ${kw}: ${rows.length}`);
    for (const row of rows) {
      if (!row.서비스ID) continue;
      if (!byId.has(row.서비스ID)) byId.set(row.서비스ID, row);
    }
  }

  const candidates = [...byId.values()].filter(isRelevant);
  console.log(`Unique relevant: ${candidates.length}`);

  await fs.mkdir(OUT_DIR, { recursive: true });

  // Remove previously synced markdown (keep manually curated without synced: true)
  const existing = await fs.readdir(OUT_DIR);
  for (const file of existing) {
    if (!file.endsWith('.md')) continue;
    const full = path.join(OUT_DIR, file);
    const text = await fs.readFile(full, 'utf8');
    if (text.includes('\nsynced: true\n') || text.includes('\nsynced: true\r\n')) {
      await fs.unlink(full);
    }
  }

  let written = 0;
  for (const list of candidates) {
    const id = list.서비스ID;
    process.stdout.write(`  detail ${id}… `);
    let detail = null;
    try {
      detail = await fetchDetail(id);
      console.log('ok');
    } catch (err) {
      console.log(`fail (${err.message})`);
    }
    const md = toMarkdown({ list, detail });
    const file = path.join(OUT_DIR, `${id}.md`);
    await fs.writeFile(file, md, 'utf8');
    written += 1;
  }

  // Drop legacy sample files that are superseded by serviceId files
  const legacy = [
    'electricity-welfare-discount.md',
    'energy-voucher.md',
    'public-housing-common-electricity.md',
    'ev-purchase-subsidy.md',
    'electrical-safety-check.md',
  ];
  for (const file of legacy) {
    try {
      await fs.unlink(path.join(OUT_DIR, file));
      console.log(`removed legacy ${file}`);
    } catch {
      // ignore
    }
  }

  console.log(`Done. Wrote ${written} benefit pages → ${OUT_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
