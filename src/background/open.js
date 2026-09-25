(function (root) {
  const BetterLinks = root.BetterLinks || (root.BetterLinks = {});

  BetterLinks.isSafeHttpUrl = function isSafeHttpUrl(url) {
    try {
      const parsed = new URL(url);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  };

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

  BetterLinks.openFromAction = function openFromAction(actionId, url, tab) {
    const spec = BetterLinks.ACTIONS[actionId];
    if (!spec || spec.kind !== "open" || !BetterLinks.isSafeHttpUrl(url)) return;
    if (spec.mode === "newWindow") {
      chrome.windows.create({ url: url, focused: true });
      return;
    }
    openNewTab(url, tab, spec.active !== false);
  };

  BetterLinks.handleOpenMessage = function handleOpenMessage(message, sender, sendResponse) {
    if (!message || message.type !== "open" || !BetterLinks.isSafeHttpUrl(message.url)) return false;
    if (message.mode === "newWindow") {
      chrome.windows.create({ url: message.url, focused: true });
      sendResponse({ ok: true });
      return false;
    }
    if (message.mode === "newTab") {
      openNewTab(message.url, sender && sender.tab, message.active !== false, (ok) => {
        sendResponse({ ok: ok });
      });
      return true;
    }
    return false;
  };
})(globalThis);
