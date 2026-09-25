importScripts("shared/defaults.js", "shared/link.js", "shared/i18n.js");

const BL = globalThis.BetterLinks;
const MENU_SEARCH = "bl-search-google";
const MENU_NEW_WINDOW = "bl-new-window";
const MENU_NEW_TAB = "bl-new-tab";
const MENU_NEW_TAB_SWITCH = "bl-new-tab-switch";
const MENU_LINK_NEW_TAB_SWITCH = "bl-link-new-tab-switch";
const MENU_IMAGE_NEW_TAB_SWITCH = "bl-image-new-tab-switch";
const MENU_IDS = [MENU_SEARCH, MENU_NEW_WINDOW, MENU_NEW_TAB, MENU_NEW_TAB_SWITCH];
const ALL_MENU_IDS = MENU_IDS.concat(MENU_LINK_NEW_TAB_SWITCH, MENU_IMAGE_NEW_TAB_SWITCH);

let settings = BL.normalizeSettings(BL.DEFAULTS);
const textByFrame = new Map();
const linkByFrame = new Map();
const imageByFrame = new Map();
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
  if (id === MENU_IMAGE_NEW_TAB_SWITCH) return BL.t(lang, "image.tooltip.newTabAndSwitch");
  if (id === MENU_NEW_TAB_SWITCH || id === MENU_LINK_NEW_TAB_SWITCH) return BL.t(lang, "tooltip.newTabAndSwitch");
  return BL.t(lang, "tooltip.newTab");
}

function ensureMenus(done) {
  const specs = MENU_IDS.map((id) => ({ id: id, contexts: ["selection"], visible: false }));
  specs.push({ id: MENU_LINK_NEW_TAB_SWITCH, contexts: ["link"], visible: true });
  specs.push({ id: MENU_IMAGE_NEW_TAB_SWITCH, contexts: ["image"], visible: true });
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

function filenameFromDisposition(header) {
  if (!header) return "";
  const encoded = header.match(/filename\*\s*=\s*(?:UTF-8''|utf-8'')([^;]+)/i);
  if (encoded) {
    try {
      return decodeURIComponent(encoded[1].trim().replace(/^"|"$/g, ""));
    } catch {
      return "";
    }
  }
  const plain = header.match(/filename\s*=\s*"?([^";]+)"?/i);
  return plain ? plain[1].trim() : "";
}

function filenameFromUrl(url) {
  try {
    const segment = new URL(url).pathname.split("/").filter(Boolean).pop() || "";
    return decodeURIComponent(segment);
  } catch {
    return "";
  }
}

function safeFilename(name) {
  return String(name || "")
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
}

const IMAGE_EXT = {
  "image/webp": "webp",
  "image/gif": "gif",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/avif": "avif",
  "image/bmp": "bmp",
  "image/svg+xml": "svg",
  "image/tiff": "tiff",
  "image/x-icon": "ico",
  "image/vnd.microsoft.icon": "ico",
};

function extensionFromMime(mime) {
  const type = String(mime || "").split(";")[0].trim().toLowerCase();
  return IMAGE_EXT[type] || "";
}

function extensionFromBytes(bytes) {
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "webp";
  }
  if (bytes.length >= 6 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return "gif";
  if (bytes.length >= 4 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "png";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
  return "";
}

function applyExtension(name, ext) {
  const cleaned = safeFilename(name) || "image";
  if (!ext) return cleaned;
  const match = cleaned.match(/^(.*?)(?:\.([a-z0-9]{1,8}))?$/i);
  const base = (match && match[1] ? match[1] : cleaned).replace(/[. ]+$/g, "") || "image";
  const current = match && match[2] ? match[2].toLowerCase() : "";
  if (current === ext || (ext === "jpg" && current === "jpeg")) return base + "." + (current === "jpeg" ? "jpeg" : ext);
  return base + "." + ext;
}

async function suggestedImageName(url) {
  let headerName = "";
  let mime = "";
  let sniffed = "";
  try {
    const response = await fetch(url, { headers: { Range: "bytes=0-31" } });
    headerName = filenameFromDisposition(response.headers.get("content-disposition"));
    mime = response.headers.get("content-type") || "";
    if (response.body) {
      const reader = response.body.getReader();
      const chunk = await reader.read();
      await reader.cancel();
      sniffed = extensionFromBytes(chunk.value ? chunk.value.subarray(0, 32) : new Uint8Array());
    }
  } catch {
    headerName = "";
  }
  const ext = sniffed || extensionFromMime(mime);
  return applyExtension(headerName || filenameFromUrl(url) || "image", ext);
}

const pendingSaveNames = new Map();

chrome.downloads.onDeterminingFilename.addListener((item, suggest) => {
  const wanted = pendingSaveNames.get(item.url);
  if (!wanted) return;
  pendingSaveNames.delete(item.url);
  suggest({ filename: wanted, conflictAction: "uniquify" });
});

async function urlToPngBytes(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("fetch");
  const blob = await response.blob();
  const bitmap = await createImageBitmap(blob);
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  canvas.getContext("2d").drawImage(bitmap, 0, 0);
  bitmap.close();
  const png = await canvas.convertToBlob({ type: "image/png" });
  return new Uint8Array(await png.arrayBuffer());
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

  if (message.type === "image") {
    const tabId = sender.tab && sender.tab.id;
    if (tabId == null) return;
    const key = tabId + ":" + sender.frameId;
    const url = String(message.url || "");
    if (url && isSafeHttpUrl(url)) imageByFrame.set(key, url);
    else imageByFrame.delete(key);
    return;
  }

  if (message.type === "saveImage" && isSafeHttpUrl(message.url)) {
    suggestedImageName(message.url).then((filename) => {
      if (filename) pendingSaveNames.set(message.url, filename);
      const options = { url: message.url, saveAs: true };
      if (filename) options.filename = filename;
      chrome.downloads.download(options);
    });
    return;
  }

  if (message.type === "imagePng" && isSafeHttpUrl(message.url)) {
    urlToPngBytes(message.url)
      .then((buffer) => sendResponse({ buffer: buffer.buffer }))
      .catch(() => sendResponse({ buffer: null }));
    return true;
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
  if (info.menuItemId === MENU_IMAGE_NEW_TAB_SWITCH) {
    const key = tab && tab.id != null ? tab.id + ":" + info.frameId : "";
    const stored = key ? imageByFrame.get(key) : "";
    const imageUrl = stored && isSafeHttpUrl(stored) ? stored : info.srcUrl;
    if (imageUrl && isSafeHttpUrl(imageUrl)) openNewTab(imageUrl, tab, true);
    return;
  }

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
  for (const key of imageByFrame.keys()) {
    if (key.startsWith(prefix)) imageByFrame.delete(key);
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
