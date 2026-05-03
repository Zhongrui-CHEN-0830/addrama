# AdDrama Libtv 生成、三方价值跳转、偏好反馈与广告库方案

时间：2026-05-03 16:00:15
工作区：/mnt/c/Users/29539/addrama

## 0. 本轮约束

用户明确要求：先思考并设计方案，审查后再执行操作。

因此本计划只做代码阅读和方案设计，不修改业务代码、不跑会产生外部副作用的 API 调用、不部署。

## 1. 产品工作流确认

AdDrama 的真实产品流程应是：

1. 平台/系统后台预存多个广告方原始素材，按行业、品牌、人群、预算、禁用词、可用广告形式、素材类型进行结构化管理。
2. 用户观看剧集或短剧时，系统对当前内容做场景理解：
   - 内容类型：古装、悬疑、都市、动漫、旅行、美食等。
   - 当前剧情节点：高潮、转场、对白、空镜、片尾、暂停页等。
   - 情绪强度和打断风险：red / yellow / green。
   - 用户状态：是否沉浸、是否连续追剧、是否广告敏感、历史兴趣偏好。
3. AI 从广告库中选择最匹配的行业/品牌素材。
4. AI 决定广告模式，而不是固定广告模式。六类模式：
   - short：普通短广告。
   - buffer-card：剧情缓冲卡。
   - character-match：角色同款推荐。
   - interactive：互动选择广告。
   - drama-style：AI 短剧式广告。
   - end-card：低打扰片尾/暂停/下一集前广告。
5. AI 将广告主原始素材改写成与当前剧集场景相关的剧情化/定制式广告：文案、互动问题、短剧脚本、视频生成 prompt。
6. 如果广告形式需要视频，就调用 Libtv/Seedance 生成广告视频；如果是轻量卡片/片尾/互动广告，demo 中可先展示卡片和脚本，同时可选择异步生成视频作为增强。
7. 用户看到广告后可以反馈：
   - 我更想看哪类广告。
   - 不想看这类广告。
   - 这条有用。
   - 这条无聊。
   demo 阶段只在前端/sessionStorage 呈现“AI 已记录并将调整后续广告体验”，不写数据库。

这能解释三个示例：
- 古装梳妆场景：匹配美妆素材，选择 character-match 或 interactive，插入 8 秒同款妆容灵感卡。
- 悬疑高潮：red 阶段不插，延后到 green/yellow 转场，匹配推理游戏/密室逃脱，选择 buffer-card。
- 连续追剧：进入低打扰模式，减少中插，增加 end-card/暂停页/下一集前互动权益。

## 2. 当前代码观察

已读文件：
- lib/libtv.ts
- app/api/generate-ad/route.ts
- app/api/ad-status/[sessionId]/route.ts
- app/after/page.tsx
- app/value/page.tsx
- components/AdCard.tsx
- components/UserPreference.tsx

### 2.1 Kimi 成功但未生成广告/没调用 Libtv 的可能原因

当前 app/api/generate-ad/route.ts 已经有 createLibtvSession(kimiResult.videoPromptA/B)，但用户观察到没有生成广告，可能有几类原因：

1. Libtv 环境变量缺失或命名不匹配。
   - lib/libtv.ts 只读取 process.env.LIBTV_ACCESS_KEY。
   - 如果 .env.local 或 Vercel 环境变量实际不是这个名字，createLibtvSession 会用 Bearer undefined。
   - 当前 route 捕获错误并只 console.error，不把 libtvError 返回给前端，因此前端只看到 Kimi 成功，误以为没调用。

2. Libtv API 鉴权/协议可能不对。
   - 当前请求：POST https://im.liblib.tv/openapi/session，Authorization: Bearer <key>，body: { message }。
   - 需要确认实际 Libtv 文档是否需要 accessKey/secret、签名、不同 endpoint，或者 body 字段不同。
   - 不应在未确认前盲改接口。

3. Kimi 返回的视频 prompt 不适合 Libtv。
   - 如果 videoPromptA/B 为空、中文过长、不是视频生成指令，Libtv 可能失败。
   - 需要在 create session 前校验 prompt 并记录调试信息。

4. 前端轮询只轮询 sessionId A。
   - after/page.tsx startPolling(data.sessionId)，没有 fallback 到 sessionIdB。
   - 如果 A 失败但 B 成功，前端仍看不到。

5. queryLibtvSession 的 done 解析可能过窄。
   - 只在 assistant message content 中找 .mp4/.webm/.mov URL。
   - 如果 Libtv 返回结构化 output/videoUrl/fileUrl，而不是文本 URL，当前解析会一直 pending。

