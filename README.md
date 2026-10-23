# 麦计 · 饭点管家

> 先看现在几点，再决定这顿吃多少。

![麦计 · 饭点管家](assets/cover.svg)

基于**麦当劳中国 MCP** 的饭点管家：现在几点 → 该吃哪一顿 → 今天还剩多少热量 → 附近哪家店在营业 → 这顿怎么点 → 生成一张可分享的**今日饭签**。

`早餐 / 午餐 / 下午茶 / 晚餐 / 夜宵` 五个时段都接得住；门店、菜单、营养、优惠券、价格全部来自麦当劳 MCP，本地只负责确定性配餐与展示。

**参赛作品，非麦当劳官方产品。**

---

## 30 秒体验（免 Token）

在线体验：[https://binge-666.github.io/mcd-meal-planner/](https://binge-666.github.io/mcd-meal-planner/)（已部署 GitHub Pages）；本地直接打开 [`docs/index.html`](docs/index.html) 即可。厦门中山路 5 家真实门店 + 39 个可用单品 + 营养、价格、优惠券、活动都已烘进**单文件 HTML**，不用安装、不用填 Token、不用起服务。

- 打开即按当前时间自动配好 6 组，再点「生成饭签」保存分享卡
- 本地：双击 `docs/index.html`
- GitHub Pages：仓库 Settings → Pages → Deploy from a branch → 选择 `main` 分支的 `/docs` 目录
- 页面里的「现在几点」用你本机时间实时计算，所以早餐/夜宵打开也成立
- 想完整体验实时菜单与实价核验，见下方「完整版本地运行」

## 为什么是「饭点管家」

同类作品大多从「热量」或「预算」切入，但用户真正的第一句话往往是：**「现在这个点，我该吃点什么？」**

麦计把「时间」作为第一入口：

| 入口 | 做法 |
|---|---|
| 现在几点 | 自动识别时段（早餐/午餐/下午茶/晚餐/夜宵），给出这一顿的建议热量 |
| 今天还能吃多少 | 输入每日目标与已吃热量，按当前时段分配剩余额度 |
| 附近哪家店 | 真实门店列表、营业时间、距离 |
| 这顿怎么点 | 热量 + 预算 + 口味 + 是否要甜品，生成 3–6 组方案 |
| 留下点什么 | 一键生成「今日饭签」图片，可保存分享 |

## 核心能力

- **五个饭点时段**：按时段筛选早餐/正餐，结合剩余热量给出建议额度
- **确定性配餐**：主餐 × 饮品 × 小食 × 甜品组合，按「热量差 + 价格 + 蛋白质」打分排序，不靠大模型口算
- **口味约束**：想吃辣 / 不要辣 / 鸡肉 / 牛肉 / 鱼肉 / 炸物 / 清爽 / 咖啡 / 零糖 / 甜品
- **预算约束**：30 / 40 / 50 元内优先；预算内无解时给出最接近的方案，并明确标出超出金额
- **营养可视**：每组方案展示热量、蛋白质、脂肪、碳水、钠，可展开逐项明细
- **实价核验**：每组组合调用 `calculate-price` 返回实际应付价，而不是菜单价相加
- **今日饭签**：Canvas 生成 1080×1350 分享卡（热量 / 价格 / 搭配 / 一句推荐理由）
- **静态快照**：同一套前端可打包成单文件 demo，评委和路人 10 秒内看懂

## 完整版本地运行

需要 Node.js 18+ 和自己的麦当劳 MCP Token（[申请入口](https://open.mcd.cn/mcp)）。

```bash
npm install
# macOS / Linux
MCD_TOKEN=<你的 Token> npm start
# Windows PowerShell
$env:MCD_TOKEN="<你的 Token>"; npm start
# 打开 http://localhost:3000
```

也可以把 MCP 配置放在 `~/.workbuddy/mcp.json`：

```json
{
  "mcpServers": {
    "mcd-mcp": {
      "type": "streamableHttp",
      "url": "https://mcp.mcd.cn",
      "headers": { "Authorization": "Bearer ${MCD_TOKEN}" }
    }
  }
}
```

URL 参数可直接预填并自动配餐：

```text
http://localhost:3000/?autoplan=1&city=厦门&keyword=中山路&kcal=700&meal=dinner&tastes=spicy&budget=40
```

## 常用命令

```bash
npm start                  # 启动实时版（需要 Token）
npm run build:demo         # 用 demo-data/ 快照重新生成 docs/index.html
npm run plan:demo -- --kcal 700 --meal dinner --tastes spicy --budget 40
```

## MCP 工具

| 工具 | 用途 |
|---|---|
| `now-time-info` | 取当前时间，决定饭点时段 |
| `query-nearby-stores` | 按城市 + 地标搜索到店自取门店 |
| `query-meals` | 获取门店在售菜单、分类、价格 |
| `list-nutrition-foods` | 约 160 条营养数据，按名称匹配菜单单品 |
| `query-store-coupons` | 获取门店可用优惠券 |
| `calculate-price` | 对每组推荐实际核价 |
| `campaign-calendar` | 展示当月活动 |

详见 [MCP_INTEGRATION.md](MCP_INTEGRATION.md)。

## 技术实现

- **后端**：Node.js（ESM）+ Express；`@modelcontextprotocol/sdk` 走 Streamable HTTP
- **前端**：原生 HTML/CSS/JS，无构建步骤、无框架
- **配餐算法**：`lib/planner.mjs` 纯函数，可同时跑在 Node 和浏览器
- **营养匹配**：精确匹配 → 别名表 → 去杯型/规格后缀模糊匹配；匹配不到的单品不参与推荐
- **静态 demo**：`scripts/build-static.mjs` 把门店/菜单/营养/券/活动快照、算法和前端打进一个 `docs/index.html`，并拦截 `/api/*` 请求
- **缓存**：门店/菜单 10 分钟、营养 60 分钟、券 5 分钟、价格 3 分钟
- **WorkBuddy**：`skills/mcd-meal-planner/SKILL.md` 提供可安装的 Skill 说明

## 项目结构

```text
.
├── assets/                  # README 封面
├── demo-data/               # 静态 demo 的门店/菜单/营养/券/活动快照
├── docs/
│   └── index.html           # 免 Token 单文件静态 demo（GitHub Pages）
├── lib/
│   ├── mcp.mjs              # MCP 连接、解析、缓存
│   ├── catalog.mjs          # 门店/菜单/营养/券/价格
│   └── planner.mjs          # 确定性配餐算法
├── public/                  # 实时版前端
│   ├── index.html
│   ├── styles.css
│   ├── app.js
│   └── card.js              # 今日饭签 Canvas
├── scripts/
│   ├── build-static.mjs     # 生成 docs/index.html
│   ├── plan-cli.mjs         # 配餐算法命令行
│   └── probe*.mjs           # 联调脚本
├── skills/mcd-meal-planner/ # WorkBuddy Skill
├── server.mjs
├── MCP_INTEGRATION.md
├── CONTEST_DECLARATION.md   # 官方参赛声明（未改动）
└── workbuddy.md
```

## 数据与局限

- 静态 demo 是 **2026-10-23 厦门中山路门店快照**，不是实时数据；实时版才走 MCP
- 当前快照门店 112 个菜单条目中，39 个能匹配到营养数据并参与配餐；匹配不到的不推荐
- 套餐类、周边商品不纳入自动搭配；展示价优先用 `calculate-price` 实付价，接口失败时回退为菜单价之和
- 仅覆盖到店自取、单人场景，不处理外送地址与多人拼单
- 不代下单、不收集订单信息；实际购买请前往麦当劳官方渠道
- 营养数据仅供参考，不构成医疗或营养建议

## 参赛说明

本作品参加麦当劳程序员创意开发大赛「用餐｜把饭点安排明白」方向，交付形式为可安装的 WorkBuddy Skill + 可在浏览器直接体验的 H5。

如果这个项目帮到了你，欢迎点右上角 **Star ⭐**。

## License

MIT
