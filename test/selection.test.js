const assert = require("node:assert/strict");
const test = require("node:test");
const { load } = require("./support/load");
const { parseHtml } = require("./support/html");

load(
  "src/shared/link.js",
  "src/shared/i18n.js",
  "src/shared/correctors.js",
  "src/content/targets/selection.js"
);

const { linesFromNodes, resolveTextFragments, defaultLinkCorrectors } = globalThis.BetterLinks;

// Líneas tal como aparecen en el paste de la captura, sin inventar direcciones.
const PASTE_LINES = [
  "Owo",
  "File !Pics & ViDs :",
  "https://site.com/a/V919Dpti",
  "https://site.com/a/KKh1SZe6",
  "https://site.com/a/ACBi5J44",
  "",
  "ViDs : https://cyberdrop.me/a/40oFSGfd",
  "Pics : https://cyberdrop.me/a/Bqe03XWv",
  "Bj ViD : https://site.com/a/HoR9JWci",
  "",
  "",
  "",
  "",
  "https://site.com/a/cf6LgJGo",
  "https://theleaknetwork.com/files/hannahowo",
  "https://site.com/d/FNRDYD",
  "https://site.com/d/w4hnPe",
  "https://cyberdrop.me/a/ouycxEym",
  "https://putme.ga/album/hannahowo-full.ybnRY",
  "",
  "",
  "https://site.com/d/ocnydH",
  "https://cyberdrop.me/a/0i7459QP",
  "Telegram chanel : https://t.me/joinchat/j0Iz3uxoYywwYzI0",
];

const PURE_URLS = PASTE_LINES.filter((line) => /^https?:\/\//.test(line));

function escapeHtml(value) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;");
}

// Pastebin pinta cada línea en su propio li > div, sin <br> y sin salto dentro del texto.
function pastebinHtml(lines) {
  return `<ol class="text">${lines
    .map((line, index) => {
      const cls = index % 2 === 0 ? "li1" : "li2";
      return `<li class="${cls}"><div class="de1">${escapeHtml(line)}</div></li>`;
    })
    .join("")}</ol>`;
}

function linksIn(html) {
  return resolveTextFragments(linesFromNodes(parseHtml(html)), true, defaultLinkCorrectors("en"));
}

test("reads each Pastebin line as its own link when lines are separate elements", () => {
  assert.deepEqual(linksIn(pastebinHtml(PASTE_LINES)), PURE_URLS);
});

test("reads the same paste when each address is separated by br", () => {
  const html = `<div class="post">${PASTE_LINES.map(escapeHtml).join("<br>")}</div>`;
  assert.deepEqual(linksIn(html), PURE_URLS);
});

test("keeps a highlighted address in one line when span and b wrap parts of it", () => {
  const html =
    '<li class="li1"><div class="de1"><span class="syn">https</span>://<b>site.com</b>/a/cf6LgJGo</div></li>';
  assert.deepEqual(linksIn(html), ["https://site.com/a/cf6LgJGo"]);
});