6. 后端非致命吞错隐藏问题。
   - generate-ad route 把 Libtv 错误 console.error 后仍返回 Kimi 结果，但 response 不带 libtvStatus/libtvError。
   - demo 阶段建议把非敏感状态返回给前端，便于展示“文案已生成，视频生成失败/排队中”。

### 2.2 无法跳转“三方价值”页面的可能原因

app/after/page.tsx 中 “查看三方价值”按钮被包在：

```tsx
{showAdCard && (... button router.push('/value') ...)}
```

而 showAdCard 只有视频播放 currentTime >= 35 秒才变 true：

```tsx
if (video.currentTime >= 35 && !showAdCard) {
  video.pause()
  setShowAdCard(true)
}
```

所以如果用户视频短于 35 秒、自动播放失败、没等到 35 秒、或者希望直接看流程，就看不到三方价值入口。这很可能就是“无法跳转”的原因。

另外，AdCard 的三个按钮都会触发 preference，但没有提供“继续看三方价值”的路径；用户提交偏好后也只是显示成功，不会出现下一步按钮。

### 2.3 用户偏好反馈模块现状

components/UserPreference.tsx 已有基本偏好反馈：
- 不想再看 / 太长 / 不相关
- 我喜欢这类广告 / 想看更短广告 / 愿意互动换跳过
- 美食/游戏/数码/美妆/旅游/电商优惠

但它还不完全满足本轮产品要求：
- 缺少明确的 “这条有用 / 这条无聊”。
- “我更想看哪类广告 / 不想看这类广告” 没有分成两个清晰区域。
- 反馈未写 sessionStorage，刷新后不能呈现“AI 后续调整”。
- 提交后没有在 UI 上说明 demo 阶段不入库。
- 没有触发后续体验变化，例如低打扰提示、偏好摘要、下一步按钮。

## 3. 建议目标

本次实施目标建议分成 4 个小闭环：

A. 修复并可观测化 Libtv 广告生成链路。
B. 修复三方价值页面入口，不再依赖 35 秒广告卡出现。
C. 强化用户偏好反馈模块，demo 阶段用 sessionStorage 保存和呈现。
D. 补上 mock 广告库与 AI 选择逻辑，让 Kimi 不只是根据单一默认广告主生成，而是根据剧情从多个行业素材中选择并剧情化改写。

## 4. 详细执行方案

### 4.1 Libtv 调用链路修复

#### 4.1.1 后端返回 Libtv 诊断状态

修改 types/index.ts：
- 增加生成状态字段，建议不破坏现有字段：

```ts
export interface LibtvGenerationStatus {
  attempted: boolean
  status: 'not-configured' | 'queued' | 'error'
  error?: string
  projectUrlA?: string
  projectUrlB?: string
}

export interface GenerateAdResponse {
  ...
  libtv?: LibtvGenerationStatus
}
```

修改 app/api/generate-ad/route.ts：
- 在调用 createLibtvSession 前检查环境变量配置状态。
- 如果缺少，返回：
  libtv: { attempted: false, status: 'not-configured', error: 'LIBTV_ACCESS_KEY missing' }
- 如果调用失败，返回：
  libtv: { attempted: true, status: 'error', error: sanitizedMessage }
- 如果成功，返回：
  libtv: { attempted: true, status: 'queued', projectUrlA, projectUrlB }

注意：不要把完整 access key 或敏感响应返回前端。

#### 4.1.2 libtv.ts 增强配置校验与错误信息

修改 lib/libtv.ts：
- 不要用 `process.env.LIBTV_ACCESS_KEY!` 静默断言。
- 增加：

```ts
export function isLibtvConfigured() {
  return Boolean(process.env.LIBTV_ACCESS_KEY)
}
```

- createLibtvSession 内部若缺失 key，抛清晰错误。
- 请求失败时限制 err 文本长度，例如 slice(0, 500)。

#### 4.1.3 Libtv 状态查询兼容更多返回结构

修改 lib/libtv.ts queryLibtvSession：
- 保留当前 assistant message 正则。
- 增加结构化字段扫描，例如递归扫描 json.data 中可能出现的 videoUrl/url/fileUrl/outputUrl 字段。
- 同时返回 projectUrl，如果可用。

#### 4.1.4 前端展示 Libtv 状态和 fallback

修改 app/after/page.tsx / components/AdCard.tsx：
- 如果 Libtv queued：显示“Seedance 正在渲染广告”。
- 如果 Libtv error/not-configured：不要让广告卡空白，只展示 Kimi 生成的剧情化广告卡、脚本和互动问题。
- startPolling 支持 sessionIdA/sessionIdB fallback：
  - 优先轮询 sessionId。
  - 如果没有 sessionId 但有 sessionIdB，则轮询 B。
  - 可选：同时轮询 A/B，谁先 done 用谁。

#### 4.1.5 验证方式

不直接调用真实 Libtv，除非用户批准。

