import { callMcp, cached } from "./mcp.mjs";

const ALIASES = {
  "麦乐鸡": "麦乐鸡5块",
  "麦辣鸡翅": "麦辣鸡翅-2块",
  "黄金橙橙": "【美汁源】“黄金橙橙”",
  "雪碧": "雪碧中杯",
  "可乐": "可乐中杯",
  "玉米杯": "小杯玉米杯",
  "薯条": "中薯条",
  "麦咖啡™奶铁": "热奶铁中杯",
  "麦咖啡™美式": "热美式中杯",
  "燕麦奶铁": "热燕麦奶铁中杯",
  "燕麦奶": "热燕麦奶中杯",
  "牛奶": "热牛奶中杯",
  "阳光柠檬红茶": "阳光柠檬红茶中杯",
  "怡泉+C": "中杯怡泉+C",
  "鲜萃咖啡": "小杯鲜萃咖啡",
  "蘸酱麦麦脆汁鸡": "麦麦脆汁鸡-琵琶腿",
  "经典麦旋风": "奥利奥麦旋风",
};

const DRINK =
  /可乐|雪碧|咖啡|红茶|奶茶|牛奶|奶铁|美式|拿铁|燕麦奶|果汁|纯悦|怡泉|橙橙|柠柠|豆浆|朱古力|雪冰|玛奇朵|卡布奇诺|黑巧|抹茶|苹果汁/;
const DESSERT = /冰淇淋|新地|麦旋风|圆筒|派|拉明顿|阿芙佳朵|奶冻/;
const SIDE = /薯条|玉米杯|苹果片|麦乐鸡|鸡翅|鸡球|V翅|芝士条|笋卷/;
const MAIN = /堡|卷|鸡排|脆汁鸡|炸鸡/;
const BREAKFAST = /麦满分|粥|薯饼|油条|营养卷|香肠|豆浆|炒双蛋/;
const MERCH = /丝巾|周边|按摩捶|痒痒挠|徽章|玩具|毛绒|盲盒|卡套/;
const COMBO_SET = /套餐|件套|随心选|随心配|分享餐|组合|双拼|拼盘|双人餐|单人餐|开心乐园|BFF|四宫格|单品精选/;

export function normalizeName(value) {
  return String(value || "")
    .replace(/[™®]/g, "")
    .replace(/[“”"'‘’]/g, "")
    .replace(/[（(][^）)]*[）)]/g, "")
    .replace(/[\s\-–—·.]/g, "")
    .replace(/^麦当劳/, "");
}

function classify(name) {
  if (DESSERT.test(name)) return "dessert";
  if (DRINK.test(name)) return "drink";
  if (SIDE.test(name)) return "side";
  if (MAIN.test(name)) return "main";
  return null;
}

export function parseNutrition(raw) {
  if (!raw) return [];
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("[") && !line.startsWith("{") && line.includes(","))
    .map((line) => {
      const parts = line.split(",");
      const tail = parts.slice(-8).map((value) => Number(value) || 0);
      const name = parts.slice(0, -8).join(",").trim();
      return {
        name,
        kcal: tail[2],
        protein: tail[3],
        fat: tail[4],
        carb: tail[5],
        sodium: tail[6],
        calcium: tail[7],
      };
    })
    .filter((item) => item.name && Number.isFinite(item.kcal));
}

function buildNutritionIndex(foods) {
  const index = new Map();
  for (const food of foods) index.set(normalizeName(food.name), food);
  return index;
}

const SIZE_TOKENS = /小杯|中杯|大杯|盒装|迷你|2块|4块|5块|6块|十翅|1块/g;
const GENERIC = new Set(["新地", "派"]);

function stripSizes(value) {
  return normalizeName(value)
    .replace(SIZE_TOKENS, "")
    .replace(/^(小|中|大|迷你)/, "");
}

function scoreCandidate(food, stripped) {
  let score = 0;
  if (normalizeName(food.name) === stripped) score += 100;
  if (/中杯/.test(food.name)) score += 10;
  else if (/小杯/.test(food.name)) score += 6;
  else if (/大杯/.test(food.name)) score += 2;
  score -= Math.abs(normalizeName(food.name).length - stripped.length);
  return score;
}

function matchNutrition(name, index) {
  const direct = index.get(normalizeName(name));
  if (direct) return direct;
  const alias = ALIASES[name];
  if (alias) {
    const hit = index.get(normalizeName(alias));
    if (hit) return hit;
  }
  const stripped = stripSizes(name);
  if (stripped.length < 2 || GENERIC.has(stripped)) return null;
  let best = null;
  let bestScore = -Infinity;
  for (const food of index.values()) {
    const candidate = stripSizes(food.name);
    if (candidate !== stripped && !(candidate.length >= 2 && (candidate.includes(stripped) || stripped.includes(candidate)))) {
      continue;
    }
    const score = scoreCandidate(food, stripped);
    if (score > bestScore) {
      bestScore = score;
      best = food;
    }
  }
  return bestScore > -20 ? best : null;
}

