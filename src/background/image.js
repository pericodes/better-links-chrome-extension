(function (root) {
  const BetterLinks = root.BetterLinks || (root.BetterLinks = {});

  function filenameFromDisposition(header) {
    if (!header) return "";
    const encoded = header.match(/filename\*\s*=\s*(?:UTF-8''|utf-8'')([^;]+)/i);
    if (encoded) {
      try {
        return decodeURIComponent(encoded[1].trim().replace(/^"|"$/g, ""));
      } catch {
        return "";
      }
    }
    const plain = header.match(/filename\s*=\s*"?([^";]+)"?/i);
    return plain ? plain[1].trim() : "";
  }

  function filenameFromUrl(url) {
    try {
      const segment = new URL(url).pathname.split("/").filter(Boolean).pop() || "";
      return decodeURIComponent(segment);
    } catch {
      return "";
    }
  }

  function safeFilename(name) {
    return String(name || "")
      .replace(/[\\/:*?"<>|\u0000-\u001f]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 180);
  }

  const IMAGE_EXT = {
    "image/webp": "webp",
    "image/gif": "gif",
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/avif": "avif",
    "image/bmp": "bmp",
    "image/svg+xml": "svg",
    "image/tiff": "tiff",
    "image/x-icon": "ico",
    "image/vnd.microsoft.icon": "ico",
  };

  function extensionFromMime(mime) {
    const type = String(mime || "").split(";")[0].trim().toLowerCase();
    return IMAGE_EXT[type] || "";
  }

  function extensionFromBytes(bytes) {
    if (
      bytes.length >= 12 &&
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50
    ) {
      return "webp";
    }
    if (bytes.length >= 6 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return "gif";
    if (bytes.length >= 4 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "png";
    if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
    return "";
  }

  function applyExtension(name, ext) {
    const cleaned = safeFilename(name) || "image";
    if (!ext) return cleaned;
    const match = cleaned.match(/^(.*?)(?:\.([a-z0-9]{1,8}))?$/i);
    const base = (match && match[1] ? match[1] : cleaned).replace(/[. ]+$/g, "") || "image";
    const current = match && match[2] ? match[2].toLowerCase() : "";
    if (current === ext || (ext === "jpg" && current === "jpeg")) return base + "." + (current === "jpeg" ? "jpeg" : ext);
    return base + "." + ext;
  }

  async function suggestedImageName(url) {
    let headerName = "";
    let mime = "";
    let sniffed = "";
    try {
      const response = await fetch(url, { headers: { Range: "bytes=0-31" } });
      headerName = filenameFromDisposition(response.headers.get("content-disposition"));
      mime = response.headers.get("content-type") || "";
      if (response.body) {
        const reader = response.body.getReader();
        const chunk = await reader.read();
        await reader.cancel();
        sniffed = extensionFromBytes(chunk.value ? chunk.value.subarray(0, 32) : new Uint8Array());
      }
    } catch {
      headerName = "";
    }
    const ext = sniffed || extensionFromMime(mime);
    return applyExtension(headerName || filenameFromUrl(url) || "image", ext);
  }

  const pendingSaveNames = new Map();

  chrome.downloads.onDeterminingFilename.addListener((item, suggest) => {
    const wanted = pendingSaveNames.get(item.url);
    if (!wanted) return;
    pendingSaveNames.delete(item.url);
    suggest({ filename: wanted, conflictAction: "uniquify" });
  });

  async function urlToPngBytes(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error("fetch");
    const blob = await response.blob();
    const bitmap = await createImageBitmap(blob);
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    canvas.getContext("2d").drawImage(bitmap, 0, 0);
    bitmap.close();
    const png = await canvas.convertToBlob({ type: "image/png" });
    return new Uint8Array(await png.arrayBuffer());
  }

  BetterLinks.saveImage = function saveImage(url) {
    if (!BetterLinks.isSafeHttpUrl(url)) return;
    suggestedImageName(url).then((filename) => {
      if (filename) pendingSaveNames.set(url, filename);
      const options = { url: url, saveAs: true };
      if (filename) options.filename = filename;
      chrome.downloads.download(options);
    });
  };

  BetterLinks.replyImagePng = function replyImagePng(url, sendResponse) {
    if (!BetterLinks.isSafeHttpUrl(url)) {
      sendResponse({ buffer: null });
      return;
    }
    urlToPngBytes(url)
      .then((buffer) => sendResponse({ buffer: buffer.buffer }))
      .catch(() => sendResponse({ buffer: null }));
  };
})(globalThis);
