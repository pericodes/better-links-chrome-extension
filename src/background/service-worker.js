importScripts(
  chrome.runtime.getURL("shared/defaults.js"),
  chrome.runtime.getURL("shared/link.js"),
  chrome.runtime.getURL("shared/i18n.js"),
  chrome.runtime.getURL("shared/correctors.js"),
  chrome.runtime.getURL("shared/actions.js"),
  chrome.runtime.getURL("background/frames.js"),
  chrome.runtime.getURL("background/open.js"),
  chrome.runtime.getURL("background/image.js"),
  chrome.runtime.getURL("background/context-menu.js")
);

const BL = globalThis.BetterLinks;

let settings = BL.normalizeSettings(BL.DEFAULTS);
BL.getSettings = function getSettings() {
  return settings;
};

function senderIds(sender) {
  const tabId = sender.tab && sender.tab.id;
  if (tabId == null) return null;
  return { tabId: tabId, frameId: sender.frameId };
}

chrome.action.onClicked.addListener(() => {
  chrome.runtime.openOptionsPage();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message) return;
  const ids = senderIds(sender);

  if (message.type === "selection" && ids) {
    BL.frames.setText(ids.tabId, ids.frameId, message.text);
    BL.noteSelectionFromTab(ids.tabId);
    return;
  }

  if (message.type === "image" && ids) {
    BL.frames.setImage(ids.tabId, ids.frameId, message.url);
    return;
  }

  if (message.type === "video" && ids) {
    BL.frames.setVideo(ids.tabId, ids.frameId, message.url);
    return;
  }

  if (message.type === "link" && ids) {
    BL.frames.setLink(ids.tabId, ids.frameId, message.url);
    return;
  }

  if (message.type === "saveImage") {
    BL.saveImage(message.url);
    return;
  }

  if (message.type === "imagePng") {
    BL.replyImagePng(message.url, sendResponse);
    return true;
  }

  if (message.type === "openAll") return BL.handleOpenAllMessage(message, sender, sendResponse);
  if (message.type === "open") return BL.handleOpenMessage(message, sender, sendResponse);
});

chrome.tabs.onActivated.addListener((info) => {
  BL.noteActiveTab(info.tabId);
});

chrome.tabs.onRemoved.addListener((tabId) => {
  BL.frames.forget(tabId);
  BL.forgetActiveTab(tabId);
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "sync") return;
  const next = Object.assign({}, settings);
  for (const [key, change] of Object.entries(changes)) next[key] = change.newValue;
  settings = BL.normalizeSettings(next);
  BL.syncMenu();
});

BL.installMenus(() => {
  BL.syncMenu();
});

chrome.storage.sync.get(null, (stored) => {
  settings = BL.normalizeSettings(stored);
  BL.syncMenu();
});

chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
  if (tabs && tabs[0]) BL.noteActiveTab(tabs[0].id);
  else BL.refreshSelectionMenu();
});
