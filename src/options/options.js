(function () {
  const BL = globalThis.BetterLinks;
  const $ = (id) => document.getElementById(id);

  const textActions = [
    ["newWindow", "options.action.newWindow"],
    ["newTab", "options.action.newTab"],
    ["newTabAndOpen", "options.action.newTabAndOpen"],
    ["copy", "options.action.copy"],
    ["none", "options.action.none"],
  ];
  const anchorActions = textActions.filter(([value]) => value !== "none");
  const tooltipActions = [
    ["newWindow", "tooltip.newWindow"],
    ["newTab", "tooltip.newTab"],
    ["newTabAndOpen", "tooltip.newTabAndOpen"],
    ["copy", "tooltip.copy"],
  ];
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

  function selectedTooltipActions() {
    return [...$("tooltip-actions").querySelectorAll("input:checked")].map((input) => input.value);
  }

  function fillTooltipActions(lang, selected) {
    const chosen = new Set(selected);
    const box = $("tooltip-actions");
    box.replaceChildren();
    for (const [value, key] of tooltipActions) {
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
    $("label-section-anchor").textContent = BL.t(lang, "options.sectionAnchor");
    $("label-anchor-mode").textContent = BL.t(lang, "options.anchorMode");
    $("label-anchor-click2").textContent = BL.t(lang, "options.anchorClick2");
    $("label-anchor-click3").textContent = BL.t(lang, "options.anchorClick3");
    $("label-section-general").textContent = BL.t(lang, "options.sectionGeneral");
    $("label-fix-links").textContent = BL.t(lang, "options.fixLinks");
    $("fix-help").textContent = BL.t(lang, "options.fixLinksHelp");
    $("label-language").textContent = BL.t(lang, "options.language");
    $("save").textContent = BL.t(lang, "options.save");
    fillSelect($("click1"), textActions, lang);
    fillSelect($("click2"), textActions, lang);
    fillSelect($("click3"), textActions, lang);
    fillSelect($("anchor-mode"), modes, lang);
    fillSelect($("anchor-click2"), anchorActions, lang);
    fillSelect($("anchor-click3"), anchorActions, lang);
    fillTooltipActions(lang, settings.tooltipActions);
    fillSelect($("language"), languages, lang);
  }

  function syncAnchorFields() {
    const enabled = BL.anchorModeAppliesClicks($("anchor-mode").value);
    $("anchor-click2").disabled = !enabled;
    $("anchor-click3").disabled = !enabled;
  }

  function readForm() {
    return BL.normalizeSettings({
      showTooltip: $("show-tooltip").checked,
      tooltipOnLinks: $("show-anchor-tooltip").checked,
      tooltipActions: selectedTooltipActions(),
      tooltipDelay: $("tooltip-delay").value,
      tooltipDelayInMs: true,
      click1: $("click1").value,
      click2: $("click2").value,
      click3: $("click3").value,
      anchorMode: $("anchor-mode").value,
      anchorClick2: $("anchor-click2").value,
      anchorClick3: $("anchor-click3").value,
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
    $("anchor-mode").value = settings.anchorMode;
    $("anchor-click2").value = settings.anchorClick2;
    $("anchor-click3").value = settings.anchorClick3;
    $("fix-links").checked = settings.fixLinks;
    $("language").value = settings.language;
    applyLabels();
    $("click1").value = settings.click1;
    $("click2").value = settings.click2;
    $("click3").value = settings.click3;
    $("anchor-mode").value = settings.anchorMode;
    $("anchor-click2").value = settings.anchorClick2;
    $("anchor-click3").value = settings.anchorClick3;
    $("language").value = settings.language;
    syncAnchorFields();
  }

  $("language").addEventListener("change", () => {
    settings.language = $("language").value;
    const click1 = $("click1").value;
    const click2 = $("click2").value;
    const click3 = $("click3").value;
    const anchorMode = $("anchor-mode").value;
    const anchorClick2 = $("anchor-click2").value;
    const anchorClick3 = $("anchor-click3").value;
    settings.tooltipActions = selectedTooltipActions();
    applyLabels();
    $("click1").value = click1;
    $("click2").value = click2;
    $("click3").value = click3;
    $("anchor-mode").value = anchorMode;
    $("anchor-click2").value = anchorClick2;
    $("anchor-click3").value = anchorClick3;
    $("language").value = settings.language;
    syncAnchorFields();
  });

  $("anchor-mode").addEventListener("change", syncAnchorFields);

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
