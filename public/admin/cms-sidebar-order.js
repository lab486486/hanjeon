/**
 * Reorder Decap CMS sidebar into three groups with dividers:
 * 1) Site settings  2) Monetization  3) Content collections
 */
(function () {
  var GROUPS = [
    {
      id: "site",
      items: [
        { type: "collection", name: "site" },
        { type: "collection", name: "nav" },
      ],
    },
    {
      id: "monetize",
      items: [
        { type: "collection", name: "adsense" },
        { type: "selector", sel: "a.cms-coupang-nav" },
      ],
    },
    {
      id: "content",
      items: [
        { type: "collection", name: "benefits" },
        { type: "collection", name: "guides" },
      ],
    },
  ];

  var started = false;
  var pending = false;
  var applying = false;

  function getRoot() {
    return document.getElementById("nc-root") || document.body;
  }

  function getSidebar(root) {
    return root.querySelector("aside") || root.querySelector('[class*="Sidebar"]');
  }

  function findCollectionLink(sidebar, name) {
    var byData = sidebar.querySelector('a.cms-collection-link[data-collection="' + name + '"]');
    if (byData) return byData;
    var links = sidebar.querySelectorAll('a[href^="#/collections/"]');
    for (var i = 0; i < links.length; i++) {
      var href = links[i].getAttribute("href") || "";
      var m = href.match(/^#\/collections\/([^/?#]+)\/?$/);
      if (m && m[1] === name) return links[i];
    }
    return null;
  }

  function findLink(sidebar, item) {
    if (item.type === "selector") return sidebar.querySelector(item.sel);
    return findCollectionLink(sidebar, item.name);
  }

  function rowOf(link) {
    if (!link) return null;
    return link.closest("li") || link.parentElement;
  }

  function findList(sidebar) {
    var sample =
      findCollectionLink(sidebar, "site") ||
      findCollectionLink(sidebar, "benefits") ||
      sidebar.querySelector('a[href^="#/collections/"]');
    if (!sample) return null;
    var row = rowOf(sample);
    return row && row.parentElement ? row.parentElement : null;
  }

  function ensureDivider(list, id) {
    var existing = list.querySelector('[data-cms-sidebar-divider="' + id + '"]');
    if (existing) return existing;

    var tag = list.firstElementChild ? list.firstElementChild.tagName : "LI";
    var row = document.createElement(tag);
    row.setAttribute("data-cms-sidebar-divider", id);
    row.className = "cms-sidebar-divider-row";
    row.setAttribute("aria-hidden", "true");

    var line = document.createElement("div");
    line.className = "cms-sidebar-divider";
    row.appendChild(line);
    return row;
  }

  function applyOrder() {
    if (applying) return;
    var root = getRoot();
    var sidebar = getSidebar(root);
    if (!sidebar) return;

    var list = findList(sidebar);
    if (!list) return;

    applying = true;
    try {
      var orderedRows = [];
      var seen = new Set();

      GROUPS.forEach(function (group, groupIndex) {
        if (groupIndex > 0) {
          var divider = ensureDivider(list, "after-" + GROUPS[groupIndex - 1].id);
          orderedRows.push(divider);
          seen.add(divider);
        }

        group.items.forEach(function (item) {
          var link = findLink(sidebar, item);
          var row = rowOf(link);
          if (!row || row.parentElement !== list) return;
          if (seen.has(row)) return;
          orderedRows.push(row);
          seen.add(row);
        });
      });

      if (orderedRows.length < 2) return;

      orderedRows.forEach(function (row) {
        list.appendChild(row);
      });

      list.querySelectorAll("[data-cms-sidebar-divider]").forEach(function (row) {
        if (!seen.has(row)) row.remove();
      });
    } finally {
      applying = false;
    }
  }

  function schedule() {
    if (pending) return;
    pending = true;
    window.requestAnimationFrame(function () {
      pending = false;
      applyOrder();
    });
  }

  function start() {
    if (started) return;
    started = true;
    var root = getRoot();
    var observer = new MutationObserver(function () {
      if (applying) return;
      schedule();
    });
    observer.observe(root, { childList: true, subtree: true });
    window.addEventListener("hashchange", schedule);
    schedule();
  }

  function waitForCms() {
    var root = getRoot();
    if (root && root.querySelector("aside, [class*='Sidebar']")) {
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
