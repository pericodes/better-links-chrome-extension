const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

eval(fs.readFileSync(path.join(__dirname, "link.js"), "utf8"));
eval(fs.readFileSync(path.join(__dirname, "../content/targets/selection.js"), "utf8"));

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

test("resolves each fragment of a wider selection", () => {
  const { resolveTextFragments } = globalThis.BetterLinks;
  assert.deepEqual(
    resolveTextFragments(["https://a.example/1", "https://b.example/2"], false),
    ["https://a.example/1", "https://b.example/2"]
  );
  assert.deepEqual(
    resolveTextFragments("https://a.example\nhttps//b.example\n\nhola\n- ejemplo.com", true),
    ["https://a.example", "https://b.example", "https://ejemplo.com"]
  );
  assert.deepEqual(resolveTextFragments(["https//roto.com", "1. ok.com/a"], false), ["https://ok.com/a"]);
  assert.deepEqual(resolveTextFragments(["https//roto.com", "1. ok.com/a"], true), ["https://roto.com", "https://ok.com/a"]);
  assert.deepEqual(resolveTextFragments(["javascript:alert(1)", "hola mundo"], true), []);
});

test("treats each non-inline element as its own line", () => {
  const { linesFromNodes, resolveTextFragments } = globalThis.BetterLinks;
  const text = (value) => ({ nodeType: 3, textContent: value });
  const el = (tag, ...children) => ({ nodeType: 1, tagName: tag, childNodes: children });
  const frag = (...children) => ({ nodeType: 11, childNodes: children });

  const pasted = frag(
    el("LI", el("DIV", text("https://site.com/a/cf6LgJGo"))),
    el("LI", el("DIV", el("SPAN", text("https://site.com/d/FNRDYD")))),
    el("LI", el("DIV", el("B", text("https://")), el("SPAN", text("putme.ga/album/x"))))
  );
  const lines = linesFromNodes(pasted);
  assert.deepEqual(lines, [
    "https://site.com/a/cf6LgJGo",
    "https://site.com/d/FNRDYD",
    "https://putme.ga/album/x",
  ]);
  assert.deepEqual(resolveTextFragments(lines, false), lines);

  assert.deepEqual(
    linesFromNodes(el("DIV", text("https://a.example"), el("BR"), text("https://b.example"))),
    ["https://a.example", "https://b.example"]
  );
  assert.deepEqual(
    linesFromNodes(el("P", el("SPAN", text("https://a.example")), el("B", text("/path")))),
    ["https://a.example/path"]
  );
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
