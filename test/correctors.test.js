const assert = require("node:assert/strict");
const test = require("node:test");
const { load } = require("./support/load");

load(
  "src/shared/link.js",
  "src/shared/i18n.js",
  "src/shared/correctors.js",
  "src/shared/actions.js",
  "src/shared/defaults.js"
);

const { applyLinkCorrectors, activeCorrectors, defaultLinkCorrectors, normalizeSettings } = globalThis.BetterLinks;

const defaults = defaultLinkCorrectors("es");

test("default correctors accept the Pastebin lines and repair a broken protocol", () => {
  const run = (text, fixLinks) => applyLinkCorrectors(text, activeCorrectors(defaults, fixLinks));
  assert.equal(run("https://site.com/a/cf6LgJGo", true), "https://site.com/a/cf6LgJGo");
  assert.equal(run("https//site.com/a/KKh1SZe6", true), "https://site.com/a/KKh1SZe6");
  assert.equal(run("http:/site.com/d/FNRDYD", true), "http://site.com/d/FNRDYD");
  assert.equal(run("ejemplo.com/ruta", true), "https://ejemplo.com/ruta");
  assert.equal(run("https//site.com/a/KKh1SZe6", false), null);
  assert.equal(run("Owo", true), null);
  assert.equal(run("File !Pics & ViDs :", true), null);
  assert.equal(run("javascript:alert(1)", true), null);
});

test("a broken corrector is skipped and the next valid one is used", () => {
  const list = [
    { id: "boom", name: "falla", notes: "", code: "throw new Error('roto');" },
    {
      id: "bad-true",
      name: "dice que sí pero no es un enlace",
      notes: "",
      code: "return 'no es un enlace';",
    },
    {
      id: "fix-site",
      name: "arregla site",
      notes: "",
      code: "if (text === 'https//site.com/a/cf6LgJGo') return 'https://site.com/a/cf6LgJGo'; return '';",
    },
  ];
  assert.equal(applyLinkCorrectors("https//site.com/a/cf6LgJGo", list), "https://site.com/a/cf6LgJGo");
});

test("the first function that yields a valid link wins", () => {
  const list = [
    {
      id: "first",
      name: "primera",
      notes: "",
      code: "return 'https://site.com/d/w4hnPe';",
    },
    {
      id: "second",
      name: "segunda",
      notes: "",
      code: "return 'https://putme.ga/album/hannahowo-full.ybnRY';",
    },
  ];
  assert.equal(applyLinkCorrectors("https://site.com/a/cf6LgJGo", list), "https://site.com/d/w4hnPe");
});

test("a broken Pastebin line fails until the repair corrector", () => {
  const { traceLinkCorrectors } = globalThis.BetterLinks;
  const trace = traceLinkCorrectors("https//site.com/a/cf6LgJGo", activeCorrectors(defaults, true));
  assert.equal(trace.url, "https://site.com/a/cf6LgJGo");
  assert.equal(trace.winner.id, "repair-protocol");
  assert.deepEqual(
    trace.steps.map((step) => step.status),
    ["fail", "pass", "skipped"]
  );
  assert.equal(traceLinkCorrectors("Owo", activeCorrectors(defaults, true)).url, null);
});

test("an inactive corrector is skipped", () => {
  const list = [
    {
      id: "off",
      enabled: false,
      name: "apagado",
      notes: "",
      code: "return 'https://site.com/d/w4hnPe';",
    },
    {
      id: "on",
      enabled: true,
      name: "encendido",
      notes: "",
      code: "return 'https://site.com/a/cf6LgJGo';",
    },
  ];
  assert.equal(
    applyLinkCorrectors("https://putme.ga/album/hannahowo-full.ybnRY", list),
    "https://site.com/a/cf6LgJGo"
  );
});

test("default correctors still accept a Pastebin url when eval is blocked", () => {
  const original = globalThis.Function;
  globalThis.Function = function Function() {
    const error = new EvalError(
      "Refused to evaluate a string as JavaScript because 'unsafe-eval' is not an allowed source of script"
    );
    error.name = "EvalError";
    throw error;
  };
  try {
    const edited = defaults.map((item) => (item.id === "plain-url" ? Object.assign({}, item, { code: "return '';" }) : item));
    assert.equal(applyLinkCorrectors("https://site.com/a/cf6LgJGo", activeCorrectors(edited, true)), "https://site.com/a/cf6LgJGo");
    assert.equal(applyLinkCorrectors("https//site.com/a/KKh1SZe6", activeCorrectors(defaults, true)), "https://site.com/a/KKh1SZe6");
  } finally {
    globalThis.Function = original;
  }
});

test("with no correctors the text is not a link", () => {
  assert.equal(applyLinkCorrectors("https://site.com/d/ocnydH", []), null);
});

test("missing correctors fall back to the defaults and an empty list stays empty", () => {
  const fresh = normalizeSettings({ language: "es" });
  assert.deepEqual(fresh.linkCorrectors.map((item) => item.id), ["plain-url", "repair-protocol", "bare-domain"]);
  const cleared = normalizeSettings({ language: "es", linkCorrectors: [] });
  assert.deepEqual(cleared.linkCorrectors, []);
});
