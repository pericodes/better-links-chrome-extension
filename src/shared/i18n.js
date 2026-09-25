(function (root) {
  const BetterLinks = root.BetterLinks || (root.BetterLinks = {});

  BetterLinks.MESSAGES = {
    es: {
      "tooltip.newWindow": "Abrir en una nueva ventana",
      "tooltip.newTab": "Abrir en una nueva pestaña",
      "tooltip.newTabAndOpen": "Abrir en una nueva pestaña y abrir",
      "tooltip.copy": "Copiar",
      copied: "Copiado",
      "options.title": "Better Links",
      "options.sectionText": "Texto seleccionado",
      "options.showTooltip": "Mostrar tooltip",
      "options.showAnchorTooltip": "Mostrar tooltip",
      "options.sectionTooltip": "Tooltip",
      "options.tooltipActions": "Acciones del tooltip",
      "options.tooltipDelay": "Tiempo mínimo para mostrarlo (ms)",
      "options.tooltipDelayHelp": "0 = inmediato.",
      "options.click1": "1 clic",
      "options.click2": "2 clics",
      "options.click3": "3 clics",
      "options.sectionAnchor": "Enlaces <a>",
      "options.anchorMode": "Cómo actuar",
      "options.mode.ignore": "Ignorar",
      "options.mode.tooltip": "Mostrar tooltip",
      "options.mode.clicks": "Aplicar clics",
      "options.mode.both": "Mostrar tooltip y aplicar clics",
      "options.anchorClick2": "2 clics",
      "options.anchorClick3": "3 clics",
      "options.sectionGeneral": "General",
      "options.fixLinks": "Intentar corregir enlaces",
      "options.fixLinksHelp": "Por ejemplo https//sdf o http:/fds pasan a https://sdf y http://fds.",
      "options.language": "Idioma",
      "options.language.auto": "Automático",
      "options.language.es": "Español",
      "options.language.en": "English",
      "options.action.newWindow": "Ventana nueva",
      "options.action.newTab": "Pestaña nueva",
      "options.action.newTabAndOpen": "Abrir en una nueva pestaña y abrir",
      "options.action.copy": "Copiar",
      "options.action.none": "Ninguna",
      "options.save": "Guardar",
      "options.saved": "Guardado",
    },
    en: {
      "tooltip.newWindow": "Open in a new window",
      "tooltip.newTab": "Open in a new tab",
      "tooltip.newTabAndOpen": "Open in a new tab and open",
      "tooltip.copy": "Copy",
      copied: "Copied",
      "options.title": "Better Links",
      "options.sectionText": "Selected text",
      "options.showTooltip": "Show tooltip",
      "options.showAnchorTooltip": "Show tooltip",
      "options.sectionTooltip": "Tooltip",
      "options.tooltipActions": "Tooltip actions",
      "options.tooltipDelay": "Minimum time before it appears (ms)",
      "options.tooltipDelayHelp": "0 = immediate.",
      "options.click1": "1 click",
      "options.click2": "2 clicks",
      "options.click3": "3 clicks",
      "options.sectionAnchor": "Anchor links <a>",
      "options.anchorMode": "How to handle them",
      "options.mode.ignore": "Ignore",
      "options.mode.tooltip": "Show tooltip",
      "options.mode.clicks": "Apply clicks",
      "options.mode.both": "Show tooltip and apply clicks",
      "options.anchorClick2": "2 clicks",
      "options.anchorClick3": "3 clicks",
      "options.sectionGeneral": "General",
      "options.fixLinks": "Try to fix links",
      "options.fixLinksHelp": "For example https//sdf or http:/fds become https://sdf and http://fds.",
      "options.language": "Language",
      "options.language.auto": "Automatic",
      "options.language.es": "Español",
      "options.language.en": "English",
      "options.action.newWindow": "New window",
      "options.action.newTab": "New tab",
      "options.action.newTabAndOpen": "Open in a new tab and open",
      "options.action.copy": "Copy",
      "options.action.none": "None",
      "options.save": "Save",
      "options.saved": "Saved",
    },
  };

  BetterLinks.resolveLanguage = function resolveLanguage(setting) {
    if (setting === "es" || setting === "en") return setting;
    let ui = "en";
    try {
      if (typeof chrome !== "undefined" && chrome.i18n && chrome.i18n.getUILanguage) {
        ui = chrome.i18n.getUILanguage() || ui;
      } else if (typeof navigator !== "undefined" && navigator.language) {
        ui = navigator.language;
      }
    } catch {
      ui = "en";
    }
    return String(ui).toLowerCase().startsWith("es") ? "es" : "en";
  };

  BetterLinks.t = function t(lang, key) {
    const pack = BetterLinks.MESSAGES[lang] || BetterLinks.MESSAGES.en;
    if (pack[key]) return pack[key];
    return BetterLinks.MESSAGES.en[key] || key;
  };
})(globalThis);
