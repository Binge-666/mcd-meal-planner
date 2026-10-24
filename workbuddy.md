# WorkBuddy 开发对话记录

本文件记录使用 WorkBuddy 开发「麦计 · 饭点管家」的核心过程，用于参赛要求。

## 项目目标

用麦当劳 MCP 做一个「饭点管家」：现在几点 → 该吃哪一顿 → 今天还剩多少热量 → 附近哪家店 → 这顿怎么点 → 一张今日饭签。

真实调用门店、菜单、营养、优惠券、价格与活动日历，不靠大模型编造数据。

## 开发思路

1. **接入验证**：在 WorkBuddy 配置 mcd-mcp（Streamable HTTP），确认 35 个工具可用
2. **数据摸底**：用脚本抓取 `list-nutrition-foods`、`query-nearby-stores`、`query-meals`、`query-store-coupons`、`calculate-price`、`campaign-calendar`，掌握真实字段
3. **算法设计**：从营养表反向匹配菜单单品，按「主餐 × 饮品 × 小食 × 甜品」组合打分（热量差 + 价格 + 蛋白质），口味和预算做硬过滤
4. **定位迭代**：从「热量配餐」改成「饭点管家」，把时间作为第一入口，避开同类作品的拥挤赛道
5. **UI 原型**：复古快餐风格，突出「现在几点」「今天还剩多少」「这顿怎么吃」
6. **分享产物**：Canvas 生成 1080×1350 的今日饭签，可保存转发
7. **联调打磨**：处理营养命名差异（杯型后缀）、排除周边商品、每个组合走 `calculate-price` 实价核验
8. **可体验性**：把一次真实 MCP 快照烘成单文件静态 demo，评委无需 Token 即可打开

## 关键决策

- **到店自取场景**：用 `beType=1, orderType=1` 简化参数，覆盖日常三餐与夜宵
- **时间优先**：用 `now-time-info` 判断早餐/午餐/下午茶/晚餐/夜宵，并按剩余热量分配这一顿的额度
- **营养匹配**：先精确再模糊（去除杯型/规格后缀），命中率从 ~55% 提升到 ~70%
- **算法取舍**：不做穷举全排列，限制主餐轮换避免推荐雷同，重点命中 ±40 kcal
- **真价验证**：每个推荐组合都走 `calculate-price`，展示实际金额而不是估算
- **可分享**：今日饭签把「算法结果」变成「社交产物」，降低传播成本
- **静态快照**：`scripts/build-static.mjs` 生成 `docs/index.html`，免 Token、免安装，10 秒看懂

## 验证

- 健康检查：`/api/health` 返回 MCP 时间
- 门店：厦门中山路可搜到 5 家门店
- 配餐：晚餐 630 kcal 生成 6 组，组合来自真实菜单与营养表
- 算价：每组组合返回 `calculate-price` 实付价
- 活动：`campaign-calendar` 正常拉取当月活动
- 静态 demo：无头浏览器验证，5 家门店、6 组配餐、6 个饭签按钮均渲染成功

## 交付物

- `public/`：实时版 H5（需本地启动 + 自己的 MCP Token）
- `docs/index.html`：免 Token 单文件静态 demo（GitHub Pages）
- `skills/mcd-meal-planner/SKILL.md`：可安装的 WorkBuddy Skill 说明
- `lib/planner.mjs`：确定性配餐算法，Node 与浏览器共用
- `public/card.js`：今日饭签 Canvas

## 待迭代

- 外送场景（需地址）
- 优惠券叠加与自动领券
- 多人拼单与人均分摊
- 早餐菜单快照（当前快照在晚餐时段采集，早餐品类不全）
## 现场增量：MCP 调用轨迹（2026-10-24）

- 目的：让评委直观看到真实 MCP 工具调用，证明已接入并调用麦当劳 MCP（非官网改动，为 1024 比赛现场增量）
- 改动文件：
  - lib/mcp.mjs：callMcp 加计时、结果数统计、环形缓冲 50 条日志，新增 getMcpLog()
  - server.mjs：新增 GET /api/mcp-log（置于 catch-all 之前）
  - public/index.html、public/app.js、public/styles.css：页脚加「MCP 调用轨迹」按钮及抽屉面板，每 2 秒拉取，展示工具名/耗时/结果数/成功失败、总调用/成功率/平均耗时
  - docs/index.html：npm run build:demo 重新生成
- 验证命令与结果：
  - node --check server.mjs; node --check lib/mcp.mjs -> OK
  - npm run build:demo -> docs/index.html 已生成：172.9 KB（门店 5 家 · 城市 20 个 · 可用菜品 39 个 · 券 2 张 · 活动 6 条）
  - Invoke-WebRequest /api/health -> {"ok":true,"time":"2026-10-24 13:16:07"}
  - Invoke-WebRequest /api/mcp-log -> {"ok":true,"mode":"live","entries":[...now-time-info...],"summary":{"total":2,...}}，无 Token/Bearer
- 说明：主体功能（地图、厦门配餐、北京守卫、饭签等）未改动，仅做最小增量。
