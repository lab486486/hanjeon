import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const categoryEnum = z.enum([
  '요금할인',
  '바우처',
  '공동전기료',
  '전기차',
  '안전점검',
  '시설지원',
  '기타',
]);

const benefits = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/benefits' }),
  schema: z.object({
    title: z.string(),
    org: z.string(),
    region: z.string().default('전국'),
    category: categoryEnum,
    maxBenefit: z.string().default('확인 필요'),
    targetSummary: z.string(),
    gender: z.string().default('제한없음'),
    applyStart: z.string().optional(),
    applyEnd: z.string().optional(),
    alwaysOpen: z.boolean().default(false),
    sourceUrl: z.string().url(),
    sourceName: z.string().default('보조금24'),
    verifiedAt: z.string(),
    featured: z.boolean().default(false),
    draft: z.boolean().default(false),
  }),
});

const guides = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/guides' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    order: z.number().default(99),
    updatedAt: z.string(),
  }),
});

export const collections = { benefits, guides };
