(function (root) {
  const BetterLinks = root.BetterLinks || (root.BetterLinks = {});

  function elementFrom(node) {
    if (!node) return null;
    return node.nodeType === 1 ? node : node.parentElement;
  }

  function videoInPath(event) {
    const path = event.composedPath ? event.composedPath() : [];
    for (const node of path) {
      if (node && node.nodeType === 1 && node.tagName === "VIDEO") return node;
    }
    const el = elementFrom(event.target);
    if (!el || !el.closest) return null;
    return el.closest("video");
  }

  function httpUrl(value) {
    if (!value) return "";
    try {
      const url = new URL(value, location.href).href;
      return BetterLinks.isHttpUrl(url) ? url : "";
    } catch {
      return "";
    }
  }

  BetterLinks.videoFromEvent = function videoFromEvent(event, isOwnUi) {
    if (typeof isOwnUi === "function" && isOwnUi(event)) return null;
    return videoInPath(event);
  };

  BetterLinks.videoMediaUrl = function videoMediaUrl(video) {
    if (!video) return "";
    const current = httpUrl(video.currentSrc);
    if (current) return current;
    const attr = video.getAttribute ? video.getAttribute("src") : "";
    const fromAttr = httpUrl(attr);
    if (fromAttr) return fromAttr;
    const fromSrc = httpUrl(video.src);
    if (fromSrc) return fromSrc;
    const sources = video.querySelectorAll ? video.querySelectorAll("source") : [];
    for (const source of sources) {
      const url = httpUrl(source.getAttribute("src") || source.src);
      if (url) return url;
    }
    return "";
  };

  BetterLinks.videoUrl = function videoUrl(video) {
    const media = BetterLinks.videoMediaUrl(video);
    if (media) return media;
    return BetterLinks.canonicalPlayerUrl(location.href) || "";
  };

  BetterLinks.videoAnchor = function videoAnchor(video) {
    if (!video || !video.closest) return null;
    return video.closest("a[href]");
  };
})(globalThis);
