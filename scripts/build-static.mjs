import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(dirname, "..");

function read(relative) {
  return fs.readFileSync(path.join(root, relative), "utf8").replace(/^\uFEFF/, "");
}

function readJson(relative) {
  return JSON.parse(read(relative));
}

const menu = readJson("demo-data/menu.json");
if (!menu.items?.length) throw new Error("demo-data/menu.json 没有可用菜品，先跑一次在线配餐再更新快照");

const citySnapshot = readJson("demo-data/cities.json");

const demo = {
  builtAt: new Date().toISOString(),
  label: `全国 ${citySnapshot.cities.length} 城门店 + 厦门菜单快照`,
  city: "厦门",
  keyword: "中山路",
  stores: readJson("demo-data/stores.json").stores || [],
  cities: citySnapshot.cities || [],
  menu: {
    storeCode: menu.storeCode,
    coverage: menu.coverage,
    items: menu.items,
  },
  coupons: readJson("demo-data/coupons.json").coupons || [],
  activity: readJson("demo-data/activity.json").list || [],
};

const planner = read("lib/planner.mjs").replace("export function planCombos", "function planCombos");
const app = read("public/app.js")
  .replaceAll("麦当劳 MCP 已连接", "MCP 数据快照 · 免 Token")
  .replace(
    'if (new URLSearchParams(location.search).get("autoplan") === "1") {',
    'if (window.__DEMO__ || new URLSearchParams(location.search).get("autoplan") === "1") {'
  );
const card = read("public/card.js");
const styles = read("public/styles.css");

const adapter = `
(function () {
  var DEMO = window.__DEMO__;
  var SLOT_LABEL = { breakfast: "早餐", lunch: "午餐", teatime: "下午茶", dinner: "晚餐", latenight: "夜宵" };
  var SLOT_SHARE = { breakfast: 0.25, lunch: 0.35, teatime: 0.15, dinner: 0.35, latenight: 0.2 };

  function pad(value) { return String(value).padStart(2, "0"); }

  function slotForHour(hour) {
    if (hour >= 5 && hour < 10) return "breakfast";
    if (hour >= 10 && hour < 14) return "lunch";
    if (hour >= 14 && hour < 17) return "teatime";
    if (hour >= 17 && hour < 21) return "dinner";
    return "latenight";
  }

  function nowData() {
    var d = new Date();
    var hour = d.getHours();
    var slot = slotForHour(hour);
    return {
      ok: true,
      source: "snapshot",
      time: d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + " " + pad(hour) + ":" + pad(d.getMinutes()),
      hour: hour,
      slot: slot,
      slotLabel: SLOT_LABEL[slot],
      suggestedKcal: Math.min(1200, Math.max(300, Math.round((1800 * SLOT_SHARE[slot]) / 10) * 10)),
    };
  }

  function reply(data) {
    return Promise.resolve({ ok: true, status: 200, json: function () { return Promise.resolve(data); } });
  }

  var originalFetch = window.fetch ? window.fetch.bind(window) : null;

  window.fetch = function (url, options) {
    var parsed;
    try { parsed = new URL(url, location.href); } catch (err) { return originalFetch ? originalFetch(url, options) : Promise.reject(err); }
    var pathname = parsed.pathname;

    if (pathname.endsWith("/api/health")) return reply({ ok: true, time: nowData().time });
    if (pathname.endsWith("/api/now")) return reply(nowData());
    if (pathname.endsWith("/api/stores")) {
      var city = parsed.searchParams.get("city") || "";
      var matched = (DEMO.cities || []).filter(function (entry) { return entry.city === city; })[0];
      return reply({ ok: true, stores: matched ? matched.stores : DEMO.stores });
    }
    if (pathname.endsWith("/api/activity")) return reply({ ok: true, currentTime: nowData().time, list: DEMO.activity });

    if (pathname.endsWith("/api/plan")) {
      var body = {};
      try { body = JSON.parse((options && options.body) || "{}"); } catch (err) { body = {}; }
      if (body.storeCode && body.storeCode !== DEMO.menu.storeCode) {
        return reply({ ok: false, error: "静态演示只烘了厦门中山路门店的菜单；切换回厦门即可配餐，实时版支持全国门店。" });
      }
      var target = Math.min(1400, Math.max(200, Number(body.targetKcal) || 700));
      var budget = Number(body.budget) || 0;
      var result = planCombos({
        items: DEMO.menu.items,
        targetKcal: target,
        tastes: Array.isArray(body.tastes) ? body.tastes : [],
        mealTime: body.mealTime || "lunch",
        budget: budget,
        includeDessert: Boolean(body.includeDessert),
        coupons: DEMO.coupons,
        variant: Number(body.variant) || 0,
      });
      var combos = result.combos.map(function (combo) {
        combo.priced = null;
        combo.couponAvailable = Boolean(combo.coupon);
        return combo;
      });
      if (budget > 0) {
        var within = combos.filter(function (combo) { return (combo.totals.price || 0) <= budget + 0.01; });
        combos = within.length ? within : combos.slice(0, 6);
      }
      return reply({
        ok: true,
        target: target,
        pool: result.pool,
        coverage: DEMO.menu.coverage,
        coupons: DEMO.coupons.length,
        combos: combos,
      });
    }

    if (originalFetch) return originalFetch(url, options);
    return Promise.reject(new Error("静态演示不支持该请求"));
  };
})();
`;

let html = read("public/index.html");

html = html.replace(
  '<link rel="stylesheet" href="/styles.css" />',
  `<style>\n${styles}\n\n/* static demo banner */\n.demo-banner {\n  background: var(--ink);\n  color: var(--yellow);\n  text-align: center;\n  padding: 9px 16px;\n  font-size: 12px;\n  font-weight: 700;\n  letter-spacing: 0.06em;\n}\n</style>`
);

html = html.replace(
  '<script src="/map-data.js"></script>',
  `<script>\n${read("public/map-data.js")}\n</script>`
);

html = html.replace(
  '<script src="/card.js"></script>',
  `<script>\n${card}\n</script>`
);

html = html.replace(
  '<script src="/app.js" type="module"></script>',
  `<script>\nwindow.__DEMO__ = ${JSON.stringify(demo).replace(/</g, "\\u003c")};\n${planner}\n${adapter}\n${app}\n</script>`
);

html = html.replace(
  "<body>",
  '<body>\n    <div class="demo-banner">静态演示 · 全国 20 城门店 + 厦门菜单快照 · 免 Token 即开即玩 · 实时版需本地启动</div>'
);

new Function(card);
new Function(`${planner}\n${adapter}\n${app}`);

const outDir = path.join(root, "docs");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "index.html"), html, "utf8");
fs.writeFileSync(path.join(outDir, ".nojekyll"), "", "utf8");

const size = Buffer.byteLength(html, "utf8");
console.log(`docs/index.html 已生成：${(size / 1024).toFixed(1)} KB`);
console.log(`门店 ${demo.stores.length} 家 · 城市 ${demo.cities.length} 个 · 可用菜品 ${demo.menu.items.length} 个 · 券 ${demo.coupons.length} 张 · 活动 ${demo.activity.length} 条`);
