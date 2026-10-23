import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const cfgPath = path.join(os.homedir(), ".workbuddy", "mcp.json");
const cfg = JSON.parse(fs.readFileSync(cfgPath, "utf8"));
const server = cfg.mcpServers["mcd-mcp"];
if (!server) throw new Error("mcd-mcp not found in mcp.json");

const token = String(server.headers?.Authorization || "").replace(/^Bearer\s+/i, "");
if (!token) throw new Error("missing token");

const transport = new StreamableHTTPClientTransport(new URL(server.url), {
  requestInit: { headers: { Authorization: `Bearer ${token}` } },
});
const client = new Client({ name: "mcd-introspect", version: "1.0.0" });

await client.connect(transport);

const { tools } = await client.listTools();
fs.writeFileSync(
  path.join(process.cwd(), "tools.json"),
  JSON.stringify(tools, null, 2)
);

console.log(`tools: ${tools.length}`);
for (const t of tools) {
  const keys = Object.keys(t.inputSchema?.properties || {});
  const required = t.inputSchema?.required || [];
  console.log(
    `${t.name} | args: ${keys.map((k) => (required.includes(k) ? `${k}*` : k)).join(",") || "-"}`
  );
}

const time = await client.callTool({ name: "now-time-info", arguments: {} });
console.log("now-time-info:", JSON.stringify(time.content).slice(0, 300));

await client.close();
