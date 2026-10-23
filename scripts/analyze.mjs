import fs from "node:fs";

function parseJson(t) {
  const k = t.indexOf('{"success"');
  if (k < 0) return null;
  try { return JSON.parse(t.slice(k)); } catch { return null; }
}

const meals = parseJson(fs.readFileSync("probe/query-meals.txt", "utf8")).data;
const nut = parseJson(fs.readFileSync("probe/list-nutrition-foods.txt", "utf8")).data;

const rows = nut.split("\n").slice(1).filter((l) => l.includes(","));
const foods = rows.map((l) => {
  const p = l.split(",");
  return { name: p[0], kcal: Number(p[3]), protein: Number(p[4]), fat: Number(p[5]), carb: Number(p[6]), sodium: Number(p[7]), calcium: Number(p[8]) };
});
console.log("nutrition rows:", foods.length);

function norm(s) {
  return s.replace(/[（(].*?[）)]/g, "").replace(/[·\-\s]/g, "").replace(/^麦当劳/, "");
}
const nutNames = foods.map((f) => norm(f.name));
const mealNames = Object.values(meals.meals).map((m) => norm(m.name));

let exact = 0, contains = 0, miss = [];
for (const n of mealNames) {
  if (nutNames.includes(n)) exact++;
  else if (nutNames.some((x) => x.includes(n) || n.includes(x))) contains++;
  else miss.push(n);
}
console.log("menu items:", mealNames.length, "exact:", exact, "contains:", contains, "miss:", miss.length);
console.log("unmatched:", miss.join(" | "));
fs.writeFileSync("probe/nutrition-parsed.json", JSON.stringify(foods, null, 2));
