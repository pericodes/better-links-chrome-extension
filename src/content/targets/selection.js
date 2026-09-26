(function (root) {
  const BetterLinks = root.BetterLinks || (root.BetterLinks = {});

  BetterLinks.selectionInsideAnchor = function selectionInsideAnchor(selection) {
    if (!selection || !selection.rangeCount || selection.isCollapsed) return false;
    const range = selection.getRangeAt(0);
    const containers = [range.startContainer, range.endContainer, range.commonAncestorContainer];
    return containers.every((node) => {
      const el = node && node.nodeType === 1 ? node : node && node.parentElement;
      return Boolean(el && el.closest && el.closest("a"));
    });
  };

  BetterLinks.pointInSelection = function pointInSelection(x, y) {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount || selection.isCollapsed) return false;
    for (const rect of selection.getRangeAt(0).getClientRects()) {
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) return true;
    }
    return false;
  };

  BetterLinks.selectionRect = function selectionRect() {
    const selection = window.getSelection();
    if (!selection || !selection.rangeCount) return null;
    const rect = selection.getRangeAt(0).getBoundingClientRect();
    if (!rect || (rect.width === 0 && rect.height === 0)) return null;
    return rect;
  };

  BetterLinks.readFieldSelection = function readFieldSelection(target) {
    const el = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")
      ? target
      : document.activeElement;
    if (!el || (el.tagName !== "INPUT" && el.tagName !== "TEXTAREA")) return null;
    if (el.selectionStart == null || el.selectionStart === el.selectionEnd) return null;
    return {
      text: el.value.slice(el.selectionStart, el.selectionEnd),
      rect: el.getBoundingClientRect(),
    };
  };

  const INLINE_TAGS = {
    A: 1, ABBR: 1, B: 1, BDI: 1, BDO: 1, BIG: 1, CITE: 1, CODE: 1, DATA: 1, DEL: 1,
    DFN: 1, EM: 1, FONT: 1, I: 1, INS: 1, KBD: 1, LABEL: 1, MARK: 1, NOBR: 1, Q: 1,
    RUBY: 1, RP: 1, RT: 1, S: 1, SAMP: 1, SMALL: 1, SPAN: 1, STRIKE: 1, STRONG: 1,
    SUB: 1, SUP: 1, TIME: 1, TT: 1, U: 1, VAR: 1, WBR: 1,
  };

  BetterLinks.linesFromNodes = function linesFromNodes(root) {
    const lines = [];
    let current = "";

    function flush() {
      const text = current.trim();
      current = "";
      if (text) lines.push(text);
    }

    function appendText(text) {
      const parts = String(text == null ? "" : text).split(/\r?\n/);
      for (let i = 0; i < parts.length; i += 1) {
        if (i > 0) flush();
        current += parts[i];
      }
    }

    function walk(node) {
      if (!node) return;
      if (node.nodeType === 11 || node.nodeType === 9) {
        for (const child of node.childNodes) walk(child);
        return;
      }
      if (node.nodeType === 3) {
        appendText(node.textContent);
        return;
      }
      if (node.nodeType !== 1) return;
      const tag = node.tagName;
      if (tag === "SCRIPT" || tag === "STYLE" || tag === "NOSCRIPT" || tag === "SVG") return;
      if (tag === "BR" || tag === "HR") {
        flush();
        return;
      }
      const inline = Boolean(INLINE_TAGS[tag]);
      if (!inline) flush();
      for (const child of node.childNodes) walk(child);
      if (!inline) flush();
    }

    walk(root);
    flush();
    return lines;
  };

  function innerTextLines(fragment) {
    if (typeof document === "undefined" || !document.createElement) return [];
    const holder = document.createElement("div");
    holder.setAttribute(
      "style",
      "position:fixed;left:0;top:0;opacity:0;pointer-events:none;width:max-content;max-width:none;white-space:pre;"
    );
    const parent = document.body || document.documentElement;
    if (!parent) return [];
    try {
      holder.appendChild(fragment);
      parent.appendChild(holder);
      return String(holder.innerText || "")
        .split(/\n/)
        .map((line) => line.trim())
        .filter(Boolean);
    } catch {
      return [];
    } finally {
      holder.remove();
    }
  }

  BetterLinks.selectionLineGroups = function selectionLineGroups(selection) {
    if (!selection || !selection.rangeCount || selection.isCollapsed) return [];
    const groups = [];
    try {
      const fragment = selection.getRangeAt(0).cloneContents();
      groups.push(BetterLinks.linesFromNodes(fragment));
      groups.push(innerTextLines(fragment));
    } catch {
      /* La selección puede no clonarse. */
    }
    groups.push(String(selection.toString() || "").split(/\r?\n/));
    return groups;
  };

  BetterLinks.selectionFragments = function selectionFragments(selection) {
    const groups = BetterLinks.selectionLineGroups(selection);
    return groups.length ? groups[0] : [];
  };

  BetterLinks.currentSelectionText = function currentSelectionText() {
    const field = BetterLinks.readFieldSelection(document.activeElement);
    if (field) return field.text;
    const selection = window.getSelection();
    return selection ? selection.toString() : "";
  };
})(globalThis);
