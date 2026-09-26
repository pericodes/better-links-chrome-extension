(function (root) {
  const BetterLinks = root.BetterLinks || (root.BetterLinks = {});

  function copyUrl(url) {
    const copied = () => {
      if (BetterLinks.tooltip) BetterLinks.tooltip.showCopied(BetterLinks.tooltip.currentRect());
    };
    const fallback = () => {
      const area = document.createElement("textarea");
      area.value = url;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.left = "-9999px";
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
      copied();
    };
    try {
      navigator.clipboard.writeText(url).then(copied, fallback);
    } catch {
      fallback();
    }
  }

  function openAll(urls, spec) {
    const message = { type: "openAll", mode: spec.mode, urls: urls };
    const fallback = () => {
      for (const url of urls) window.open(url, "_blank", "noopener,noreferrer");
    };
    try {
      chrome.runtime.sendMessage(message, () => {
        if (chrome.runtime.lastError) fallback();
      });
    } catch {
      fallback();
    }
  }

  function openUrl(url, spec) {
    const message = { type: "open", mode: spec.mode, url: url };
    if (spec.active === false) message.active = false;
    const fallback = () => {
      if (spec.mode === "newWindow") window.open(url, "_blank", "noopener,noreferrer,width=1200,height=800");
      else window.open(url, "_blank", "noopener,noreferrer");
    };
    try {
      chrome.runtime.sendMessage(message, () => {
        if (chrome.runtime.lastError) fallback();
      });
    } catch {
      fallback();
    }
  }

  function linkList(url) {
    return (Array.isArray(url) ? url : [url]).filter((item) => BetterLinks.isHttpUrl(item));
  }

  BetterLinks.runLinkAction = function runLinkAction(id, url) {
    const spec = BetterLinks.ACTIONS[id];
    if (!spec) return;
    if (spec.kind === "copyLinks") {
      const list = linkList(url);
      if (list.length) copyUrl(list.join("\n"));
      return;
    }
    if (spec.kind === "openAll") {
      const list = linkList(url);
      if (list.length) openAll(list, spec);
      return;
    }
    if (!url || Array.isArray(url)) return;
    if (spec.kind === "copyLink") {
      copyUrl(url);
      return;
    }
    if (spec.kind === "open") openUrl(url, spec);
  };
})(globalThis);
