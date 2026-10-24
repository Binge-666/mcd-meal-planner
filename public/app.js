const state = {
  stores: [],
  storeCode: null,
  storeName: "",
  targetKcal: 700,
  mealTime: "lunch",
  budget: 0,
  tastes: [],
  includeDessert: false,
  variant: 0,
  combos: [],
  coupons: 0,
  dailyKcal: 1800,
  eatenKcal: 0,
  now: null,
};

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

const el = {
  city: document.getElementById("city"),
  keyword: document.getElementById("keyword"),
  searchStores: document.getElementById("searchStores"),
  storeList: document.getElementById("storeList"),
  targetKcal: document.getElementById("targetKcal"),
  kcalValue: document.getElementById("kcalValue"),
  presets: document.querySelector(".presets"),
  mealTime: document.getElementById("mealTime"),
  budget: document.getElementById("budget"),
  tastes: document.getElementById("tastes"),
  includeDessert: document.getElementById("includeDessert"),
  makePlan: document.getElementById("makePlan"),
  results: document.getElementById("results"),
  resultsTitle: document.getElementById("resultsTitle"),
  resultsSub: document.getElementById("resultsSub"),
  comboList: document.getElementById("comboList"),
  reshuffle: document.getElementById("reshuffle"),
  activityPanel: document.getElementById("activityPanel"),
  activityList: document.getElementById("activityList"),
  mcpStatus: document.getElementById("mcpStatus"),
  makePlanLabel: document.getElementById("makePlanLabel"),
  toast: document.getElementById("toast"),
  nowStrip: document.getElementById("nowStrip"),
  nowTime: document.getElementById("nowTime"),
  nowSlot: document.getElementById("nowSlot"),
  nowHint: document.getElementById("nowHint"),
  useNow: document.getElementById("useNow"),
  dailyKcal: document.getElementById("dailyKcal"),
  eatenKcal: document.getElementById("eatenKcal"),
  dailyRemain: document.getElementById("dailyRemain"),
  useSuggestion: document.getElementById("useSuggestion"),
  cardModal: document.getElementById("cardModal"),
  cardImage: document.getElementById("cardImage"),
  cardDownload: document.getElementById("cardDownload"),
  cardClose: document.getElementById("cardClose"),
  chinaMap: document.getElementById("chinaMap"),
  mapHint: document.getElementById("mapHint"),
  mcpTraceBtn: document.getElementById("mcpTraceBtn"),
  traceDrawer: document.getElementById("traceDrawer"),
  traceBackdrop: document.getElementById("traceBackdrop"),
  traceClose: document.getElementById("traceClose"),
  traceMode: document.getElementById("traceMode"),
  traceSummary: document.getElementById("traceSummary"),
  traceHint: document.getElementById("traceHint"),
  traceList: document.getElementById("traceList"),
};

let toastTimer;

function toast(message) {
  el.toast.textContent = message;
  el.toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.toast.classList.remove("show"), 2600);
}

async function api(url, options) {
  const res = await fetch(url, options);
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok || !data?.ok) {
    throw new Error(data?.error || `请求失败 (${res.status})`);
  }
  return data;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function money(value) {
  const num = Number(value) || 0;
  return Number.isInteger(num) ? String(num) : num.toFixed(1);
}

function renderStores() {
  if (!state.stores.length) {
    el.storeList.innerHTML = '<div class="store-empty">没找到门店，换个商圈或城市再试。</div>';
    return;
  }
  el.storeList.innerHTML = state.stores
    .map((store) => {
      const active = store.storeCode === state.storeCode ? " active" : "";
      const distance = store.distance >= 1000 ? `${(store.distance / 1000).toFixed(1)}km` : `${store.distance}m`;
      return `
        <button class="store-card${active}" data-code="${escapeHtml(store.storeCode)}" type="button">
          <span class="distance">${distance}</span>
          <div class="store-name">${escapeHtml(store.name)}</div>
          <div class="store-address">${escapeHtml(store.address)}</div>
          <div class="store-meta"><span>${escapeHtml(store.hours)}</span><span>${store.open ? "营业中" : "已打烊"}</span></div>
        </button>
      `;
    })
    .join("");
}

