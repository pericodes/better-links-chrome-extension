(function (root) {
  const BetterLinks = root.BetterLinks || (root.BetterLinks = {});

  BetterLinks.DEFAULTS = {
    showTooltip: true,
    tooltipOnLinks: true,
    tooltipActions: ["newWindow", "newTab", "newTabAndSwitch", "copy"],
    tooltipDelay: 500,
    tooltipDelayInMs: true,
    click1: "newWindow",
    click2: "newTab",
    click3: "copy",
    anchorMode: "clicks",
    anchorClick2: "newTab",
    anchorClick3: "copy",
    showImageTooltip: true,
    imageClick1: "none",
    imageClick2: "newTabAndSwitch",
    imageClick3: "copyImage",
    imageTooltipActions: ["newWindow", "newTab", "newTabAndSwitch", "copyImageLink", "copyImage", "saveImage"],
    fixLinks: true,
    language: "auto",
  };

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

    const renameAction = (action) => (action === "newTabAndOpen" ? "newTabAndSwitch" : action);
    settings.click1 = renameAction(settings.click1);
    settings.click2 = renameAction(settings.click2);
    settings.click3 = renameAction(settings.click3);
    settings.anchorClick2 = renameAction(settings.anchorClick2);
    settings.anchorClick3 = renameAction(settings.anchorClick3);

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

    const rawActions = (Array.isArray(source.tooltipActions) ? source.tooltipActions : defaults.tooltipActions).map(
      renameAction
    );
    settings.tooltipActions = BetterLinks.TOOLTIP_ACTIONS.filter((action) => rawActions.includes(action));

    if (!BetterLinks.IMAGE_CLICK_ACTIONS.includes(settings.imageClick1)) settings.imageClick1 = defaults.imageClick1;
    if (!BetterLinks.IMAGE_CLICK_ACTIONS.includes(settings.imageClick2)) settings.imageClick2 = defaults.imageClick2;
    if (!BetterLinks.IMAGE_CLICK_ACTIONS.includes(settings.imageClick3)) settings.imageClick3 = defaults.imageClick3;
    const rawImageActions = Array.isArray(source.imageTooltipActions)
      ? source.imageTooltipActions
      : defaults.imageTooltipActions;
    settings.imageTooltipActions = BetterLinks.IMAGE_ACTIONS.filter((action) => rawImageActions.includes(action));
    settings.showImageTooltip = Boolean(settings.showImageTooltip);

    settings.showTooltip = Boolean(settings.showTooltip);
    settings.tooltipOnLinks = hasTooltipOnLinks ? Boolean(source.tooltipOnLinks) : !legacyHidden;
    delete settings.showAnchorTooltip;
    const hasDelay = Object.prototype.hasOwnProperty.call(source, "tooltipDelay");
    if (!hasDelay) settings.tooltipDelay = defaults.tooltipDelay;
    else {
      const delay = Number(source.tooltipDelay);
      const delayInMs = Boolean(source.tooltipDelayInMs);
      if (!Number.isFinite(delay) || delay < 0) settings.tooltipDelay = defaults.tooltipDelay;
      else if (delay === 0) settings.tooltipDelay = 0;
      else settings.tooltipDelay = Math.round(delayInMs ? delay : delay * 1000);
    }
    settings.tooltipDelayInMs = true;
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
