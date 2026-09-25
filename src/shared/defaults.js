(function (root) {
  const BetterLinks = root.BetterLinks || (root.BetterLinks = {});

  BetterLinks.DEFAULTS = {
    showTooltip: true,
    tooltipOnLinks: true,
    tooltipDelay: 0,
    click1: "newWindow",
    click2: "newTab",
    click3: "copy",
    anchorMode: "clicks",
    anchorClick2: "newTab",
    anchorClick3: "copy",
    fixLinks: true,
    language: "auto",
  };

  BetterLinks.TEXT_ACTIONS = ["newWindow", "newTab", "copy", "none"];
  BetterLinks.ANCHOR_ACTIONS = ["newWindow", "newTab", "copy"];
  BetterLinks.ANCHOR_MODES = ["ignore", "clicks"];
  BetterLinks.LANGUAGES = ["auto", "es", "en"];

  BetterLinks.normalizeSettings = function normalizeSettings(raw) {
    const defaults = BetterLinks.DEFAULTS;
    const source = raw && typeof raw === "object" ? raw : {};
    const settings = Object.assign({}, defaults, source);
    const rawMode = source.anchorMode;
    const hasTooltipOnLinks = Object.prototype.hasOwnProperty.call(source, "tooltipOnLinks");
    const legacyHidden =
      !hasTooltipOnLinks &&
      !Object.prototype.hasOwnProperty.call(source, "showAnchorTooltip") &&
      (rawMode === "clicks" || rawMode === "ignore");

    if (settings.anchorMode === "both") settings.anchorMode = "clicks";
    if (settings.anchorMode === "tooltip") settings.anchorMode = "ignore";

    if (!BetterLinks.TEXT_ACTIONS.includes(settings.click1)) settings.click1 = defaults.click1;
    if (!BetterLinks.TEXT_ACTIONS.includes(settings.click2)) settings.click2 = defaults.click2;
    if (!BetterLinks.TEXT_ACTIONS.includes(settings.click3)) settings.click3 = defaults.click3;
    if (!BetterLinks.ANCHOR_ACTIONS.includes(settings.anchorClick2)) {
      settings.anchorClick2 = defaults.anchorClick2;
    }
    if (!BetterLinks.ANCHOR_ACTIONS.includes(settings.anchorClick3)) {
      settings.anchorClick3 = defaults.anchorClick3;
    }
    if (!BetterLinks.ANCHOR_MODES.includes(settings.anchorMode)) {
      settings.anchorMode = defaults.anchorMode;
    }
    if (!BetterLinks.LANGUAGES.includes(settings.language)) settings.language = defaults.language;

    settings.showTooltip = Boolean(settings.showTooltip);
    settings.tooltipOnLinks = hasTooltipOnLinks ? Boolean(source.tooltipOnLinks) : !legacyHidden;
    delete settings.showAnchorTooltip;
    const delay = Number(settings.tooltipDelay);
    settings.tooltipDelay = Number.isFinite(delay) && delay > 0 ? delay : 0;
    settings.fixLinks = Boolean(settings.fixLinks);
    return settings;
  };

  BetterLinks.anchorModeShowsTooltip = function anchorModeShowsTooltip(mode) {
    return mode === "tooltip" || mode === "both";
  };

  BetterLinks.anchorModeAppliesClicks = function anchorModeAppliesClicks(mode) {
    return mode === "clicks" || mode === "both";
  };
})(globalThis);
