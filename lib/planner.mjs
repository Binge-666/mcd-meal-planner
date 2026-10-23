const PROTEIN_MATCHERS = {
  chicken: /鸡/,
  beef: /牛|巨无霸|安格斯|吉士/,
  fish: /鱼|鳕/,
  veggie: /蔬|苹果|玉米|沙拉/,
};

const COFFEE = /咖啡|奶铁|美式|拿铁|玛奇朵|卡布奇诺|浓缩/;

function pickProtein(tastes) {
  return Object.keys(PROTEIN_MATCHERS).find((key) => tastes.includes(key)) || null;
}

function applyTasteFilters(items, tastes, mealTime) {
  let pool = items;
  if (mealTime === "breakfast") {
    const breakfast = pool.filter((item) => item.breakfast);
    if (breakfast.length) pool = breakfast;
  } else {
    const nonBreakfast = pool.filter((item) => !item.breakfast);
    if (nonBreakfast.length) pool = nonBreakfast;
  }

  const protein = pickProtein(tastes);
  const spicy = tastes.includes("spicy");
  const mild = tastes.includes("mild");

  const mains = pool.filter((item) => {
    if (item.group !== "main") return false;
    if (spicy && !item.spicy) return false;
    if (mild && item.spicy) return false;
    if (protein && !PROTEIN_MATCHERS[protein].test(item.name)) return false;
    return true;
  });

  let drinks = pool.filter((item) => item.group === "drink");
  if (tastes.includes("coffee")) drinks = drinks.filter((item) => COFFEE.test(item.name));
  if (tastes.includes("nosugar")) drinks = drinks.filter((item) => item.kcal <= 10);
  if (!drinks.length) drinks = pool.filter((item) => item.group === "drink");
  if (!drinks.length) drinks = [null];

  return {
    mains: mains.length ? mains : pool.filter((item) => item.group === "main"),
    drinks,
    sides: pool.filter((item) => item.group === "side"),
    desserts: pool.filter((item) => item.group === "dessert"),
  };
}

function hashString(value) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function combosFor(pool, targetKcal, tastes, includeDessert, variant) {
  const results = [];
  const wantDessert = includeDessert || tastes.includes("sweet");
  const requireDessert = tastes.includes("sweet");
  for (const main of pool.mains) {
    for (const drink of pool.drinks) {
      const sideChoices = [null, ...pool.sides];
      for (const side of sideChoices) {
        let dessertChoices = wantDessert ? [null, ...pool.desserts] : [null];
        if (requireDessert) dessertChoices = pool.desserts.length ? pool.desserts : [null];
        for (const dessert of dessertChoices) {
          const items = [main, drink, side, dessert].filter(Boolean);
          const seen = new Set();
          let duplicate = false;
          for (const item of items) {
            if (seen.has(item.code)) duplicate = true;
            seen.add(item.code);
          }
          if (duplicate) continue;
          const kcal = items.reduce((sum, item) => sum + item.kcal, 0);
          const price = items.reduce((sum, item) => sum + item.price, 0);
          const protein = items.reduce((sum, item) => sum + item.protein, 0);
          const fat = items.reduce((sum, item) => sum + item.fat, 0);
          const carb = items.reduce((sum, item) => sum + item.carb, 0);
          const sodium = items.reduce((sum, item) => sum + item.sodium, 0);
          const diff = kcal - targetKcal;
          let score = Math.abs(diff) * 3 + price * 0.9;
          if (diff > 0) score += diff * 2;
          if (tastes.includes("light")) {
            if (main.fried) score += 120;
            score += fat * 2;
          }
          if (tastes.includes("crispy") && !items.some((item) => item.fried)) score += 80;
          score -= protein * 1.2;
          if (variant) score += hashString(items.map((item) => item.code).join('') + variant) % 90;
          results.push({
            items,
            kcal,
            price,
            protein,
            fat,
            carb,
            sodium,
            diff,
            score,
          });
        }
      }
    }
  }
  return results;
}

function buildReason(combo, targetKcal, tastes, coupon) {
  const parts = [];
  const diff = combo.kcal - targetKcal;
  if (Math.abs(diff) <= 40) parts.push("热量几乎正中目标");
  else if (diff < 0) parts.push(`比目标少 ${Math.abs(Math.round(diff))} kcal`);
  else parts.push(`比目标多 ${Math.round(diff)} kcal`);
  parts.push(`蛋白质 ${Math.round(combo.protein)}g`);
  if (combo.items.some((item) => item.spicy)) parts.push("带辣味主餐");
  if (tastes.includes("light")) parts.push("偏清爽组合");
  if (combo.items.some((item) => item.breakfast)) parts.push("早餐时段");
  if (coupon) parts.push(`可用「${coupon.title}」`);
  return parts.join(" · ");
}

export function planCombos({ items, targetKcal, tastes = [], mealTime = "lunch", budget = 0, includeDessert = false, coupons = [], variant = 0 }) {
  const pool = applyTasteFilters(items, tastes, mealTime);
  if (!pool.mains.length) {
    return { pool: { mains: 0, drinks: 0, sides: 0, desserts: 0 }, combos: [] };
  }
  let combos = combosFor(pool, targetKcal, tastes, includeDessert, variant);
  combos = combos.filter((combo) => combo.kcal >= 150);
  if (budget > 0) {
    const within = combos.filter((combo) => combo.price <= budget);
    if (within.length) combos = within;
    else combos = [...combos].sort((a, b) => a.price - b.price || a.score - b.score);
  }
  combos.sort((a, b) => a.score - b.score);

  const picked = [];
  const usedMains = new Set();
  for (const combo of combos) {
    const main = combo.items[0];
    if (usedMains.has(main.code)) continue;
    usedMains.add(main.code);
    picked.push(combo);
    if (picked.length >= 6) break;
  }
  for (const combo of combos) {
    if (picked.length >= 6) break;
    if (picked.includes(combo)) continue;
    picked.push(combo);
  }

  const byProduct = new Map();
  for (const coupon of coupons) {
    for (const product of coupon.products || []) {
      if (!byProduct.has(product.productCode)) byProduct.set(product.productCode, coupon);
    }
  }

  return {
    pool: {
      mains: pool.mains.length,
      drinks: pool.drinks.filter(Boolean).length,
      sides: pool.sides.length,
      desserts: pool.desserts.length,
    },
    combos: picked.map((combo, index) => {
      const matchedCoupons = combo.items
        .map((item) => byProduct.get(item.code))
        .filter(Boolean);
      const coupon = matchedCoupons[0] || null;
      return {
        id: `combo-${index + 1}`,
        items: combo.items.map((item) => ({
          code: item.code,
          name: item.name,
          image: item.image,
          group: item.group,
          price: item.price,
          kcal: item.kcal,
          protein: item.protein,
          fat: item.fat,
          carb: item.carb,
          sodium: item.sodium,
          calcium: item.calcium,
        })),
        totals: {
          kcal: Math.round(combo.kcal),
          price: Number(combo.price.toFixed(1)),
          protein: Math.round(combo.protein),
          fat: Math.round(combo.fat),
          carb: Math.round(combo.carb),
          sodium: Math.round(combo.sodium),
          diff: Math.round(combo.diff),
        },
        coupon: coupon ? { title: coupon.title, couponId: coupon.couponId } : null,
        reason: buildReason(combo, targetKcal, tastes, coupon),
      };
    }),
  };
}