export async function getStores(city, keyword) {
  const key = `stores:${city}:${keyword}`;
  return cached(key, 10 * 60 * 1000, async () => {
    const { data } = await callMcp("query-nearby-stores", {
      beType: 1,
      searchType: 2,
      city,
      keyword,
    });
    if (!data?.success) throw new Error(data?.message || "门店查询失败");
    return (data.data || []).map((store) => ({
      storeCode: store.storeCode,
      name: store.storeName,
      address: store.address,
      distance: store.distance,
      open: store.businessStatus,
      hours: `${store.businessStartTime}-${store.businessEndTime}`,
      reservation: store.reservation,
      latitude: Number(store.latitude) || null,
      longitude: Number(store.longitude) || null,
    }));
  });
}

export async function getNutrition() {
  return cached("nutrition", 60 * 60 * 1000, async () => {
    const { data } = await callMcp("list-nutrition-foods", {});
    if (!data?.success) throw new Error(data?.message || "营养数据获取失败");
    return parseNutrition(data.data);
  });
}

export async function getMenu(storeCode) {
  return cached(`menu:${storeCode}`, 10 * 60 * 1000, async () => {
    const [menuRes, nutrition] = await Promise.all([
      callMcp("query-meals", { storeCode, orderType: 1, beType: 1 }),
      getNutrition(),
    ]);
    if (!menuRes.data?.success) throw new Error(menuRes.data?.message || "菜单获取失败");
    const index = buildNutritionIndex(nutrition);
    const categories = menuRes.data.data?.categories || [];
    const meals = menuRes.data.data?.meals || {};
    const categoryMap = new Map();
    for (const category of categories) {
      const title = category.name.replace(/\s+/g, "");
      for (const entry of category.meals || []) {
        if (!categoryMap.has(entry.code)) categoryMap.set(entry.code, []);
        categoryMap.get(entry.code).push(title);
      }
    }
    const items = [];
    for (const [code, meal] of Object.entries(meals)) {
      const name = meal.name || "";
      if (!name || MERCH.test(name) || COMBO_SET.test(name)) continue;
      const price = Number(meal.currentPrice);
      if (!Number.isFinite(price) || price <= 0) continue;
      const group = classify(name);
      if (!group) continue;
      const nut = matchNutrition(name, index);
      if (!nut) continue;
      items.push({
        code,
        name,
        image: meal.image || "",
        price,
        originalPrice: Number(meal.originalPrice) || price,
        group,
        breakfast: BREAKFAST.test(name),
        spicy: /辣|山葵|椒盐/.test(name),
        fried: /脆|炸|薯条|鸡翅|鸡球|鸡排|麦乐鸡/.test(name),
        categories: categoryMap.get(code) || [],
        kcal: nut.kcal,
        protein: nut.protein,
        fat: nut.fat,
        carb: nut.carb,
        sodium: nut.sodium,
        calcium: nut.calcium,
      });
    }
    return {
      storeCode,
      categories,
      items,
      coverage: { menu: Object.keys(meals).length, usable: items.length },
    };
  });
}

export async function getCoupons(storeCode) {
  return cached(`coupons:${storeCode}`, 5 * 60 * 1000, async () => {
    const { data } = await callMcp("query-store-coupons", {
      storeCode,
      orderType: 1,
      beType: 1,
    });
    if (!data?.success) return [];
    return (data.data || []).map((coupon) => ({
      title: coupon.title,
      couponId: coupon.couponId,
      couponCode: coupon.couponCode,
      validUntil: coupon.tradeDateTime,
      products: coupon.products || [],
    }));
  });
}

export async function getActivity() {
  return cached("activity", 30 * 60 * 1000, async () => {
    const { text, data } = await callMcp("campaign-calendar", {});
    const activities = [];
    const blocks = text.split("#### ").slice(1);
    for (const block of blocks) {
      const title = (block.match(/\*\*活动标题\*\*：(.+)/) || [])[1];
      const body = (block.match(/\*\*活动内容介绍\*\*：([\s\S]+?)\*\*活动图片介绍\*\*/) || [])[1];
      const image = (block.match(/<img src="([^"]+)"/) || [])[1];
      const date = block.split("\n")[0].trim();
      if (!title) continue;
      activities.push({
        date,
        title: title.trim(),
        desc: (body || "").replace(/\n+/g, " ").trim().slice(0, 120),
        image: image || "",
      });
    }
    return {
      currentTime: data?.datetime || "",
      list: activities.slice(-6).reverse(),
    };
  });
}

export async function calcPrice(storeCode, items) {
  const codes = items.map((item) => `${item.productCode}x${item.quantity}`).sort().join("|");
  return cached(`price:${storeCode}:${codes}`, 3 * 60 * 1000, async () => {
    const { data } = await callMcp("calculate-price", {
      storeCode,
      orderType: 1,
      beType: 1,
      items,
    });
    if (!data?.success) return null;
    const price = data.data || {};
    return {
      total: (price.price || price.productPrice || 0) / 100,
      original: (price.originalPrice || price.productOriginalPrice || 0) / 100,
      discount: (price.discount || 0) / 100,
      lines: price.productList || [],
    };
  });
}
