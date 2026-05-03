export const PRODUCT_DOC_STORAGE_KEY = 'addrama_product_doc'

export const DEFAULT_PRODUCT_DOC = `# AdDrama AI 产品说明

## 1. 产品定位
AdDrama AI 是面向短剧/视频平台的 AI 广告体验优化系统。它不是简单地把传统贴片广告插入视频，而是先理解剧情场景、情绪强度和节奏风险，再从广告主素材库中选择合适素材，生成与当前剧情相关的定制式广告。

## 2. 核心工作流
1. 用户上传视频片段。
2. 系统抽取关键帧，Kimi 识别场景、情绪、节奏和广告插入风险。
3. Kimi 从模拟广告库中选择最匹配广告主素材。
4. Kimi 自动选择广告形式：普通短广告、剧情缓冲卡、角色同款推荐、互动广告、AI 短剧广告或片尾低打扰广告。
5. Libtv/Seedance 异步生成广告视频；生成期间前端展示广告卡片和渲染状态。
6. 在推荐插入点触发不可跳过广告门禁，避免评委必须从头观看，同时体现真实平台广告机制。
7. 用户可反馈“有用/无聊、想看/不想看类别”，demo 阶段记录在本次浏览器会话。

## 3. 三方价值
- 用户：广告更短、更相关，避开剧情高潮，并拥有反馈权。
- 平台：降低广告负反馈，提高完播率、观看时长和广告库存价值。
- 广告主：原始素材被 AI 改写为场景化表达，提高品牌记忆度和转化效率。

## 4. Demo 说明
当前 demo 重点展示产品流程与交互闭环。Libtv 视频生成是异步任务，实际返回可能需要数分钟；若视频未生成，页面会继续展示轮询状态和项目画布入口。`

export function normalizeProductDoc(value: unknown): string {
  if (typeof value !== 'string') return DEFAULT_PRODUCT_DOC
  const trimmed = value.trim()
  return trimmed ? value : DEFAULT_PRODUCT_DOC
}
