const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

eval(fs.readFileSync(path.join(__dirname, "actions.js"), "utf8"));
eval(fs.readFileSync(path.join(__dirname, "defaults.js"), "utf8"));

const { DEFAULTS, settingsForExport, settingsFromFile } = globalThis.BetterLinks;

test("exports only known settings", () => {
  const file = settingsForExport(Object.assign({}, DEFAULTS, { click1: "copy", extra: "ignore-me" }));
  assert.equal(file.click1, "copy");
  assert.equal(Object.hasOwn(file, "extra"), false);
  assert.deepEqual(Object.keys(file).sort(), Object.keys(DEFAULTS).sort());
});

test("imports an old file without resetting newer settings", () => {
  const current = Object.assign({}, DEFAULTS, {
    click1: "newWindow",
    imageClick2: "saveImage",
    language: "es",
  });
  const next = settingsFromFile(current, { click1: "copy", unknownFuture: true });
  assert.equal(next.click1, "copy");
  assert.equal(next.imageClick2, "saveImage");
  assert.equal(next.language, "es");
  assert.equal(Object.hasOwn(next, "unknownFuture"), false);
});

test("multi-link settings keep defaults and drop unknown actions", () => {
  const { normalizeSettings } = globalThis.BetterLinks;
  const fresh = normalizeSettings({ click1: "copy" });
  assert.equal(fresh.multiLinks, true);
  assert.equal(fresh.multiClick1, "none");
  assert.equal(fresh.multiClick2, "openAllNewWindow");
  assert.equal(fresh.multiClick3, "openAllCurrentWindow");
  assert.deepEqual(fresh.multiTooltipActions, ["openAllNewWindow", "openAllCurrentWindow", "copyLinks"]);

  const next = normalizeSettings({
    multiLinks: false,
    multiClick2: "not-an-action",
    multiTooltipActions: ["copyLinks", "nope"],
  });
  assert.equal(next.multiLinks, false);
  assert.equal(next.multiClick2, "openAllNewWindow");
  assert.deepEqual(next.multiTooltipActions, ["copyLinks"]);
});

test("rejects a file with no recognized options", () => {
  assert.equal(settingsFromFile(DEFAULTS, { notASetting: 1 }), null);
  assert.equal(settingsFromFile(DEFAULTS, null), null);
  assert.equal(settingsFromFile(DEFAULTS, []), null);
});
