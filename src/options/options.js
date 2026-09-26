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
    $("tab-options").textContent = BL.t(lang, "options.tabOptions");
    $("tab-correctors").textContent = BL.t(lang, "options.tabCorrectors");
    $("label-section-correctors").textContent = BL.t(lang, "options.sectionCorrectors");
    $("correctors-help").textContent = BL.t(lang, "options.correctorsHelp");
    $("label-corrector-try").textContent = BL.t(lang, "options.correctorTry");
    $("corrector-try-run").textContent = BL.t(lang, "options.correctorTryRun");
    $("add-corrector").textContent = BL.t(lang, "options.correctorAdd");
    $("export-correctors").textContent = BL.t(lang, "options.correctorExport");
    $("import-correctors").textContent = BL.t(lang, "options.correctorImport");
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
      linkCorrectors: readCorrectorsFromDom(),
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
    renderCorrectors(settings.linkCorrectors);
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

  function readCorrectorsFromDom() {
    return [...$("link-correctors").querySelectorAll(".corrector")].map((card) => ({
      id: card.dataset.id,
      name: card.querySelector(".name").value,
      notes: card.querySelector(".notes").value,
      code: card.querySelector(".code").value,
      enabled: card.querySelector(".enabled").checked,
    }));
  }

  function renderCorrectors(list) {
    const lang = BL.resolveLanguage(settings.language);
    const box = $("link-correctors");
    box.replaceChildren();
    list.forEach((item, index) => {
      const card = document.createElement("article");
      card.className = "corrector";
      card.dataset.id = item.id;

      const head = document.createElement("div");
      head.className = "corrector-head";
      const priority = document.createElement("span");
      priority.className = "priority";
      priority.textContent = String(index + 1);
      const active = document.createElement("label");
      active.className = "check";
      const enabled = document.createElement("input");
      enabled.className = "enabled";
      enabled.type = "checkbox";
      enabled.checked = item.enabled !== false;
      const enabledText = document.createElement("span");
      enabledText.textContent = BL.t(lang, "options.correctorEnabled");
      active.append(enabled, enabledText);
      const name = document.createElement("input");
      name.className = "name";
      name.type = "text";
      name.value = item.name;
      name.setAttribute("aria-label", BL.t(lang, "options.correctorName"));
      const actions = document.createElement("div");
      actions.className = "row-actions";
      actions.append(moveButton("up", lang, index === 0), moveButton("down", lang, index === list.length - 1), moveButton("delete", lang, false));
      head.append(priority, active, name, actions);

      const notesLabel = document.createElement("span");
      notesLabel.className = "group-label";
      notesLabel.textContent = BL.t(lang, "options.correctorNotes");
      const notes = document.createElement("textarea");
      notes.className = "notes";
      notes.rows = 2;
      notes.value = item.notes;

      const codeLabel = document.createElement("span");
      codeLabel.className = "group-label";
      codeLabel.textContent = BL.t(lang, "options.correctorCode");
      const code = document.createElement("textarea");
      code.className = "code";
      code.rows = 8;
      code.spellcheck = false;
      code.value = item.code;

      card.append(head, notesLabel, notes, codeLabel, code);
      box.appendChild(card);
    });
  }

  function moveButton(act, lang, disabled) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "ghost";
    button.dataset.act = act;
    const key = act === "up" ? "options.correctorUp" : act === "down" ? "options.correctorDown" : "options.correctorDelete";
    button.textContent = BL.t(lang, key);
    button.disabled = disabled;
    return button;
  }

  $("link-correctors").addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button || !button.dataset.act) return;
    const list = readCorrectorsFromDom();
    const card = button.closest(".corrector");
    const index = list.findIndex((item) => item.id === card.dataset.id);
    if (index < 0) return;
    if (button.dataset.act === "delete") list.splice(index, 1);
    if (button.dataset.act === "up" && index > 0) {
      const previous = list[index - 1];
      list[index - 1] = list[index];
      list[index] = previous;
    }
    if (button.dataset.act === "down" && index < list.length - 1) {
      const next = list[index + 1];
      list[index + 1] = list[index];
      list[index] = next;
    }
    settings.linkCorrectors = list;
    renderCorrectors(list);
  });

  $("add-corrector").addEventListener("click", () => {
    const list = readCorrectorsFromDom();
    list.push({
      id: "user-" + Math.random().toString(36).slice(2, 10),
      name: "",
      notes: "",
      code: "return '';",
      enabled: true,
    });
    settings.linkCorrectors = list;
    renderCorrectors(list);
  });

  function showTab(name) {
    const options = name === "options";
    $("panel-options").hidden = !options;
    $("panel-correctors").hidden = options;
    $("tab-options").setAttribute("aria-selected", options ? "true" : "false");
    $("tab-correctors").setAttribute("aria-selected", options ? "false" : "true");
  }

  const sandboxFrame = document.createElement("iframe");
  sandboxFrame.hidden = true;
  sandboxFrame.tabIndex = -1;
  sandboxFrame.setAttribute("aria-hidden", "true");
  let sandboxReady = false;
  sandboxFrame.addEventListener("load", () => {
    sandboxReady = true;
  });
  sandboxFrame.src = "sandbox.html";
  document.body.appendChild(sandboxFrame);

  function runSandboxed(code, text) {
    return new Promise((resolve) => {
      const id = "c" + Math.random().toString(36).slice(2);
      const timer = window.setTimeout(() => finish({ failed: true }), 1500);
      function finish(result) {
        window.clearTimeout(timer);
        window.removeEventListener("message", onMessage);
        resolve(result);
      }
      function onMessage(event) {
        if (event.source !== sandboxFrame.contentWindow) return;
        const data = event.data;
        if (!data || data.id !== id) return;
        if (data.error) finish({ failed: true });
        else finish({ value: typeof data.text === "string" ? data.text : "" });
      }
      window.addEventListener("message", onMessage);
      const send = () => sandboxFrame.contentWindow.postMessage({ id: id, code: code, text: text }, "*");
      if (sandboxReady) send();
      else sandboxFrame.addEventListener("load", send, { once: true });
    });
  }

  async function tryCorrector() {
    const lang = BL.resolveLanguage(settings.language);
    const sample = $("corrector-try").value;
    const list = BL.activeCorrectors(readCorrectorsFromDom(), $("fix-links").checked);
    const steps = [];
    let winner = null;
    let stopped = false;
    for (const item of list) {
      const id = item && item.id;
      if (stopped || !item || item.enabled === false || typeof item.code !== "string" || !item.code.trim()) {
        steps.push({ id: id, status: "skipped" });
        continue;
      }
      let outcome = BL.executeCorrector(item, sample);
      if (outcome.blocked) outcome = await runSandboxed(item.code, sample);
      if (outcome.failed) {
        steps.push({ id: id, status: "fail" });
        continue;
      }
      const candidate = String(outcome.value || "").trim();
      if (!BL.isHttpUrl(candidate)) {
        steps.push({ id: id, status: "fail" });
        continue;
      }
      steps.push({ id: id, status: "pass" });
      winner = { id: id, name: typeof item.name === "string" ? item.name : "", text: candidate };
      stopped = true;
    }
    const byId = new Map(steps.map((step) => [step.id, step.status]));
    for (const card of $("link-correctors").querySelectorAll(".corrector")) {
      card.classList.remove("pass", "fail");
      const status = byId.get(card.dataset.id);
      if (status === "pass" || status === "fail") card.classList.add(status);
    }
    const result = $("corrector-try-result");
    result.hidden = false;
    result.classList.toggle("ok", Boolean(winner));
    result.classList.toggle("bad", !winner);
    result.textContent = winner ? winner.text : BL.t(lang, "options.correctorTryFail");
  }

  $("corrector-try-run").addEventListener("click", tryCorrector);
  $("corrector-try").addEventListener("keydown", (event) => {
    if (event.key === "Enter") tryCorrector();
  });

  $("tab-options").addEventListener("click", () => showTab("options"));
  $("tab-correctors").addEventListener("click", () => showTab("correctors"));

  function showCorrectorStatus(key, isError) {
    const status = $("correctors-status");
    status.hidden = false;
    status.classList.toggle("error", Boolean(isError));
    status.textContent = BL.t(BL.resolveLanguage(settings.language), key);
    window.setTimeout(() => {
      status.hidden = true;
    }, 1600);
  }

  $("export-correctors").addEventListener("click", () => {
    const file = new Blob([JSON.stringify(readCorrectorsFromDom(), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = "better-links-correctors.json";
    link.click();
    URL.revokeObjectURL(url);
  });

  $("import-correctors").addEventListener("click", () => {
    $("import-correctors-file").value = "";
    $("import-correctors-file").click();
  });

  $("import-correctors-file").addEventListener("change", () => {
    const file = $("import-correctors-file").files && $("import-correctors-file").files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      let parsed;
      try {
        parsed = JSON.parse(String(reader.result || ""));
      } catch {
        showCorrectorStatus("options.correctorImportError", true);
        return;
      }
      const raw = Array.isArray(parsed) ? parsed : parsed && parsed.linkCorrectors;
      if (!Array.isArray(raw)) {
        showCorrectorStatus("options.correctorImportEmpty", true);
        return;
      }
      const list = BL.normalizeLinkCorrectors(raw, settings.language);
      settings.linkCorrectors = list;
      renderCorrectors(list);
      const next = readForm();
      chrome.storage.sync.set(next, () => {
        settings = next;
        showCorrectorStatus("options.correctorImported", false);
      });
    };
    reader.onerror = () => showCorrectorStatus("options.correctorImportError", true);
    reader.readAsText(file);
  });

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
    settings.linkCorrectors = readCorrectorsFromDom();
    applyLabels();
    renderCorrectors(settings.linkCorrectors);
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
