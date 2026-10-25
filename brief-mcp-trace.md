# brief · 现场增量：MCP 调用轨迹

> 给 WorkBuddy 的任务书。目标：让评委看到真实 MCP 调用，不是只看到一个静态页面。
> 不要重做整个项目，只做这个增量。

## 0. 一句话

在不改现有功能和视觉的前提下，增加「MCP 调用轨迹」：后端记录最近 50 次 `callMcp`，
前端可打开面板查看工具名、耗时、结果数；静态 demo 自动降级为快照说明。

## 1. 现有资产

- 在线 demo: https://binge-666.github.io/mcd-meal-planner/
- 技术栈: Node 18+ ESM + Express；原生 HTML/CSS/JS；无前端构建
- MCP: `mcd-mcp`，Streamable HTTP，Bearer Token
- Token 来源: `MCD_TOKEN` 或 `~/.workbuddy/mcp.json`
- 真实调用入口: `lib/mcp.mjs` 的 `callMcp()`
- 现有能力: 20 城/100 店、厦门自动配餐、北京门店列表 + 菜单守卫、
  6 组方案、`calculate-price` 实价、今日饭签

先读这些文件，不要凭猜测改：

```text
lib/mcp.mjs
server.mjs
public/app.js
public/index.html
public/styles.css
scripts/build-static.mjs
MCP_INTEGRATION.md
```

## 2. 允许修改

```text
lib/mcp.mjs
server.mjs
public/index.html
public/app.js
public/styles.css
scripts/build-static.mjs   # 仅静态降级必要处
workbuddy.md               # 追加本轮真实记录
```

禁止：

- 新增依赖
- 改 `demo-data/`
- 手改 `docs/index.html`（它是构建产物）
- 改配餐算法、现有视觉风格、现有文案
- 把 Token 写进代码、响应、日志或前端

## 3. 任务

### Task 1 · 后端记录（先做，15 分钟）

- `callMcp` 记录：`name`、`ms`、`ok`、`count`、`attempts`、`at`
- 失败时记录截断到 200 字符的 `error`
- 模块内环形缓冲 50 条
- 导出 `getMcpLog()`
- 不记录 headers、Token、完整响应体
- 新增 `GET /api/mcp-log`，放在 `server.mjs` 的 catch-all 之前，返回：

```json
{
  "ok": true,
  "mode": "live",
  "entries": [
    {
      "name": "query-meals",
      "ms": 182,
      "ok": true,
      "count": 112,
      "attempts": 1,
      "at": "2026-10-23T11:40:00.000Z"
    }
  ],
  "summary": { "total": 1, "ok": 1, "failed": 0, "avgMs": 182 }
}
```

### Task 2 · 前端面板（30–45 分钟）

- 页脚或导航加「MCP 调用轨迹」按钮
- 点击打开抽屉/浮层；再次点击或 Esc 关闭
- 打开时每 2 秒拉 `/api/mcp-log`
- 每条显示：工具名、耗时 ms、结果数、成功/失败、时间
- 顶部汇总：总调用、成功率、平均耗时
- 请求失败时显示：「静态快照模式，实时调用需本地启动」
- 保持现有复古快餐风格；不引第三方库；移动端不溢出

### Task 3 · 静态降级（10 分钟）

- `docs/index.html` 中 `/api/mcp-log` 失败时显示快照提示
- 不要破坏 `scripts/build-static.mjs` 现有的 `/api/*` 拦截逻辑
- `npm run build:demo` 必须通过

### Task 4 · 验证与记录

- 跑完第 4 节验收
- 把本轮改动、命令、结果追加到 `workbuddy.md`，保留真实记录

## 4. 验收

- [ ] `MCD_TOKEN=... npm start`；`GET /api/health` 正常
- [ ] 打开 autoplan 链接后，`/api/mcp-log` 至少 5 条，包含：
  `now-time-info`、`query-nearby-stores`、`query-meals`、
  `list-nutrition-foods`、`query-store-coupons`、`calculate-price`
- [ ] 每条含 `name/ms/ok/count`；响应无 Token、无 Bearer
- [ ] 面板可开合；汇总正确；刷新不报错
- [ ] `node --check server.mjs`；`node --check lib/mcp.mjs`
- [ ] `npm run build:demo` 通过；静态页能开且显示快照提示
- [ ] 20 城/100 店、厦门配餐、北京门店列表 + 菜单守卫不回归

测试地址：

```text
http://localhost:3000/?autoplan=1&city=厦门&keyword=中山路&kcal=700&meal=dinner&tastes=spicy&budget=40
```

## 5. 工作方式

- 先给计划，不写代码；我确认后再按 Task 顺序做
- 每次只做一个 Task；改完立即验证；通过后 `git commit`
- 不要重构无关文件；不要新增依赖
- MCP 失败就明确报告，不要编造数据
- 每轮结束把「改了什么/命令/结果」追加到 `workbuddy.md`

## 6. Git 注意

- 本地 HEAD 是 `fc1335e`，远端最新是 `11cdc57`，本地没有 upstream
- 先建分支再改：

```powershell
git checkout -b workbuddy/live-trace
```

- 不要直接 `git push main`；提交前先在 GitHub 上对比远端
