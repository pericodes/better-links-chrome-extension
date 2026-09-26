(function (root) {
  const BetterLinks = root.BetterLinks || (root.BetterLinks = {});

  function hostEndsWith(hostname, domain) {
    return hostname === domain || hostname.endsWith("." + domain);
  }

  function youtubeId(value) {
    if (!/^[A-Za-z0-9_-]{11}$/.test(value)) return "";
    return value;
  }

  function vimeoId(value) {
    if (!/^\d+$/.test(value)) return "";
    return value;
  }

  function youtubeFromUrl(url) {
    const host = url.hostname.toLowerCase();
    const youtube = hostEndsWith(host, "youtube.com") || hostEndsWith(host, "youtube-nocookie.com");
    const short = hostEndsWith(host, "youtu.be");
    if (!youtube && !short) return "";

    if (short) {
      const id = url.pathname.split("/").filter(Boolean)[0] || "";
      return youtubeId(id);
    }

    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0] === "embed" || parts[0] === "shorts" || parts[0] === "live") return youtubeId(parts[1] || "");
    if (parts[0] === "watch") return youtubeId(url.searchParams.get("v") || "");
    return "";
  }

  function vimeoFromUrl(url) {
    const host = url.hostname.toLowerCase();
    const parts = url.pathname.split("/").filter(Boolean);
    if (hostEndsWith(host, "player.vimeo.com") && parts[0] === "video") return vimeoId(parts[1] || "");
    if (hostEndsWith(host, "vimeo.com") && !hostEndsWith(host, "player.vimeo.com") && parts.length === 1) {
      return vimeoId(parts[0]);
    }
    return "";
  }

  BetterLinks.canonicalPlayerUrl = function canonicalPlayerUrl(pageHref) {
    let url;
    try {
      url = new URL(String(pageHref || ""));
    } catch {
      return null;
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;

    const youtube = youtubeFromUrl(url);
    if (youtube) return "https://www.youtube.com/watch?v=" + youtube;

    const vimeo = vimeoFromUrl(url);
    if (vimeo) return "https://vimeo.com/" + vimeo;
    return null;
  };
})(globalThis);
