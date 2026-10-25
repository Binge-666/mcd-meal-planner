# 待办清单 · 麦计 · 饭点管家

更新：2026-10-23
原则：**不重做整个项目**；只做可验证的增量；先录屏材料，再提交。

## P0 现场前（约 60–90 分钟）

- [ ] **Task 1 · MCP 调用日志（15 分钟，必须）**
  - 在 `lib/mcp.mjs` 给 `callMcp` 加计时与 50 条环形日志
  - 在 `server.mjs` 加 `GET /api/mcp-log`（放在 catch-all 之前）
  - 重启 `npm start`
  - 验收：浏览器打开 `http://localhost:3000/api/mcp-log` 返回 JSON，
    包含 `now-time-info`、`query-nearby-stores`、`query-meals`、
    `list-nutrition-foods`、`query-store-coupons`、`calculate-price`
  - 验收：返回内容没有 Token / Bearer

- [ ] **Task 2 · 前端轨迹面板（30–45 分钟，建议）**
  - 页脚或导航加「MCP 调用轨迹」按钮
  - 打开时拉 `/api/mcp-log`，显示工具名、耗时、结果数、成功/失败
  - 顶部显示总调用、成功率、平均耗时
  - 验收：面板可开合，至少 5 条真实调用，不报错

- [ ] **Task 3 · 静态降级（10 分钟）**
  - `docs/index.html` 请求失败时显示「静态快照模式，实时调用需本地启动」
  - 验收：`npm run build:demo` 通过；静态页正常打开

- [ ] **Task 4 · 重启并完整验证**
  - `node --check server.mjs`
  - `node --check lib/mcp.mjs`
  - `npm run build:demo`
  - 厦门自动配餐、北京守卫、饭签都不回归

- [ ] **补 workbuddy.md**
  - 已恢复总结版；再补现场 WorkBuddy 会话截图/导出
  - 如实写明：主体前期完成，现场增量是「MCP 调用轨迹」
  - 不要把它写成从零开发

- [ ] **录 75–90 秒演示**
  - 按 `RECORDING.md` 顺序
  - 北京守卫只能用静态页录，不要用本地实时版
  - 用 `Win + Alt + R`

- [ ] **低优先级文案**
  - 静态页 HTML 初始文案「麦当劳 MCP 已连接」改成「MCP 数据快照 · 免 Token」
  - README 增加一行链接到 `workbuddy.md`

## P1 提交前（10/25 15:00–16:00）

- [ ] **确认 git 策略**
  - 本地 HEAD `fc1335e`，远端最新 `11cdc57`，本地无 upstream
  - 不要直接 `git push main`
  - 建议：备份工作区 → `git fetch origin` → 用分支合并/重置
  - 或直接在 GitHub 网页/API 更新文件

- [ ] **公开仓库文件齐全**
  - `README.md`
  - `CONTEST_DECLARATION.md`
  - `MCP_INTEGRATION.md`
  - `workbuddy.md`
  - 源代码、`LICENSE`、`.env.example`
  - 仓库 Public，Pages 可访问

- [ ] **赛事站提交**
  - 赛道：用餐
  - 使用工具：**WorkBuddy**
  - 作品链接 + 演示录屏
  - 15:00 封板，15:00–16:00 提交，不要拖到 15:59

- [ ] **麦当劳大赛**
  - 填公开仓库地址
  - 去麦当劳大赛仓库发报名 Issue
  - 截止 10/25 23:59

- [ ] **提交后检查**
  - 手机/无痕窗口打开 Pages
  - `/api/health` 本地可用
  - 视频能播放、无隐私信息

## P2 可选 / 不做

- [ ] ~~加游戏赛道~~：单人，已决定不加，避免稀释用餐作品
- [ ] ~~现场从零重做网页~~：不做，重做只会降级
- [ ] 早餐菜单快照（赛后）
- [ ] 优惠券叠加（赛后）
- [ ] 多人拼单（赛后）

## 不要做

- 不要把 `MCD_TOKEN` 写进代码、README、录屏或日志
- 不要手改 `docs/index.html`，它是 `npm run build:demo` 的产物
- 不要提交 `node_modules/`、`tools.json`、`probe/`
- 不要在 10/25 15:00 封板后继续改代码
- 不要把静态快照说成实时数据

## 验收命令

```powershell
curl.exe http://localhost:3000/api/health
curl.exe http://localhost:3000/api/mcp-log
npm run build:demo
```