先写单元测试/集成测试：
- env 缺失时 generate-ad 能返回 Kimi 结果 + libtv not-configured。
- queryLibtvSession 能从结构化 json 中提取 videoUrl。
- queryLibtvSession 能从 assistant content 中提取 mp4 URL。

如果用户审查后允许，再用 .env.local 中的真实 key 做一次手动测试。

### 4.2 三方价值页面跳转修复

当前问题核心是入口被 showAdCard gating。

建议 UI 调整：

1. 在 app/after/page.tsx 页面底部始终显示一个流程导航区：
   - “查看 AI 决策面板” -> /ai-analysis
   - “查看三方价值” -> /value
   - “重新上传” -> /

2. showAdCard 仍然控制广告卡出现，但不控制三方价值入口。

3. 在广告卡/偏好反馈提交成功后，强化 CTA：
   - “反馈已记录，查看三方价值 →”

4. 如果用户视频短于 recommendedInsertPoint，插入点应动态计算：
   - 优先使用 result.rhythmTimeline.recommendedInsertPoints[0]
   - 如果没有，则 min(35, video.duration * 0.6)
   - 如果视频 duration < 35，确保仍能在合理时间出现广告卡，例如 duration * 0.5 或 5 秒。

这比单纯把 35 秒改小更合理，能体现 Kimi 的广告插入点判断。

### 4.3 用户偏好反馈模块强化

修改 components/UserPreference.tsx：

目标 UI：四个明确区块：

1. “这条广告怎么样？”
   - 这条有用
   - 这条无聊
   - 太长了
   - 和剧情不相关

2. “我更想看哪类广告？”
   - 美妆护肤
   - 饮料食品
   - 游戏娱乐
   - 电商优惠
   - 汽车出行
   - 旅行酒店
   - 数码家电

3. “不想看这类广告”
   - 同上行业标签，可多选。

4. “我偏好的广告体验”
   - 更短广告
   - 剧情缓冲卡
   - 角色同款推荐
   - 互动换跳过
   - 低打扰片尾广告

提交行为：
- 不写数据库。
- 写 sessionStorage，例如：

```ts
addrama_user_ad_preferences = {
  useful: boolean,
  boring: boolean,
  preferredCategories: string[],
  blockedCategories: string[],
  preferredFormats: AdFormat[],
  lastUpdatedAt: string
}
```

提交成功文案：
“已记录到本次 demo 会话。AI 将减少你不喜欢的类型，并优先尝试更短/更相关的广告形式。”

可选增强：AfterPage 读取该偏好，在广告卡上显示：
“已根据你的偏好切换为低打扰/互动模式（demo）”。

### 4.4 mock 广告库与 Kimi 选择逻辑

新增建议文件：

- lib/mock-advertisers.ts

结构示例：

```ts
export interface AdvertiserAsset {
  id: string
  industry: 'beverage-food' | 'beauty' | 'game' | 'ecommerce' | 'auto' | 'travel'
  brandName: string
  productName: string
  sourceMaterial: string
  keySellingPoint: string
  targetAudience: string
  brandTone: string
  bannedWords: string
  suitableScenes: string[]
  suitableFormats: AdFormat[]
  budgetTier: 'low' | 'medium' | 'high'
}
```

mock 样例：
- 饮料食品：0 糖气泡水 / 能量饮料 / 轻食。
- 美妆护肤：桃花妆口红 / 修护精华 / 防晒。
- 游戏：密室逃脱手游 / 推理游戏 / 国风 RPG。
- 电商：穿搭会场 / 家居好物 / 会员券。
- 汽车：新能源 SUV / 城市通勤车。
- 旅游：古城旅行 / 温泉酒店 / 海岛度假。

Kimi prompt 调整：
- 输入 frames + mockAdLibrary。
- 要求 Kimi 输出新增字段：

```json
"selectedAdvertiser": {
  "id": "beauty-peach-makeup",
  "industry": "beauty",
  "brandName": "...",
  "matchReason": "..."
}
```

- Kimi 先判断剧情场景，再选择广告素材，再选择六种广告形式之一，最后生成剧情化改写。

类型同步：
- types/index.ts 增加 SelectedAdvertiser / AdvertiserAsset。
- GenerateAdResponse 增加 selectedAdvertiser?: SelectedAdvertiser。

前端展示：
- AiPanel 增加“匹配广告素材”区域。
- AdCard 显示品牌/行业和“为什么匹配”。
- ValuePage/AdvertiserDashboard 可展示被选广告主对应的 mock 指标。

### 4.5 广告模式选择规则固化

虽然 Kimi 会选择，但为了 demo 稳定，建议 prompt 和代码里都保留一份规则说明：

