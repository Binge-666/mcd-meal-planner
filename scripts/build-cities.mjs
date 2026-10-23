import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { callMcp } from "../lib/mcp.mjs";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(dirname, "..");

const PAIRS = [
  ["厦门", "中山路"],
  ["福州", "东街口"],
  ["泉州", "丰泽"],
  ["北京", "国贸"],
  ["上海", "人民广场"],
  ["广州", "天河"],
  ["深圳", "福田"],
  ["成都", "春熙路"],
  ["杭州", "西湖"],
  ["南京", "新街口"],
  ["武汉", "江汉路"],
  ["长沙", "五一广场"],
  ["重庆", "解放碑"],
  ["西安", "钟楼"],
  ["天津", "滨江道"],
  ["苏州", "观前街"],
  ["青岛", "五四广场"],
  ["郑州", "二七广场"],
  ["大连", "青泥洼桥"],
  ["昆明", "南屏街"],
];

const CITY_CENTERS = {
  厦门: [24.4798, 118.0894],
  福州: [26.0745, 119.2965],
  泉州: [24.8741, 118.6757],
  北京: [39.9042, 116.4074],
  上海: [31.2304, 121.4737],
  广州: [23.1291, 113.2644],
  深圳: [22.5431, 114.0579],
  成都: [30.5728, 104.0668],
  杭州: [30.2741, 120.1551],
  南京: [32.0603, 118.7969],
  武汉: [30.5928, 114.3055],
  长沙: [28.2282, 112.9388],
  重庆: [29.563, 106.5516],
  西安: [34.3416, 108.9398],
  天津: [39.0842, 117.2009],
  苏州: [31.2989, 120.5853],
  青岛: [36.0671, 120.3826],
  郑州: [34.7466, 113.6254],
  大连: [38.914, 121.6147],
  昆明: [24.8801, 102.8329],
};

const WIDTH = 1000;
const HEIGHT = 740;
const LON0 = 73;
const LON1 = 135;
const LAT0 = 17;
const LAT1 = 54;

function projectX(lon) {
  return ((lon - LON0) / (LON1 - LON0)) * WIDTH;
}

function projectY(lat) {
  return ((LAT1 - lat) / (LAT1 - LAT0)) * HEIGHT;
}

function ringArea(points) {
  let sum = 0;
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    sum += a[0] * b[1] - b[0] * a[1];
  }
  return Math.abs(sum) / 2;
}

function distanceToSegment(p, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  if (!dx && !dy) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

function simplify(points, tolerance) {
  if (points.length <= 4) return points;
  const keep = new Array(points.length).fill(false);
  keep[0] = true;
  keep[points.length - 1] = true;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [start, end] = stack.pop();
    let index = -1;
    let max = tolerance;
    for (let i = start + 1; i < end; i += 1) {
      const d = distanceToSegment(points[i], points[start], points[end]);
      if (d > max) {
        max = d;
        index = i;
      }
    }
    if (index > 0) {
      keep[index] = true;
      stack.push([start, index], [index, end]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

function round(value) {
  return Math.round(value * 10) / 10;
}

const geo = JSON.parse(fs.readFileSync(path.join(root, "demo-data/china.json"), "utf8"));

function buildPath() {
  const parts = [];
  for (const feature of geo.features) {
    const geometry = feature.geometry || {};
    const polygons =
      geometry.type === "Polygon" ? [geometry.coordinates] : geometry.type === "MultiPolygon" ? geometry.coordinates : [];
    for (const polygon of polygons) {
      for (const ring of polygon) {
        if (!ring.length) continue;
        if (ringArea(ring) < 0.12) continue;
        const projected = ring.map(([lon, lat]) => [projectX(lon), projectY(lat)]);
        const simplified = simplify(projected, 0.9);
        if (simplified.length < 3) continue;
        parts.push(
          "M" + simplified.map(([x, y]) => `${round(x)} ${round(y)}`).join("L") + "Z"
        );
      }
    }
  }
  return parts.join("");
}

async function fetchStores(city, keyword) {
  const { data } = await callMcp("query-nearby-stores", { beType: 1, searchType: 2, city, keyword });
  if (!data?.success) throw new Error(`${city}: ${data?.message || "门店查询失败"}`);
  return (data.data || []).map((store) => ({
    storeCode: store.storeCode,
    name: store.storeName,
    address: store.address,
    distance: store.distance,
    open: store.businessStatus,
    hours: `${store.businessStartTime}-${store.businessEndTime}`,
    latitude: Number(store.latitude) || null,
    longitude: Number(store.longitude) || null,
  }));
}

const cities = [];
for (const [city, keyword] of PAIRS) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const stores = await fetchStores(city, keyword);
      const center = CITY_CENTERS[city] || [null, null];
      cities.push({ city, keyword, count: stores.length, lat: center[0], lng: center[1], stores });
      console.log(`${city} ${stores.length} 家`);
      break;
    } catch (err) {
      console.warn(`${city} 第 ${attempt + 1} 次失败: ${err.message}`);
      if (attempt === 2) throw err;
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  }
  await new Promise((resolve) => setTimeout(resolve, 400));
}

const mapPath = buildPath();

const cityMap = {
  width: WIDTH,
  height: HEIGHT,
  path: mapPath,
  cities: cities
    .filter((c) => c.lat && c.lng)
    .map((c) => ({
      name: c.city,
      keyword: c.keyword,
      count: c.count,
      x: round(projectX(c.lng)),
      y: round(projectY(c.lat)),
    })),
};

const snapshot = {
  builtAt: new Date().toISOString(),
  source: "McDonald's MCP query-nearby-stores",
  label: `全国 ${cities.length} 城门店快照（每城取默认商圈真实返回）`,
  cities,
};

fs.writeFileSync(path.join(root, "demo-data/cities.json"), JSON.stringify(snapshot, null, 2), "utf8");
fs.writeFileSync(
  path.join(root, "public/map-data.js"),
  `window.CITY_MAP = ${JSON.stringify(cityMap)};\n`,
  "utf8"
);

console.log(`门店快照：${cities.length} 城 / ${cities.reduce((sum, c) => sum + c.count, 0)} 家`);
console.log(`地图形状：${(Buffer.byteLength(mapPath) / 1024).toFixed(1)} KB`);
