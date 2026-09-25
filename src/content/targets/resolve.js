(function (root) {
  const BetterLinks = root.BetterLinks || (root.BetterLinks = {});

  BetterLinks.resolveHit = function resolveHit(event, fixLinks, isOwnUi) {
    const imageEl = BetterLinks.imageFromEvent(event, isOwnUi);
    const anchorEl = BetterLinks.anchorFromEvent(event, isOwnUi);
    const imageSrc = imageEl ? BetterLinks.imageUrl(imageEl) || "" : "";
    const link = anchorEl ? BetterLinks.anchorUrl(anchorEl, fixLinks) || "" : "";
    return {
      image: imageEl
        ? { element: imageEl, url: imageSrc, anchor: BetterLinks.imageAnchor(imageEl) }
        : null,
      anchor: anchorEl ? { element: anchorEl, url: link } : null,
    };
  };
})(globalThis);