async function loadStores() {
  const city = el.city.value.trim() || "厦门";
  const keyword = el.keyword.value.trim() || "中山路";
  el.searchStores.disabled = true;
  el.searchStores.textContent = "搜索中";
  try {
    const data = await api(`/api/stores?city=${encodeURIComponent(city)}&keyword=${encodeURIComponent(keyword)}`);
    state.stores = data.stores;
    if (!state.stores.some((store) => store.storeCode === state.storeCode)) {
      state.storeCode = state.stores[0]?.storeCode || null;
      state.storeName = state.stores[0]?.name || "";
    }
    renderStores();
    if (!state.stores.length) toast("没有搜到门店，试试更具体的商圈");
  } catch (err) {
    el.storeList.innerHTML = `<div class="store-empty">${escapeHtml(err.message)}</div>`;
    toast(err.message);
  } finally {
    el.searchStores.disabled = false;
    el.searchStores.textContent = "搜索门店";
  }
}

function syncTarget(value) {
  const target = Math.min(1200, Math.max(300, Number(value)));
  state.targetKcal = target;
  el.targetKcal.value = target;
  el.kcalValue.textContent = target;
  [...el.presets.querySelectorAll("button")].forEach((button) => {
    button.classList.toggle("active", Number(button.dataset.kcal) === target);
  });
}

function remainingKcal() {
  return Math.max(0, state.dailyKcal - state.eatenKcal);
}

function suggestKcal() {
  const remaining = remainingKcal();
  if (remaining <= 0) return 300;
  const share = SLOT_SHARE[state.mealTime] || 0.3;
  return Math.min(1200, Math.max(300, Math.round((remaining * share) / 10) * 10));
}

function updateDaily() {
  const remaining = remainingKcal();
  el.dailyRemain.textContent =
    remaining > 0 ? `今天还剩 ${remaining} kcal` : "今天的额度已经用完，这顿按 300 kcal 起步";
  if (state.now) {
    el.nowHint.textContent = `今日还剩 ${remaining} kcal · 建议这顿 ${suggestKcal()} kcal`;
  }
}

function setSlot(slot) {
  if (!SLOT_LABEL[slot]) return;
  state.mealTime = slot;
  [...el.mealTime.querySelectorAll("button")].forEach((button) => {
    button.classList.toggle("active", button.dataset.value === slot);
  });
  updateDaily();
}

function setTimeLabel() {
  if (!state.now) return;
  const time = String(state.now.time || "");
  const clock = time.slice(11, 16);
  el.nowTime.textContent = clock ? `现在 ${clock}` : "现在";
  el.nowSlot.textContent = SLOT_LABEL[state.now.slot] || "饭点";
  updateDaily();
  el.nowStrip?.classList.add("ready");
}

function toggleTaste(value) {
  const opposite = { spicy: "mild", mild: "spicy" };
  const exclusive = {
    chicken: ["beef", "fish"],
    beef: ["chicken", "fish"],
    fish: ["chicken", "beef"],
  };
  const wasActive = state.tastes.includes(value);
  const next = state.tastes.filter((item) => {
    if (item === value) return false;
    if (opposite[value] === item) return false;
    if (exclusive[value]?.includes(item)) return false;
    return true;
  });
  if (!wasActive) next.push(value);
  state.tastes = next;
  [...el.tastes.querySelectorAll("button")].forEach((button) => {
    button.classList.toggle("active", state.tastes.includes(button.dataset.value));
  });
}

function renderSkeleton() {
  el.results.hidden = false;
  el.resultsSub.textContent = "";
  el.comboList.innerHTML = '<div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div>';
}

function comboTitle(combo) {
  const main = combo.items[0];
  return main ? main.name : "推荐组合";
}

