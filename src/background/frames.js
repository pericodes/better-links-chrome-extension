(function (root) {
  const BetterLinks = root.BetterLinks || (root.BetterLinks = {});

  const textByFrame = new Map();
  const linkByFrame = new Map();
  const imageByFrame = new Map();

  function keyFor(tabId, frameId) {
    return tabId + ":" + frameId;
  }

  function forgetMap(map, tabId) {
    const prefix = tabId + ":";
    for (const key of map.keys()) {
      if (key.startsWith(prefix)) map.delete(key);
    }
  }

  BetterLinks.frames = {
    setText(tabId, frameId, text) {
      const key = keyFor(tabId, frameId);
      const value = String(text || "").trim();
      if (value) textByFrame.set(key, value);
      else textByFrame.delete(key);
    },
    setLink(tabId, frameId, url) {
      const key = keyFor(tabId, frameId);
      if (url && BetterLinks.isSafeHttpUrl(url)) linkByFrame.set(key, url);
      else linkByFrame.delete(key);
    },
    setImage(tabId, frameId, url) {
      const key = keyFor(tabId, frameId);
      if (url && BetterLinks.isSafeHttpUrl(url)) imageByFrame.set(key, url);
      else imageByFrame.delete(key);
    },
    textsForTab(tabId) {
      if (tabId == null) return [];
      const prefix = tabId + ":";
      const found = [];
      for (const [key, text] of textByFrame) {
        if (key.startsWith(prefix)) found.push(text);
      }
      return found;
    },
    link(tabId, frameId) {
      return linkByFrame.get(keyFor(tabId, frameId)) || "";
    },
    image(tabId, frameId) {
      return imageByFrame.get(keyFor(tabId, frameId)) || "";
    },
    forget(tabId) {
      forgetMap(textByFrame, tabId);
      forgetMap(linkByFrame, tabId);
      forgetMap(imageByFrame, tabId);
    },
  };
})(globalThis);
