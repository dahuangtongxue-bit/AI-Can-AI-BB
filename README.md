# AI 奇葩说 · 竞技场

六个国产大模型 **3v3** 唇枪舌战，现场 100 名拟真观众 **赛前/赛后两次投票**，**跑票多者胜** —— 一档全自动的 AI 辩论围观秀。

与「AI 谁是卧底」「AI 狼人杀」同一套架构：Next.js + Edge Function 模型代理 + 上帝视角围观 + 本地历史回放，**环境变量与那两个项目完全相同，可直接复用同一批 API Key**。

---

## 玩法

- **3v3**：每局把你选的 6 个模型随机分成正方 3 人、反方 3 人，各自随机抽一/二/三辩。
- **跑票定胜负**：现场 100 名观众赛前先就辩题投一次，全场辩完再投一次；把更多观众拉到自己这边（净增票更多）的一方获胜——不看绝对多数，看「跑票」。
- **全自动**：开一局，6 个模型自动跑完全程，你只管围观。

### 单场流程
1. **出辩题** → 随机分正反方、定辩位
2. **观众初投**（拟真）→ 得到初始票数，如 正53 : 反47
3. **立论**：正一辩 → 反一辩 → 正二辩 → 反二辩 → 正三辩 → 反三辩，依次开场陈词
4. **开杠**：双方一辩短兵相接，4 个回合快速攻防
5. **结辩**：双方三辩总结陈词，**赛前落后的一方拿到「后结辩」**（全场最后发言权，制造翻盘/跑票戏剧性）
6. **导师点评**：1-2 位导师点评全场（只点评、不投票）
7. **观众终投**（拟真）→ 最终票数
8. **判胜负**：比各方「最终 − 初始」的净增票，跑票多者胜，并评出本场 MVP 辩手

---

## 角色怎么来的

为了不增加任何环境变量，导师 / 评审都是**从你选的同一批模型里客串中立角色**（当前版本，对应需求里的 (A) 方案）：

- **6 名辩手**：你选的 6 个模型。
- **1-2 位导师（纯点评）**：每局随机挑 1-2 个模型，用中立"导师"人设给一段奇葩说式点评，**不投票、不判胜负**。
- **1 位"现场观众情绪"评审**：自动挑一个稳定模型（优先 DeepSeek > 智谱 > 千问，避开 MiniMax），用绝对中立的人设产出观众的初始/最终投票分布——**跑票就是它算的**。

> 这些中立角色由参赛模型客串，略有"既当运动员又当裁判"的味道，但对娱乐节目无伤大雅。后期想干净分离（给导师/评审单独配模型，完全不下场），代码里把这几处的取值改成独立槽位即可（对应 (B) 方案）。
>
> 比赛页右上角「解说」开关打开后，会显示当前由哪个模型当评审、哪些当导师，以及观众跑票的理由。

## 「加权拟真观众」是怎么算的

- 评审模型**赛前只看辩题**给一个初始分布（基于大众对这个话题的天然立场，不必对半），**赛后读完整场**给最终分布，并说明哪些发言造成了跑票。
- 程序在评审给的数字上叠加一个**小幅随机抖动**做基线，让票数有机、不死板；同时**严格沿用评审的跑票方向与幅度**，保证"谁赢"始终等于评审的判断，不会被随机噪声翻盘。
- 后期要换成**真人观众投票**：把 `runDebate` 里赛前/赛后那两处评审调用，换成真人投票 UI 的结果即可，其余流程不动（接口已预留）。

---

## 本地运行

```bash
npm install
# 配置环境变量（见下），或先用 .env.local
npm run dev      # http://localhost:3000
```

## 部署到 Netlify

1. 推到 GitHub，在 Netlify「Add new site → Import from GitHub」选该仓库。
2. 构建设置（仓库里 `netlify.toml` 已写好，一般无需改）：
   - Build command：`npm run build`
   - Publish directory：`.next`
   - 插件：`@netlify/plugin-nextjs`
3. 配置环境变量（见下），Deploy。

### 环境变量（与卧底 / 狼人杀完全一致，可复用同一批 Key）

六个模型槽位，每个 4 个变量（`DISPLAY_NAME` 可不填，显示名已写死在代码里：1 智谱 / 2 DeepSeek / 3 千问 / 4 Kimi / 5 豆包 / 6 MiniMax）：

```
PLAYER_1_BASE_URL = https://open.bigmodel.cn/api/paas/v4
PLAYER_1_API_KEY  = <智谱 key>
PLAYER_1_MODEL    = glm-4.5

PLAYER_2_BASE_URL = https://api.deepseek.com/v1
PLAYER_2_API_KEY  = <DeepSeek key>
PLAYER_2_MODEL    = deepseek-chat

PLAYER_3_BASE_URL = https://dashscope.aliyuncs.com/compatible-mode/v1
PLAYER_3_API_KEY  = <千问 key>
PLAYER_3_MODEL    = qwen-plus

PLAYER_4_BASE_URL = https://api.moonshot.cn/v1
PLAYER_4_API_KEY  = <Kimi key>
PLAYER_4_MODEL    = moonshot-v1-8k

PLAYER_5_BASE_URL = https://ark.cn-beijing.volces.com/api/v3
PLAYER_5_API_KEY  = <豆包 key>
PLAYER_5_MODEL    = <豆包接入点 ID>

PLAYER_6_BASE_URL = https://api.minimaxi.com/v1
PLAYER_6_API_KEY  = <MiniMax key>
PLAYER_6_MODEL    = MiniMax-M2.7-highspeed

# 可选
ACCESS_PASSWORD       = <访问密码，留空则不验证>
SECRETS_SCAN_ENABLED  = false
```

> **MiniMax 提示**：沿用了狼人杀里那套已调好的处理——内容审核软化、流式心跳保活、22 秒截止保护、长发言自动压短、失败优雅跳过。建议用 `MiniMax-M2.7-highspeed` 这类高速版；它的"立论/结辩"会被自动压成 2-3 句精炼输出，以避开边缘函数超时。

---

## 自定义辩题

设置页内置了一批奇葩说风格辩题（感情 / 家庭 / 职场 / 脑洞），「换一个」随机抽；也可点「自定义辩题」手动填辩题与正反方观点。

## 与其它项目的关系

`app/api/debate/route.js` 是从「AI 狼人杀」的代理文件直接复用的（厂商关思考、Kimi 温度、MiniMax 全套处理都在里面），仅把"精简措辞"改得更适合辩论。所以三个项目（卧底 / 狼人杀 / 奇葩说）**共用同一套模型接入与同一批 Key**，配一次到处用。

## 技术栈

Next.js 15（App Router）· React 18 · Tailwind CSS · lucide-react · Netlify Edge Functions · localStorage 历史回放
