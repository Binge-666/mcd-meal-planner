import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const mcpLog = [];
const MAX_MCP_LOG = 50;

function pushMcpLog(entry) {
  mcpLog.push(entry);
  if (mcpLog.length > MAX_MCP_LOG) {
    mcpLog.shift();
  }
}

export function getMcpLog() {
  const total = mcpLog.length;
  const ok = mcpLog.filter((e) => e.ok).length;
  const failed = total - ok;
  const avgMs = total ? Math.round(mcpLog.reduce((sum, e) => sum + (Number(e.ms) || 0), 0) / total) : 0;
  return {
    ok: true,
    mode: "live",
    entries: [...mcpLog].reverse(),
    summary: { total, ok, failed, avgMs },
  };
}

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
  const start = Date.now();
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const client = await getClient();
      const res = await client.callTool({ name, arguments: args });
      const text = (res.content || [])
        .filter((item) => item.type === "text")
        .map((item) => item.text || "")
        .join("\n");
      if (res.isError) throw new Error(text || `${name} 调用失败`);
      const data = extractJson(text);
      let count = null;
      if (Array.isArray(data)) count = data.length;
      else if (data && typeof data === "object") {
        if (Array.isArray(data.stores)) count = data.stores.length;
        else if (Array.isArray(data.items)) count = data.items.length;
        else if (Array.isArray(data.list)) count = data.list.length;
        else if (Array.isArray(data.foods)) count = data.foods.length;
        else if (Array.isArray(data.coupons)) count = data.coupons.length;
        else if (Array.isArray(data.results)) count = data.results.length;
        else if (Array.isArray(data.combos)) count = data.combos.length;
        else if (data.total != null) count = data.total;
      }
      pushMcpLog({
        name,
        ms: Date.now() - start,
        ok: true,
        count,
        attempts: attempt + 1,
        at: new Date().toISOString(),
      });
      return { text, data };
    } catch (err) {
      lastError = err;
      clientPromise = null;
    }
  }
  pushMcpLog({
    name,
    ms: Date.now() - start,
    ok: false,
    count: null,
    attempts: 2,
    error: String(lastError?.message || lastError || "").slice(0, 200),
    at: new Date().toISOString(),
  });
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
