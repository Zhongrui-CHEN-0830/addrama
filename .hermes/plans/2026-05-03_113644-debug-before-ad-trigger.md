# Plan: debug addrama “改造前” 20 秒传统广告体验未触发

生成时间：2026-05-03 11:36:44
项目路径：`/mnt/c/Users/29539/addrama`
约束：本计划只做只读检查和修复方案设计；在你审查通过前不修改业务代码。

## 1. 目标

修复上传视频后点击“体验改造前”进入 `/before` 页面时，预期体验没有出现的问题：

1. 视频播放至第 20 秒时，随机广告全屏覆盖，持续 30 秒，不可跳过。
2. 广告覆盖期间，负面情绪气泡动效同步浮现。
3. 广告结束后出现按钮：`下一步：看 AI 如何决策 →`。

同时确保这个流程适合 demo：即使用户上传的视频不足 20 秒，也不应导致“改造前”体验永远不出现。

## 2. 当前只读检查结果

相关文件：

- `app/page.tsx`
  - 上传成功后显示两个入口：
    - `体验改造前 →` 跳转 `/before`
    - `直接体验改造后 →` 跳转 `/after`
- `components/VideoUpload.tsx`
  - 上传成功后把 blob URL 写入：`sessionStorage.addrama_blob_url`
- `app/before/page.tsx`
  - 读取 `sessionStorage.addrama_blob_url`
  - 如果不存在则跳回 `/`
  - 当前广告触发逻辑在 `timeupdate` 事件里：
    - 当 `video.currentTime >= 20 && !adActive` 时：
      - `video.pause()`
      - `setAd(getRandomAd())`
      - `setAdActive(true)`
      - `setAdCountdown(30)`
  - 负面气泡依赖 `adActive === true`
  - 下一步按钮依赖 `showNext === true`
  - `showNext` 只在 `adCountdown <= 0` 时设置为 true

## 3. 初步根因假设

### 根因假设 A：上传视频时长不足 20 秒，导致触发条件永远达不到

这是最可能的原因。

当前代码把“传统广告插入点”硬编码为 20 秒：

```ts
if (video.currentTime >= 20 && !adActive) { ... }
```

如果上传的视频长度小于 20 秒，`timeupdate` 永远不会达到 20 秒；视频自然结束后，当前代码也没有 `ended` 兜底触发，所以广告覆盖、负面气泡、下一步按钮都会缺失。

用户描述是“观看完视频后并没有出现”，这与“视频不足 20 秒或播放结束早于 20 秒”高度吻合。

### 根因假设 B：`adActive` 关闭后，`currentTime` 仍然大于 20，可能再次触发广告

当前逻辑在广告结束后：

```ts
setAdActive(false)
setShowNext(true)
videoRef.current?.play()
```

但没有 `hasTriggeredAd` 标志。广告结束恢复播放后，视频 currentTime 仍然在 20 秒附近或大于 20 秒。由于 `adActive` 又变回 false，理论上下一次 `timeupdate` 会再次触发广告，造成循环广告或按钮状态异常。

虽然这不是“完全不出现”的第一根因，但属于必须一起修掉的状态机缺陷。

### 根因假设 C：`timeupdate` 事件绑定时机可能早于 video DOM/ref 稳定

当前 `before/page.tsx` 初始 `videoUrl` 为空，读取 sessionStorage 后才渲染 `<video>`。广告触发 effect 依赖只有 `[adActive]`，不依赖 `videoUrl`。

React effect 首次执行时可能拿不到 `videoRef.current`，直接 return。之后 `videoUrl` 更新导致 `<video>` 出现，但这个 effect 不一定因为 `videoUrl` 变化而重新绑定监听器。

这会导致 `timeupdate` handler 没有挂上，进而广告永远不触发。

这个假设也很重要，因为即使视频超过 20 秒，也可能因为监听器绑定失败导致问题。

## 4. 修复方向

建议把 `/before` 页面的“传统广告体验”改成一个更明确的单次触发状态机，而不是只依赖 `currentTime >= 20 && !adActive`。

### 4.1 增加单次触发标志

在 `app/before/page.tsx` 增加：

- `hasTriggeredAd` state 或 ref

目的：确保传统广告只触发一次。

推荐用 ref：

```ts
const hasTriggeredAdRef = useRef(false)
```

触发广告时立刻设置：

```ts
hasTriggeredAdRef.current = true
```

### 4.2 抽出统一触发函数

新增函数：

```ts
function triggerTraditionalAd() {
  if (hasTriggeredAdRef.current) return
  hasTriggeredAdRef.current = true
  videoRef.current?.pause()
  setAd(getRandomAd())
  setAdActive(true)
  setAdCountdown(30)
}
```

让 `timeupdate`、`ended`、`loadedmetadata` 等都调用同一个函数，避免多处状态不一致。

### 4.3 监听器依赖改为跟随 `videoUrl`

把广告触发 effect 改成依赖 `videoUrl`，确保 `<video>` 渲染后重新绑定监听器：

```ts
useEffect(() => {
  const video = videoRef.current
  if (!video || !videoUrl) return
  ...
}, [videoUrl])
```

注意：这里不再依赖 `adActive`，避免反复解绑/重绑。

### 4.4 对短视频增加兜底触发策略

为了满足 demo 体验：

- 如果视频时长大于 22 秒：仍在第 20 秒触发。
- 如果视频时长不足 20 秒：在视频接近结尾前触发，例如：
  - `triggerAt = Math.max(1, Math.min(20, duration * 0.6))`
  - 或 `triggerAt = Math.max(1, duration - 1)`

