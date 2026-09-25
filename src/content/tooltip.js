(function (root) {
  const BetterLinks = root.BetterLinks || (root.BetterLinks = {});

  let getSettings = function () { return BetterLinks.DEFAULTS; };
  let uiRoot;
  let shadow;
  let tip;
  let toast;
  let hideTimer = 0;
  let showTimer = 0;
  let pending = "";
  let toastTimer = 0;

  function t(key) {
    return BetterLinks.t(BetterLinks.resolveLanguage(getSettings().language), key);
  }

  function labelKey(action, target) {
    const spec = BetterLinks.ACTIONS[action];
    if (!spec) return "";
    const surface = target === "image" ? "imageTooltip" : "tooltip";
    return spec.surfaces[surface] || "";
  }

  function ensureUi() {
    if (uiRoot) return;
    uiRoot = document.createElement("div");
    uiRoot.id = "better-links-root";
    uiRoot.style.cssText = "position:absolute;top:0;left:0;width:0;height:0;z-index:2147483647;";
    shadow = uiRoot.attachShadow({ mode: "open" });
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
      BetterLinks.tooltip.scheduleHide();
    });
    (document.documentElement || document.body).appendChild(uiRoot);
  }

  function renderTipButtons(groups) {
    tip.replaceChildren();
    for (const group of groups) {
      const row = document.createElement("div");
      row.className = "tip-row";
      for (const action of group.actions) {
        const key = labelKey(action, group.target);
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

  function tooltipDelayMs() {
    const ms = Number(getSettings().tooltipDelay) || 0;
    return ms > 0 ? Math.round(ms) : 0;
  }

  BetterLinks.initTooltip = function initTooltip(getter) {
    if (typeof getter === "function") getSettings = getter;
    ensureUi();
  };

  BetterLinks.tooltip = {
    isOwnEvent(event) {
      if (!uiRoot) return false;
      if (event.target === uiRoot) return true;
      const path = event.composedPath ? event.composedPath() : [];
      if (path.includes(uiRoot) || path.includes(shadow)) return true;
      const node = event.target;
      return Boolean(node && node.getRootNode && node.getRootNode() === shadow);
    },
    buttonFrom(event) {
      const path = event.composedPath ? event.composedPath() : [];
      for (const node of path) {
        if (node && node.nodeType === 1 && node.dataset && node.dataset.action) return node;
      }
      return null;
    },
    isUiNode(node) {
      if (!node || !uiRoot) return false;
      if (node === uiRoot) return true;
      return Boolean(node.getRootNode && node.getRootNode() === shadow);
    },
    kind() {
      return tip && tip.dataset.kind ? tip.dataset.kind : "";
    },
    isHidden() {
      return !tip || tip.hidden;
    },
    pendingKind() {
      return pending;
    },
    cancelSchedule() {
      window.clearTimeout(showTimer);
      showTimer = 0;
      pending = "";
    },
    placeNear(rect) {
      if (tip) placeNear(rect);
    },
    hide() {
      this.cancelSchedule();
      if (!tip) return;
      tip.hidden = true;
      delete tip.dataset.url;
      delete tip.dataset.kind;
    },
    scheduleHide() {
      window.clearTimeout(hideTimer);
      hideTimer = window.setTimeout(() => BetterLinks.tooltip.hide(), 350);
    },
    clearHide() {
      window.clearTimeout(hideTimer);
    },
    schedule(rect, kind, rectSource, groups) {
      ensureUi();
      this.cancelSchedule();
      this.hide();
      if (!groups.some((group) => group.actions && group.actions.length)) return;
      const reveal = () => {
        showTimer = 0;
        pending = "";
        const live = typeof rectSource === "function" ? rectSource() || rect : rect;
        if (!live) return;
        renderTipButtons(groups);
        if (!tip.childElementCount) return;
        tip.dataset.kind = kind;
        tip.hidden = false;
        placeNear(live);
      };
      const delay = tooltipDelayMs();
      if (delay === 0) reveal();
      else {
        pending = kind;
        showTimer = window.setTimeout(reveal, delay);
      }
    },
    showCopied(rect) {
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
    },
    currentRect() {
      if (tip && !tip.hidden) {
        return {
          left: parseFloat(tip.style.left) || 8,
          top: parseFloat(tip.style.top) || 8,
          width: tip.offsetWidth,
          height: 0,
        };
      }
      return { left: 16, top: 16, width: 0, height: 0 };
    },
  };
})(globalThis);
