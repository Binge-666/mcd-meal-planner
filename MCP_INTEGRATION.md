# MCP 接入说明（MCP_INTEGRATION）

## 1. 接入方式
- MCP 地址：`https://mcp.mcd.cn`
- 传输协议：Streamable HTTP
- 鉴权：请求头 `Authorization: Bearer <MCP_TOKEN>`
- 客户端：`@modelcontextprotocol/sdk`（Node.js）

## 2. 配置
### 方式 A：WorkBuddy 配置
`~/.workbuddy/mcp.json`：

```json
{
  "mcpServers": {
    "mcd-mcp": {
      "type": "streamableHttp",
      "url": "https://mcp.mcd.cn",
      "headers": {
        "Authorization": "Bearer ${MCD_TOKEN}"
      },
      "timeout": 30000
    }
  }
}
```

### 方式 B：环境变量（本项目）
```bash
MCD_MCP_URL=https://mcp.mcd.cn
MCD_TOKEN=<你的 Token>
```

> 注意：Token 不写入仓库，`.gitignore` 已忽略本地配置文件。

## 3. 客户端实现（lib/mcp.mjs）
- 首次调用时建立 `StreamableHTTPClientTransport` 连接
- `callMcp(name, args)`：调用工具 → 提取文本 / 解析 JSON → 失败自动重连重试 1 次
- `extractJson`：从工具返回的说明文本中定位 `{"success"` 并做括号配对解析
- `cached(key, ttl)`：门店 10 分钟、菜单 10 分钟、营养 60 分钟、券 5 分钟、价格 3 分钟，降低请求频率（远低于 600 次/分钟限制）

## 4. 工具调用链
```text
用户打开页面 / 输入城市地标
  → now-time-info        取当前时间，决定早餐/午餐/下午茶/晚餐/夜宵
  → query-nearby-stores  搜门店（beType=1, searchType=2）
  → query-meals          取门店菜单（storeCode, orderType=1, beType=1）
  → list-nutrition-foods 取营养表并按名称匹配菜单单品
  → query-store-coupons  取门店可用券
  → 本地配餐算法（时段 + 剩余热量 + 预算 + 口味约束）
  → calculate-price      对每组推荐实际核价
  → 前端展示 + 生成今日饭签
```

辅助工具：
- `now-time-info`：既是健康检查，也是「饭点时段」的第一入口
- `campaign-calendar`：活动板块

### 饭点时段

| 时间 | 时段 | 建议热量占剩余额度 |
|---|---|---|
| 05:00–10:00 | 早餐 | 25% |
| 10:00–14:00 | 午餐 | 35% |
| 14:00–17:00 | 下午茶 | 15% |
| 17:00–21:00 | 晚餐 | 35% |
| 21:00–05:00 | 夜宵 | 20% |

## 5. 数据结构处理
### 营养表
`list-nutrition-foods` 的 `data` 是一段表格文本：
```text
[160]{productName,nutritionDescription,energyKj,energyKcal,protein,fat,carbohydrate,sodium,calcium}:
  巨无霸,null,2146,513,27,26,42,961,171
```
按行拆分、跳过表头、取最后 8 个字段，得到热量与宏量营养素。

### 菜单
`query-meals` 返回：
- `categories`：分类与商品编码
- `meals`：`code -> { name, image, currentPrice, originalPrice }`

### 名称匹配
营养表和菜单命名不完全一致（杯型、规格后缀），采用三级匹配：
1. 精确匹配（去空格/符号）
2. 别名表（如 `雪碧 → 雪碧中杯`、`麦乐鸡 → 麦乐鸡5块`）
3. 去规格后缀模糊匹配（`中杯/大杯/小杯/盒装/2块/5块`），并按 `中杯 > 小杯 > 大杯` 优先

## 6. 错误处理
| 情况 | 处理 |
|---|---|
| 401 | 提示检查 Token |
| 429 | 本地缓存 + 缩短请求，返回友好错误 |
| 工具返回 `success:false` | 抛出 `message` 并展示 |
| 连接中断 | 清空客户端并重试一次 |

## 7. 复现步骤
```bash
npm install
MCD_TOKEN=<token> npm start
# http://localhost:3000
```

也可使用 URL 参数直接生成配餐：
```text
http://localhost:3000/?autoplan=1&city=北京&keyword=国贸&kcal=700&tastes=spicy
```

## 8. 静态快照 demo

`node scripts/build-static.mjs` 会把一次真实 MCP 调用结果（门店、菜单、营养、券、活动）连同配餐算法和前端打进 `docs/index.html`：

- 单文件、免 Token、免安装，可直接双击或部署到 GitHub Pages
- 浏览器内拦截 `/api/*`，用快照数据复现 `/api/now`、`/api/stores`、`/api/activity`、`/api/plan`
- 不包含任何 Token、手机号、订单或地址
- 快照会过期，实时菜单与实价核验仍需启动完整版并配置自己的 Token

构建命令：

```bash
npm run build:demo
```

配餐算法也可以单独命令行跑：

```bash
npm run plan:demo -- --kcal 700 --meal dinner --tastes spicy --budget 40
```
