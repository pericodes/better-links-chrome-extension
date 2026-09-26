const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

eval(fs.readFileSync(path.join(__dirname, "video.js"), "utf8"));

const { canonicalPlayerUrl } = globalThis.BetterLinks;

test("rewrites YouTube pages to the watch url", () => {
  assert.equal(
    canonicalPlayerUrl("https://www.youtube.com/embed/dQw4w9WgXcQ"),
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
  );
  assert.equal(
    canonicalPlayerUrl("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?start=10"),
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
  );
  assert.equal(
    canonicalPlayerUrl("https://youtu.be/dQw4w9WgXcQ"),
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
  );
  assert.equal(
    canonicalPlayerUrl("https://www.youtube.com/shorts/dQw4w9WgXcQ"),
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
  );
  assert.equal(
    canonicalPlayerUrl("https://www.youtube.com/live/dQw4w9WgXcQ"),
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
  );
  assert.equal(
    canonicalPlayerUrl("https://m.youtube.com/watch?v=dQw4w9WgXcQ&t=30"),
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
  );
});

test("rewrites Vimeo player pages and keeps the video page", () => {
  assert.equal(canonicalPlayerUrl("https://player.vimeo.com/video/123456"), "https://vimeo.com/123456");
  assert.equal(canonicalPlayerUrl("https://vimeo.com/123456"), "https://vimeo.com/123456");
  assert.equal(canonicalPlayerUrl("https://www.vimeo.com/123456"), "https://vimeo.com/123456");
});

test("rejects streams, scripts, and pages that are not a known player", () => {
  assert.equal(canonicalPlayerUrl("blob:https://www.youtube.com/abc"), null);
  assert.equal(canonicalPlayerUrl("javascript:alert(1)"), null);
  assert.equal(canonicalPlayerUrl("https://example.com/embed/player"), null);
  assert.equal(canonicalPlayerUrl("https://www.youtube.com/feed/subscriptions"), null);
  assert.equal(canonicalPlayerUrl("https://vimeo.com/channels/staffpicks"), null);
  assert.equal(canonicalPlayerUrl(""), null);
});
