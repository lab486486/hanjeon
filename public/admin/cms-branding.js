(function () {
  const COLLECTIONS_LABEL = "관리자 메뉴";
  const DEFAULT_TITLE = "한전넷";
  const DEFAULT_URL = "https://hanjeon.net";

  // Inline SVGs (currentColor) so active/hover tint matches Decap and widths stay even.
  const COLLECTION_ICONS = {
    site:
      '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.03 7.03 0 0 0-1.63-.94l-.36-2.54A.5.5 0 0 0 13.9 2h-3.8a.5.5 0 0 0-.5.42l-.36 2.54c-.59.24-1.13.55-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.7 8.48a.5.5 0 0 0 .12.64l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94L2.82 14.58a.5.5 0 0 0-.12.64l1.92 3.32c.14.24.43.34.68.22l2.39-.96c.5.39 1.04.7 1.63.94l.36 2.54c.05.24.26.42.5.42h3.8c.24 0 .45-.18.5-.42l.36-2.54c.59-.24 1.13-.55 1.63-.94l2.39.96c.25.12.54.02.68-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58ZM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7Z"/></svg>',
    nav:
      '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M4 6.5A1.5 1.5 0 0 1 5.5 5h13A1.5 1.5 0 0 1 20 6.5v1A1.5 1.5 0 0 1 18.5 9h-13A1.5 1.5 0 0 1 4 7.5v-1Zm0 5A1.5 1.5 0 0 1 5.5 10h13a1.5 1.5 0 0 1 1.5 1.5v1A1.5 1.5 0 0 1 18.5 14h-13A1.5 1.5 0 0 1 4 12.5v-1Zm0 5A1.5 1.5 0 0 1 5.5 15h9a1.5 1.5 0 0 1 1.5 1.5v1A1.5 1.5 0 0 1 14.5 19h-9A1.5 1.5 0 0 1 4 17.5v-1Z"/></svg>',
    adsense:
      '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M12 2a7 7 0 0 0-7 7c0 2.8 1.6 5.2 4 6.3V17a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-1.7c2.4-1.1 4-3.5 4-6.3a7 7 0 0 0-7-7Zm-1 18a1 1 0 0 0 1 1h0a1 1 0 0 0 1-1v-1h-2v1Zm1-16a5 5 0 0 1 5 5c0 2-1.2 3.7-3 4.5l-.5.2V14h-3v-.3l-.5-.2A5 5 0 0 1 7 9a5 5 0 0 1 5-5Z"/></svg>',
    benefits:
      '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M7 3h7.5L19 7.5V19a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm7 1.5V8h3.5L14 4.5ZM8 11h8v1.5H8V11Zm0 3.5h8V16H8v-1.5Zm0 3.5h5V18H8v-1.5Z"/></svg>',
    guides:
      '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M7 3h7.5L19 7.5V19a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm7 1.5V8h3.5L14 4.5ZM8 11h8v1.5H8V11Zm0 3.5h8V16H8v-1.5Zm0 3.5h5V18H8v-1.5Z"/></svg>',
  };

  let siteMeta = {
    title: DEFAULT_TITLE,
    site_url: DEFAULT_URL,
    rss_url: DEFAULT_URL + "/rss.xml",
    sitemap_url: DEFAULT_URL + "/sitemap-index.xml",
  };
  let started = false;
  let pending = false;

  function siteAdminLabel() {
    return siteMeta.title + " 관리자 페이지";
  }

  async function loadSiteMeta() {
    try {
      const response = await fetch("/admin/site-meta.json", { cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json();
      const base = String(data.site_url || DEFAULT_URL).replace(/\/$/, "");
      siteMeta.title = data.title || DEFAULT_TITLE;
      siteMeta.site_url = base;
      siteMeta.rss_url = data.rss_url || base + "/rss.xml";
      siteMeta.sitemap_url = data.sitemap_url || base + "/sitemap-index.xml";
    } catch {
      /* keep defaults */
    }
  }

  function replaceHeaderContentsLink(root) {
    const header =
      root.querySelector("header") ||
      root.querySelector('[class*="AppHeader"]') ||
      root.querySelector('[class*="TopBar"]');
    if (!header) return;

    const links = header.querySelectorAll("a");
    for (const link of links) {
      if (link.dataset.cmsSiteLinkReady === "1") continue;
      const text = (link.textContent || "").trim();
      if (
        text.includes("Contents") ||
        text.endsWith("이동하기") ||
        text.endsWith("관리자 페이지")
      ) {
        const title = document.createElement("span");
        link.classList.forEach(function (cls) {
          title.classList.add(cls);
        });
        title.classList.add("cms-admin-title");
        title.textContent = siteAdminLabel();
        title.dataset.cmsSiteLinkReady = "1";
        link.replaceWith(title);
      }
    }
  }

  function removeSidebarSiteLinks(root) {
    root.querySelectorAll("[data-cms-site-home]").forEach(function (el) {
      el.remove();
    });
  }

  function replaceCollectionsHeading(root) {
    const sidebar = getSidebar(root);
    if (!sidebar) return;

    const walker = document.createTreeWalker(sidebar, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();

    while (node) {
      if (node.textContent.trim() === "Collections" && node.parentElement) {
        const parent = node.parentElement;
        if (parent.dataset.cmsCollectionsReady !== "1") {
          node.textContent = COLLECTIONS_LABEL;
          parent.dataset.cmsCollectionsReady = "1";
        }
      }
      node = walker.nextNode();
    }
  }

  function getSidebar(root) {
    return root.querySelector("aside") || root.querySelector('[class*="Sidebar"]');
  }

  function isSidebarCollectionLink(href) {
    return /^#\/collections\/[^/]+\/?$/.test(href || "");
  }

  function removeIconsOutsideSidebar(root) {
    const sidebar = getSidebar(root);
    root.querySelectorAll(".cms-collection-icon").forEach(function (icon) {
      if (!sidebar || !sidebar.contains(icon)) icon.remove();
    });
    root.querySelectorAll("a.cms-collection-link").forEach(function (link) {
      if (!sidebar || !sidebar.contains(link)) {
        link.classList.remove("cms-collection-link");
      }
    });
  }

  function findCollectionsHeading(sidebar) {
    const walker = document.createTreeWalker(sidebar, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();

    while (node) {
      if (node.textContent.trim() === COLLECTIONS_LABEL && node.parentElement) {
        return node.parentElement;
      }
      node = walker.nextNode();
    }

    return null;
  }

  function syncSiteInfoIndent(wrap, sidebar) {
    const sampleLink =
      sidebar.querySelector("a.cms-collection-link") ||
      sidebar.querySelector('a[href^="#/collections/"]');
    if (!sampleLink) return;

    const icon = sampleLink.querySelector(".cms-collection-icon");
    const sidebarRect = sidebar.getBoundingClientRect();
    const iconRect = icon
      ? icon.getBoundingClientRect()
      : sampleLink.getBoundingClientRect();

    wrap.style.paddingLeft = Math.max(0, Math.round(iconRect.left - sidebarRect.left)) + "px";
  }

  function updateSiteInfoPanel(panel) {
    const rssLink = panel.querySelector('[data-cms-site-info="rss"]');
    const sitemapLink = panel.querySelector('[data-cms-site-info="sitemap"]');
    if (rssLink) {
      rssLink.href = siteMeta.rss_url;
      rssLink.textContent = siteMeta.rss_url;
    }
    if (sitemapLink) {
      sitemapLink.href = siteMeta.sitemap_url;
      sitemapLink.textContent = siteMeta.sitemap_url;
    }
  }

  function injectSiteInfo(root) {
    const sidebar = getSidebar(root);
    if (!sidebar) return;

    let wrap = sidebar.querySelector("[data-cms-site-info-ready]");
    if (wrap) {
      syncSiteInfoIndent(wrap, sidebar);
      const trigger = wrap.querySelector(".cms-site-info-trigger");
      if (trigger) trigger.textContent = "RSS / 사이트맵";
      const panel = wrap.querySelector(".cms-site-info-panel");
      if (panel) updateSiteInfoPanel(panel);
      return;
    }

    const heading = findCollectionsHeading(sidebar);
    if (!heading) return;

    wrap = document.createElement("div");
    wrap.className = "cms-site-info-wrap";
    wrap.dataset.cmsSiteInfoReady = "1";

    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "cms-site-info-trigger";
    trigger.textContent = "RSS / 사이트맵";
    trigger.setAttribute("aria-expanded", "false");

    const panel = document.createElement("div");
    panel.className = "cms-site-info-panel";
    panel.hidden = true;
    panel.innerHTML =
      '<a class="cms-site-info-url" data-cms-site-info="rss" href="' +
      siteMeta.rss_url +
      '" target="_blank" rel="noopener noreferrer" title="' +
      siteMeta.rss_url +
      '">' +
      siteMeta.rss_url +
      "</a>" +
      '<a class="cms-site-info-url" data-cms-site-info="sitemap" href="' +
      siteMeta.sitemap_url +
      '" target="_blank" rel="noopener noreferrer" title="' +
      siteMeta.sitemap_url +
      '">' +
      siteMeta.sitemap_url +
      "</a>";

    trigger.addEventListener("click", function () {
      const open = !panel.hidden;
      panel.hidden = open;
      trigger.setAttribute("aria-expanded", open ? "false" : "true");
      trigger.classList.toggle("is-open", !open);
    });

    wrap.appendChild(trigger);
    wrap.appendChild(panel);
    heading.insertAdjacentElement("afterend", wrap);
    syncSiteInfoIndent(wrap, sidebar);
  }

  function decorateCollectionIcons(root) {
    const sidebar = getSidebar(root);
    if (!sidebar) return;

    const links = sidebar.querySelectorAll('a[href^="#/collections/"]');

    for (const link of links) {
      const href = link.getAttribute("href") || "";
      if (!isSidebarCollectionLink(href)) continue;

      const match = href.match(/#\/collections\/([^/?#]+)/);
      if (!match) continue;

      const collection = match[1];
      const icon = COLLECTION_ICONS[collection];
      if (!icon) continue;

      link.classList.add("cms-collection-link");
      link.dataset.collection = collection;
      if (!href || href === "#") {
        link.setAttribute("href", "#/collections/" + collection);
      }

      // Drop Decap's built-in icon nodes so only our fixed-width slot remains.
      Array.from(link.children).forEach(function (child) {
        if (child.classList && child.classList.contains("cms-collection-icon")) return;
        if (
          child.tagName === "SVG" ||
          (child.querySelector && child.querySelector("svg")) ||
          (child.className && String(child.className).toLowerCase().includes("icon"))
        ) {
          child.remove();
        }
      });

      let iconEl = link.querySelector(":scope > .cms-collection-icon");
      if (!iconEl) {
        iconEl = document.createElement("span");
        iconEl.className = "cms-collection-icon";
        iconEl.setAttribute("aria-hidden", "true");
        link.prepend(iconEl);
      }

      if (iconEl.dataset.icon !== collection) {
        iconEl.dataset.icon = collection;
        iconEl.innerHTML = icon;
      }
    }
  }

  function applyBranding() {
    const root = document.getElementById("nc-root");
    if (!root || !root.firstElementChild) return;

    removeSidebarSiteLinks(root);
    replaceHeaderContentsLink(root);
    replaceCollectionsHeading(root);
    injectSiteInfo(root);
    removeIconsOutsideSidebar(root);
    decorateCollectionIcons(root);
  }

  function scheduleBranding() {
    if (pending) return;
    pending = true;
    window.requestAnimationFrame(function () {
      pending = false;
      applyBranding();
    });
  }

  async function start() {
    if (started) return;
    started = true;
    await loadSiteMeta();
    applyBranding();

    const root = document.getElementById("nc-root");
    if (!root) return;

    const observer = new MutationObserver(scheduleBranding);
    observer.observe(root, { childList: true, subtree: true });
    window.addEventListener("hashchange", scheduleBranding);
  }

  function waitForCms() {
    const root = document.getElementById("nc-root");
    if (root && root.firstElementChild) {
      start();
      return;
    }
    window.requestAnimationFrame(waitForCms);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", waitForCms);
  } else {
    waitForCms();
  }
})();
