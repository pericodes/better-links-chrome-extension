function isSafeHttpUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

chrome.action.onClicked.addListener(() => {
  chrome.runtime.openOptionsPage();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || message.type !== "open" || !isSafeHttpUrl(message.url)) {
    return;
  }

  if (message.mode === "newWindow") {
    chrome.windows.create({ url: message.url, focused: true });
    sendResponse({ ok: true });
    return;
  }

  if (message.mode === "newTab") {
    chrome.tabs.create({ url: message.url, active: true });
    sendResponse({ ok: true });
  }
});
