importScripts("shared/defaults.js", "shared/link.js", "shared/i18n.js");

const BL = globalThis.BetterLinks;
const MENU_SEARCH = "bl-search-google";
const MENU_NEW_WINDOW = "bl-new-window";
const MENU_NEW_TAB = "bl-new-tab";
const MENU_NEW_TAB_SWITCH = "bl-new-tab-switch";
const MENU_LINK_NEW_TAB_SWITCH = "bl-link-new-tab-switch";
const MENU_IDS = [MENU_SEARCH, MENU_NEW_WINDOW, MENU_NEW_TAB, MENU_NEW_TAB_SWITCH];
const ALL_MENU_IDS = MENU_IDS.concat(MENU_LINK_NEW_TAB_SWITCH);

let settings = BL.normalizeSettings(BL.DEFAULTS);
const textByFrame = new Map();
const linkByFrame = new Map();
let activeTabId = null;
let menusReady = false;

function isSafeHttpUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function menuTitle(id) {
  const lang = BL.resolveLanguage(settings.language);
  if (id === MENU_SEARCH) return BL.t(lang, "context.searchGoogle");
  if (id === MENU_NEW_WINDOW) return BL.t(lang, "tooltip.newWindow");
  if (id === MENU_NEW_TAB_SWITCH || id === MENU_LINK_NEW_TAB_SWITCH) return BL.t(lang, "tooltip.newTabAndSwitch");
  return BL.t(lang, "tooltip.newTab");
}

function ensureMenus(done) {
  const specs = MENU_IDS.map((id) => ({ id: id, contexts: ["selection"], visible: false }));
  specs.push({ id: MENU_LINK_NEW_TAB_SWITCH, contexts: ["link"], visible: true });
  let left = specs.length;
  for (const spec of specs) {
    chrome.contextMenus.create(
      {
        id: spec.id,
        title: menuTitle(spec.id),
        contexts: spec.contexts,
        visible: spec.visible,
      },
      () => {
        void chrome.runtime.lastError;
        left -= 1;
        if (left === 0 && done) done();
      }
    );
  }
}

function updateMenuTitles() {
  for (const id of ALL_MENU_IDS) {
    chrome.contextMenus.update(id, { title: menuTitle(id) }, () => void chrome.runtime.lastError);
  }
}

function selectionUrlForTab(tabId) {
  if (tabId == null) return "";
  const prefix = tabId + ":";
  let found = "";
  for (const [key, text] of textByFrame) {
    if (!key.startsWith(prefix)) continue;
    const url = BL.resolveTextLink(text, settings.fixLinks);
    if (url) found = url;
  }
  return found;
}

function refreshMenuVisibility() {
  if (!menusReady) return;
  const visible = Boolean(selectionUrlForTab(activeTabId));
  for (const id of MENU_IDS) {
    chrome.contextMenus.update(id, { visible: visible }, () => void chrome.runtime.lastError);
  }
}

function openNewTab(url, tab, active, done) {
  const index = tab ? tab.index + 1 : undefined;
  const stay = active === false && tab && tab.id != null;
  chrome.tabs.create(
    {
      url: url,
      active: true,
      index: index,
    },
    (created) => {
      if (chrome.runtime.lastError || !created) {
        if (done) done(false);
        return;
      }
      const finish = () => {
        if (stay) {
          chrome.tabs.update(tab.id, { active: true }, () => {
            void chrome.runtime.lastError;
            if (done) done(true);
          });
          return;
        }
        chrome.tabs.update(created.id, { active: true }, () => {
          void chrome.runtime.lastError;
          if (created.windowId == null) {
            if (done) done(true);
            return;
          }
          chrome.windows.update(created.windowId, { focused: true }, () => {
            void chrome.runtime.lastError;
            if (done) done(true);
          });
        });
      };
      if (index == null) {
        finish();
        return;
      }
      chrome.tabs.move(created.id, { index: index }, () => {
        void chrome.runtime.lastError;
        finish();
      });
    }
  );
}

