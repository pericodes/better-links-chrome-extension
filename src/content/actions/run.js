(function (root) {
  const BetterLinks = root.BetterLinks || (root.BetterLinks = {});

  BetterLinks.runAction = function runAction(id, url) {
    if (!id || id === "none") return;
    const spec = BetterLinks.ACTIONS[id];
    if (!spec) return;
    if (spec.kind === "openAll" || spec.kind === "copyLinks") {
      BetterLinks.runLinkAction(id, url);
      return;
    }
    if (!url || Array.isArray(url)) return;
    if (spec.kind === "copyImage" || spec.kind === "saveImage") BetterLinks.runImageAction(id, url);
    else BetterLinks.runLinkAction(id, url);
  };
})(globalThis);
