(function (root) {
  const BetterLinks = root.BetterLinks || (root.BetterLinks = {});
  const CLICK_WINDOW_MS = 450;

  let getSettings = function () { return BetterLinks.normalizeSettings(BetterLinks.DEFAULTS); };
  let hoverAnchor = null;
  let hoverImage = null;
  let ignoreNextMouseUp = false;

  const selectionState = { armed: false, url: "", count: 0, timer: 0, fieldOnly: false };
  const anchorState = { anchor: null, url: "", count: 0, downs: 0, timer: 0 };
  const imageState = { image: null, url: "", anchor: null, count: 0, downs: 0, timer: 0 };

  const tip = () => BetterLinks.tooltip;

  function modifiers(event) {
    return event.ctrlKey || event.metaKey || event.shiftKey || event.altKey;
  }

  function hit(event) {
    return BetterLinks.resolveHit(event, getSettings().fixLinks, tip().isOwnEvent);
  }

  function linkGroup(url) {
    return { actions: getSettings().tooltipActions, url: url, target: "link" };
  }

  function imageGroup(url) {
    return { actions: getSettings().imageTooltipActions, url: url, target: "image" };
  }

  function disarmSelection() {
    if (tip().pendingKind() === "selection") tip().cancelSchedule();
    selectionState.armed = false;
    selectionState.url = "";
    selectionState.count = 0;
    selectionState.fieldOnly = false;
    window.clearTimeout(selectionState.timer);
  }

  function followAnchor(anchor, url) {
    if (anchor.target === "_blank") {
      chrome.runtime.sendMessage({ type: "open", mode: "newTab", url: url });
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

  function clearImagePending(follow) {
    window.clearTimeout(imageState.timer);
    const image = imageState.image;
    const anchor = imageState.anchor;
    const count = imageState.count;
    imageState.image = null;
    imageState.url = "";
    imageState.anchor = null;
    imageState.count = 0;
    imageState.downs = 0;
    if (!follow || !image || count !== 1) return;
    const anchorUrlValue = anchor ? BetterLinks.anchorUrl(anchor, getSettings().fixLinks) : "";
    if (anchor && anchorUrlValue) followAnchor(anchor, anchorUrlValue);
  }

  function finishSelectionClicks() {
    const count = selectionState.count;
    const url = selectionState.url;
    const settings = getSettings();
    const action = count <= 1 ? settings.click1 : count === 2 ? settings.click2 : settings.click3;
    disarmSelection();
    tip().hide();
    BetterLinks.runAction(action, url);
  }

  function finishAnchorClicks() {
    const anchor = anchorState.anchor;
    const url = anchorState.url;
    const count = anchorState.count;
    anchorState.anchor = null;
    anchorState.url = "";
    anchorState.count = 0;
    anchorState.downs = 0;
    if (!anchor || !url) return;
    const settings = getSettings();
    if (count <= 1) followAnchor(anchor, url);
    else if (count === 2) BetterLinks.runAction(settings.anchorClick2, url);
    else BetterLinks.runAction(settings.anchorClick3, url);
    tip().hide();
  }

  function finishImageClicks() {
    const url = imageState.url;
    const anchor = imageState.anchor;
    const count = imageState.count;
    imageState.image = null;
    imageState.url = "";
    imageState.anchor = null;
    imageState.count = 0;
    imageState.downs = 0;
    if (!url) return;
    const settings = getSettings();
    const action = count <= 1 ? settings.imageClick1 : count === 2 ? settings.imageClick2 : settings.imageClick3;
    if ((!action || action === "none") && count <= 1 && anchor) {
      const anchorUrlValue = BetterLinks.anchorUrl(anchor, settings.fixLinks);
      if (anchorUrlValue) followAnchor(anchor, anchorUrlValue);
      tip().hide();
      return;
    }
    BetterLinks.runAction(action, url);
    tip().hide();
  }

  function armSelection(url, rect, fieldOnly) {
    clearAnchorPending(false);
    selectionState.armed = true;
    selectionState.url = url;
    selectionState.count = 0;
    selectionState.fieldOnly = fieldOnly;
    window.clearTimeout(selectionState.timer);
    if (getSettings().showTooltip) {
      tip().schedule(rect, "selection", () => (fieldOnly ? rect : BetterLinks.selectionRect()), [linkGroup(url)]);
    } else tip().hide();
  }

  function activateTooltipButton(event) {
    const button = tip().buttonFrom(event);
    if (!button) return false;
    event.preventDefault();
    event.stopPropagation();
    BetterLinks.runAction(button.dataset.action, button.dataset.url);
    disarmSelection();
    clearAnchorPending(false);
    clearImagePending(false);
    tip().hide();
    return true;
  }

  function onMouseUp(event) {
    if (event.button !== 0 || tip().isOwnEvent(event)) return;
    if (ignoreNextMouseUp) {
      ignoreNextMouseUp = false;
      return;
    }
    const found = hit(event);
    if (found.anchor || found.image) return;

    const field = BetterLinks.readFieldSelection(event.target);
    if (field) {
      const url = BetterLinks.resolveTextLink(field.text, getSettings().fixLinks);
      if (!url) {
        disarmSelection();
        if (tip().kind() === "selection") tip().hide();
        return;
      }
      armSelection(url, field.rect, true);
      return;
    }

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || BetterLinks.selectionInsideAnchor(selection)) {
      if (!selectionState.armed) return;
      disarmSelection();
      if (tip().kind() === "selection") tip().hide();
      return;
    }

    const url = BetterLinks.resolveTextLink(selection.toString(), getSettings().fixLinks);
    const rect = BetterLinks.selectionRect();
    if (!url || !rect) {
      disarmSelection();
      if (tip().kind() === "selection") tip().hide();
      return;
    }
    armSelection(url, rect, false);
  }

  function onMouseDown(event) {
    if (event.button !== 0) return;
    if (activateTooltipButton(event)) return;
    if (tip().isOwnEvent(event)) return;
    const found = hit(event);
    if (found.image && found.image.url && !modifiers(event)) {
      if (imageState.image === found.image.element && imageState.downs >= 1) {
        event.preventDefault();
        event.stopPropagation();
      }
      return;
    }
    if (found.anchor && BetterLinks.anchorModeAppliesClicks(getSettings().anchorMode)) {
      if (!found.anchor.url || modifiers(event)) return;
      if (anchorState.anchor === found.anchor.element && anchorState.downs >= 1) {
        event.preventDefault();
        event.stopPropagation();
      }
      return;
    }
    if (!selectionState.armed || selectionState.fieldOnly) return;
    if (!BetterLinks.pointInSelection(event.clientX, event.clientY)) {
      disarmSelection();
      if (tip().kind() === "selection") tip().hide();
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
    if (event.button !== 0 || tip().isOwnEvent(event)) return;
    const found = hit(event);
    if (found.image && found.image.url && !modifiers(event)) {
      event.preventDefault();
      event.stopPropagation();
      const image = found.image.element;
      const anchor = found.image.anchor;
      if (imageState.image !== image) {
        clearImagePending(true);
        imageState.image = image;
        imageState.url = found.image.url;
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
    if (!BetterLinks.anchorModeAppliesClicks(getSettings().anchorMode)) return;
    if (!found.anchor) return;
    if (!found.anchor.url || modifiers(event)) return;
    event.preventDefault();
    event.stopPropagation();
    const anchor = found.anchor.element;
    if (anchorState.anchor !== anchor) {
      clearAnchorPending(true);
      anchorState.anchor = anchor;
      anchorState.url = found.anchor.url;
      anchorState.count = 0;
      anchorState.downs = 0;
    }
    anchorState.count += 1;
    anchorState.downs += 1;
    window.clearTimeout(anchorState.timer);
    anchorState.timer = window.setTimeout(finishAnchorClicks, CLICK_WINDOW_MS);
  }

  function onMouseOver(event) {
    const settings = getSettings();
    const found = hit(event);
    if (found.image && found.image.url) {
      const groups = [];
      const parent = found.image.anchor;
      const link = parent ? BetterLinks.anchorUrl(parent, settings.fixLinks) : "";
      if (link && settings.tooltipOnLinks) groups.push(linkGroup(link));
      if (settings.showImageTooltip) groups.push(imageGroup(found.image.url));
      if (!groups.length) return;
      tip().clearHide();
      const kind = groups.length > 1 ? "both" : groups[0].target === "image" ? "image" : "anchor";
      const image = found.image.element;
      if (hoverImage === image && (tip().pendingKind() || (!tip().isHidden() && tip().kind() === kind))) return;
      hoverImage = image;
      hoverAnchor = parent;
      tip().schedule(
        image.getBoundingClientRect(),
        kind,
        () => (image.isConnected ? image.getBoundingClientRect() : null),
        groups
      );
      return;
    }
    if (!settings.tooltipOnLinks) return;
    if (!found.anchor || !found.anchor.url) return;
    tip().clearHide();
    const anchor = found.anchor.element;
    if (hoverAnchor === anchor && !hoverImage && (tip().pendingKind() || (!tip().isHidden() && tip().kind() === "anchor"))) return;
    hoverAnchor = anchor;
    hoverImage = null;
    tip().schedule(
      anchor.getBoundingClientRect(),
      "anchor",
      () => (anchor.isConnected ? anchor.getBoundingClientRect() : null),
      [linkGroup(found.anchor.url)]
    );
  }

  function onMouseOut(event) {
    const found = hit(event);
    if (found.image) {
      const image = found.image.element;
      const next = event.relatedTarget;
      if (image.matches(":hover")) return;
      if (tip().isUiNode(next)) return;
      if (next && image.contains(next)) return;
      if (hoverImage === image) hoverImage = null;
      if (tip().pendingKind() === "image" || tip().pendingKind() === "both") tip().cancelSchedule();
      const anchor = found.image.anchor;
      if (anchor && next && anchor.contains(next)) return;
      if (tip().isHidden() || (tip().kind() !== "image" && tip().kind() !== "both")) return;
      tip().scheduleHide();
      return;
    }
    if (!found.anchor) return;
    const anchor = found.anchor.element;
    const next = event.relatedTarget;
    if (anchor.matches(":hover")) return;
    if (tip().isUiNode(next)) return;
    if (next && anchor.contains(next)) return;
    if (hoverAnchor === anchor) hoverAnchor = null;
    if (tip().pendingKind() === "anchor") tip().cancelSchedule();
    if (tip().isHidden() || tip().kind() !== "anchor") return;
    tip().scheduleHide();
  }

  function onKeyDown(event) {
    if (event.key !== "Escape") return;
    disarmSelection();
    clearAnchorPending(false);
    clearImagePending(false);
    tip().hide();
  }

  function onSelectionChange() {
    if (!selectionState.armed || selectionState.fieldOnly || selectionState.count > 0) return;
    const selection = window.getSelection();
    const url = selection && !selection.isCollapsed
      ? BetterLinks.resolveTextLink(selection.toString(), getSettings().fixLinks)
      : null;
    if (url !== selectionState.url) {
      disarmSelection();
      if (tip().kind() === "selection") tip().hide();
    }
  }

  function onReposition() {
    if (tip().isHidden() || tip().kind() !== "selection" || selectionState.fieldOnly) return;
    const rect = BetterLinks.selectionRect();
    if (rect) tip().placeNear(rect);
  }

  function onSettings(next) {
    if (!next.showTooltip && tip().kind() === "selection") tip().hide();
    if (!next.tooltipOnLinks && (hoverAnchor || tip().kind() === "anchor")) {
      hoverAnchor = null;
      tip().hide();
    }
    if (!next.showImageTooltip && (hoverImage || tip().kind() === "image" || tip().kind() === "both")) {
      hoverImage = null;
      tip().hide();
    }
  }

  BetterLinks.initGestures = function initGestures(getter) {
    if (typeof getter === "function") getSettings = getter;
  };

  BetterLinks.gestures = {
    onMouseDown: onMouseDown,
    onMouseUp: onMouseUp,
    onClick: onClick,
    onMouseOver: onMouseOver,
    onMouseOut: onMouseOut,
    onKeyDown: onKeyDown,
    onSelectionChange: onSelectionChange,
    onReposition: onReposition,
    onSettings: onSettings,
  };
})(globalThis);
