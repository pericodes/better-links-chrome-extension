(function () {
  const BL = globalThis.BetterLinks;
  const $ = (id) => document.getElementById(id);

  function choices(surface, withNone) {
    const list = BL.actionChoices(surface);
    return withNone ? list.concat([["none", "options.action.none"]]) : list;
  }
  const modes = [
    ["ignore", "options.mode.ignore"],
    ["clicks", "options.mode.clicks"],
  ];
  const languages = [
    ["auto", "options.language.auto"],
    ["es", "options.language.es"],
    ["en", "options.language.en"],
  ];

  let settings = BL.normalizeSettings(BL.DEFAULTS);

  function fillSelect(select, options, lang) {
    const current = select.value;
    select.replaceChildren();
    for (const [value, key] of options) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = BL.t(lang, key);
      select.appendChild(option);
    }
    if ([...select.options].some((option) => option.value === current)) select.value = current;
  }

  function selectedChecks(id) {
    return [...$(id).querySelectorAll("input:checked")].map((input) => input.value);
  }

  function fillChecks(id, options, lang, selected) {
    const chosen = new Set(selected);
    const box = $(id);
    box.replaceChildren();
    for (const [value, key] of options) {
      const label = document.createElement("label");
      label.className = "check";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.value = value;
      input.checked = chosen.has(value);
      const text = document.createElement("span");
      text.textContent = BL.t(lang, key);
      label.append(input, text);
      box.appendChild(label);
    }
  }

  function applyLabels() {
    const lang = BL.resolveLanguage(settings.language);
    document.documentElement.lang = lang;
    document.title = BL.t(lang, "options.title");
    $("title").textContent = BL.t(lang, "options.title");
    $("label-section-text").textContent = BL.t(lang, "options.sectionText");
    $("label-show-tooltip").textContent = BL.t(lang, "options.showTooltip");
    $("label-show-anchor-tooltip").textContent = BL.t(lang, "options.showAnchorTooltip");
    $("label-section-tooltip").textContent = BL.t(lang, "options.sectionTooltip");
    $("label-tooltip-actions").textContent = BL.t(lang, "options.tooltipActions");
    $("label-tooltip-delay").textContent = BL.t(lang, "options.tooltipDelay");
    $("tooltip-delay-help").textContent = BL.t(lang, "options.tooltipDelayHelp");
    $("label-click1").textContent = BL.t(lang, "options.click1");
    $("label-click2").textContent = BL.t(lang, "options.click2");
    $("label-click3").textContent = BL.t(lang, "options.click3");
    $("label-section-multi").textContent = BL.t(lang, "options.sectionMulti");
    $("label-multi-links").textContent = BL.t(lang, "options.multiLinks");
    $("multi-help").textContent = BL.t(lang, "options.multiLinksHelp");
    $("label-multi-click1").textContent = BL.t(lang, "options.click1");
    $("label-multi-click2").textContent = BL.t(lang, "options.click2");
    $("label-multi-click3").textContent = BL.t(lang, "options.click3");
    $("label-multi-tooltip-actions").textContent = BL.t(lang, "options.multiTooltipActions");
    $("label-section-anchor").textContent = BL.t(lang, "options.sectionAnchor");
    $("label-anchor-mode").textContent = BL.t(lang, "options.anchorMode");
    $("label-anchor-click2").textContent = BL.t(lang, "options.anchorClick2");
    $("label-anchor-click3").textContent = BL.t(lang, "options.anchorClick3");
    $("label-section-image").textContent = BL.t(lang, "options.sectionImage");
    $("label-show-image-tooltip").textContent = BL.t(lang, "options.showImageTooltip");
    $("label-image-click1").textContent = BL.t(lang, "options.click1");
    $("label-image-click2").textContent = BL.t(lang, "options.click2");
    $("label-image-click3").textContent = BL.t(lang, "options.click3");
    $("label-image-tooltip-actions").textContent = BL.t(lang, "options.imageTooltipActions");
    $("label-section-video").textContent = BL.t(lang, "options.sectionVideo");
    $("label-show-video-tooltip").textContent = BL.t(lang, "options.showVideoTooltip");
    $("label-video-click1").textContent = BL.t(lang, "options.click1");
    $("label-video-click2").textContent = BL.t(lang, "options.click2");
    $("label-video-click3").textContent = BL.t(lang, "options.click3");
    $("label-video-tooltip-actions").textContent = BL.t(lang, "options.videoTooltipActions");
    $("label-section-general").textContent = BL.t(lang, "options.sectionGeneral");
    $("label-fix-links").textContent = BL.t(lang, "options.fixLinks");
    $("fix-help").textContent = BL.t(lang, "options.fixLinksHelp");
    $("label-language").textContent = BL.t(lang, "options.language");
    $("label-section-backup").textContent = BL.t(lang, "options.sectionBackup");
    $("backup-help").textContent = BL.t(lang, "options.backupHelp");
    $("export").textContent = BL.t(lang, "options.export");
    $("import").textContent = BL.t(lang, "options.import");
    $("save").textContent = BL.t(lang, "options.save");
    fillSelect($("click1"), choices("textClick", true), lang);
    fillSelect($("click2"), choices("textClick", true), lang);
    fillSelect($("click3"), choices("textClick", true), lang);
    fillSelect($("multi-click1"), choices("multiClick", true), lang);
    fillSelect($("multi-click2"), choices("multiClick", true), lang);
    fillSelect($("multi-click3"), choices("multiClick", true), lang);
    fillChecks("multi-tooltip-actions", choices("multiTooltip"), lang, settings.multiTooltipActions);
    fillSelect($("anchor-mode"), modes, lang);
    fillSelect($("anchor-click2"), choices("anchorClick"), lang);
    fillSelect($("anchor-click3"), choices("anchorClick"), lang);
    fillChecks("tooltip-actions", choices("tooltip"), lang, settings.tooltipActions);
    fillSelect($("image-click1"), choices("imageClick", true), lang);
    fillSelect($("image-click2"), choices("imageClick", true), lang);
    fillSelect($("image-click3"), choices("imageClick", true), lang);
    fillChecks("image-tooltip-actions", choices("imageTooltip"), lang, settings.imageTooltipActions);
    fillSelect($("video-click1"), choices("videoClick", true), lang);
    fillSelect($("video-click2"), choices("videoClick", true), lang);
    fillSelect($("video-click3"), choices("videoClick", true), lang);
    fillChecks("video-tooltip-actions", choices("videoTooltip"), lang, settings.videoTooltipActions);
    fillSelect($("language"), languages, lang);
  }

  function syncAnchorFields() {
    const enabled = BL.anchorModeAppliesClicks($("anchor-mode").value);
    $("anchor-click2").disabled = !enabled;
    $("anchor-click3").disabled = !enabled;
  }

  function syncMultiFields() {
    const enabled = $("multi-links").checked;
    $("multi-click1").disabled = !enabled;
    $("multi-click2").disabled = !enabled;
    $("multi-click3").disabled = !enabled;
    for (const input of $("multi-tooltip-actions").querySelectorAll("input")) input.disabled = !enabled;
  }

  function readForm() {
    return BL.normalizeSettings({
      showTooltip: $("show-tooltip").checked,
      tooltipOnLinks: $("show-anchor-tooltip").checked,
      tooltipActions: selectedChecks("tooltip-actions"),
      tooltipDelay: $("tooltip-delay").value,
      tooltipDelayInMs: true,
      click1: $("click1").value,
      click2: $("click2").value,
      click3: $("click3").value,
      multiLinks: $("multi-links").checked,
      multiClick1: $("multi-click1").value,
      multiClick2: $("multi-click2").value,
      multiClick3: $("multi-click3").value,
      multiTooltipActions: selectedChecks("multi-tooltip-actions"),
      anchorMode: $("anchor-mode").value,
      anchorClick2: $("anchor-click2").value,
      anchorClick3: $("anchor-click3").value,
      showImageTooltip: $("show-image-tooltip").checked,
      imageClick1: $("image-click1").value,
      imageClick2: $("image-click2").value,
      imageClick3: $("image-click3").value,
      imageTooltipActions: selectedChecks("image-tooltip-actions"),
      showVideoTooltip: $("show-video-tooltip").checked,
      videoClick1: $("video-click1").value,
      videoClick2: $("video-click2").value,
      videoClick3: $("video-click3").value,
      videoTooltipActions: selectedChecks("video-tooltip-actions"),
      fixLinks: $("fix-links").checked,
      language: $("language").value,
    });
  }

  function writeForm(next) {
    settings = BL.normalizeSettings(next);
    $("show-tooltip").checked = settings.showTooltip;
    $("show-anchor-tooltip").checked = settings.tooltipOnLinks;
    $("tooltip-delay").value = String(settings.tooltipDelay);
    $("click1").value = settings.click1;
    $("click2").value = settings.click2;
    $("click3").value = settings.click3;
    $("multi-links").checked = settings.multiLinks;
    $("anchor-mode").value = settings.anchorMode;
    $("anchor-click2").value = settings.anchorClick2;
    $("anchor-click3").value = settings.anchorClick3;
    $("show-image-tooltip").checked = settings.showImageTooltip;
    $("image-click1").value = settings.imageClick1;
    $("image-click2").value = settings.imageClick2;
    $("image-click3").value = settings.imageClick3;
    $("show-video-tooltip").checked = settings.showVideoTooltip;
    $("video-click1").value = settings.videoClick1;
    $("video-click2").value = settings.videoClick2;
    $("video-click3").value = settings.videoClick3;
    $("fix-links").checked = settings.fixLinks;
    $("language").value = settings.language;
    applyLabels();
    $("click1").value = settings.click1;
    $("click2").value = settings.click2;
    $("click3").value = settings.click3;
    $("multi-click1").value = settings.multiClick1;
    $("multi-click2").value = settings.multiClick2;
    $("multi-click3").value = settings.multiClick3;
    $("anchor-mode").value = settings.anchorMode;
    $("anchor-click2").value = settings.anchorClick2;
    $("anchor-click3").value = settings.anchorClick3;
    $("image-click1").value = settings.imageClick1;
    $("image-click2").value = settings.imageClick2;
    $("image-click3").value = settings.imageClick3;
    $("video-click1").value = settings.videoClick1;
    $("video-click2").value = settings.videoClick2;
    $("video-click3").value = settings.videoClick3;
    $("language").value = settings.language;
    syncAnchorFields();
    syncMultiFields();
  }

  $("language").addEventListener("change", () => {
    settings.language = $("language").value;
    const click1 = $("click1").value;
    const click2 = $("click2").value;
    const click3 = $("click3").value;
    const multiClick1 = $("multi-click1").value;
    const multiClick2 = $("multi-click2").value;
    const multiClick3 = $("multi-click3").value;
    settings.multiTooltipActions = selectedChecks("multi-tooltip-actions");
    const anchorMode = $("anchor-mode").value;
    const anchorClick2 = $("anchor-click2").value;
    const anchorClick3 = $("anchor-click3").value;
    settings.tooltipActions = selectedChecks("tooltip-actions");
    const imageClick1 = $("image-click1").value;
    const imageClick2 = $("image-click2").value;
    const imageClick3 = $("image-click3").value;
    settings.imageTooltipActions = selectedChecks("image-tooltip-actions");
    const videoClick1 = $("video-click1").value;
    const videoClick2 = $("video-click2").value;
    const videoClick3 = $("video-click3").value;
    settings.videoTooltipActions = selectedChecks("video-tooltip-actions");
    applyLabels();
    $("click1").value = click1;
    $("click2").value = click2;
    $("click3").value = click3;
    $("multi-click1").value = multiClick1;
    $("multi-click2").value = multiClick2;
    $("multi-click3").value = multiClick3;
    $("anchor-mode").value = anchorMode;
    $("anchor-click2").value = anchorClick2;
    $("anchor-click3").value = anchorClick3;
    $("image-click1").value = imageClick1;
    $("image-click2").value = imageClick2;
    $("image-click3").value = imageClick3;
    $("video-click1").value = videoClick1;
    $("video-click2").value = videoClick2;
    $("video-click3").value = videoClick3;
    $("language").value = settings.language;
    syncAnchorFields();
    syncMultiFields();
  });

  $("anchor-mode").addEventListener("change", syncAnchorFields);
  $("multi-links").addEventListener("change", syncMultiFields);

  function showTransfer(key, isError) {
    const status = $("transfer-status");
    status.hidden = false;
    status.classList.toggle("error", Boolean(isError));
    status.textContent = BL.t(BL.resolveLanguage(settings.language), key);
    window.setTimeout(() => {
      status.hidden = true;
    }, 1600);
  }

  $("export").addEventListener("click", () => {
    const file = new Blob([JSON.stringify(BL.settingsForExport(settings), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = "better-links-settings.json";
    link.click();
    URL.revokeObjectURL(url);
  });

  $("import").addEventListener("click", () => {
    $("import-file").value = "";
    $("import-file").click();
  });

  $("import-file").addEventListener("change", () => {
    const file = $("import-file").files && $("import-file").files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      let parsed;
      try {
        parsed = JSON.parse(String(reader.result || ""));
      } catch {
        showTransfer("options.importError", true);
        return;
      }
      const next = BL.settingsFromFile(settings, parsed);
      if (!next) {
        showTransfer("options.importEmpty", true);
        return;
      }
      chrome.storage.sync.set(next, () => {
        writeForm(next);
        showTransfer("options.imported", false);
      });
    };
    reader.onerror = () => showTransfer("options.importError", true);
    reader.readAsText(file);
  });

  $("save").addEventListener("click", () => {
    const next = readForm();
    const clicks = BL.anchorModeAppliesClicks(next.anchorMode);
    if (clicks && next.tooltipOnLinks) next.anchorMode = "both";
    else if (next.tooltipOnLinks) next.anchorMode = "tooltip";
    else if (clicks) next.anchorMode = "clicks";
    else next.anchorMode = "ignore";
    chrome.storage.sync.set(next, () => {
      settings = next;
      const saved = $("saved");
      saved.hidden = false;
      saved.textContent = BL.t(BL.resolveLanguage(settings.language), "options.saved");
      window.setTimeout(() => {
        saved.hidden = true;
      }, 1600);
    });
  });

  chrome.storage.sync.get(null, (stored) => writeForm(stored));
})();
