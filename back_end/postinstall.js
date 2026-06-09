const fs = require("fs");
const path = require("path");

const ppPath = path.join(__dirname, "node_modules", "pg-pool", "index.js");

try {
  let code = fs.readFileSync(ppPath, "utf8");
  // Fix broken Error.captureStackTrace call (pg-pool bug)
  if (code.includes("Error.y\n    captureStackTrace(err)")) {
    code = code.replace("Error.y\n    captureStackTrace(err)", "Error.captureStackTrace(err)");
    fs.writeFileSync(ppPath, code, "utf8");
    console.log("[postinstall] Fixed pg-pool Error.captureStackTrace bug");
  }
} catch (err) {
  // pg-pool might not be installed yet; skip silently
}
