const assert = require("node:assert/strict");
const test = require("node:test");
const { load } = require("./support/load");

load("src/shared/link.js");

const { repairUrl, resolveTextLink, resolveAnchorUrl, resolveTextFragments } = globalThis.BetterLinks;

test("repairs the broken protocols described in the options", () => {
  assert.equal(repairUrl("https//sdf"), "https://sdf");
  assert.equal(repairUrl("http:/fds"), "http://fds");
  assert.equal(repairUrl("https:/ejemplo.com"), "https://ejemplo.com");
  assert.equal(repairUrl("htps://example.com"), "https://example.com");
  assert.equal(repairUrl("htp://example.com"), "http://example.com");
  assert.equal(repairUrl("https:///example.com"), "https://example.com");
  assert.equal(repairUrl("https://bunkr.is/a/cf6LgJGo"), "https://bunkr.is/a/cf6LgJGo");
});

test("resolves a single selected address", () => {
  assert.equal(resolveTextLink("https://bunkr.is/a/cf6LgJGo", false), "https://bunkr.is/a/cf6LgJGo");
  assert.equal(resolveTextLink("http://gofile.io/d/FNRDYD", false), "http://gofile.io/d/FNRDYD");
  assert.equal(resolveTextLink("ejemplo.com/ruta", false), "https://ejemplo.com/ruta");
  assert.equal(resolveTextLink("www.ejemplo.com:8080/q?x=1", false), "https://www.ejemplo.com:8080/q?x=1");
  assert.equal(resolveTextLink("  https://putme.ga/album/hannahowo-full.ybnRY  ", false), "https://putme.ga/album/hannahowo-full.ybnRY");
  assert.equal(resolveTextLink("https//bunkr.is/a/cf6LgJGo", true), "https://bunkr.is/a/cf6LgJGo");
  assert.equal(resolveTextLink("https//bunkr.is/a/cf6LgJGo", false), null);
  assert.equal(resolveTextLink("http:/gofile.io/d/FNRDYD", true), "http://gofile.io/d/FNRDYD");
  assert.equal(resolveTextLink("File !Pics & ViDs :", true), null);
  assert.equal(resolveTextLink("Owo", true), null);
  assert.equal(resolveTextLink("javascript:alert(1)", true), null);
});

test("resolves a paste copied as separate lines", () => {
  const pasted = [
    "Owo",
    "https://bunkr.is/a/V919Dpti",
    "https//bunkr.is/a/KKh1SZe6",
    "",
    "ViDs : https://cyberdrop.me/a/40oFSGfd",
    "https://gofile.io/d/FNRDYD",
  ].join("\n");
  assert.deepEqual(resolveTextFragments(pasted, true), [
    "https://bunkr.is/a/V919Dpti",
    "https://bunkr.is/a/KKh1SZe6",
    "https://gofile.io/d/FNRDYD",
  ]);
  assert.deepEqual(resolveTextFragments(pasted, false), [
    "https://bunkr.is/a/V919Dpti",
    "https://gofile.io/d/FNRDYD",
  ]);
});

test("resolves anchor hrefs from a page", () => {
  assert.equal(resolveAnchorUrl("https://gofile.io/d/w4hnPe", "https://gofile.io/d/w4hnPe", false), "https://gofile.io/d/w4hnPe");
  assert.equal(resolveAnchorUrl("/ruta", "https://ejemplo.com/ruta", false), "https://ejemplo.com/ruta");
  assert.equal(
    resolveAnchorUrl("https//bunkr.is/a/cf6LgJGo", "https://pastebin.com/https//bunkr.is/a/cf6LgJGo", true),
    "https://bunkr.is/a/cf6LgJGo"
  );
  assert.equal(
    resolveAnchorUrl("https//bunkr.is/a/cf6LgJGo", "https://pastebin.com/https//bunkr.is/a/cf6LgJGo", false),
    null
  );
  assert.equal(resolveAnchorUrl("javascript:alert(1)", "javascript:alert(1)", true), null);
});
