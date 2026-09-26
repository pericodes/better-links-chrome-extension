(function (root) {
  const BetterLinks = root.BetterLinks || (root.BetterLinks = {});

  const linkOptions = {
    newWindow: "options.action.newWindow",
    newTab: "options.action.newTab",
    newTabAndSwitch: "options.action.newTabAndSwitch",
    copy: "options.action.copy",
  };

  BetterLinks.ACTIONS = {
    newWindow: {
      kind: "open",
      mode: "newWindow",
      surfaces: {
        textClick: linkOptions.newWindow,
        anchorClick: linkOptions.newWindow,
        tooltip: "tooltip.newWindow",
        imageClick: "image.action.newWindow",
        imageTooltip: "image.tooltip.newWindow",
        videoClick: "video.action.newWindow",
        videoTooltip: "video.tooltip.newWindow",
        menu: "tooltip.newWindow",
      },
    },
    newTab: {
      kind: "open",
      mode: "newTab",
      active: false,
      surfaces: {
        textClick: linkOptions.newTab,
        anchorClick: linkOptions.newTab,
        tooltip: "tooltip.newTab",
        imageClick: "image.action.newTab",
        imageTooltip: "image.tooltip.newTab",
        videoClick: "video.action.newTab",
        videoTooltip: "video.tooltip.newTab",
        menu: "tooltip.newTab",
      },
    },
    newTabAndSwitch: {
      kind: "open",
      mode: "newTab",
      active: true,
      surfaces: {
        textClick: linkOptions.newTabAndSwitch,
        anchorClick: linkOptions.newTabAndSwitch,
        tooltip: "tooltip.newTabAndSwitch",
        imageClick: "image.action.newTabAndSwitch",
        imageTooltip: "image.tooltip.newTabAndSwitch",
        videoClick: "video.action.newTabAndSwitch",
        videoTooltip: "video.tooltip.newTabAndSwitch",
        menu: "tooltip.newTabAndSwitch",
      },
    },
    copy: {
      kind: "copyLink",
      surfaces: {
        textClick: linkOptions.copy,
        anchorClick: linkOptions.copy,
        tooltip: "tooltip.copy",
        videoClick: "video.action.copy",
        videoTooltip: "video.tooltip.copy",
      },
    },
    copyImageLink: {
      kind: "copyLink",
      surfaces: {
        imageClick: "image.action.copyImageLink",
        imageTooltip: "image.tooltip.copyImageLink",
      },
    },
    copyImage: {
      kind: "copyImage",
      surfaces: {
        imageClick: "image.action.copyImage",
        imageTooltip: "image.tooltip.copyImage",
      },
    },
    saveImage: {
      kind: "saveImage",
      surfaces: {
        imageClick: "image.action.saveImage",
        imageTooltip: "image.tooltip.saveImage",
      },
    },
    openAllNewWindow: {
      kind: "openAll",
      mode: "newWindow",
      surfaces: {
        multiClick: "options.action.openAllNewWindow",
        multiTooltip: "tooltip.openAllNewWindow",
      },
    },
    openAllCurrentWindow: {
      kind: "openAll",
      mode: "currentWindow",
      surfaces: {
        multiClick: "options.action.openAllCurrentWindow",
        multiTooltip: "tooltip.openAllCurrentWindow",
      },
    },
    copyLinks: {
      kind: "copyLinks",
      surfaces: {
        multiClick: "options.action.copyLinks",
        multiTooltip: "tooltip.copyLinks",
      },
    },
  };

  BetterLinks.actionsFor = function actionsFor(surface) {
    return Object.keys(BetterLinks.ACTIONS).filter((id) => BetterLinks.ACTIONS[id].surfaces[surface]);
  };

  BetterLinks.actionChoices = function actionChoices(surface) {
    return BetterLinks.actionsFor(surface).map((id) => [id, BetterLinks.ACTIONS[id].surfaces[surface]]);
  };

  BetterLinks.TEXT_ACTIONS = BetterLinks.actionsFor("textClick").concat("none");
  BetterLinks.ANCHOR_ACTIONS = BetterLinks.actionsFor("anchorClick");
  BetterLinks.TOOLTIP_ACTIONS = BetterLinks.actionsFor("tooltip");
  BetterLinks.IMAGE_ACTIONS = BetterLinks.actionsFor("imageTooltip");
  BetterLinks.IMAGE_CLICK_ACTIONS = BetterLinks.actionsFor("imageClick").concat("none");
  BetterLinks.VIDEO_ACTIONS = BetterLinks.actionsFor("videoTooltip");
  BetterLinks.VIDEO_CLICK_ACTIONS = BetterLinks.actionsFor("videoClick").concat("none");
  BetterLinks.MULTI_ACTIONS = BetterLinks.actionsFor("multiTooltip");
  BetterLinks.MULTI_CLICK_ACTIONS = BetterLinks.actionsFor("multiClick").concat("none");
})(globalThis);
