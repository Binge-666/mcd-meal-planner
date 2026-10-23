import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const cfg = JSON.parse(fs.readFileSync(path.join(os.homedir(), ".workbuddy", "mcp.json"), "utf8"));
const server = cfg.mcpServers["mcd-mcp"];
const token = String(server.headers?.Authorization || "").replace(/^Bearer\s+/i, "");
const transport = new StreamableHTTPClientTransport(new URL(server.url), {
  requestInit: { headers: { Authorization: `Bearer ${token}` } },
});
const client = new Client({ name: "mcd-probe2", version: "1.0.0" });
await client.connect(transport);

const outDir = path.join(process.cwd(), "probe");
async function call(name, args, tag = name) {
  const res = await client.callTool({ name, arguments: args });
  const text = (res.content || []).map((c) => c.text || "").join("\n");
  fs.writeFileSync(path.join(outDir, `${tag}.txt`), text);
  return text;
}
function parse(text) {
  const k = text.indexOf('{"success"');
  if (k < 0) return null;
  try { return JSON.parse(text.slice(k)); } catch { return null; }
}

const mealsText = fs.readFileSync(path.join(outDir, "query-meals.txt"), "utf8");
const meals = parse(mealsText)?.data;
console.log("meals list sample:", JSON.stringify(meals?.meals?.[0]));

const codes = ["521956", "9900000891", "1100", "9900004064"];
for (const code of codes) {
  const t = await call("query-meal-detail", { storeCode: "1950564", orderType: 1, beType: 1, code }, `detail-${code}`);
  const j = parse(t);
  const d = j?.data;
  console.log(`\n--- detail ${code} keys:`, d && typeof d === "object" ? Object.keys(d) : d);
  console.log(JSON.stringify(d).slice(0, 700));
}

const price = await call("calculate-price", {
  storeCode: "1950564",
  orderType: 1,
  beType: 1,
  items: [{ productCode: "1100", quantity: 1 }],
}, "price-1100");
console.log("\n--- price:", price.slice(price.indexOf('{"success"'), price.indexOf('{"success"') + 900));

await client.close();
