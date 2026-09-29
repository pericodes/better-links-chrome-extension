(function (root) {
  const BetterLinks = root.BetterLinks || (root.BetterLinks = {});

  const SCRIPT_ID = "better-links";

  BetterLinks.contentScriptFiles = [
    "shared/defaults.js",
    "shared/link.js",
    "shared/correctors.js",
    "shared/video.js",
    "shared/i18n.js",
    "shared/actions.js",
    "content/targets/selection.js",
    "content/targets/anchor.js",
    "content/targets/image.js",
    "content/targets/video.js",
    "content/targets/resolve.js",
    "content/actions/link.js",
    "content/actions/image.js",
    "content/actions/run.js",
    "content/tooltip.js",
    "content/gestures.js",
    "content/content.js",
  ];
  BetterLinks.contentScriptCss = ["content/content.css"];

  BetterLinks.contentScriptRegistration = function contentScriptRegistration() {
    return {
      id: SCRIPT_ID,
      matches: BetterLinks.HOST_ORIGINS.slice(),
      js: BetterLinks.contentScriptFiles.slice(),
      css: BetterLinks.contentScriptCss.slice(),
      runAt: "document_idle",
      allFrames: true,
      persistAcrossSessions: true,
    };
  };

  let pending = Promise.resolve();

  function applyRegistration(granted) {
    const spec = BetterLinks.contentScriptRegistration();
    return chrome.scripting.getRegisteredContentScripts({ ids: [spec.id] }).then((existing) => {
      if (!granted) {
        if (!existing.length) return false;
        return chrome.scripting.unregisterContentScripts({ ids: [spec.id] }).then(() => false);
      }
      if (!existing.length) return chrome.scripting.registerContentScripts([spec]).then(() => true);
      return chrome.scripting
        .updateContentScripts([
          {
            id: spec.id,
            matches: spec.matches,
            js: spec.js,
            css: spec.css,
            runAt: spec.runAt,
            allFrames: spec.allFrames,
          },
        ])
        .then(() => true)
        .catch(() => {
          return chrome.scripting.unregisterContentScripts({ ids: [spec.id] }).then(() => {
            return chrome.scripting.registerContentScripts([spec]).then(() => true);
          });
        });
    });
  }

  BetterLinks.syncContentScripts = function syncContentScripts() {
    const run = () => chrome.permissions.contains({ origins: BetterLinks.HOST_ORIGINS }).then(applyRegistration);
    pending = pending.then(run, run);
    return pending;
  };
})(globalThis);
