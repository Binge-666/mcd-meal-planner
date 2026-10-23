import fs from "node:fs";

const files = process.argv.slice(2);
for (const f of files) {
  const t = fs.readFileSync(`probe/${f}.txt`, "utf8");
  const k = t.indexOf('{"success"');
  console.log(`\n===== ${f} (${t.length} chars) =====`);
  if (k < 0) {
    console.log(t.slice(0, 800));
    continue;
  }
  let j;
  try {
    j = JSON.parse(t.slice(k));
  } catch (e) {
    console.log("parse error", e.message);
    console.log(t.slice(k, k + 800));
    continue;
  }
  const d = j.data;
  console.log("data type:", Array.isArray(d) ? `array(${d.length})` : typeof d);
  const sample = Array.isArray(d) ? d[0] : d;
  console.log("keys:", sample && typeof sample === "object" ? Object.keys(sample) : "-");
  console.log(JSON.stringify(sample).slice(0, 2200));
}
