(function (root) {
  const BetterLinks = root.BetterLinks || (root.BetterLinks = {});

  BetterLinks.resolveHit = function resolveHit(event, fixLinks, isOwnUi) {
    const videoEl = BetterLinks.videoFromEvent(event, isOwnUi);
    const imageEl = BetterLinks.imageFromEvent(event, isOwnUi);
    const anchorEl = BetterLinks.anchorFromEvent(event, isOwnUi);
    const videoSrc = videoEl ? BetterLinks.videoUrl(videoEl) || "" : "";
    const imageSrc = imageEl ? BetterLinks.imageUrl(imageEl) || "" : "";
    const link = anchorEl ? BetterLinks.anchorUrl(anchorEl, fixLinks) || "" : "";
    return {
      video: videoEl
        ? { element: videoEl, url: videoSrc, anchor: BetterLinks.videoAnchor(videoEl) }
        : null,
      image: imageEl
        ? { element: imageEl, url: imageSrc, anchor: BetterLinks.imageAnchor(imageEl) }
        : null,
      anchor: anchorEl ? { element: anchorEl, url: link } : null,
    };
  };
})(globalThis);
