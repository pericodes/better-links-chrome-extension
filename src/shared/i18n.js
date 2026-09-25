(function (root) {
  const BetterLinks = root.BetterLinks || (root.BetterLinks = {});

  BetterLinks.MESSAGES = {
    es: {
      "tooltip.newWindow": "Abrir en una nueva ventana",
      "tooltip.newTab": "Abrir en una nueva pestaña",
      "tooltip.newTabAndSwitch": "Abrir en una nueva pestaña y cambiar",
      "tooltip.copy": "Copiar",
      "context.searchGoogle": "Buscar en Google",
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
      "options.sectionImage": "Imágenes",
      "options.showImageTooltip": "Mostrar tooltip",
      "options.imageTooltipActions": "Acciones del tooltip",
      "image.action.newWindow": "Abrir en una nueva ventana",
      "image.action.newTab": "Abrir en una nueva pestaña",
      "image.action.newTabAndSwitch": "Abrir en una nueva pestaña y cambiar",
      "image.action.copyImageLink": "Copiar link de la imagen",
      "image.action.copyImage": "Copiar imagen",
      "image.action.saveImage": "Guardar imagen como",
      "image.tooltip.newWindow": "Abrir imagen en una nueva ventana",
      "image.tooltip.newTab": "Abrir imagen en una nueva pestaña",
      "image.tooltip.newTabAndSwitch": "Abrir imagen en una nueva pestaña y cambiar",
      "image.tooltip.copyImageLink": "Copiar link de la imagen",
      "image.tooltip.copyImage": "Copiar imagen",
      "image.tooltip.saveImage": "Guardar imagen como",
      "options.sectionGeneral": "General",
      "options.fixLinks": "Intentar corregir enlaces",
      "options.fixLinksHelp": "Por ejemplo https//sdf o http:/fds pasan a https://sdf y http://fds.",
      "options.language": "Idioma",
      "options.language.auto": "Automático",
      "options.language.es": "Español",
      "options.language.en": "English",
      "options.action.newWindow": "Ventana nueva",
      "options.action.newTab": "Abrir en una nueva pestaña",
      "options.action.newTabAndSwitch": "Abrir en una nueva pestaña y cambiar",
      "options.action.copy": "Copiar",
      "options.action.none": "Ninguna",
      "options.save": "Guardar",
      "options.saved": "Guardado",
    },
    en: {
      "tooltip.newWindow": "Open in a new window",
      "tooltip.newTab": "Open in a new tab",
      "tooltip.newTabAndSwitch": "Open in a new tab and switch",
      "tooltip.copy": "Copy",
      "context.searchGoogle": "Search on Google",
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
      "options.sectionImage": "Images",
      "options.showImageTooltip": "Show tooltip",
      "options.imageTooltipActions": "Tooltip actions",
      "image.action.newWindow": "Open in a new window",
      "image.action.newTab": "Open in a new tab",
      "image.action.newTabAndSwitch": "Open in a new tab and switch",
      "image.action.copyImageLink": "Copy image link",
      "image.action.copyImage": "Copy image",
      "image.action.saveImage": "Save image as",
      "image.tooltip.newWindow": "Open image in a new window",
      "image.tooltip.newTab": "Open image in a new tab",
      "image.tooltip.newTabAndSwitch": "Open image in a new tab and switch",
      "image.tooltip.copyImageLink": "Copy image link",
      "image.tooltip.copyImage": "Copy image",
      "image.tooltip.saveImage": "Save image as",
      "options.sectionGeneral": "General",
      "options.fixLinks": "Try to fix links",
      "options.fixLinksHelp": "For example https//sdf or http:/fds become https://sdf and http://fds.",
      "options.language": "Language",
      "options.language.auto": "Automatic",
      "options.language.es": "Español",
      "options.language.en": "English",
      "options.action.newWindow": "New window",
      "options.action.newTab": "Open in a new tab",
      "options.action.newTabAndSwitch": "Open in a new tab and switch",
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
