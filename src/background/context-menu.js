(function (root) {
  const BetterLinks = root.BetterLinks || (root.BetterLinks = {});

  const MENU_SEARCH = "bl-search-google";
  const ITEMS = [
    { id: MENU_SEARCH, contexts: ["selection"], visible: false, titleKey: "context.searchGoogle" },
    { id: "bl-new-window", contexts: ["selection"], visible: false, action: "newWindow", titleKey: "tooltip.newWindow" },
    { id: "bl-new-tab", contexts: ["selection"], visible: false, action: "newTab", titleKey: "tooltip.newTab" },
    {
      id: "bl-new-tab-switch",
      contexts: ["selection"],
      visible: false,
      action: "newTabAndSwitch",
      titleKey: "tooltip.newTabAndSwitch",
    },
    {
      id: "bl-link-new-tab-switch",
      contexts: ["link"],
      visible: true,
      action: "newTabAndSwitch",
      titleKey: "tooltip.newTabAndSwitch",
      source: "link",
    },
    {
      id: "bl-image-new-tab-switch",
      contexts: ["image"],
      visible: true,
      action: "newTabAndSwitch",
      titleKey: "image.tooltip.newTabAndSwitch",
      source: "image",
    },
  ];
  const SELECTION_IDS = ITEMS.filter((item) => item.contexts[0] === "selection").map((item) => item.id);

  let activeTabId = null;
  let menusReady = false;

  function settings() {
    return BetterLinks.getSettings ? BetterLinks.getSettings() : BetterLinks.normalizeSettings(BetterLinks.DEFAULTS);
  }

  function menuTitle(item) {
    const lang = BetterLinks.resolveLanguage(settings().language);
    return BetterLinks.t(lang, item.titleKey);
  }

  function selectionUrlForTab(tabId) {
    let found = "";
    for (const text of BetterLinks.frames.textsForTab(tabId)) {
      const url = BetterLinks.resolveTextLink(text, settings().fixLinks);
      if (url) found = url;
    }
    return found;
  }

  function refreshMenuVisibility() {
    if (!menusReady) return;
    const visible = Boolean(selectionUrlForTab(activeTabId));
    for (const id of SELECTION_IDS) {
      chrome.contextMenus.update(id, { visible: visible }, () => void chrome.runtime.lastError);
    }
  }

  BetterLinks.noteActiveTab = function noteActiveTab(tabId) {
    activeTabId = tabId;
    refreshMenuVisibility();
  };

  BetterLinks.noteSelectionFromTab = function noteSelectionFromTab(tabId) {
    if (activeTabId == null) activeTabId = tabId;
    if (tabId === activeTabId) refreshMenuVisibility();
  };

  BetterLinks.forgetActiveTab = function forgetActiveTab(tabId) {
    if (activeTabId !== tabId) return;
    activeTabId = null;
    refreshMenuVisibility();
  };

  BetterLinks.refreshSelectionMenu = refreshMenuVisibility;

  BetterLinks.syncMenu = function syncMenu() {
    for (const item of ITEMS) {
      chrome.contextMenus.update(item.id, { title: menuTitle(item) }, () => void chrome.runtime.lastError);
    }
    refreshMenuVisibility();
  };

  BetterLinks.installMenus = function installMenus(done) {
    let left = ITEMS.length;
    for (const item of ITEMS) {
      chrome.contextMenus.create(
        {
          id: item.id,
          title: menuTitle(item),
          contexts: item.contexts,
          visible: item.visible,
        },
        () => {
          void chrome.runtime.lastError;
          left -= 1;
          if (left === 0) {
            menusReady = true;
            if (done) done();
          }
        }
      );
    }
  };

  function storedUrl(source, tab, frameId, fallback) {
    const keyTab = tab && tab.id != null ? tab.id : null;
    const stored = keyTab == null ? "" : source === "image"
      ? BetterLinks.frames.image(keyTab, frameId)
      : BetterLinks.frames.link(keyTab, frameId);
    const url = stored && BetterLinks.isSafeHttpUrl(stored) ? stored : fallback;
    return url && BetterLinks.isSafeHttpUrl(url) ? url : "";
  }

  chrome.contextMenus.onClicked.addListener((info, tab) => {
    const item = ITEMS.find((entry) => entry.id === info.menuItemId);
    if (!item) return;

    if (item.source === "image" || item.source === "link") {
      const fallback = item.source === "image" ? info.srcUrl : info.linkUrl;
      const url = storedUrl(item.source, tab, info.frameId, fallback);
      if (url) BetterLinks.openFromAction(item.action, url, tab);
      return;
    }

    const text = String(info.selectionText || "").trim();
    if (item.id === MENU_SEARCH) {
      if (!text) return;
      const search = "https://www.google.com/search?q=" + encodeURIComponent(text);
      if (tab && tab.id != null) chrome.tabs.update(tab.id, { url: search });
      else chrome.tabs.create({ url: search });
      return;
    }

    const url = BetterLinks.resolveTextLink(text, settings().fixLinks);
    if (!url || !BetterLinks.isSafeHttpUrl(url) || !item.action) return;
    BetterLinks.openFromAction(item.action, url, tab);
  });
})(globalThis);