function renderCombos() {
  if (!state.combos.length) {
    el.comboList.innerHTML = '<div class="store-empty">这个条件下没配出组合，放宽预算或热量再试试。</div>';
    return;
  }
  el.comboList.innerHTML = state.combos
    .map((combo, index) => {
      const main = combo.items[0];
      const image = main?.image
        ? `<img src="${escapeHtml(main.image)}" alt="${escapeHtml(main.name)}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='grid';" /><span class="fallback" style="display:none">M</span>`
        : `<span class="fallback">M</span>`;
      const items = combo.items
        .map((item) => `<li>${escapeHtml(item.name)}<span>${Math.round(item.kcal)} kcal</span></li>`)
        .join("");
      const tags = combo.items.some((item) => item.group === "dessert") ? '<span class="tag">含甜品</span>' : "";
      const price = combo.priced?.total ?? combo.totals.price;
      const discount = combo.priced?.discount || 0;
      const over = state.budget > 0 && price > state.budget ? Number((price - state.budget).toFixed(1)) : 0;
      const coupon = combo.coupon ? `<div class="coupon">券 · ${escapeHtml(combo.coupon.title)}</div>` : "";
      const rows = combo.items
        .map(
          (item) => `
            <tr>
              <td>${escapeHtml(item.name)}</td>
              <td>${Math.round(item.kcal)}</td>
              <td>${item.protein}g</td>
              <td>${item.fat}g</td>
              <td>${item.carb}g</td>
              <td>${item.sodium}mg</td>
            </tr>`
        )
        .join("");
      return `
        <article class="combo">
          <div class="combo-main">
            <div class="combo-visual">
              <span class="rank">TOP ${index + 1}</span>
              ${image}
              <span class="kcal-badge">${Math.round(combo.totals.kcal)} <small>kcal</small></span>
            </div>
            <div class="combo-body">
              <h3 class="combo-title">${escapeHtml(comboTitle(combo))}${tags}</h3>
              <ul class="item-list">${items}</ul>
              <p class="reason">${escapeHtml(combo.reason)}</p>
              <div class="macros">
                <span>蛋白质 ${combo.totals.protein}g</span>
                <span>脂肪 ${combo.totals.fat}g</span>
                <span>碳水 ${combo.totals.carb}g</span>
                <span>钠 ${combo.totals.sodium}mg</span>
              </div>
            </div>
            <div class="combo-side">
              <div class="price">
                <strong>${money(price)}</strong>
                <span class="${over ? "over-budget" : ""}">${over ? `超预算 ¥${money(over)}` : discount > 0 ? `已省 ¥${money(discount)}` : "到店自取价"}</span>
              </div>
              ${coupon}
              <button class="detail-toggle" type="button" data-target="detail-${index}">营养明细</button>
              <button class="share-btn" type="button" data-index="${index}">生成饭签</button>
            </div>
          </div>
          <div class="combo-detail" id="detail-${index}" hidden>
            <table>
              <thead><tr><th>单品</th><th>热量</th><th>蛋白质</th><th>脂肪</th><th>碳水</th><th>钠</th></tr></thead>
              <tbody>${rows}</tbody>
              <tfoot><tr class="total"><td>合计</td><td>${combo.totals.kcal}</td><td>${combo.totals.protein}g</td><td>${combo.totals.fat}g</td><td>${combo.totals.carb}g</td><td>${combo.totals.sodium}mg</td></tr></tfoot>
            </table>
            <p class="note">营养数据来自麦当劳 MCP 餐品营养表；套餐类商品未纳入自动搭配，价格为按单品计算的实际取餐价。</p>
          </div>
        </article>
      `;
    })
    .join("");

  [...el.comboList.querySelectorAll(".detail-toggle")].forEach((button) => {
    button.addEventListener("click", () => {
      const detail = document.getElementById(button.dataset.target);
      const open = !detail.hidden;
      detail.hidden = open;
      button.textContent = open ? "营养明细" : "收起明细";
    });
  });

  [...el.comboList.querySelectorAll(".share-btn")].forEach((button) => {
    button.addEventListener("click", () => openCard(Number(button.dataset.index)));
  });
}

function openCard(index) {
  const combo = state.combos[index];
  if (!combo || !window.MealCard) return;
  const main = combo.items[0];
  const price = combo.priced?.total ?? combo.totals.price;
  const canvas = document.createElement("canvas");
  window.MealCard.draw(canvas, {
    mode: window.__DEMO__ ? "snapshot" : "live",
    date: String(state.now?.time || new Date().toISOString()).slice(0, 10),
    storeName: state.storeName,
    slotLabel: SLOT_LABEL[state.mealTime] || "这一顿",
    title: main?.name || "这一顿",
    targetKcal: state.targetKcal,
    items: combo.items,
    kcal: combo.totals.kcal,
    price: money(price),
    reason: combo.reason,
  });
  const url = canvas.toDataURL("image/png");
  el.cardImage.src = url;
  el.cardDownload.href = url;
  el.cardModal.hidden = false;
  document.body.classList.add("modal-open");
}

function closeCard() {
  el.cardModal.hidden = true;
  document.body.classList.remove("modal-open");
}