我更建议：

```ts
const triggerAt = Number.isFinite(video.duration)
  ? Math.min(20, Math.max(1, video.duration * 0.6))
  : 20
```

原因：

- 长视频仍符合“20 秒插入”的需求。
- 短视频也能看到传统广告体验，不会播放完什么都不发生。
- 60% 位置比最后 1 秒更自然，用户更容易感知“粗暴打断”。

### 4.5 添加 `ended` 兜底

即使浏览器没有及时触发目标秒数，也应在视频结束时兜底触发：

```ts
video.addEventListener('ended', triggerTraditionalAd)
```

这样“观看完视频后”也不会空白结束。

### 4.6 广告文案改为“不可跳过”

当前 UI 显示：

```tsx
广告 · {adCountdown > 0 ? `${adCountdown} 秒后可跳过` : '广告结束'}
```

这与需求“不可以跳过”矛盾。

应改成类似：

```tsx
广告 · 不可跳过 · 剩余 {adCountdown} 秒
```

或者：

```tsx
广告 · {adCountdown > 0 ? `不可跳过 · 剩余 ${adCountdown} 秒` : '广告结束'}
```

### 4.7 广告结束后是否恢复原视频播放

当前广告结束后会：

```ts
videoRef.current?.play()
```

这里有两个选择：

方案 A：保留恢复播放，同时显示下一步按钮。
- 优点：模拟真实广告结束后继续播放。
- 风险：如果没有 `hasTriggeredAd`，会循环触发；但加了单次标志后风险消失。

方案 B：广告结束后不恢复播放，只显示“下一步”。
- 优点：demo 节奏更明确，用户不会错过按钮。
- 缺点：不像真实播放器。

建议采用方案 A，并确保按钮明显显示在视频下方。

## 5. 具体修改计划（待你批准后执行）

仅修改：

- `app/before/page.tsx`

拟执行步骤：

1. 在组件内新增 `hasTriggeredAdRef`，控制传统广告只触发一次。
2. 新增 `triggerTraditionalAd` 统一函数。
3. 修改广告触发 effect：
   - 依赖 `videoUrl`
   - 绑定 `timeupdate`
   - 绑定 `loadedmetadata` 或在 handler 内动态计算 triggerAt
   - 绑定 `ended` 兜底
   - cleanup 时移除监听器
4. 修改倒计时结束逻辑：
   - 设置 `adActive=false`
   - 设置 `showNext=true`
   - 保留或明确处理视频恢复播放
5. 修改广告倒计时 UI 文案为“不可跳过”。
6. 如果需要，增加一行很轻的调试日志，开发时验证后可删除：
   - 不建议长期保留 console.log。

## 6. 验证计划

### 6.1 静态验证

运行：

```bash
npm run lint
npm run build
```

目标：

- TypeScript/ESLint 无错误。
- Next.js build 成功。

### 6.2 手动浏览器验证

启动本地服务：

```bash
npm run dev
```

测试路径：

1. 打开首页 `/`。
2. 上传一个视频。
3. 点击 `体验改造前 →`。
4. 对长视频（>20 秒）验证：
   - 第 20 秒出现全屏广告覆盖。
   - 倒计时 30 秒。
   - 文案显示不可跳过。
   - 负面气泡持续浮现。
   - 广告结束后出现 `下一步：看 AI 如何决策 →`。
5. 对短视频（<20 秒）验证：
   - 不会“播放完什么都没有”。
   - 应在 60% 左右或 ended 兜底触发广告。
6. 点击 `下一步：看 AI 如何决策 →`，确认进入 `/ai-analysis`。

### 6.3 可选自动化验证

当前项目未配置 Playwright/Vitest/Jest。若后续希望稳定回归测试，可以新增 Playwright E2E：

- mock sessionStorage 中的 `addrama_blob_url`
- 使用测试 mp4 或 data URL
- 跳转 `/before`
- 操作 video currentTime 或等待事件
- 断言广告层、气泡、下一步按钮出现

但这会新增依赖和测试配置，不建议放进本次最小修复，除非你要求。

## 7. 风险与权衡

1. 浏览器自动播放策略：
   - 当前 video 是 `autoPlay muted`，通常允许自动播放。
   - 广告结束后的 `play()` 可能在某些浏览器被拒绝，但这不影响下一步按钮显示。

2. Blob 视频 metadata 加载：
   - Vercel Blob URL 跨域播放通常没问题。
   - 若 `duration` 一开始是 `NaN`，用 fallback 20 秒即可。

3. 短视频触发点：
   - 如果采用 60% 时长触发，就不再严格是“20 秒”。
   - 但从 demo 角度更可靠。
   - UI 可以仍表达为“传统平台在固定点粗暴插入广告”；代码层面对短视频做体验兜底。

4. 30 秒倒计时对 demo 偏长：
   - 需求明确写 30 秒，不建议改短。
   - 如需演示更快，可以后续做 dev-only 加速开关，但本轮不加。

## 8. 建议采纳的最终方案

我建议批准以下最小修复：

- 只改 `app/before/page.tsx`。
- 添加 `hasTriggeredAdRef` 防止重复触发。
- 广告触发 effect 依赖 `videoUrl`，确保 video ref 存在后绑定事件。
- 触发点：长视频 20 秒；短视频 60% 时长；ended 兜底。
- 广告文案改为“不可跳过 · 剩余 N 秒”。
- 广告结束后显示下一步按钮，并恢复原视频播放。

你确认后，我再开始修改代码。