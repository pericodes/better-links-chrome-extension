const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { load } = require("./support/load");

const src = path.join(__dirname, "..", "src");
const manifest = JSON.parse(fs.readFileSync(path.join(src, "manifest.json"), "utf8"));

load("src/shared/hosts.js", "src/shared/i18n.js", "src/background/inject.js");

const { HOST_ORIGINS, contentScriptFiles, contentScriptCss, contentScriptRegistration, t } = globalThis.BetterLinks;

test("install does not request broad host access", () => {
  assert.equal(Object.hasOwn(manifest, "host_permissions"), false);
  assert.equal(Object.hasOwn(manifest, "content_scripts"), false);
  assert.equal(JSON.stringify(manifest).includes("<all_urls>"), false);
  assert.deepEqual(manifest.permissions, ["storage", "contextMenus", "downloads", "scripting"]);
  assert.deepEqual(manifest.optional_host_permissions, ["http://*/*", "https://*/*"]);
  assert.deepEqual(manifest.optional_host_permissions, HOST_ORIGINS);
});

test("content scripts register on http and https only, in dependency order", () => {
  const registration = contentScriptRegistration();
  assert.deepEqual(registration.matches, HOST_ORIGINS);
  assert.equal(registration.runAt, "document_idle");
  assert.equal(registration.allFrames, true);
  assert.equal(registration.js.at(-1), "content/content.js");
  assert.ok(registration.js.indexOf("content/targets/video.js") < registration.js.indexOf("content/targets/resolve.js"));
  assert.ok(registration.js.indexOf("content/actions/link.js") < registration.js.indexOf("content/actions/run.js"));
  assert.deepEqual(registration.js, contentScriptFiles);
  assert.deepEqual(registration.css, contentScriptCss);
  for (const file of registration.js.concat(registration.css)) {
    assert.equal(fs.existsSync(path.join(src, file)), true, file);
  }
});

test("page access copy exists in Spanish and English", () => {
  for (const key of ["options.hostAccess", "options.hostAccessHelp", "options.hostAccessGrant"]) {
    assert.notEqual(t("es", key), key);
    assert.notEqual(t("en", key), key);
    assert.notEqual(t("es", key), t("en", key));
  }
});
