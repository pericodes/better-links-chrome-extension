(function (root) {
  const BetterLinks = root.BetterLinks || (root.BetterLinks = {});
  const CLICK_WINDOW_MS = 450;

  let getSettings = function () { return BetterLinks.normalizeSettings(BetterLinks.DEFAULTS); };
  let hoverAnchor = null;
  let hoverImage = null;
  let hoverVideo = null;
  let ignoreNextMouseUp = false;

  const selectionState = { armed: false, url: "", urls: [], count: 0, timer: 0, fieldOnly: false };
  const anchorState = { anchor: null, url: "", count: 0, downs: 0, timer: 0 };
  const imageState = { image: null, url: "", anchor: null, count: 0, downs: 0, timer: 0 };
  const videoState = { video: null, url: "", anchor: null, count: 0, downs: 0, timer: 0 };

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

  function videoGroup(url) {
    return { actions: getSettings().videoTooltipActions, url: url, target: "video" };
  }

  function linksGroup(urls) {
    return { actions: getSettings().multiTooltipActions, urls: urls, target: "links" };
  }

  function sameUrls(left, right) {
    if (!left || !right || left.length !== right.length) return false;
    for (let i = 0; i < left.length; i += 1) if (left[i] !== right[i]) return false;
    return true;
  }

  function urlsFromField(text) {
    const settings = getSettings();
    if (!settings.multiLinks) {
      const url = BetterLinks.resolveTextLink(text, settings.fixLinks);
      return url ? [url] : [];
    }
    return BetterLinks.resolveTextFragments(String(text == null ? "" : text).split(/\r?\n/), settings.fixLinks);
  }

  function describeFragment(node, depth, budget) {
    if (!node || budget.left <= 0 || depth > 6) return "";
    if (node.nodeType === 3) {
      const value = JSON.stringify(String(node.textContent || "").slice(0, 120));
      budget.left -= value.length;
      return value;
    }
    if (node.nodeType === 11) {
      return Array.from(node.childNodes).map((child) => describeFragment(child, depth, budget)).join("");
    }
    if (node.nodeType !== 1) return "";
    const tag = String(node.tagName || "").toLowerCase();
    budget.left -= tag.length + 2;
    const kids = Array.from(node.childNodes || [])
      .slice(0, 12)
      .map((child) => describeFragment(child, depth + 1, budget))
      .join("");
    return "<" + tag + ">" + kids + "</" + tag + ">";
  }

  function urlsFromSelection(selection, debug) {
    const settings = getSettings();
    const text = selection && selection.toString ? String(selection.toString() || "") : "";
    if (!selection || selection.isCollapsed || BetterLinks.selectionInsideAnchor(selection)) {
      if (debug) {
        console.group("Better Links: selección");
        console.log("descartada", {
          colapsada: !selection || selection.isCollapsed,
          dentroDeUnEnlace: Boolean(selection && BetterLinks.selectionInsideAnchor(selection)),
          texto: text,
        });
        console.groupEnd();
      }
      return [];
    }
    if (!settings.multiLinks) {
      const url = BetterLinks.resolveTextLink(text, settings.fixLinks);
      if (debug) {
        console.group("Better Links: selección");
        console.log("varios enlaces desactivado");
        console.log("texto", text);
        console.log("un enlace", url);
        console.groupEnd();
      }
      return url ? [url] : [];
    }
    let best = [];
    let bestLabel = "";
    const labels = ["estructura", "innerText", "toString"];
    const groups = BetterLinks.selectionLineGroups(selection);
    if (debug) {
      console.group("Better Links: selección");
      console.log("texto", text);
      try {
        const fragment = selection.getRangeAt(0).cloneContents();
        console.log("html clonado", describeFragment(fragment, 0, { left: 2000 }));
      } catch (error) {
        console.log("no se pudo clonar", error);
      }
    }
    groups.forEach((lines, index) => {
      const urls = BetterLinks.resolveTextFragments(lines, settings.fixLinks);
      if (debug) console.log(labels[index] || "grupo " + index, { lineas: lines, enlaces: urls });
      if (urls.length > best.length) {
        best = urls;
        bestLabel = labels[index] || "grupo " + index;
      }
    });
    if (debug) {
      console.log("elegido", bestLabel || "ninguno", best);
      console.groupEnd();
    }
    return best;
  }

  function videoKind(groups) {
    const hasVideo = groups.some((group) => group.target === "video");
    const hasLink = groups.some((group) => group.target === "link");
    if (hasVideo && hasLink) return "video+anchor";
    if (hasVideo) return "video";
    return "anchor";
  }

  function isVideoTip(kind) {
    return kind === "video" || kind === "video+anchor";
  }

  function disarmSelection() {
    if (tip().pendingKind() === "selection") tip().cancelSchedule();
    selectionState.armed = false;
    selectionState.url = "";
    selectionState.urls = [];
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
    const urls = selectionState.urls.slice();
    const settings = getSettings();
    const multi = urls.length > 1;
    const action = multi
      ? count <= 1 ? settings.multiClick1 : count === 2 ? settings.multiClick2 : settings.multiClick3
      : count <= 1 ? settings.click1 : count === 2 ? settings.click2 : settings.click3;
    if (multi && (!action || action === "none")) {
      selectionState.count = 0;
      return;
    }
    disarmSelection();
    tip().hide();
    BetterLinks.runAction(action, multi ? urls : urls[0]);
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

  function clearVideoPending() {
    window.clearTimeout(videoState.timer);
    videoState.video = null;
    videoState.url = "";
    videoState.anchor = null;
    videoState.count = 0;
    videoState.downs = 0;
  }

  function finishVideoClicks() {
    const url = videoState.url;
    const count = videoState.count;
    videoState.video = null;
    videoState.url = "";
    videoState.anchor = null;
    videoState.count = 0;
    videoState.downs = 0;
    if (!url) return;
    const settings = getSettings();
    const action = count <= 1 ? settings.videoClick1 : count === 2 ? settings.videoClick2 : settings.videoClick3;
    BetterLinks.runAction(action, url);
    tip().hide();
  }

  function armSelection(urls, rect, fieldOnly) {
    clearAnchorPending(false);
    selectionState.armed = true;
    selectionState.urls = urls;
    selectionState.url = urls.length === 1 ? urls[0] : "";
    selectionState.count = 0;
    selectionState.fieldOnly = fieldOnly;
    window.clearTimeout(selectionState.timer);
    if (getSettings().showTooltip) {
      const group = urls.length > 1 ? linksGroup(urls) : linkGroup(urls[0]);
      tip().schedule(rect, "selection", () => (fieldOnly ? rect : BetterLinks.selectionRect()), [group]);
    } else tip().hide();
  }

  function activateTooltipButton(event) {
    const button = tip().buttonFrom(event);
    if (!button) return false;
    event.preventDefault();
    event.stopPropagation();
    const spec = BetterLinks.ACTIONS[button.dataset.action];
    let target = button.dataset.url;
    if (spec && (spec.kind === "openAll" || spec.kind === "copyLinks")) {
      try {
        target = JSON.parse(button.dataset.url);
      } catch {
        return true;
      }
    }
    BetterLinks.runAction(button.dataset.action, target);
    disarmSelection();
    clearAnchorPending(false);
    clearImagePending(false);
    clearVideoPending();
    tip().hide();
    return true;
  }

  function onMouseUp(event) {
    if (event.button !== 0 || tip().isOwnEvent(event)) return;
    if (ignoreNextMouseUp) {
      ignoreNextMouseUp = false;
      return;
    }
    const field = BetterLinks.readFieldSelection(event.target);
    if (field) {
      const urls = urlsFromField(field.text);
      console.group("Better Links: campo de texto");
      console.log("texto", field.text);
      console.log("enlaces", urls);
      console.groupEnd();
      if (!urls.length) {
        disarmSelection();
        if (tip().kind() === "selection") tip().hide();
        return;
      }
      armSelection(urls, field.rect, true);
      return;
    }

    const selection = window.getSelection();
    const textSelection = selection && !selection.isCollapsed && !BetterLinks.selectionInsideAnchor(selection);
    if (!textSelection) {
      const found = hit(event);
      if (found.anchor || found.image || found.video) {
        console.log("Better Links: mouseup sobre un enlace, imagen o vídeo; la selección no se trata como texto", {
          colapsada: !selection || selection.isCollapsed,
          dentroDeUnEnlace: Boolean(selection && BetterLinks.selectionInsideAnchor(selection)),
          texto: selection ? selection.toString() : "",
        });
        return;
      }
      if (!selectionState.armed) return;
      disarmSelection();
      if (tip().kind() === "selection") tip().hide();
      return;
    }

    const urls = urlsFromSelection(selection, true);
    const rect = BetterLinks.selectionRect();
    if (!rect) console.log("Better Links: la selección no tiene rectángulo visible");
    if (!urls.length || !rect) {
      disarmSelection();
      if (tip().kind() === "selection") tip().hide();
      return;
    }
    armSelection(urls, rect, false);
  }

  function onMouseDown(event) {
    if (event.button !== 0) return;
    if (activateTooltipButton(event)) return;
    if (tip().isOwnEvent(event)) return;
    const found = hit(event);
    if (found.video && found.video.url && !modifiers(event)) {
      const stealFirst = getSettings().videoClick1 && getSettings().videoClick1 !== "none";
      const same = videoState.video === found.video.element;
      if (stealFirst || (same && videoState.downs >= 1)) {
        event.preventDefault();
        event.stopPropagation();
      }
      return;
    }
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
    if (found.video && found.video.url && !modifiers(event)) {
      const video = found.video.element;
      if (videoState.video !== video) {
        clearVideoPending();
        videoState.video = video;
        videoState.url = found.video.url;
        videoState.anchor = found.video.anchor;
        videoState.count = 0;
        videoState.downs = 0;
      }
      videoState.count += 1;
      videoState.downs += 1;
      const steal = videoState.count >= 2 || (getSettings().videoClick1 && getSettings().videoClick1 !== "none");
      if (steal) {
        event.preventDefault();
        event.stopPropagation();
      }
      window.clearTimeout(videoState.timer);
      videoState.timer = window.setTimeout(finishVideoClicks, CLICK_WINDOW_MS);
      return;
    }
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
    if (found.video && found.video.url) {
      const groups = [];
      const parent = found.video.anchor;
      const link = parent ? BetterLinks.anchorUrl(parent, settings.fixLinks) : "";
      if (link && settings.tooltipOnLinks) groups.push(linkGroup(link));
      if (settings.showVideoTooltip) groups.push(videoGroup(found.video.url));
      if (!groups.length) return;
      tip().clearHide();
      const kind = videoKind(groups);
      const video = found.video.element;
      if (hoverVideo === video && (tip().pendingKind() || (!tip().isHidden() && tip().kind() === kind))) return;
      hoverVideo = video;
      hoverImage = null;
      hoverAnchor = parent;
      tip().schedule(
        video.getBoundingClientRect(),
        kind,
        () => (video.isConnected ? video.getBoundingClientRect() : null),
        groups
      );
      return;
    }
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
      hoverVideo = null;
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
    if (hoverAnchor === anchor && !hoverImage && !hoverVideo && (tip().pendingKind() || (!tip().isHidden() && tip().kind() === "anchor"))) return;
    hoverAnchor = anchor;
    hoverImage = null;
    hoverVideo = null;
    tip().schedule(
      anchor.getBoundingClientRect(),
      "anchor",
      () => (anchor.isConnected ? anchor.getBoundingClientRect() : null),
      [linkGroup(found.anchor.url)]
    );
  }

  function onMouseOut(event) {
    const found = hit(event);
    if (found.video) {
      const video = found.video.element;
      const next = event.relatedTarget;
      if (video.matches(":hover")) return;
      if (tip().isUiNode(next)) return;
      if (next && video.contains(next)) return;
      if (hoverVideo === video) hoverVideo = null;
      if (isVideoTip(tip().pendingKind())) tip().cancelSchedule();
      const anchor = found.video.anchor;
      if (anchor && next && anchor.contains(next)) return;
      if (tip().isHidden() || !isVideoTip(tip().kind())) return;
      tip().scheduleHide();
      return;
    }
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
    clearVideoPending();
    tip().hide();
  }

  function onSelectionChange() {
    if (!selectionState.armed || selectionState.fieldOnly || selectionState.count > 0) return;
    const selection = window.getSelection();
    const urls = selection && !selection.isCollapsed ? urlsFromSelection(selection) : [];
    if (!sameUrls(urls, selectionState.urls)) {
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
    if (!next.multiLinks && selectionState.urls.length > 1) {
      disarmSelection();
      if (tip().kind() === "selection") tip().hide();
    }
    if (!next.tooltipOnLinks && (hoverAnchor || tip().kind() === "anchor")) {
      hoverAnchor = null;
      tip().hide();
    }
    if (!next.showImageTooltip && (hoverImage || tip().kind() === "image" || tip().kind() === "both")) {
      hoverImage = null;
      tip().hide();
    }
    if (!next.showVideoTooltip && (hoverVideo || isVideoTip(tip().kind()))) {
      hoverVideo = null;
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
