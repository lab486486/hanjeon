import { getCollection, type CollectionEntry } from 'astro:content';

export type Benefit = CollectionEntry<'benefits'>;

export const CATEGORIES = [
  '요금할인',
  '바우처',
  '공동전기료',
  '전기차',
  '안전점검',
  '시설지원',
  '기타',
] as const;

export async function getPublishedBenefits(): Promise<Benefit[]> {
  const all = await getCollection('benefits', ({ data }) => !data.draft);
  return all.sort((a, b) => {
    if (a.data.featured !== b.data.featured) return a.data.featured ? -1 : 1;
    return b.data.verifiedAt.localeCompare(a.data.verifiedAt);
  });
}

export function daysUntil(dateStr?: string): number | null {
  if (!dateStr) return null;
  const end = new Date(`${dateStr}T23:59:59+09:00`);
  if (Number.isNaN(end.getTime())) return null;
  const now = new Date();
  return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export function deadlineLabel(benefit: Benefit): string {
  if (benefit.data.alwaysOpen) return '상시';
  const days = daysUntil(benefit.data.applyEnd);
  if (days === null) return '공고 확인';
  if (days < 0) return '마감';
  if (days === 0) return 'D-Day';
  return `D-${days}`;
}

export function matchesFilters(
  benefit: Benefit,
  opts: { region?: string; category?: string; keyword?: string },
): boolean {
  const { region, category, keyword } = opts;
  if (region && region !== '전국' && benefit.data.region !== '전국' && !benefit.data.region.includes(region)) {
    return false;
  }
  if (category && benefit.data.category !== category) return false;
  if (keyword) {
    const hay = `${benefit.data.title} ${benefit.data.org} ${benefit.data.targetSummary}`.toLowerCase();
    if (!hay.includes(keyword.toLowerCase())) return false;
  }
  return true;
}
