const { readdirSync } = require("node:fs");
const { spawnSync } = require("node:child_process");
const path = require("node:path");

const files = readdirSync(__dirname)
  .filter((name) => name.endsWith(".test.js"))
  .map((name) => path.join(__dirname, name));

const result = spawnSync(process.execPath, ["--test", ...files], { stdio: "inherit" });
process.exit(result.status == null ? 1 : result.status);
