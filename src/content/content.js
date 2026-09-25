(function () {
  const CLICK_WINDOW_MS = 450;
  const BL = globalThis.BetterLinks;

  let settings = BL.normalizeSettings(BL.DEFAULTS);
  let lang = "en";
  let root;
  let shadow;
  let tip;
  let toast;
  let hideTimer = 0;
  let showTimer = 0;
  let pendingKind = "";
  let toastTimer = 0;
  let hoverAnchor = null;
  let ignoreNextMouseUp = false;

  const selectionState = {
    armed: false,
    url: "",
    count: 0,
    timer: 0,
    fieldOnly: false,
  };

  const anchorState = {
    anchor: null,
    url: "",
    count: 0,
    downs: 0,
    timer: 0,
  };

  function t(key) {
    return BL.t(lang, key);
  }

  function ensureUi() {
    if (root) return;
    root = document.createElement("div");
    root.id = "better-links-root";
    root.style.cssText = "position:absolute;top:0;left:0;width:0;height:0;z-index:2147483647;";
    shadow = root.attachShadow({ mode: "open" });
    shadow.innerHTML = `
      <style>
        .tip, .toast {
          position: fixed;
          font: 13px/1.3 system-ui, sans-serif;
          z-index: 2147483647;
        }
        .tip {
          display: flex;
          gap: 4px;
          padding: 4px;
          background: #111827;
          color: #fff;
          border-radius: 8px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.28);
          pointer-events: auto;
        }
        .tip[hidden], .toast[hidden] { display: none; }
        button {
          appearance: none;
          border: 0;
          background: transparent;
          color: inherit;
          font: inherit;
          padding: 6px 8px;
          border-radius: 6px;
          cursor: pointer;
          white-space: nowrap;
        }
        button:hover, button:focus-visible { background: #1f2937; outline: none; }
        .toast {
          padding: 6px 10px;
          background: #111827;
          color: #fff;
          border-radius: 8px;
        }
      </style>
      <div class="tip" hidden role="toolbar"></div>
      <div class="toast" hidden></div>
    `;
    tip = shadow.querySelector(".tip");
    toast = shadow.querySelector(".toast");
    tip.addEventListener("mousedown", (event) => {
      event.preventDefault();
      event.stopPropagation();
    });
    tip.addEventListener("mouseover", () => window.clearTimeout(hideTimer));
    tip.addEventListener("mouseout", (event) => {
      if (tip.dataset.kind !== "anchor") return;
      const next = event.relatedTarget;
      if (next && (next === tip || tip.contains(next))) return;
      scheduleHide();
    });
    (document.documentElement || document.body).appendChild(root);
  }

  function renderTipButtons() {
    const labels = {
      newWindow: "tooltip.newWindow",
      newTab: "tooltip.newTab",
      newTabAndOpen: "tooltip.newTabAndOpen",
      copy: "tooltip.copy",
    };
    tip.replaceChildren();
    for (const action of settings.tooltipActions) {
      const key = labels[action];
      if (!key) continue;
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.action = action;
      button.textContent = t(key);
      tip.appendChild(button);
    }
  }

  function placeNear(rect) {
    const margin = 8;
    const width = tip.offsetWidth;
    const height = tip.offsetHeight;
    let left = rect.left + rect.width / 2 - width / 2;
    let top = rect.top - height - margin;
    if (top < margin) top = rect.bottom + margin;
    left = Math.max(margin, Math.min(left, window.innerWidth - width - margin));
    top = Math.max(margin, Math.min(top, window.innerHeight - height - margin));
    tip.style.left = `${left}px`;
    tip.style.top = `${top}px`;
  }

  function showTip(url, rect, kind) {
    ensureUi();
    renderTipButtons();
    tip.dataset.url = url;
    tip.dataset.kind = kind;
    tip.hidden = false;
    placeNear(rect);
  }

  function concealTip() {
    if (!tip) return;
    tip.hidden = true;
    delete tip.dataset.url;
    delete tip.dataset.kind;
  }

  function cancelScheduledTip() {
    window.clearTimeout(showTimer);
    showTimer = 0;
    pendingKind = "";
  }

  function tooltipDelayMs() {
    const ms = Number(settings.tooltipDelay) || 0;
    return ms > 0 ? Math.round(ms) : 0;
  }

  function scheduleTip(url, rect, kind, rectSource) {
    cancelScheduledTip();
    concealTip();
    if (!settings.tooltipActions.length) return;
    const reveal = () => {
      showTimer = 0;
      const live = typeof rectSource === "function" ? rectSource() || rect : rect;
      if (!live) return;
      showTip(url, live, kind);
    };
    const delay = tooltipDelayMs();
    if (delay === 0) reveal();
    else {
      pendingKind = kind;
      showTimer = window.setTimeout(reveal, delay);
    }
  }

  function hideTip() {
    cancelScheduledTip();
    concealTip();
  }

  function scheduleHide() {
    window.clearTimeout(hideTimer);
    hideTimer = window.setTimeout(hideTip, 350);
  }

  function showCopied(rect) {
    ensureUi();
    toast.textContent = t("copied");
    toast.hidden = false;
    const width = toast.offsetWidth;
    const left = Math.max(8, rect.left + rect.width / 2 - width / 2);
    toast.style.left = `${left}px`;
    toast.style.top = `${Math.max(8, rect.top - toast.offsetHeight - 8)}px`;
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      toast.hidden = true;
    }, 1200);
  }

  function currentRect() {
    if (tip && !tip.hidden) {
      return {
        left: parseFloat(tip.style.left) || 8,
        top: parseFloat(tip.style.top) || 8,
        width: tip.offsetWidth,
        height: 0,
      };
    }
    return { left: 16, top: 16, width: 0, height: 0 };
  }

  async function copyUrl(url) {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const area = document.createElement("textarea");
      area.value = url;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.left = "-9999px";
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    showCopied(currentRect());
  }

  function openUrl(url, mode, after) {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      if (typeof after === "function") after();
    };
    const fallback = () => {
      if (mode === "newWindow") window.open(url, "_blank", "noopener,noreferrer,width=1200,height=800");
      else window.open(url, "_blank", "noopener,noreferrer");
    };
    try {
      chrome.runtime.sendMessage({ type: "open", mode: mode, url: url }, () => {
        if (chrome.runtime.lastError) fallback();
        finish();
      });
    } catch {
      fallback();
      finish();
    }
  }

  function openHere(url, anchor) {
    if (anchor && anchor.isConnected && anchor.hasAttribute("download")) {
      followAnchor(anchor, url);
      return;
    }
    location.assign(url);
  }

  function runAction(action, url, anchor) {
    if (!url || !action || action === "none") return;
    if (action === "copy") {
      copyUrl(url);
      return;
    }
    if (action === "newTabAndOpen") {
      openUrl(url, "newTab", () => openHere(url, anchor));
      return;
    }
    if (action === "newWindow" || action === "newTab") openUrl(url, action);
  }

  function selectionInsideAnchor(selection) {
    if (!selection || !selection.rangeCount || selection.isCollapsed) return false;
    const range = selection.getRangeAt(0);
    const containers = [range.startContainer, range.endContainer, range.commonAncestorContainer];
    return containers.every((node) => {
      const el = node && node.nodeType === 1 ? node : node && node.parentElement;
      return Boolean(el && el.closest && el.closest("a"));
    });
  }

  function pointInSelection(x, y) {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount || selection.isCollapsed) return false;
    for (const rect of selection.getRangeAt(0).getClientRects()) {
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) return true;
    }
    return false;
  }

  function selectionRect() {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return null;
    const rect = selection.getRangeAt(0).getBoundingClientRect();
    if (!rect || (rect.width === 0 && rect.height === 0)) return null;
    return rect;
  }

  function fieldSelection(target) {
    const el = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")
      ? target
      : document.activeElement;
    if (!el || (el.tagName !== "INPUT" && el.tagName !== "TEXTAREA")) return null;
    if (el.selectionStart == null || el.selectionStart === el.selectionEnd) return null;
    return {
      text: el.value.slice(el.selectionStart, el.selectionEnd),
      rect: el.getBoundingClientRect(),
    };
  }

  function disarmSelection() {
    if (pendingKind === "selection") cancelScheduledTip();
    selectionState.armed = false;
    selectionState.url = "";
    selectionState.count = 0;
    selectionState.fieldOnly = false;
    window.clearTimeout(selectionState.timer);
  }

  function armSelection(url, rect, fieldOnly) {
    clearAnchorPending(false);
    selectionState.armed = true;
    selectionState.url = url;
    selectionState.count = 0;
    selectionState.fieldOnly = fieldOnly;
    window.clearTimeout(selectionState.timer);
    if (settings.showTooltip) {
      scheduleTip(url, rect, "selection", () => (fieldOnly ? rect : selectionRect()));
    } else hideTip();
  }

  function finishSelectionClicks() {
    const count = selectionState.count;
    const url = selectionState.url;
    const action = count <= 1 ? settings.click1 : count === 2 ? settings.click2 : settings.click3;
    disarmSelection();
    hideTip();
    runAction(action, url);
  }

  function fromUi(event) {
    if (!root) return false;
    if (event.target === root) return true;
    const path = event.composedPath ? event.composedPath() : [];
    if (path.includes(root) || path.includes(shadow)) return true;
    const node = event.target;
    return Boolean(node && node.getRootNode && node.getRootNode() === shadow);
  }

  function tooltipButton(event) {
    const path = event.composedPath ? event.composedPath() : [];
    for (const node of path) {
      if (node && node.nodeType === 1 && node.dataset && node.dataset.action) return node;
    }
    return null;
  }

  function activateTooltipButton(event) {
    const button = tooltipButton(event);
    if (!button || !tip) return false;
    event.preventDefault();
    event.stopPropagation();
    const url = tip.dataset.url;
    const action = button.dataset.action;
    const anchor = tip.dataset.kind === "anchor" && hoverAnchor && hoverAnchor.isConnected ? hoverAnchor : null;
    runAction(action, url, anchor);
    disarmSelection();
    clearAnchorPending(false);
    hideTip();
    return true;
  }

  function anchorFromEvent(event) {
    if (fromUi(event)) return null;
    const path = event.composedPath ? event.composedPath() : [];
    if (path.includes(root)) return null;
    const node = event.target && event.target.nodeType === 1 ? event.target : event.target && event.target.parentElement;
    if (!node || !node.closest) return null;
    return node.closest("a[href]");
  }

  function anchorUrl(anchor) {
    if (!anchor) return null;
    return BL.resolveAnchorUrl(anchor.getAttribute("href"), anchor.href, settings.fixLinks);
  }

  function clearAnchorPending(navigate) {
    window.clearTimeout(anchorState.timer);
    const pending = anchorState.anchor;
    const url = anchorState.url;
    const count = anchorState.count;
    anchorState.anchor = null;
    anchorState.url = "";
    anchorState.count = 0;
    anchorState.downs = 0;
    if (navigate && pending && count === 1 && url) followAnchor(pending, url);
  }

  function followAnchor(anchor, url) {
    if (anchor.target === "_blank") {
      chrome.runtime.sendMessage({ type: "open", mode: "newTab", url });
      return;
    }
    if (anchor.hasAttribute("download")) {
      const link = document.createElement("a");
      link.href = url;
      link.download = anchor.getAttribute("download") || "";
      link.rel = "noopener";
      document.body.appendChild(link);
      link.click();
      link.remove();
      return;
    }
    location.assign(url);
  }

  function finishAnchorClicks() {
    const { anchor, url, count } = anchorState;
    anchorState.anchor = null;
    anchorState.url = "";
    anchorState.count = 0;
    anchorState.downs = 0;
    if (!anchor || !url) return;
    if (count <= 1) followAnchor(anchor, url);
    else if (count === 2) runAction(settings.anchorClick2, url, anchor);
    else runAction(settings.anchorClick3, url, anchor);
    hideTip();
  }

  function onMouseUp(event) {
    if (event.button !== 0 || fromUi(event)) return;
    if (ignoreNextMouseUp) {
      ignoreNextMouseUp = false;
      return;
    }
    if (anchorFromEvent(event)) return;

    const field = fieldSelection(event.target);
    if (field) {
      const url = BL.resolveTextLink(field.text, settings.fixLinks);
      if (!url) {
        disarmSelection();
        if (tip && tip.dataset.kind === "selection") hideTip();
        return;
      }
      armSelection(url, field.rect, true);
      return;
    }

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selectionInsideAnchor(selection)) {
      if (!selectionState.armed) return;
      disarmSelection();
      if (tip && tip.dataset.kind === "selection") hideTip();
      return;
    }

    const url = BL.resolveTextLink(selection.toString(), settings.fixLinks);
    const rect = selectionRect();
    if (!url || !rect) {
      disarmSelection();
      if (tip && tip.dataset.kind === "selection") hideTip();
      return;
    }
    armSelection(url, rect, false);
  }

  function onMouseDown(event) {
    if (event.button !== 0) return;
    if (activateTooltipButton(event)) return;
    if (fromUi(event)) return;
    const anchor = anchorFromEvent(event);
    if (anchor && BL.anchorModeAppliesClicks(settings.anchorMode)) {
      const url = anchorUrl(anchor);
      if (!url || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      if (anchorState.anchor === anchor && anchorState.downs >= 1) {
        event.preventDefault();
        event.stopPropagation();
      }
      return;
    }

    if (!selectionState.armed || selectionState.fieldOnly) return;
    if (!pointInSelection(event.clientX, event.clientY)) {
      disarmSelection();
      if (tip && tip.dataset.kind === "selection") hideTip();
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    ignoreNextMouseUp = true;
    selectionState.count += 1;
    window.clearTimeout(selectionState.timer);
    selectionState.timer = window.setTimeout(finishSelectionClicks, CLICK_WINDOW_MS);
  }

  function onClick(event) {
    if (event.button !== 0 || fromUi(event)) return;
    if (!BL.anchorModeAppliesClicks(settings.anchorMode)) return;
    const anchor = anchorFromEvent(event);
    if (!anchor) return;
    const url = anchorUrl(anchor);
    if (!url || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;

    event.preventDefault();
    event.stopPropagation();

    if (anchorState.anchor !== anchor) {
      clearAnchorPending(true);
      anchorState.anchor = anchor;
      anchorState.url = url;
      anchorState.count = 0;
      anchorState.downs = 0;
    }
    anchorState.count += 1;
    anchorState.downs += 1;
    window.clearTimeout(anchorState.timer);
    anchorState.timer = window.setTimeout(finishAnchorClicks, CLICK_WINDOW_MS);
  }

  function onMouseOver(event) {
    if (!settings.tooltipOnLinks) return;
    const anchor = anchorFromEvent(event);
    if (!anchor) return;
    const url = anchorUrl(anchor);
    if (!url) return;
    window.clearTimeout(hideTimer);
    if (hoverAnchor === anchor && (showTimer || (tip && !tip.hidden && tip.dataset.kind === "anchor"))) return;
    hoverAnchor = anchor;
    scheduleTip(url, anchor.getBoundingClientRect(), "anchor", () =>
      anchor.isConnected ? anchor.getBoundingClientRect() : null
    );
  }

  function onMouseOut(event) {
    const anchor = anchorFromEvent(event);
    if (!anchor) return;
    const next = event.relatedTarget;
    if (anchor.matches(":hover")) return;
    if (next === root || (next && next.getRootNode && next.getRootNode() === shadow)) return;
    if (next && anchor.contains(next)) return;
    if (hoverAnchor === anchor) hoverAnchor = null;
    if (pendingKind === "anchor") cancelScheduledTip();
    if (!tip || tip.hidden || tip.dataset.kind !== "anchor") return;
    scheduleHide();
  }

  function onKeyDown(event) {
    if (event.key !== "Escape") return;
    disarmSelection();
    clearAnchorPending(false);
    hideTip();
  }

  function onSelectionChange() {
    if (!selectionState.armed || selectionState.fieldOnly || selectionState.count > 0) return;
    const selection = window.getSelection();
    const url = selection && !selection.isCollapsed
      ? BL.resolveTextLink(selection.toString(), settings.fixLinks)
      : null;
    if (url !== selectionState.url) {
      disarmSelection();
      if (tip && tip.dataset.kind === "selection") hideTip();
    }
  }

  function reposition() {
    if (!tip || tip.hidden) return;
    if (tip.dataset.kind === "selection" && !selectionState.fieldOnly) {
      const rect = selectionRect();
      if (rect) placeNear(rect);
    }
  }

  function applySettings(next) {
    settings = BL.normalizeSettings(next);
    lang = BL.resolveLanguage(settings.language);
    if (!settings.showTooltip && tip && tip.dataset.kind === "selection") hideTip();
    if (!settings.tooltipOnLinks && (hoverAnchor || (tip && tip.dataset.kind === "anchor"))) {
      hoverAnchor = null;
      hideTip();
    }
    if (tip && !tip.hidden) {
      if (!settings.tooltipActions.length) hideTip();
      else renderTipButtons();
    }
  }

  function start() {
    ensureUi();
    window.addEventListener("mousedown", onMouseDown, true);
    document.addEventListener("mouseup", onMouseUp, true);
    document.addEventListener("click", onClick, true);
    document.addEventListener("mouseover", onMouseOver, true);
    document.addEventListener("mouseout", onMouseOut, true);
    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("selectionchange", onSelectionChange, true);
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "sync") return;
      const next = Object.assign({}, settings);
      for (const [key, change] of Object.entries(changes)) next[key] = change.newValue;
      applySettings(next);
    });
    chrome.storage.sync.get(null, (stored) => applySettings(stored));
  }

  start();
})();
