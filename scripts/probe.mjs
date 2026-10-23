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
const client = new Client({ name: "mcd-probe", version: "1.0.0" });
await client.connect(transport);

const outDir = path.join(process.cwd(), "probe");
fs.mkdirSync(outDir, { recursive: true });

async function call(name, args) {
  const res = await client.callTool({ name, arguments: args });
  const text = (res.content || []).map((c) => c.text || "").join("\n");
  fs.writeFileSync(path.join(outDir, `${name}.txt`), text);
  return text;
}

const nutrition = await call("list-nutrition-foods", {});
console.log("nutrition length:", nutrition.length);

const stores = await call("query-nearby-stores", {
  beType: 1,
  searchType: 2,
  city: "厦门",
  keyword: "中山路",
});
console.log("stores length:", stores.length);

const calendar = await call("campaign-calendar", {});
console.log("calendar length:", calendar.length);

let storeCode = null;
try {
  const m = stores.match(/"storeCode"\s*:\s*"(\d+)"/);
  storeCode = m && m[1];
} catch {}
console.log("first storeCode:", storeCode);

if (storeCode) {
  const meals = await call("query-meals", { storeCode, orderType: 1, beType: 1 });
  console.log("meals length:", meals.length);
  const coupons = await call("query-store-coupons", { storeCode, orderType: 1, beType: 1 });
  console.log("coupons length:", coupons.length);
}

await client.close();
