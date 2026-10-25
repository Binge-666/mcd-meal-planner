# brief.md - 麦计·饭点管家（最小复现版）

## 目标
用最短路径复现“按时段选饭点 -> 附近门店 -> 热量+预算配餐 -> 实价核验 -> 生成饭签”的最小闭环。

## 技术栈
- 后端：Node.js (ESM) + Express
- 前端：原生 HTML / CSS / JavaScript（禁止引入框架）
- MCP：@modelcontextprotocol/sdk（Streamable HTTP）
- 不要在前端暴露 MCD_TOKEN

## MCP 工具清单（必须用到）
- query-nearby-stores（按 city + keyword 搜索到店自取门店）
- query-meals（获取门店在售菜单）
- list-nutrition-foods（获取营养数据，用于匹配菜单单品）
- query-store-coupons（获取门店优惠券）
- calculate-price（每组组合核验实际应付价）

## 核心功能（按优先级做）
1. 门店搜索与选择
2. 营养匹配（能匹配到的才参与配餐）
3. 确定性配餐（主餐+饮品+小食，按热量差+蛋白质打分排序，生成 3-6 组）
4. 预算约束（用 calculate-price 实价过滤，超预算要标注超出金额）
5. 今日饭签（Canvas 生成分享图）

## 页面结构（最简）
- 顶部：时段、今日剩余额度
- 门店区：城市/商圈 -> 搜索 -> 门店列表（可选中）
- 配餐区：目标热量、预算、口味（可先只做热量+预算两个）
- 结果区：推荐组合列表、营养明细、价格、生成饭签

## 约束
- 不得把 token 写进前端代码
- 用原生实现，不用打包工具（webpack/vite）
- 配置优先从环境变量 MCD_TOKEN 读取，也可兼容 ~/.workbuddy/mcp.json
- 营养匹配不到的单品不纳入自动搭配
- 套餐类商品不纳入自动搭配

## 验收标准
- [ ] 能用 MCP 搜到真实门店
- [ ] 能生成 >=3 组配餐
- [ ] 每组都能拿到 calculate-price 的实价
- [ ] 预算过滤用实价判断生效
- [ ] npm start 本地可跑通全流程

## 参考文件（只传这些即可）
- server.mjs
- lib/mcp.mjs
- lib/catalog.mjs（可只看 getStores/getMenu/getNutrition/calcPrice 思路）
- lib/planner.mjs
- public/index.html
- public/app.js
