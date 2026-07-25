import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';
import { getPublishedBenefits } from '../lib/benefits';

export const GET: APIRoute = async (context) => {
  const benefits = await getPublishedBenefits();
  const site = context.site ?? new URL('https://hanjeon.net');

  return rss({
    title: '전기요금 지원금 안내 | 한전넷',
    description: '전기요금 지원금·소상공인 전기지원금·에너지바우처 신청 안내',
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
