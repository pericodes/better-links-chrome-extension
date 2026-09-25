(function (root) {
  const BetterLinks = root.BetterLinks || (root.BetterLinks = {});

  function eventElement(event) {
    const node = event.target;
    if (!node) return null;
    return node.nodeType === 1 ? node : node.parentElement;
  }

  BetterLinks.imageFromEvent = function imageFromEvent(event, isOwnUi) {
    if (typeof isOwnUi === "function" && isOwnUi(event)) return null;
    const node = eventElement(event);
    if (!node || !node.closest) return null;
    return node.closest("img");
  };

  BetterLinks.imageUrl = function imageUrl(image) {
    if (!image) return null;
    const src = image.currentSrc || image.src;
    if (!src) return null;
    try {
      const url = new URL(src, location.href).href;
      return BetterLinks.isHttpUrl(url) ? url : null;
    } catch {
      return null;
    }
  };

  BetterLinks.imageAnchor = function imageAnchor(image) {
    if (!image || !image.closest) return null;
    return image.closest("a[href]");
  };
})(globalThis);
