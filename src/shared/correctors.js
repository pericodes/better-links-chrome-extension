(function (root) {
  const BetterLinks = root.BetterLinks || (root.BetterLinks = {});

  const PLAIN_URL_CODE = [
    "const value = String(text == null ? '' : text).trim();",
    "if (!value || /\\s/.test(value) || !/^https?:\\/\\//i.test(value)) return '';",
    "try {",
    "  const url = new URL(value);",
    "  if ((url.protocol === 'http:' || url.protocol === 'https:') && url.hostname.length > 0) return value;",
    "} catch (error) {}",
    "return '';",
  ].join("\n");

  const REPAIR_CODE = [
    "const value = String(text == null ? '' : text).trim().replace(/\\s+/g, '');",
    "if (!value || /^https?:\\/\\//i.test(value)) return '';",
    "let fixed = value.replace(/^htps(?=:|\\/)/i, 'https').replace(/^htp(?=:|\\/)/i, 'http');",
    "const match = fixed.match(/^(https?)(:?)(.*)$/i);",
    "if (!match) return '';",
    "const scheme = match[1].toLowerCase();",
    "const rest = match[3].replace(/^\\/+/, '');",
    "return scheme + '://' + rest;",
  ].join("\n");

  const DOMAIN_CODE = [
    "const value = String(text == null ? '' : text).trim();",
    "if (!value || /\\s/.test(value)) return '';",
    "const domain = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\\.)+[a-z]{2,}(?::\\d{2,5})?(?:[/?#][^\\s]*)?$/i;",
    "if (!domain.test(value)) return '';",
    "return 'https://' + value;",
  ].join("\n");

  function label(lang, key) {
    if (!BetterLinks.t) return key;
    return BetterLinks.t(lang, key);
  }

  BetterLinks.defaultLinkCorrectors = function defaultLinkCorrectors(language) {
    const lang = BetterLinks.resolveLanguage ? BetterLinks.resolveLanguage(language) : "en";
    return [
      {
        id: "plain-url",
        name: label(lang, "corrector.plainUrl.name"),
        notes: label(lang, "corrector.plainUrl.notes"),
        code: PLAIN_URL_CODE,
        enabled: true,
      },
      {
        id: "repair-protocol",
        name: label(lang, "corrector.repair.name"),
        notes: label(lang, "corrector.repair.notes"),
        code: REPAIR_CODE,
        enabled: true,
      },
      {
        id: "bare-domain",
        name: label(lang, "corrector.domain.name"),
        notes: label(lang, "corrector.domain.notes"),
        code: DOMAIN_CODE,
        enabled: true,
      },
    ];
  };

  BetterLinks.normalizeLinkCorrectors = function normalizeLinkCorrectors(raw, language) {
    if (!Array.isArray(raw)) return BetterLinks.defaultLinkCorrectors(language);
    const out = [];
    for (const item of raw) {
      if (!item || typeof item !== "object") continue;
      const code = typeof item.code === "string" ? item.code : "";
      if (!code.trim()) continue;
      const id = typeof item.id === "string" && item.id.trim() ? item.id.trim() : "user-" + out.length;
      out.push({
        id: id,
        name: typeof item.name === "string" ? item.name : "",
        notes: typeof item.notes === "string" ? item.notes : "",
        code: code,
        enabled: item.enabled !== false,
      });
    }
    return out;
  };

  BetterLinks.activeCorrectors = function activeCorrectors(correctors, fixLinks) {
    const list = Array.isArray(correctors) ? correctors : [];
    return list.filter((item) => {
      if (!item || item.enabled === false) return false;
      if (!fixLinks && item.id === "repair-protocol") return false;
      return true;
    });
  };

  function resultText(value) {
    if (typeof value === "string") return value;
    if (value && typeof value === "object" && typeof value.text === "string") return value.text;
    return "";
  }

  function plainUrl(text) {
    const value = String(text == null ? "" : text).trim();
    if (!value || /\s/.test(value) || !/^https?:\/\//i.test(value)) return "";
    try {
      const url = new URL(value);
      if ((url.protocol === "http:" || url.protocol === "https:") && url.hostname.length > 0) return value;
    } catch (error) {
      /* No es una URL. */
    }
    return "";
  }

  function repairProtocol(text) {
    const value = String(text == null ? "" : text).trim().replace(/\s+/g, "");
    if (!value || /^https?:\/\//i.test(value)) return "";
    const fixed = value.replace(/^htps(?=:|\/)/i, "https").replace(/^htp(?=:|\/)/i, "http");
    const match = fixed.match(/^(https?)(:?)(.*)$/i);
    if (!match) return "";
    return match[1].toLowerCase() + "://" + match[3].replace(/^\/+/, "");
  }

  function bareDomain(text) {
    const value = String(text == null ? "" : text).trim();
    if (!value || /\s/.test(value)) return "";
    const domain =
      /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}(?::\d{2,5})?(?:[/?#][^\s]*)?$/i;
    if (!domain.test(value)) return "";
    return "https://" + value;
  }

  const BUILTINS = {
    "plain-url": { code: PLAIN_URL_CODE, run: plainUrl },
    "repair-protocol": { code: REPAIR_CODE, run: repairProtocol },
    "bare-domain": { code: DOMAIN_CODE, run: bareDomain },
  };

  function sameCode(left, right) {
    return String(left || "").replace(/\r\n/g, "\n").trim() === String(right || "").replace(/\r\n/g, "\n").trim();
  }

  function isEvalBlocked(error) {
    const message = String(error && error.message ? error.message : error);
    return (error && error.name === "EvalError") || /unsafe-eval|Content Security Policy/.test(message);
  }

  function builtinFor(item) {
    const builtin = item && BUILTINS[item.id];
    if (!builtin || !sameCode(item.code, builtin.code)) return null;
    return builtin.run;
  }

  BetterLinks.executeCorrector = function executeCorrector(item, text) {
    const raw = String(text == null ? "" : text);
    const builtin = builtinFor(item);
    if (builtin) {
      try {
        return { value: resultText(builtin(raw)) };
      } catch (error) {
        return { failed: true };
      }
    }
    try {
      const fn = new Function("text", item.code);
      return { value: resultText(fn(raw)) };
    } catch (error) {
      if (isEvalBlocked(error)) return { blocked: true };
      return { failed: true };
    }
  };

  function finishBlocked(item, raw) {
    const builtin = item && BUILTINS[item.id];
    if (!builtin) return { failed: true };
    try {
      return { value: resultText(builtin.run(raw)) };
    } catch (error) {
      return { failed: true };
    }
  }

  BetterLinks.traceLinkCorrectors = function traceLinkCorrectors(text, correctors) {
    const raw = String(text == null ? "" : text);
    const list = Array.isArray(correctors) ? correctors : [];
    const steps = [];
    let winner = null;
    let stopped = false;
    for (const item of list) {
      const id = item && item.id;
      if (stopped || !item || item.enabled === false || typeof item.code !== "string" || !item.code.trim()) {
        steps.push({ id: id, status: "skipped" });
        continue;
      }
      let outcome = BetterLinks.executeCorrector(item, raw);
      if (outcome.blocked) outcome = finishBlocked(item, raw);
      if (outcome.failed) {
        steps.push({ id: id, status: "fail" });
        continue;
      }
      const candidate = String(outcome.value || "").trim();
      if (!BetterLinks.isHttpUrl(candidate)) {
        steps.push({ id: id, status: "fail" });
        continue;
      }
      steps.push({ id: id, status: "pass" });
      winner = { id: id, name: typeof item.name === "string" ? item.name : "", text: candidate };
      stopped = true;
    }
    return { url: winner ? winner.text : null, winner: winner, steps: steps };
  };

  BetterLinks.applyLinkCorrectors = function applyLinkCorrectors(text, correctors) {
    return BetterLinks.traceLinkCorrectors(text, correctors).url;
  };
})(globalThis);
