import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';
import { getPublishedBenefits } from '../lib/benefits';

export const GET: APIRoute = async (context) => {
  const benefits = await getPublishedBenefits();
  const site = context.site ?? new URL('https://hanjeon.net');

  return rss({
    title: '한전넷 — 전기·에너지 지원금',
    description: '신청 가능한 전기요금·에너지 지원금 안내',
    site,
    items: benefits.map((benefit) => ({
      title: benefit.data.title,
      description: benefit.data.targetSummary,
      pubDate: new Date(benefit.data.verifiedAt),
      link: `/benefits/${benefit.id}/`,
      categories: [benefit.data.category, benefit.data.region, benefit.data.org],
    })),
    customData: `<language>ko-KR</language>`,
  });
};
