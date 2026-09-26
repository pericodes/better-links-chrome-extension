# Better Links

Chrome extension (Manifest V3) that acts on selected text that looks like a URL, on `<a>` elements, and on `<img>` elements. Vanilla JavaScript, no bundler, no npm dependencies.

The unpacked extension root is `src/` (where `manifest.json` lives). Load that folder in `chrome://extensions` with Developer mode.

## Runtimes

Three isolated worlds. Do not put DOM code in the service worker, and do not call `chrome.tabs`, `chrome.windows`, `chrome.downloads`, or `chrome.contextMenus` from a content script.

| Runtime | Entry | Can use |
|---|---|---|
| Content script | `src/content/content.js` | DOM, selection, tooltip, `navigator.clipboard` |
| Service worker | `src/background/service-worker.js` | tabs, windows, downloads, context menus |
| Options page | `src/options/options.js` | the settings form |

Privileged work crosses the boundary with `chrome.runtime.sendMessage`.

## Scripts and the `BetterLinks` namespace

Content scripts cannot use `import`. Every shared file is a classic IIFE that attaches functions to `globalThis.BetterLinks`:

```javascript
(function (root) {
  const BetterLinks = root.BetterLinks || (root.BetterLinks = {});
  BetterLinks.someHelper = function someHelper() {};
})(globalThis);
```

Load order is the dependency order. A file may call another file's functions only after that file has been listed earlier.

Content scripts, in [`src/manifest.json`](src/manifest.json), in this order: `shared/defaults.js`, `shared/link.js`, `shared/i18n.js`, `shared/actions.js`, `content/targets/*.js`, `content/actions/*.js`, `content/tooltip.js`, `content/gestures.js`, `content/content.js`.

The service worker `importScripts` those shared files plus `background/frames.js`, `background/open.js`, `background/image.js`, and `background/context-menu.js`, using `chrome.runtime.getURL` so the paths stay relative to `src/`. The options page loads `defaults.js`, `i18n.js`, and `actions.js` from [`src/options/options.html`](src/options/options.html).

When you add a shared file, register it in every runtime that calls it, before any file that uses it.

## What each area owns

**Recognize the target** — `src/content/targets/`. Decide what is under the pointer or in the selection, and whether this extension handles it. `resolve.js` returns `{ anchor, image }` for an event. Selection helpers live in `selection.js`.

- Selected text, including a selection inside `input` / `textarea`. Ignore a selection that sits entirely inside an `<a>`.
- An `<a href>`.
- An `<img>`. An image can also sit inside an `<a>`; both targets can be active at once.

URL resolution stays in [`src/shared/link.js`](src/shared/link.js): `resolveTextLink`, `resolveAnchorUrl`, `repairUrl`, `isHttpUrl`. Do not reimplement that in the content script.

**Action catalog** — `src/shared/actions.js`. Each id has a `kind` (`open`, `copyLink`, `copyImage`, `saveImage`) and the surfaces where it appears (`textClick`, `anchorClick`, `tooltip`, `imageClick`, `imageTooltip`, `menu`). `actionsFor` / `actionChoices` feed `normalizeSettings` and the options form. `none` is not an action; it is appended only for click settings.

**Generic link actions.** Same four operations for text, anchors, and image URLs. Content side: `src/content/actions/link.js` (`runLinkAction`). Background side: `src/background/open.js` (`openFromAction`, `handleOpenMessage`).

- `newWindow` — open in a new window
- `newTab` — open in a new tab and stay on the current one
- `newTabAndSwitch` — open in a new tab and switch to it
- `copy` — copy the resolved URL

The content script asks the service worker to open (`{ type: "open", mode, url, active? }`). Copying text stays in the content script, where the user gesture is. `newTab` sends `active: false`. Omitting `active` means switch to the new tab.

**Image actions.** Only for an image URL:

- `copyImageLink` — copy the image URL (reuse link copy)
- `copyImage` — message `{ type: "imagePng", url }`, then write a PNG to the clipboard
- `saveImage` — message `{ type: "saveImage", url }`

`src/content/actions/image.js` sends the messages. `src/content/actions/run.js` (`runAction`) dispatches by `kind`. Filename sniffing, `chrome.downloads`, and the PNG conversion live in `src/background/image.js`.

**Tooltip** — `src/content/tooltip.js` (Shadow DOM). It does not decide what is under the pointer. Callers pass groups of `{ actions, url, target }`. A link and an image under the same pointer are two rows (`target` `"link"` and `"image"`). Styles stay inside the shadow tree.

