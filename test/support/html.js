function decode(value) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'");
}

function parseHtml(html) {
  const root = { nodeType: 11, childNodes: [] };
  const stack = [root];
  const re = /<!--[\s\S]*?-->|<\/([a-zA-Z0-9]+)>|<([a-zA-Z0-9]+)(\s[^>]*)?\/?>|([^<]+)/g;
  let match;
  while ((match = re.exec(html))) {
    if (match[0].startsWith("<!--")) continue;
    if (match[1]) {
      const tag = match[1].toUpperCase();
      while (stack.length > 1 && stack[stack.length - 1].tagName !== tag) stack.pop();
      if (stack.length > 1 && stack[stack.length - 1].tagName === tag) stack.pop();
      continue;
    }
    if (match[2]) {
      const tag = match[2].toUpperCase();
      const el = { nodeType: 1, tagName: tag, childNodes: [] };
      stack[stack.length - 1].childNodes.push(el);
      const empty = match[0].endsWith("/>") || tag === "BR" || tag === "HR";
      if (!empty) stack.push(el);
      continue;
    }
    if (match[4]) {
      stack[stack.length - 1].childNodes.push({ nodeType: 3, textContent: decode(match[4]) });
    }
  }
  return root;
}

module.exports = { parseHtml };