- short：green 且用户无明显反感，节奏平缓。
- buffer-card：转场、章节间隔、悬疑高潮后的低冲突场景。
- character-match：服装、美妆、食品、旅行、家居等可消费场景，且画面有角色/物品/场景强关联。
- interactive：用户广告敏感，或希望用互动换短广告/跳过权益。
- drama-style：品牌预算 high，且当前内容风格适合剧情化表达。
- end-card：连续观看、沉浸状态高、强插广告容易流失。

建议在 lib/kimi.ts 的 prompt 中写清楚：
“必须从广告库中选择一个素材；不得使用默认广告主，除非广告库为空。”

## 5. 建议文件变更清单

预计修改：

- types/index.ts
  - 增加 LibtvGenerationStatus、AdvertiserAsset、SelectedAdvertiser、UserAdPreference 等类型。

- lib/libtv.ts
  - 配置校验。
  - 更清晰错误。
  - query 返回结构兼容。

- app/api/generate-ad/route.ts
  - 返回 libtv 状态。
  - 传入 mock 广告库给 Kimi。
  - 不吞掉 Libtv 错误，而是作为非致命状态返回。

- lib/kimi.ts
  - prompt 增加产品真实工作流、广告库选择、六种广告模式规则。
  - 输出 schema 增加 selectedAdvertiser。

- lib/kimi-url.ts
  - 如需支持更复杂 content block，不一定改。

- 新增 lib/mock-advertisers.ts
  - mock 广告库。

- components/UserPreference.tsx
  - 重构为清晰的四类反馈，sessionStorage 保存。

- components/AdCard.tsx
  - 展示广告形式、品牌行业、Libtv 生成状态、无视频 fallback。

- components/AiPanel.tsx
  - 展示 selectedAdvertiser 和广告模式选择理由。

- app/after/page.tsx
  - 动态广告插入时机。
  - 三方价值入口常驻。
  - Libtv 状态展示/轮询 fallback。
  - 偏好反馈 CTA。

- app/value/page.tsx
  - 可选：展示本次 AI 选择的广告行业、用户反馈如何带来三方价值。

- tests/kimi.test.ts 或新增 tests/libtv.test.ts / tests/preferences.test.ts
  - 覆盖 Kimi prompt/response schema、Libtv 状态解析、偏好存储辅助函数。

## 6. 测试与验证计划

执行实现后建议验证：

1. 静态验证
   - npm test
   - npm run lint
   - npx tsc --noEmit
   - npm run build

2. 手动 demo 验证
   - 上传一个短于 35 秒的视频，确认仍可进入 /value。
   - 上传后 Kimi 成功时，After 页面显示 AI 分析和广告卡 fallback。
   - 如果 LIBTV_ACCESS_KEY 缺失，页面明确显示“视频生成未配置/失败”，而不是静默无广告。
   - 如果 Libtv sessionId 返回，前端显示“Seedance 正在渲染”并开始轮询。
   - 点击广告互动按钮，出现偏好反馈模块。
   - 提交“这条无聊 / 不想看游戏 / 更短广告”，sessionStorage 中出现 addrama_user_ad_preferences。
   - 反馈成功后可以跳转“三方价值”。

3. 如果用户允许真实 API 调用
   - 使用当前 .env.local 实测 /api/generate-ad。
   - 检查返回 sessionId/sessionIdB/libtv.status。
   - 手动 GET /api/ad-status/<sessionId> 验证解析。

## 7. 风险与取舍

1. Libtv API 真实协议不确定。
   - 当前代码可能 endpoint/header/body 与真实文档不完全一致。
   - 方案先做可观测化，避免继续静默失败。

2. Libtv 视频生成耗时长。
   - demo 不应阻塞 Kimi 分析结果展示。
   - 广告视频应异步出现；视频失败时用剧情化卡片兜底。

3. Kimi 选择广告库可能不稳定。
   - prompt 要强 schema。
   - 前端/后端要做 fallback：如果 selectedAdvertiser 缺失，使用默认 mock 素材。

4. 用户偏好 demo 不写数据库。
   - 只能影响本次 sessionStorage 体验。
   - UI 需要明确“demo 会话内生效”。

5. 过度复杂会影响演示稳定性。
   - 建议第一轮只做 mock 库 + 状态可观测 + 常驻跳转 + 偏好模块。
   - 不急着做真正个性化推荐算法。

## 8. 推荐实施顺序

如果用户审查通过，建议按这个顺序做：

1. 先修三方价值入口：小改、风险低、立刻解决体验阻塞。
2. 再增强 Libtv 可观测化：定位“没调用/调用失败/解析失败”的真实原因。
3. 然后重构 UserPreference：满足用户偏好反馈功能展示。
4. 最后加入 mock 广告库 + Kimi 选择广告素材：提升产品完整性。
5. 每一步后跑 npm test / lint / tsc / build，保持可回滚。
