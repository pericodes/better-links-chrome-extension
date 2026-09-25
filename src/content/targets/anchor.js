(function (root) {
  const BetterLinks = root.BetterLinks || (root.BetterLinks = {});

  function eventElement(event) {
    const node = event.target;
    if (!node) return null;
    return node.nodeType === 1 ? node : node.parentElement;
  }

  BetterLinks.anchorFromEvent = function anchorFromEvent(event, isOwnUi) {
    if (typeof isOwnUi === "function" && isOwnUi(event)) return null;
    const node = eventElement(event);
    if (!node || !node.closest) return null;
    return node.closest("a[href]");
  };

  BetterLinks.anchorUrl = function anchorUrl(anchor, fixLinks) {
    if (!anchor) return null;
    return BetterLinks.resolveAnchorUrl(anchor.getAttribute("href"), anchor.href, fixLinks);
  };
})(globalThis);
