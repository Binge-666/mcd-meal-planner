import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { callMcp } from "./lib/mcp.mjs";
import {
  calcPrice,
  getActivity,
  getCoupons,
  getMenu,
  getNutrition,
  getStores,
} from "./lib/catalog.mjs";
import { planCombos } from "./lib/planner.mjs";

const app = express();
const port = Number(process.env.PORT) || 3000;
const dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(express.json());
app.use(express.static(path.join(dirname, "public")));

const SLOT_LABEL = {
  breakfast: "早餐",
  lunch: "午餐",
  teatime: "下午茶",
  dinner: "晚餐",
  latenight: "夜宵",
};

const SLOT_SHARE = {
  breakfast: 0.25,
  lunch: 0.35,
  teatime: 0.15,
  dinner: 0.35,
  latenight: 0.2,
};

function slotForHour(hour) {
  if (hour >= 5 && hour < 10) return "breakfast";
  if (hour >= 10 && hour < 14) return "lunch";
  if (hour >= 14 && hour < 17) return "teatime";
  if (hour >= 17 && hour < 21) return "dinner";
  return "latenight";
}

function pad(value) {
  return String(value).padStart(2, "0");
}

app.get("/api/health", async (req, res) => {
  try {
    const { data } = await callMcp("now-time-info", {});
    res.json({ ok: true, time: data?.datetime || "" });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.get("/api/now", async (req, res) => {
  let datetime = "";
  let source = "mcp";
  try {
    const { data } = await callMcp("now-time-info", {});
    datetime = data?.datetime || "";
  } catch {
    source = "local";
  }
  let hour = new Date().getHours();
  const match = datetime.match(/(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
  if (match) hour = Number(match[4]);
  if (!match) {
    const now = new Date();
    datetime = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
  }
  const slot = slotForHour(hour);
  const suggestedKcal = Math.min(1200, Math.max(300, Math.round((1800 * SLOT_SHARE[slot]) / 10) * 10));
  res.json({
    ok: true,
    source,
    time: datetime,
    hour,
    slot,
    slotLabel: SLOT_LABEL[slot],
    suggestedKcal,
  });
});

app.get("/api/stores", async (req, res) => {
  try {
    const city = String(req.query.city || "厦门").trim();
    const keyword = String(req.query.keyword || "中山路").trim();
    const stores = await getStores(city, keyword);
    res.json({ ok: true, stores });
  } catch (err) {
    res.status(502).json({ ok: false, error: err.message });
  }
});

app.get("/api/menu", async (req, res) => {
  try {
    const storeCode = String(req.query.storeCode || "").trim();
    if (!storeCode) return res.status(400).json({ ok: false, error: "缺少 storeCode" });
    const menu = await getMenu(storeCode);
    res.json({ ok: true, ...menu });
  } catch (err) {
    res.status(502).json({ ok: false, error: err.message });
  }
});

app.get("/api/nutrition", async (req, res) => {
  try {
    res.json({ ok: true, foods: await getNutrition() });
  } catch (err) {
    res.status(502).json({ ok: false, error: err.message });
  }
});

app.get("/api/coupons", async (req, res) => {
  try {
    const storeCode = String(req.query.storeCode || "").trim();
    if (!storeCode) return res.status(400).json({ ok: false, error: "缺少 storeCode" });
    res.json({ ok: true, coupons: await getCoupons(storeCode) });
  } catch (err) {
    res.status(502).json({ ok: false, error: err.message });
  }
});

app.get("/api/activity", async (req, res) => {
  try {
    res.json({ ok: true, ...(await getActivity()) });
  } catch (err) {
    res.status(502).json({ ok: false, error: err.message });
  }
});

app.post("/api/plan", async (req, res) => {
  try {
    const {
      storeCode,
      targetKcal = 700,
      tastes = [],
      mealTime = "lunch",
      budget = 0,
      includeDessert = false,
      variant = 0,
    } = req.body || {};
    if (!storeCode) return res.status(400).json({ ok: false, error: "缺少 storeCode" });
    const target = Math.min(1400, Math.max(200, Number(targetKcal) || 700));

    const [menu, coupons] = await Promise.all([getMenu(storeCode), getCoupons(storeCode)]);
    const result = planCombos({
      items: menu.items,
      targetKcal: target,
      tastes: Array.isArray(tastes) ? tastes : [],
      mealTime,
      budget: Number(budget) || 0,
      includeDessert: Boolean(includeDessert),
      coupons,
      variant: Number(variant) || 0,
    });

    let enriched = await Promise.all(
      result.combos.map(async (combo) => {
        const items = combo.items.map((item) => ({
          productCode: item.code,
          quantity: 1,
        }));
        const priced = await calcPrice(storeCode, items).catch(() => null);
        return {
          ...combo,
          priced,
          couponAvailable: Boolean(combo.coupon),
        };
      })
    );

    const budgetNum = Number(budget) || 0;
    if (budgetNum > 0) {
      const within = enriched.filter((combo) => {
        const total = combo.priced?.total ?? combo.totals?.price ?? 0;
        return total <= budgetNum + 0.01;
      });
      if (within.length) {
        enriched = within;
      } else {
        enriched = enriched.slice(0, 6);
      }
    }

    res.json({
      ok: true,
      target,
      pool: result.pool,
      coverage: menu.coverage,
      coupons: coupons.length,
      combos: enriched,
    });
  } catch (err) {
    res.status(502).json({ ok: false, error: err.message });
  }
});

app.use((req, res) => {
  res.sendFile(path.join(dirname, "public", "index.html"));
});

app.listen(port, () => {
  console.log(`MCD meal planner: http://localhost:${port}`);
});
