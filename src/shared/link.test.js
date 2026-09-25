const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

eval(fs.readFileSync(path.join(__dirname, "link.js"), "utf8"));

const { repairUrl, resolveTextLink, resolveAnchorUrl } = globalThis.BetterLinks;

test("repairs broken protocols", () => {
  assert.equal(repairUrl("https//sdf"), "https://sdf");
  assert.equal(repairUrl("http:/fds"), "http://fds");
  assert.equal(repairUrl("https:/ejemplo.com"), "https://ejemplo.com");
  assert.equal(repairUrl("htps://example.com"), "https://example.com");
  assert.equal(repairUrl("htp://example.com"), "http://example.com");
  assert.equal(repairUrl("https:///example.com"), "https://example.com");
  assert.equal(repairUrl("https://example.com/a"), "https://example.com/a");
});

test("resolves selected text", () => {
  assert.equal(resolveTextLink("https://example.com/a", false), "https://example.com/a");
  assert.equal(resolveTextLink("http://example.com", false), "http://example.com");
  assert.equal(resolveTextLink("ejemplo.com/ruta", false), "https://ejemplo.com/ruta");
  assert.equal(resolveTextLink("www.ejemplo.com:8080/q?x=1", false), "https://www.ejemplo.com:8080/q?x=1");
  assert.equal(resolveTextLink("https//sdf", true), "https://sdf");
  assert.equal(resolveTextLink("https//sdf", false), null);
  assert.equal(resolveTextLink("http:/fds", true), "http://fds");
  assert.equal(resolveTextLink("hola mundo", true), null);
  assert.equal(resolveTextLink("hola", true), null);
  assert.equal(resolveTextLink("javascript:alert(1)", true), null);
  assert.equal(resolveTextLink("  https://example.com  ", false), "https://example.com");
});

test("resolves anchor hrefs", () => {
  assert.equal(
    resolveAnchorUrl("https://ok.com/a", "https://ok.com/a", false),
    "https://ok.com/a"
  );
  assert.equal(
    resolveAnchorUrl("/ruta", "https://example.com/ruta", false),
    "https://example.com/ruta"
  );
  assert.equal(
    resolveAnchorUrl("https//broken.com", "https://page.test/https//broken.com", true),
    "https://broken.com"
  );
  assert.equal(
    resolveAnchorUrl("https//broken.com", "https://page.test/https//broken.com", false),
    null
  );
  assert.equal(resolveAnchorUrl("javascript:alert(1)", "javascript:alert(1)", true), null);
});