chrome.action.onClicked.addListener(() => {
  chrome.runtime.openOptionsPage();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message) return;

  if (message.type === "selection") {
    const tabId = sender.tab && sender.tab.id;
    if (tabId == null) return;
    const key = tabId + ":" + sender.frameId;
    const text = String(message.text || "").trim();
    if (text) textByFrame.set(key, text);
    else textByFrame.delete(key);
    if (activeTabId == null) activeTabId = tabId;
    if (tabId === activeTabId) refreshMenuVisibility();
    return;
  }

  if (message.type === "link") {
    const tabId = sender.tab && sender.tab.id;
    if (tabId == null) return;
    const key = tabId + ":" + sender.frameId;
    const url = String(message.url || "");
    if (url && isSafeHttpUrl(url)) linkByFrame.set(key, url);
    else linkByFrame.delete(key);
    return;
  }

  if (message.type !== "open" || !isSafeHttpUrl(message.url)) {
    return;
  }

  if (message.mode === "newWindow") {
    chrome.windows.create({ url: message.url, focused: true });
    sendResponse({ ok: true });
    return;
  }

  if (message.mode === "newTab") {
    openNewTab(message.url, sender && sender.tab, message.active !== false, (ok) => {
      sendResponse({ ok: ok });
    });
    return true;
  }
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === MENU_LINK_NEW_TAB_SWITCH) {
    const key = tab && tab.id != null ? tab.id + ":" + info.frameId : "";
    const stored = key ? linkByFrame.get(key) : "";
    const linkUrl = stored && isSafeHttpUrl(stored) ? stored : info.linkUrl;
    if (linkUrl && isSafeHttpUrl(linkUrl)) openNewTab(linkUrl, tab, true);
    return;
  }

  const text = String(info.selectionText || "").trim();
  if (info.menuItemId === MENU_SEARCH) {
    if (!text) return;
    const search = "https://www.google.com/search?q=" + encodeURIComponent(text);
    if (tab && tab.id != null) chrome.tabs.update(tab.id, { url: search });
    else chrome.tabs.create({ url: search });
    return;
  }

  const url = BL.resolveTextLink(text, settings.fixLinks);
  if (!url || !isSafeHttpUrl(url)) return;
  if (info.menuItemId === MENU_NEW_WINDOW) {
    chrome.windows.create({ url: url, focused: true });
    return;
  }
  if (info.menuItemId === MENU_NEW_TAB) openNewTab(url, tab, false);
  if (info.menuItemId === MENU_NEW_TAB_SWITCH) openNewTab(url, tab, true);
});

chrome.tabs.onActivated.addListener((info) => {
  activeTabId = info.tabId;
  refreshMenuVisibility();
});

chrome.tabs.onRemoved.addListener((tabId) => {
  const prefix = tabId + ":";
  for (const key of textByFrame.keys()) {
    if (key.startsWith(prefix)) textByFrame.delete(key);
  }
  for (const key of linkByFrame.keys()) {
    if (key.startsWith(prefix)) linkByFrame.delete(key);
  }
  if (activeTabId === tabId) {
    activeTabId = null;
    refreshMenuVisibility();
  }
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "sync") return;
  const next = Object.assign({}, settings);
  for (const [key, change] of Object.entries(changes)) next[key] = change.newValue;
  settings = BL.normalizeSettings(next);
  updateMenuTitles();
  refreshMenuVisibility();
});

ensureMenus(() => {
  menusReady = true;
  updateMenuTitles();
  refreshMenuVisibility();
});
chrome.storage.sync.get(null, (stored) => {
  settings = BL.normalizeSettings(stored);
  updateMenuTitles();
  refreshMenuVisibility();
});
chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
  if (tabs && tabs[0]) activeTabId = tabs[0].id;
  refreshMenuVisibility();
});
