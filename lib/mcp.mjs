import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

function readConfig() {
  if (process.env.MCD_TOKEN) {
    return {
      url: process.env.MCD_MCP_URL || "https://mcp.mcd.cn",
      token: process.env.MCD_TOKEN,
    };
  }
  const file = path.join(os.homedir(), ".workbuddy", "mcp.json");
  const cfg = JSON.parse(fs.readFileSync(file, "utf8"));
  const server = cfg.mcpServers?.["mcd-mcp"];
  if (!server) throw new Error("mcd-mcp not found in ~/.workbuddy/mcp.json");
  const token = String(server.headers?.Authorization || "").replace(/^Bearer\s+/i, "");
  return { url: server.url || "https://mcp.mcd.cn", token };
}

let clientPromise = null;

async function connect() {
  const { url, token } = readConfig();
  if (!token) throw new Error("缺少 MCP Token");
  const transport = new StreamableHTTPClientTransport(new URL(url), {
    requestInit: { headers: { Authorization: `Bearer ${token}` } },
  });
  const client = new Client({ name: "mcd-meal-planner", version: "1.0.0" });
  await client.connect(transport);
  return client;
}

async function getClient() {
  if (!clientPromise) {
    clientPromise = connect().catch((err) => {
      clientPromise = null;
      throw err;
    });
  }
  return clientPromise;
}

export function extractJson(text) {
  const marker = text.indexOf('{"success"');
  if (marker < 0) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = marker; i < text.length; i += 1) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        try {
          return JSON.parse(text.slice(marker, i + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

export async function callMcp(name, args = {}) {
  let lastError;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const client = await getClient();
      const res = await client.callTool({ name, arguments: args });
      const text = (res.content || [])
        .filter((item) => item.type === "text")
        .map((item) => item.text || "")
        .join("\n");
      if (res.isError) throw new Error(text || `${name} 调用失败`);
      return { text, data: extractJson(text) };
    } catch (err) {
      lastError = err;
      clientPromise = null;
    }
  }
  throw lastError;
}

const cache = new Map();

export async function cached(key, ttlMs, loader) {
  const hit = cache.get(key);
  const now = Date.now();
  if (hit && now - hit.at < ttlMs) return hit.value;
  const value = await loader();
  cache.set(key, { at: now, value });
  return value;
}

export function clearCache() {
  cache.clear();
}
