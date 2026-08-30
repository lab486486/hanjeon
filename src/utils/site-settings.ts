import siteData from "../data/site.json";
import navData from "../data/nav.json";

export type NavItemType = "home" | "url";

export type SiteNavItem = {
  label: string;
  type: NavItemType;
  value?: string;
};

export type SiteSettings = {
  title: string;
  site_url: string;
  copyright_name: string;
  nav: SiteNavItem[];
};

function normalizeNavType(raw: string): NavItemType | null {
  if (raw === "home" || raw === "url") return raw;
  return null;
}

export function getSiteSettings(): SiteSettings {
  const nav = (Array.isArray(navData.nav) ? navData.nav : [])
    .map((item) => {
      const type = normalizeNavType(String(item?.type || ""));
      if (!type) return null;
      const label = String(item?.label || "").trim();
      if (!label) return null;
      return {
        label,
        type,
        value: item?.value ? String(item.value) : undefined,
      } satisfies SiteNavItem;
    })
    .filter((item): item is SiteNavItem => Boolean(item));

  return {
    title: siteData.title || "한전넷",
    site_url: (siteData.site_url || "https://hanjeon.net").replace(/\/$/, ""),
    copyright_name: siteData.copyright_name || "한전넷",
    nav,
  };
}

export function resolveNavHref(item: SiteNavItem): string {
  if (item.type === "home") return "/";
  const value = (item.value || "").trim();
  return value || "/";
}

export function isExternalHref(href: string): boolean {
  return /^https?:\/\//i.test(href);
}
