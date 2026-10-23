import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { planCombos } from "../lib/planner.mjs";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(dirname, "..");
const args = process.argv.slice(2);

function arg(name, fallback) {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  return args[index + 1] ?? fallback;
}

function readJson(relative) {
  return JSON.parse(fs.readFileSync(path.join(root, relative), "utf8").replace(/^\uFEFF/, ""));
}

let input;

if (args.includes("--demo")) {
  const menu = readJson("demo-data/menu.json");
  const coupons = readJson("demo-data/coupons.json").coupons || [];
  input = {
    items: menu.items,
    targetKcal: Number(arg("--kcal", 700)),
    tastes: String(arg("--tastes", "")).split(",").filter(Boolean),
    mealTime: arg("--meal", "lunch"),
    budget: Number(arg("--budget", 0)),
    includeDessert: args.includes("--dessert"),
    coupons,
    variant: Number(arg("--variant", 0)),
  };
} else {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  input = JSON.parse(chunks.join("") || "{}");
}

const result = planCombos(input);
console.log(JSON.stringify(result, null, 2));