async function loadNow() {
  try {
    const data = await api("/api/now");
    state.now = data;
    const params = new URLSearchParams(location.search);
    if (!params.get("meal")) setSlot(data.slot);
    if (!params.get("kcal")) syncTarget(suggestKcal());
    setTimeLabel();
  } catch {
    el.nowTime.textContent = "时间读取失败";
    el.nowHint.textContent = "仍可手动选择时段和热量";
  }
}

async function makePlan() {
  if (!state.storeCode) {
    toast("先选一家门店");
    return;
  }
  renderSkeleton();
  el.makePlan.disabled = true;
  el.makePlanLabel.textContent = "配餐中";
  el.results.scrollIntoView({ behavior: "smooth", block: "start" });
  try {
    const data = await api("/api/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storeCode: state.storeCode,
        targetKcal: state.targetKcal,
        tastes: state.tastes,
        mealTime: state.mealTime,
        budget: state.budget,
        includeDessert: state.includeDessert,
        variant: state.variant,
      }),
    });
    state.combos = data.combos;
    state.coupons = data.coupons;
    const coverage = data.coverage?.usable || 0;
    el.resultsSub.textContent = `${SLOT_LABEL[state.mealTime]} · 目标 ${data.target} kcal · 今日还剩 ${remainingKcal()} kcal · ${state.storeName} · 可用单品 ${coverage} 个 · 卡包券 ${data.coupons} 张`;
    renderCombos();
  } catch (err) {
    el.comboList.innerHTML = `<div class="store-empty">${escapeHtml(err.message)}</div>`;
    toast(err.message);
  } finally {
    el.makePlan.disabled = false;
    el.makePlanLabel.textContent = "算算这顿怎么吃";
  }
}

