# 项目状态 · 麦计 · 饭点管家

更新：2026-10-23 19:40（本地）
仓库：https://github.com/Binge-666/mcd-meal-planner
在线：https://binge-666.github.io/mcd-meal-planner/
参赛：超能 Coding 周末 · 用餐赛道 + 麦当劳程序员创意开发大赛

## 一句话

已完成可演示版本：静态免 Token demo + 本地实时 MCP 版 + Skill + 参赛文档。
还差：MCP 调用轨迹、workbuddy 原始记录补充、录屏与两个入口提交。

## 已完成

- 麦当劳 MCP 接入成功，35 个工具可用；`/api/health` 返回 MCP 真实时间
- 全国 20 城 / 100 家门店地图，点城市切换门店列表
- 厦门中山路门店自动配餐，按当前时间生成 6 组方案
- 热量、预算、口味、甜品约束；预算按 `calculate-price` 实价过滤
- 营养匹配与逐项明细；匹配不到的单品不参与搭配
- 今日饭签 Canvas 生成，可保存分享
- 静态单文件 `docs/index.html`，免 Token、免安装，已部署 GitHub Pages
- 北京等非厦门城市：静态版只展示门店列表，配餐被菜单守卫拦下
- Docker、Render、`.env.example` 部署文件
- `skills/mcd-meal-planner/SKILL.md` 可安装 Skill
- `README.md`、`CONTEST_DECLARATION.md`、`MCP_INTEGRATION.md`
- `workbuddy.md` 已从 git 历史恢复（当前是总结版，不是原始对话）
- `LICENSE` 已补（MIT）

## 已解决问题

| 问题 | 处理 | 证据 |
|---|---|---|
| MCP 是否真的连通 | `curl.exe /api/health` 调 `now-time-info` | `{"ok":true,"time":"2026-10-23 19:37:32"}` |
| Token 怎么放 | 只走 `MCD_TOKEN` 或 `~/.workbuddy/mcp.json` | 前端和仓库均无 Token |
| 静态版为什么能免 Token | `scripts/build-static.mjs` 把快照和算法烘进单文件 | `docs/index.html` 可直接打开 |
| 静态版会不会假装配餐 | 非厦门门店直接返回菜单守卫错误 | 不编造北京菜单和价格 |
| 地图经纬度为 0 | 用城市中心点做标记，文案写「收录门店数」 | `public/map-data.js` |
| 营养匹配率不高 | 精确 → 别名 → 去杯型/规格后缀 | 厦门快照 112 条中 39 条可用 |
| 预算超了怎么办 | 实价过滤；无解时保留最接近方案并标「超预算」 | 结果卡价格区 |
| Pages 怎么部署 | `main` 分支 `/docs` + `.nojekyll` | 在线地址可访问 |
| `/api/mcp-log` 打开是首页 | 接口尚未实现，被 `server.mjs` 兜底路由接住 | 已列入 TODO |
| workbuddy.md 被删 | 从本地 git 历史 `171d823` 恢复 | 文件已回到工作区 |

## 当前验证

```powershell
curl.exe http://localhost:3000/api/health
# {"ok":true,"time":"2026-10-23 19:37:32"}
```

```text
http://localhost:3000/?autoplan=1&city=厦门&keyword=中山路&kcal=700&meal=dinner&tastes=spicy&budget=40
```

静态版北京守卫提示：

```text
静态演示只烘了厦门中山路门店的菜单；切换回厦门即可配餐，实时版支持全国门店。
```

## 已知限制与风险

- **本地 git 历史和远端不一致**：本地 HEAD 是 `fc1335e`，远端最新是 `11cdc57`，本地没有 upstream。远端已包含地图和部署改动，本地这些改动还未提交。不要直接 `git push main`，先在分支上操作或重新 clone。
- **`workbuddy.md` 是总结版**：不是原始对话记录。比赛要求「开发对话记录」，需要补 WorkBuddy 会话截图/导出，并如实写明主体与现场增量。
- **静态版只烘了厦门菜单**：其他城市只能看门店，不能配餐；这是有意设计，不是 bug。
- **静态页首屏文案**：JS 执行后会变成「MCP 数据快照 · 免 Token」，但 HTML 初始文本仍是「麦当劳 MCP 已连接」；低优先级。
- **MCP 调用轨迹未实现**：`/api/mcp-log` 目前返回首页；按 `brief-mcp-trace.md` 实现后再录。
- **本地未提交改动较多**：不要 `git reset --hard` 或覆盖工作区，先备份。

## 关键文件

```text
server.mjs                 # Express API，最后有 catch-all
lib/mcp.mjs                # MCP 连接与 callMcp
lib/catalog.mjs            # 门店/菜单/营养/券/价格
lib/planner.mjs            # 确定性配餐算法
public/                    # 实时版前端
scripts/build-static.mjs   # 生成 docs/index.html
scripts/build-cities.mjs   # 生成 20 城地图数据
docs/index.html            # 静态 demo（构建产物，不要手改）
demo-data/                 # 快照数据
skills/mcd-meal-planner/   # Skill
workbuddy.md               # 开发记录（已恢复）
CONTEST_DECLARATION.md     # 参赛声明
MCP_INTEGRATION.md         # MCP 接入说明
```

## 现场启动

```powershell
cd D:\SCAN\1024\MDL
$env:MCD_TOKEN="你的 Token"   # 或已配置 ~/.workbuddy/mcp.json
npm start
```

打开 `http://localhost:3000`，健康检查 `/api/health`。
