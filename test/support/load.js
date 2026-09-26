const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..", "..");

function load(...files) {
  for (const file of files) {
    const code = fs.readFileSync(path.join(root, file), "utf8");
    const run = new Function(code);
    run();
  }
}

module.exports = { load };
