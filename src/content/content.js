(function () {
  const BL = globalThis.BetterLinks;

  let settings = BL.normalizeSettings(BL.DEFAULTS);
  let reportTimer = 0;
  let lastReportedSelection = null;
  let lastLinkReportAt = 0;

  function applySettings(next) {
    settings = BL.normalizeSettings(next);
    if (BL.gestures) BL.gestures.onSettings(settings);
  }

  function reportSelection(text) {
    const value = String(text || "");
    if (!value.trim() && Date.now() - lastLinkReportAt < 400) return;
    if (value === lastReportedSelection) return;
    lastReportedSelection = value;
    if (value.trim()) lastLinkReportAt = Date.now();
    try {
      chrome.runtime.sendMessage({ type: "selection", text: value }, () => {
        if (chrome.runtime.lastError) lastReportedSelection = null;
      });
    } catch {
      lastReportedSelection = null;
    }
  }

  function scheduleSelectionReport() {
    window.clearTimeout(reportTimer);
    reportTimer = window.setTimeout(() => {
      if (document.visibilityState === "hidden") {
        reportSelection("");
        return;
      }
      reportSelection(BL.currentSelectionText());
    }, 40);
  }

  function onContextMenu(event) {
    const found = BL.resolveHit(event, settings.fixLinks, BL.tooltip.isOwnEvent);
    const selected = BL.currentSelectionText();
    if (selected.trim()) reportSelection(selected);
    try {
      chrome.runtime.sendMessage({ type: "link", url: found.anchor ? found.anchor.url : "" });
      chrome.runtime.sendMessage({ type: "image", url: found.image ? found.image.url : "" });
    } catch {
      /* El service worker puede estar inactivo. */
    }
  }

  BL.initTooltip(() => settings);
  BL.initGestures(() => settings);

  window.addEventListener("mousedown", BL.gestures.onMouseDown, true);
  document.addEventListener("mouseup", BL.gestures.onMouseUp, true);
  document.addEventListener("click", BL.gestures.onClick, true);
  document.addEventListener("mouseover", BL.gestures.onMouseOver, true);
  document.addEventListener("mouseout", BL.gestures.onMouseOut, true);
  document.addEventListener("keydown", BL.gestures.onKeyDown, true);
  document.addEventListener("selectionchange", BL.gestures.onSelectionChange, true);
  document.addEventListener("selectionchange", scheduleSelectionReport, true);
  document.addEventListener("keyup", scheduleSelectionReport, true);
  document.addEventListener("mouseup", scheduleSelectionReport, true);
  document.addEventListener("visibilitychange", scheduleSelectionReport, true);
  document.addEventListener("contextmenu", onContextMenu, true);
  window.addEventListener("scroll", BL.gestures.onReposition, true);
  window.addEventListener("resize", BL.gestures.onReposition);
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync") return;
    const next = Object.assign({}, settings);
    for (const [key, change] of Object.entries(changes)) next[key] = change.newValue;
    applySettings(next);
  });
  chrome.storage.sync.get(null, (stored) => applySettings(stored));
})();
