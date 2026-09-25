(function (root) {
  const BetterLinks = root.BetterLinks || (root.BetterLinks = {});

  function showCopied() {
    if (BetterLinks.tooltip) BetterLinks.tooltip.showCopied(BetterLinks.tooltip.currentRect());
  }

  function copyImage(url) {
    const pngPromise = new Promise((resolve, reject) => {
      try {
        chrome.runtime.sendMessage({ type: "imagePng", url: url }, (response) => {
          if (chrome.runtime.lastError || !response || !response.buffer) {
            reject(new Error("copy"));
            return;
          }
          resolve(new Blob([response.buffer], { type: "image/png" }));
        });
      } catch (error) {
        reject(error);
      }
    });
    navigator.clipboard.write([new ClipboardItem({ "image/png": pngPromise })]).then(showCopied, () => {});
  }

  function saveImage(url) {
    try {
      chrome.runtime.sendMessage({ type: "saveImage", url: url });
    } catch {
      /* El service worker puede estar inactivo. */
    }
  }

  BetterLinks.runImageAction = function runImageAction(id, url) {
    const spec = BetterLinks.ACTIONS[id];
    if (!url || !spec) return;
    if (spec.kind === "copyImage") copyImage(url);
    else if (spec.kind === "saveImage") saveImage(url);
  };
})(globalThis);
