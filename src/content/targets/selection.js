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

  BetterLinks.currentSelectionText = function currentSelectionText() {
    const field = BetterLinks.readFieldSelection(document.activeElement);
    if (field) return field.text;
    const selection = window.getSelection();
    return selection ? selection.toString() : "";
  };
})(globalThis);
