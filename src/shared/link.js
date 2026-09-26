(function (root) {
  const BetterLinks = root.BetterLinks || (root.BetterLinks = {});

  const DOMAIN_RE =
    /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}(?::\d{2,5})?(?:[/?#][^\s]*)?$/i;

  function looksLikeProtocol(value) {
    return /^(https?|htps|htp)(:|\/)/i.test(value);
  }

  function isBrokenProtocol(value) {
    return looksLikeProtocol(value) && !/^https?:\/\//i.test(value);
  }

  BetterLinks.repairUrl = function repairUrl(raw) {
    let value = String(raw == null ? "" : raw).trim().replace(/\s+/g, "");
    if (!value) return "";

    value = value.replace(/^htps(?=:|\/)/i, "https");
    value = value.replace(/^htp(?=:|\/)/i, "http");

    const match = value.match(/^(https?)(:?)(.*)$/i);
    if (!match) return value;

    const scheme = match[1].toLowerCase();
    const rest = match[3].replace(/^\/+/, "");
    return scheme + "://" + rest;
  };

  BetterLinks.isHttpUrl = function isHttpUrl(url) {
    try {
      const parsed = new URL(url);
      return (parsed.protocol === "http:" || parsed.protocol === "https:") && parsed.hostname.length > 0;
    } catch {
      return false;
    }
  };

  BetterLinks.resolveTextLink = function resolveTextLink(text, fixLinks) {
    const raw = String(text == null ? "" : text).trim();
    if (!raw || /\s/.test(raw)) return null;

    if (looksLikeProtocol(raw)) {
      if (isBrokenProtocol(raw) && !fixLinks) return null;
      const candidate = fixLinks ? BetterLinks.repairUrl(raw) : raw;
      return BetterLinks.isHttpUrl(candidate) ? candidate : null;
    }

    if (!DOMAIN_RE.test(raw)) return null;
    const withProtocol = "https://" + raw;
    return BetterLinks.isHttpUrl(withProtocol) ? withProtocol : null;
  };

  function stripListMarker(value) {
    return String(value == null ? "" : value)
      .trim()
      .replace(/^(?:[-*•·▪◦]|\d+[.)])\s+/, "");
  }

  BetterLinks.resolveTextFragments = function resolveTextFragments(fragments, fixLinks) {
    const urls = [];
    const list = Array.isArray(fragments) ? fragments : [fragments];
    for (const fragment of list) {
      const lines = String(fragment == null ? "" : fragment).split(/\r?\n/);
      for (const line of lines) {
        const url = BetterLinks.resolveTextLink(stripListMarker(line), fixLinks);
        if (url) urls.push(url);
      }
    }
    return urls;
  };

  BetterLinks.resolveAnchorUrl = function resolveAnchorUrl(hrefAttr, absoluteHref, fixLinks) {
    const attr = String(hrefAttr == null ? "" : hrefAttr).trim();

    if (fixLinks && attr && isBrokenProtocol(attr)) {
      const repaired = BetterLinks.repairUrl(attr);
      if (BetterLinks.isHttpUrl(repaired)) return repaired;
    }

    if (attr && isBrokenProtocol(attr)) return null;
    if (absoluteHref && BetterLinks.isHttpUrl(absoluteHref)) return absoluteHref;
    return null;
  };
})(globalThis);