async function loadActivity() {
  try {
    const data = await api("/api/activity");
    if (!data.list?.length) return;
    el.activityPanel.hidden = false;
    el.activityList.innerHTML = data.list
      .map(
        (item) => `
        <article class="activity">
          ${item.image ? `<img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}" loading="lazy" />` : ""}
          <div class="activity-body">
            <div class="activity-date">${escapeHtml(item.date)}</div>
            <h3 class="activity-title">${escapeHtml(item.title)}</h3>
            <p class="activity-desc">${escapeHtml(item.desc)}</p>
          </div>
        </article>`
      )
      .join("");
  } catch {
    el.activityPanel.hidden = true;
  }
}

el.searchStores.addEventListener("click", loadStores);
el.keyword.addEventListener("keydown", (event) => {
  if (event.key === "Enter") loadStores();
});
el.city.addEventListener("change", () => {
  const option = el.city.selectedOptions[0];
  if (option?.dataset.keyword) el.keyword.value = option.dataset.keyword;
  highlightCity(el.city.value);
  loadStores();
});

function setCity(city) {
  if (!city) return;
  const exists = [...el.city.options].some((option) => option.value === city);
  if (!exists) {
    const option = document.createElement("option");
    option.value = city;
    option.textContent = city;
    el.city.append(option);
  }
  el.city.value = city;
}

el.storeList.addEventListener("click", (event) => {
  const card = event.target.closest(".store-card");
  if (!card) return;
  state.storeCode = card.dataset.code;
  const store = state.stores.find((item) => item.storeCode === state.storeCode);
  state.storeName = store?.name || "";
  renderStores();
  toast(`已选择：${state.storeName}`);
});

el.targetKcal.addEventListener("input", (event) => syncTarget(event.target.value));

el.presets.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  syncTarget(button.dataset.kcal);
});

el.mealTime.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  setSlot(button.dataset.value);
});

function syncDaily() {
  const daily = Math.min(4000, Math.max(1000, Number(el.dailyKcal.value) || 1800));
  const eaten = Math.min(4000, Math.max(0, Number(el.eatenKcal.value) || 0));
  state.dailyKcal = daily;
  state.eatenKcal = eaten;
  el.dailyKcal.value = daily;
  el.eatenKcal.value = eaten;
  updateDaily();
}

el.dailyKcal.addEventListener("change", syncDaily);
el.eatenKcal.addEventListener("change", syncDaily);
el.dailyKcal.addEventListener("input", () => {
  state.dailyKcal = Number(el.dailyKcal.value) || 0;
  updateDaily();
});
el.eatenKcal.addEventListener("input", () => {
  state.eatenKcal = Number(el.eatenKcal.value) || 0;
  updateDaily();
});

el.useSuggestion.addEventListener("click", () => {
  syncTarget(suggestKcal());
  toast(`按 ${SLOT_LABEL[state.mealTime]} 建议：${suggestKcal()} kcal`);
});

el.useNow.addEventListener("click", () => {
  syncTarget(suggestKcal());
  if (state.storeCode) {
    state.variant = 0;
    makePlan();
  } else {
    toast("先选一家门店");
  }
});

el.cardClose.addEventListener("click", closeCard);
el.cardModal.addEventListener("click", (event) => {
  if (event.target === el.cardModal) closeCard();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !el.cardModal.hidden) closeCard();
});

el.budget.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  state.budget = Number(button.dataset.value);
  [...el.budget.querySelectorAll("button")].forEach((item) => item.classList.toggle("active", item === button));
});

el.tastes.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  toggleTaste(button.dataset.value);
});

el.includeDessert.addEventListener("change", (event) => {
  state.includeDessert = event.target.checked;
});

el.makePlan.addEventListener("click", () => {
  state.variant = 0;
  makePlan();
});

el.reshuffle.addEventListener("click", () => {
  state.variant += 1;
  makePlan();
});

const LABEL_OFFSET = {
  北京: [-4, -12],
  天津: [16, 4],
  上海: [-14, 16],
  苏州: [10, -12],
  广州: [-6, -12],
  深圳: [8, 14],
};

function renderMap() {
  const map = window.CITY_MAP;
  if (!map || !el.chinaMap) return;
  const active = el.city.value;
  const markers = map.cities
    .map((city) => {
      const [dx, dy] = LABEL_OFFSET[city.name] || [0, -12];
      const isActive = city.name === active ? " active" : "";
      return `
        <g class="map-city${isActive}" data-city="${escapeHtml(city.name)}" role="button" tabindex="0">
          <circle cx="${city.x}" cy="${city.y}" r="6"></circle>
          <text x="${city.x + dx}" y="${city.y + dy}">${escapeHtml(city.name)}</text>
          <title>${escapeHtml(city.name)} · 收录 ${city.count} 家门店</title>
        </g>`;
    })
    .join("");
  el.chinaMap.innerHTML = `
    <svg viewBox="0 0 ${map.width} ${map.height}" xmlns="http://www.w3.org/2000/svg">
      <path class="map-land" d="${map.path}" fill-rule="evenodd"></path>
      ${markers}
    </svg>`;
  if (el.mapHint) {
    const total = map.cities.reduce((sum, city) => sum + city.count, 0);
    const mode = window.__DEMO__ ? "快照" : "收录";
    el.mapHint.textContent = `${map.cities.length} 城 · ${mode} ${total} 家真实门店 · 点城市切换`;
  }
  el.chinaMap.onclick = (event) => {
    const node = event.target.closest(".map-city");
    if (!node) return;
    const city = node.dataset.city;
    setCity(city);
    const option = el.city.selectedOptions[0];
    if (option?.dataset.keyword) el.keyword.value = option.dataset.keyword;
    highlightCity(city);
    loadStores().then(() => el.storeList.scrollIntoView({ behavior: "smooth", block: "center" }));
  };
}

function highlightCity(city) {
  if (!el.chinaMap) return;
  el.chinaMap.querySelectorAll(".map-city").forEach((node) => {
    node.classList.toggle("active", node.dataset.city === city);
  });
}

function applyQuery() {
  const params = new URLSearchParams(location.search);
  if (params.get("city")) {
    setCity(params.get("city"));
    const option = el.city.selectedOptions[0];
    if (option?.dataset.keyword) el.keyword.value = option.dataset.keyword;
  }
  if (params.get("keyword")) el.keyword.value = params.get("keyword");
  if (params.get("meal")) setSlot(params.get("meal"));
  if (params.get("kcal")) syncTarget(params.get("kcal"));
  if (params.get("budget")) {
    state.budget = Math.max(0, Number(params.get("budget")) || 0);
    [...el.budget.querySelectorAll("button")].forEach((button) => {
      button.classList.toggle("active", Number(button.dataset.value) === state.budget);
    });
  }
  if (params.get("daily")) {
    state.dailyKcal = Math.min(4000, Math.max(1000, Number(params.get("daily")) || 1800));
    el.dailyKcal.value = state.dailyKcal;
  }
  if (params.get("eaten")) {
    state.eatenKcal = Math.min(4000, Math.max(0, Number(params.get("eaten")) || 0));
    el.eatenKcal.value = state.eatenKcal;
  }
  const tastes = (params.get("tastes") || "").split(",").filter(Boolean);
  for (const taste of tastes) {
    if (!state.tastes.includes(taste)) toggleTaste(taste);
  }
  if (params.get("dessert") === "1") {
    state.includeDessert = true;
    el.includeDessert.checked = true;
  }
}

let traceTimer = null;

async function loadMcpTrace() {
  if (!el.traceList) return;
  try {
    const res = await fetch("/api/mcp-log");
    const data = await res.json();
    if (!data.ok) throw new Error("获取失败");
    if (el.traceMode) el.traceMode.textContent = data.mode === "live" ? "实时模式" : "模式";
    if (el.traceHint) {
      if (window.__DEMO__) {
        el.traceHint.hidden = false;
        el.traceHint.textContent = "静态快照模式，实时调用需本地启动";
      } else {
        el.traceHint.hidden = true;
      }
    }
    const s = data.summary || { total: 0, ok: 0, failed: 0, avgMs: 0 };
    const rate = s.total ? Math.round((s.ok / s.total) * 100) : 0;
    if (el.traceSummary) {
      el.traceSummary.innerHTML = `
        <div class="item"><strong>${s.total}</strong><span>总调用</span></div>
        <div class="item"><strong>${rate}%</strong><span>成功率</span></div>
        <div class="item"><strong>${s.avgMs}ms</strong><span>平均耗时</span></div>
        <div class="item"><strong>${s.failed}</strong><span>失败</span></div>
      `;
    }
    const entries = data.entries || [];
    if (!entries.length) {
      el.traceList.innerHTML = '<div class="store-empty">暂无调用记录</div>';
      return;
    }
    el.traceList.innerHTML = entries
      .map((e) => {
        const time = e.at ? e.at.slice(11, 19) : "";
        const count = e.count == null ? "-" : e.count;
        return `
          <article class="trace-item ${e.ok ? "" : "fail"}">
            <div>
              <div class="name">${escapeHtml(e.name)}</div>
              <div class="meta">
                <span>${time}</span>
                <span>尝试 ${e.attempts || 1}</span>
                ${e.error ? `<span>err: ${escapeHtml(e.error)}</span>` : ""}
              </div>
            </div>
            <div class="right">
              <div class="status ${e.ok ? "ok" : "fail"}">${e.ok ? "成功" : "失败"}</div>
              <div>${e.ms}ms · ${count} 条</div>
            </div>
          </article>
        `;
      })
      .join("");
  } catch (err) {
    if (el.traceHint) {
      el.traceHint.hidden = false;
      el.traceHint.textContent = "静态快照模式，实时调用需本地启动";
    }
    if (el.traceSummary) el.traceSummary.innerHTML = "";
    if (el.traceList) el.traceList.innerHTML = `<div class="store-empty">${escapeHtml(err.message)}</div>`;
  }
}

function openTrace() {
  if (!el.traceDrawer) return;
  el.traceDrawer.hidden = false;
  document.body.style.overflow = "hidden";
  loadMcpTrace();
  if (traceTimer) clearInterval(traceTimer);
  traceTimer = setInterval(loadMcpTrace, 2000);
}

function closeTrace() {
  if (!el.traceDrawer) return;
  el.traceDrawer.hidden = true;
  document.body.style.overflow = "";
  if (traceTimer) {
    clearInterval(traceTimer);
    traceTimer = null;
  }
}

async function init() {
  applyQuery();
  renderMap();
  loadActivity();
  loadNow();
  try {
    await api("/api/health");
    el.mcpStatus.textContent = "麦当劳 MCP 已连接";
  } catch {
    el.mcpStatus.textContent = "MCP 连接异常";
    document.querySelector(".dot").style.background = "var(--red)";
  }
  await loadStores();
  if (new URLSearchParams(location.search).get("autoplan") === "1") {
    makePlan();
  }
}

if (el.mcpTraceBtn) {
  el.mcpTraceBtn.addEventListener("click", () => {
    if (el.traceDrawer && el.traceDrawer.hidden) openTrace();
    else closeTrace();
  });
}
if (el.traceBackdrop) el.traceBackdrop.addEventListener("click", closeTrace);
if (el.traceClose) el.traceClose.addEventListener("click", closeTrace);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && el.traceDrawer && !el.traceDrawer.hidden) closeTrace();
});

init();
