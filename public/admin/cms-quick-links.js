(function () {
  const SITE_LINK_LABEL = "내 사이트 방문";
  const DEFAULT_SITE_URL = "https://hanjeon.net";

  const STATIC_LINKS = [
    { label: "Github", url: "https://github.com/lab486486/hanjeon", target: "_blank" },
    { label: "PageSpeed", url: "https://pagespeed.web.dev/?hl=ko", target: "_blank" },
  ];

  let siteUrl = DEFAULT_SITE_URL;
  let started = false;
  let pending = false;

  async function loadSiteMeta() {
    try {
      const response = await fetch("/admin/site-meta.json", { cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json();
      if (data.site_url) siteUrl = data.site_url;
    } catch {
      /* keep default */
    }
  }

  function getRoot() {
    return document.getElementById("nc-root");
  }

  function normalizeText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function isQuickAddText(text) {
    return /^quick\s*add$/i.test(normalizeText(text));
  }

  function getHeader(root) {
    return (
      root.querySelector('[class*="AppHeader"]') ||
      root.querySelector("header") ||
      root.querySelector('[class*="TopBar"]')
    );
  }

  function findQuickAddTrigger(root) {
    const header = getHeader(root);
    if (!header) return null;

    for (const node of header.querySelectorAll('[role="button"], button')) {
      if (isQuickAddText(node.textContent)) return node;
    }

    return null;
  }

  function getQuickAddScope(root) {
    const trigger = findQuickAddTrigger(root);
    return trigger ? trigger.parentElement : null;
  }

  function findQuickAddList(root) {
    const scope = getQuickAddScope(root);
    if (!scope) return null;

    const menu = scope.querySelector('div[role="menu"]');
    if (!menu) return null;

    return menu.querySelector("ul");
  }

  function getMenuItems() {
    return [
      { label: SITE_LINK_LABEL, url: siteUrl, target: "_top", site: true },
      ...STATIC_LINKS,
    ];
  }

  function isNativeQuickAddList(list) {
    if (!list || list.dataset.cmsQuickPatched === "1") return false;
    if (list.querySelector("[data-cms-quick-site]")) return false;

    const item = list.querySelector('[role="menuitem"] span');
    if (!item) return false;

    const text = normalizeText(item.textContent);
    return (
      text === "글" ||
      text === "Post" ||
      text === "혜택" ||
      text === "가이드" ||
      text === "Benefit" ||
      text === "Guide"
    );
  }

  function buildQuickAddRow() {
    const row = document.createElement("div");
    row.className = "cms-quick-add-row";
    row.setAttribute("role", "presentation");

    getMenuItems().forEach(function (item) {
      const link = document.createElement("a");
      link.className = "cms-quick-add-cell-link";
      link.href = item.url;
      link.target = item.target;
      link.rel = "noopener noreferrer";
      link.textContent = item.label;
      if (item.site) link.dataset.cmsQuickSite = "1";
      row.appendChild(link);
    });

    return row;
  }

  function patchQuickAddList(root) {
    const list = findQuickAddList(root);
    if (!list || !isNativeQuickAddList(list)) return false;

    list.dataset.cmsQuickPatched = "1";
    list.classList.add("cms-quick-add-menu");
    list.innerHTML = "";
    list.appendChild(buildQuickAddRow());
    return true;
  }

  function scheduleMenuPatch(root) {
    patchQuickAddList(root);
    window.requestAnimationFrame(function () {
      patchQuickAddList(root);
    });
    [0, 16, 50, 100, 200].forEach(function (delay) {
      window.setTimeout(function () {
        patchQuickAddList(root);
      }, delay);
    });
  }

  function watchQuickAddScope(root) {
    const trigger = findQuickAddTrigger(root);
    const scope = getQuickAddScope(root);
    if (!trigger || !scope) return;

    if (scope.dataset.cmsQuickScopeWatch !== "1") {
      scope.dataset.cmsQuickScopeWatch = "1";

      const observer = new MutationObserver(function () {
        const list = findQuickAddList(root);
        if (list) list.dataset.cmsQuickPatched = "";
        patchQuickAddList(root);
      });
      observer.observe(scope, { childList: true, subtree: true });
    }

    if (trigger.dataset.cmsQuickWatch !== "1") {
      trigger.dataset.cmsQuickWatch = "1";

      trigger.addEventListener("click", function () {
        scheduleMenuPatch(root);
      });

      trigger.addEventListener("keydown", function (event) {
        if (event.key !== "Enter" && event.key !== " ") return;
        scheduleMenuPatch(root);
      });
    }
  }

  function applyQuickLinks() {
    const root = getRoot();
    if (!root || !root.firstElementChild) return;

    watchQuickAddScope(root);
    patchQuickAddList(root);
  }

  function scheduleQuickLinks() {
    if (pending) return;
    pending = true;
    window.requestAnimationFrame(function () {
      pending = false;
      applyQuickLinks();
    });
  }

  async function start() {
    if (started) return;
    started = true;
    await loadSiteMeta();
    applyQuickLinks();

    const root = getRoot();
    if (!root) return;

    const observer = new MutationObserver(scheduleQuickLinks);
    observer.observe(root, { childList: true, subtree: true });
    window.addEventListener("hashchange", scheduleQuickLinks);
  }

  function waitForCms() {
    const root = getRoot();
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
