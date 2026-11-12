import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const vendorPath = path.join(__dirname, "../public/vendor/dymo.connect.framework.js");
let source = fs.readFileSync(vendorPath, "utf8");
const pattern =
  /dymo\.xml\.serialize=function\(e\)\{return goog\.dom\.xml\.serialize\(e\)\.replaceAll\([^}]+\)\}/;
const replacement = String.raw`dymo.xml.serialize=function(e){var o=goog.dom.xml.serialize(e);return o.replace(/<(ForeColor|BackColor|Font|TextFont|CheckSumFont|Color|LinkedObjectName|RoundRectangle|Bounds)([^>]*?)\s*\/>/gi,"<$1$2> </$1>")}`;
if (!pattern.test(source)) {
  console.error("DYMO vendor serialize hook not found; file may already be patched.");
  process.exit(1);
}
source = source.replace(pattern, replacement);
fs.writeFileSync(vendorPath, source);
console.log("Patched", vendorPath);
