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
  let hoverImage = null;
  let ignoreNextMouseUp = false;
  let reportTimer = 0;
  let lastReportedSelection = null;
  let lastLinkReportAt = 0;

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

  const imageState = {
    image: null,
    url: "",
    anchor: null,
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
          flex-direction: column;
          gap: 4px;
          padding: 4px;
          background: #111827;
          color: #fff;
          border-radius: 8px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.28);
          pointer-events: auto;
        }
        .tip-row {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
        }
        .tip-row + .tip-row {
          border-top: 1px solid #374151;
          padding-top: 4px;
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
      const kind = tip.dataset.kind;
      if (kind !== "anchor" && kind !== "image" && kind !== "both") return;
      const next = event.relatedTarget;
      if (next && (next === tip || tip.contains(next))) return;
      scheduleHide();
    });
    (document.documentElement || document.body).appendChild(root);
  }

  const LINK_TIP_LABELS = {
    newWindow: "tooltip.newWindow",
    newTab: "tooltip.newTab",
    newTabAndSwitch: "tooltip.newTabAndSwitch",
    copy: "tooltip.copy",
  };
  const IMAGE_TIP_LABELS = {
    newWindow: "image.tooltip.newWindow",
    newTab: "image.tooltip.newTab",
    newTabAndSwitch: "image.tooltip.newTabAndSwitch",
    copyImageLink: "image.tooltip.copyImageLink",
    copyImage: "image.tooltip.copyImage",
    saveImage: "image.tooltip.saveImage",
  };

  function renderTipButtons(groups) {
    tip.replaceChildren();
    for (const group of groups) {
      const row = document.createElement("div");
      row.className = "tip-row";
      for (const action of group.actions) {
        const key = group.labels[action];
        if (!key) continue;
        const button = document.createElement("button");
        button.type = "button";
        button.dataset.action = action;
        button.dataset.target = group.target;
        button.dataset.url = group.url;
        button.textContent = t(key);
        row.appendChild(button);
      }
      if (row.childElementCount) tip.appendChild(row);
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

  function showTip(rect, kind, groups) {
    ensureUi();
    renderTipButtons(groups);
    if (!tip.childElementCount) return;
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

  function scheduleTip(rect, kind, rectSource, groups) {
    cancelScheduledTip();
    concealTip();
    if (!groups.some((group) => group.actions.length)) return;
    const reveal = () => {
      showTimer = 0;
      const live = typeof rectSource === "function" ? rectSource() || rect : rect;
      if (!live) return;
      showTip(live, kind, groups);
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

  function openUrl(url, mode, after, active) {
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
    const message = { type: "open", mode: mode, url: url };
    if (active === false) message.active = false;
    try {
      chrome.runtime.sendMessage(message, () => {
        if (chrome.runtime.lastError) fallback();
        finish();
      });
    } catch {
      fallback();
      finish();
    }
  }

  function runAction(action, url) {
    if (!url || !action || action === "none") return;
    if (action === "copy") {
      copyUrl(url);
      return;
    }
    if (action === "newTab") {
      openUrl(url, "newTab", null, false);
      return;
    }
    if (action === "newTabAndSwitch") {
      openUrl(url, "newTab", null, true);
      return;
    }
    if (action === "newWindow") openUrl(url, action);
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
    navigator.clipboard.write([new ClipboardItem({ "image/png": pngPromise })]).then(
      () => showCopied(currentRect()),
      () => {}
    );
  }

  function saveImage(url) {
    try {
      chrome.runtime.sendMessage({ type: "saveImage", url: url });
    } catch {
      /* El service worker puede estar inactivo. */
    }
  }

  function runImageAction(action, url) {
    if (!url || !action || action === "none") return;
    if (action === "copyImageLink") {
      copyUrl(url);
      return;
    }
    if (action === "copyImage") {
      copyImage(url);
      return;
    }
    if (action === "saveImage") {
      saveImage(url);
      return;
    }
    if (action === "newTab") {
      openUrl(url, "newTab", null, false);
      return;
    }
    if (action === "newTabAndSwitch") {
      openUrl(url, "newTab", null, true);
      return;
    }
    if (action === "newWindow") openUrl(url, "newWindow");
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
      scheduleTip(rect, "selection", () => (fieldOnly ? rect : selectionRect()), [
        { actions: settings.tooltipActions, labels: LINK_TIP_LABELS, url: url, target: "link" },
      ]);
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
    const url = button.dataset.url;
    const action = button.dataset.action;
    if (button.dataset.target === "image") runImageAction(action, url);
    else runAction(action, url);
    disarmSelection();
    clearAnchorPending(false);
    clearImagePending(false);
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

  function imageFromEvent(event) {
    if (fromUi(event)) return null;
    const node = event.target && event.target.nodeType === 1 ? event.target : event.target && event.target.parentElement;
    if (!node || !node.closest) return null;
    return node.closest("img");
  }

  function imageUrl(image) {
    if (!image) return null;
    const src = image.currentSrc || image.src;
    if (!src) return null;
    try {
      const url = new URL(src, location.href).href;
      return BL.isHttpUrl(url) ? url : null;
    } catch {
      return null;
    }
  }

  function clearImagePending(follow) {
    window.clearTimeout(imageState.timer);
    const image = imageState.image;
    const url = imageState.url;
    const anchor = imageState.anchor;
    const count = imageState.count;
    imageState.image = null;
    imageState.url = "";
    imageState.anchor = null;
    imageState.count = 0;
    imageState.downs = 0;
    if (!follow || !image || count !== 1) return;
    const anchorUrlValue = anchor ? anchorUrl(anchor) : "";
    if (anchor && anchorUrlValue) followAnchor(anchor, anchorUrlValue);
  }

  function finishImageClicks() {
    const { url, anchor, count } = imageState;
    imageState.image = null;
    imageState.url = "";
    imageState.anchor = null;
    imageState.count = 0;
    imageState.downs = 0;
    if (!url) return;
    const action = count <= 1 ? settings.imageClick1 : count === 2 ? settings.imageClick2 : settings.imageClick3;
    if ((!action || action === "none") && count <= 1 && anchor) {
      const anchorUrlValue = anchorUrl(anchor);
      if (anchorUrlValue) followAnchor(anchor, anchorUrlValue);
      hideTip();
      return;
    }
    runImageAction(action, url);
    hideTip();
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
    if (anchorFromEvent(event) || imageFromEvent(event)) return;

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
    const image = imageFromEvent(event);
    if (image && imageUrl(image) && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) {
      if (imageState.image === image && imageState.downs >= 1) {
        event.preventDefault();
        event.stopPropagation();
      }
      return;
    }
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
    const image = imageFromEvent(event);
    const src = image ? imageUrl(image) : null;
    if (image && src && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) {
      event.preventDefault();
      event.stopPropagation();
      const anchor = image.closest("a[href]");
      if (imageState.image !== image) {
        clearImagePending(true);
        imageState.image = image;
        imageState.url = src;
        imageState.anchor = anchor;
        imageState.count = 0;
        imageState.downs = 0;
      }
      imageState.count += 1;
      imageState.downs += 1;
      window.clearTimeout(imageState.timer);
      imageState.timer = window.setTimeout(finishImageClicks, CLICK_WINDOW_MS);
      return;
    }
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

  function linkTipGroup(url) {
    return { actions: settings.tooltipActions, labels: LINK_TIP_LABELS, url: url, target: "link" };
  }

  function imageTipGroup(url) {
    return { actions: settings.imageTooltipActions, labels: IMAGE_TIP_LABELS, url: url, target: "image" };
  }

  function onMouseOver(event) {
    const image = imageFromEvent(event);
    const src = image ? imageUrl(image) : null;
    if (image && src) {
      const anchor = image.closest("a[href]");
      const link = anchor ? anchorUrl(anchor) : null;
      const groups = [];
      if (link && settings.tooltipOnLinks) groups.push(linkTipGroup(link));
      if (settings.showImageTooltip) groups.push(imageTipGroup(src));
      if (!groups.length) return;
      window.clearTimeout(hideTimer);
      const kind = groups.length > 1 ? "both" : groups[0].target === "image" ? "image" : "anchor";
      if (hoverImage === image && (showTimer || (tip && !tip.hidden && tip.dataset.kind === kind))) return;
      hoverImage = image;
      hoverAnchor = anchor;
      scheduleTip(image.getBoundingClientRect(), kind, () => (image.isConnected ? image.getBoundingClientRect() : null), groups);
      return;
    }
    if (!settings.tooltipOnLinks) return;
    const anchor = anchorFromEvent(event);
    if (!anchor) return;
    const url = anchorUrl(anchor);
    if (!url) return;
    window.clearTimeout(hideTimer);
    if (hoverAnchor === anchor && !hoverImage && (showTimer || (tip && !tip.hidden && tip.dataset.kind === "anchor"))) return;
    hoverAnchor = anchor;
    hoverImage = null;
    scheduleTip(anchor.getBoundingClientRect(), "anchor", () =>
      anchor.isConnected ? anchor.getBoundingClientRect() : null
    , [linkTipGroup(url)]);
  }

  function onMouseOut(event) {
    const image = imageFromEvent(event);
    if (image) {
      const next = event.relatedTarget;
      if (image.matches(":hover")) return;
      if (next === root || (next && next.getRootNode && next.getRootNode() === shadow)) return;
      if (next && image.contains(next)) return;
      if (hoverImage === image) hoverImage = null;
      if (pendingKind === "image" || pendingKind === "both") cancelScheduledTip();
      const anchor = image.closest("a[href]");
      if (anchor && next && anchor.contains(next)) return;
      if (!tip || tip.hidden || (tip.dataset.kind !== "image" && tip.dataset.kind !== "both")) return;
      scheduleHide();
      return;
    }
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
    clearImagePending(false);
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
    if (!settings.showImageTooltip && (hoverImage || (tip && (tip.dataset.kind === "image" || tip.dataset.kind === "both")))) {
      hoverImage = null;
      hideTip();
    }
  }

  function currentSelectionText() {
    const field = fieldSelection(document.activeElement);
    if (field) return field.text;
    const selection = window.getSelection();
    return selection ? selection.toString() : "";
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
      reportSelection(currentSelectionText());
    }, 40);
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
    document.addEventListener("selectionchange", scheduleSelectionReport, true);
    document.addEventListener("keyup", scheduleSelectionReport, true);
    document.addEventListener("mouseup", scheduleSelectionReport, true);
    document.addEventListener("visibilitychange", scheduleSelectionReport, true);
    document.addEventListener("contextmenu", (event) => {
      const anchor = anchorFromEvent(event);
      const url = anchor ? anchorUrl(anchor) : "";
      const image = imageFromEvent(event);
      const src = image ? imageUrl(image) || "" : "";
      const selected = currentSelectionText();
      if (selected.trim()) reportSelection(selected);
      try {
        chrome.runtime.sendMessage({ type: "link", url: url || "" });
        chrome.runtime.sendMessage({ type: "image", url: src });
      } catch {
        /* El service worker puede estar inactivo. */
      }
    }, true);
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