**Context menu** — `src/background/context-menu.js`. Per-tab text, link, and image URLs live in `src/background/frames.js`. Selection items are shown only when the selection resolves to an http(s) URL. Link and image items stay visible. "Search on Google" is menu-only; it is not a link action. The content script reports the current selection, link, and image on `contextmenu` with `{ type: "selection" | "link" | "image" }`.

**Click gestures** — `src/content/gestures.js`. 1 / 2 / 3 clicks are counted in a 450 ms window (`CLICK_WINDOW_MS`). The gesture of selecting text does not count. A plain click on an `<a>` still navigates; clicks 2 and 3 are the configurable ones. Image click 1 defaults to `none`, and then a parent `<a>` navigates as usual. `src/content/content.js` only wires events, settings, and the selection report.

## Settings

Stored in `chrome.storage.sync`. Always read and write them through `BetterLinks.normalizeSettings` in [`src/shared/defaults.js`](src/shared/defaults.js). Do not trust raw storage.

Action ids allowed today come from the catalog, not from hand-written lists:

- Text clicks: `newWindow`, `newTab`, `newTabAndSwitch`, `copy`, `none`
- Anchor clicks and the link tooltip: those four, without `none`
- Image clicks: `newWindow`, `newTab`, `newTabAndSwitch`, `copyImageLink`, `copyImage`, `saveImage`, `none`
- Image tooltip: the image actions, without `none`

`none` means "do nothing" and exists only on click settings. `anchorMode` is `ignore` or `clicks`. Older stored values `tooltip`, `both`, and the action name `newTabAndOpen` are migrated inside `normalizeSettings`; keep that migration.

The options form disables anchor click 2 and 3 when `anchorMode` does not apply clicks. On save it maps the "show tooltip on links" checkbox back onto `anchorMode` (`tooltip`, `clicks`, `both`, or `ignore`). Preserve that mapping.

## Strings

[`src/shared/i18n.js`](src/shared/i18n.js) holds the UI copy (`BetterLinks.t(lang, key)`). [`src/_locales/en`](src/_locales/en/messages.json) and [`src/_locales/es`](src/_locales/es/messages.json) are only the extension name and description in `chrome://extensions`, because `chrome.i18n` cannot switch language at runtime.

`language` is `auto`, `es`, or `en`. `auto` follows the browser language and falls back to English. Add every new user-visible string in both `es` and `en`.

## URLs

Only `http:` and `https:` may be opened, copied as a navigation target, or downloaded. The content script validates with `BetterLinks.isHttpUrl` (requires a hostname). The service worker validates again with `isSafeHttpUrl` (scheme only) before `tabs` / `windows` / `downloads`. Keep both checks.

`fixLinks` repairs broken protocols (`https//sdf`, `http:/fds`, `htps://`, extra slashes) before validation. With the option off, those strings are not links.

## Adding a feature

1. **Another element kind** (for example video): add `src/content/targets/video.js`, return it from `resolve.js`, and list the file in the manifest before `resolve.js`. Thread it through `gestures.js` and the `contextmenu` report. Do not bury the check inside an action.
2. **Another action**: add one entry in `src/shared/actions.js` and the label keys in `i18n.js`. Options and `normalizeSettings` pick it up from the catalog. Implement a new `kind` only if it is not `open`, `copyLink`, `copyImage`, or `saveImage`. Privileged work goes in `background/` behind a message `type`, dispatched from `service-worker.js`.
3. **Another tooltip row**: pass another group of catalog ids into `tooltip.schedule`. Do not special-case the shadow DOM.
4. **Another context-menu item**: add a row in `context-menu.js` that points at an action id. Perform the click with `openFromAction`. Titles refresh from `storage.onChanged`.

## Checks

After every code change, run the tests and do not finish while any test fails:

```bash
npm test
```

That runs every `*.test.js` file in [`test/`](test/). Use real cases: real URLs, real page markup, and the broken links a person actually selects. Do not invent inputs whose only purpose is to match the current code.

When you add or change behavior, add or update the tests in `test/` in the same change. URL repair and rejection stay in [`test/link.test.js`](test/link.test.js). Several links in one selection stay in [`test/selection.test.js`](test/selection.test.js).

Tooltip, clicks, and the context menu still need a reload in `chrome://extensions`: try selected text, an `<a>`, an `<img>`, an image wrapped in a link, clicks 1/2/3, and the context menu.

## Leave alone unless the task asks

- Behavior of clicks, tooltip delay, and menu visibility. A refactor moves code; it does not retune defaults.
- `src/scripts/make-icons.js` and the PNGs in `src/icons/`.
- The legacy settings migration in `normalizeSettings`.
