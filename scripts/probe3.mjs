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
const client = new Client({ name: "mcd-probe3", version: "1.0.0" });
await client.connect(transport);

async function call(name, args) {
  const res = await client.callTool({ name, arguments: args });
  const text = (res.content || []).map((c) => c.text || "").join("\n");
  fs.writeFileSync(path.join("probe", `${name}-3.txt`), text);
  return text;
}

const price = await call("calculate-price", {
  storeCode: "1950564",
  orderType: 1,
  beType: 1,
  items: [
    { productCode: "1100", quantity: 1 },
    { productCode: "4810", quantity: 1 },
    { productCode: "3010", quantity: 1 },
  ],
});
console.log(price.slice(price.indexOf('{"success"'), price.indexOf('{"success"') + 1600));

const coupons = await call("query-store-coupons", { storeCode: "1950564", orderType: 1, beType: 1 });
console.log("\n\nCOUPONS:", coupons.slice(coupons.indexOf('{"success"'), coupons.indexOf('{"success"') + 1200));

await client.close();
