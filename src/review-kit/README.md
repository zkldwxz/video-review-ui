# review-kit：视频审核组件

批量审片：重命名、标签、来源信息展示、裁剪、Delogo（可自由缩放、可设时间段）、片段剪切、审核结论。模型（YOLO / SAM）的输出可以直接预设成 Delogo 区域。

```
core/      纯逻辑，不依赖 React：类型、编辑与撤销、检测框合并、快捷键、导出任务
adapters/  模型输出 → Detection：YOLO 标签文本、Ultralytics JSON、SAM / SAM 2（含 COCO RLE 解码）
react/     <VideoReviewer> 及其子组件
```

React 层依赖项目里的 shadcn/ui 组件（`@/components/ui/*`）和图标（`@/components/icons/review-icons`）。

## 最小接入

```tsx
import { VideoReviewer, emptyEdits, type ReviewVideo } from '@/review-kit'

const videos: ReviewVideo[] = [
  {
    id: 'v1',
    src: 'https://cdn.example.com/a.mp4',
    poster: 'https://cdn.example.com/a.jpg',
    fileName: 'a.mp4',
    width: 1920, height: 1080, duration: 102, fps: 25, // 可选，不传时从视频元数据读取（fps 默认 25）
    source: {
      externalId: '7438216590123456789', platform: '抖音', author: '@作者',
      project: '项目名', category: '分类', url: 'https://…',
      stats: { plays: 3820000, likes: 214300, comments: 5120, shares: 18960 },
      extra: { 完播率: '41.6%' }, // 其他数据，按原样展示
    },
    edits: emptyEdits('视频标题'),
  },
]

<VideoReviewer
  videos={videos}
  tagOptions={['风景', '需二审']}
  onSave={async (task) => api.submit(task)}   // 抛错会显示在保存按钮旁
  onChange={(videoId, edits) => draft.save(videoId, edits)}
  keymap={savedKeymap}                         // 初始快捷键，不传用默认
  onKeymapChange={(k) => storage.set('keymap', k)}
/>
```

`ref` 可以拿到 `VideoReviewerHandle`：`importRegions(videoId, regions)`、`getEdits(videoId)`、`selectVideo(videoId)`。

## 功能开关

用不到的功能可以关掉。关掉的功能会同时去掉界面、快捷键（快捷键设置里也不再列出），以及 `onSave` 任务里对应的数据。三种调整方式：

```tsx
import { featurePresets } from '@/review-kit'

// 1. 只写要改的项，其余用默认值
<VideoReviewer features={{ segments: false }} />

// 2. 用预设
<VideoReviewer features={featurePresets.delogoOnly} />   // 只做 Delogo，不要裁剪和片段
<VideoReviewer features={featurePresets.delogoStatic} /> // 只做 Delogo，每个区域整段生效
<VideoReviewer features={featurePresets.trimOnly} />     // 只剪片段

// 3. 直接改 core/features.ts 里的 defaultFeatures：所有没传 features 的地方都跟着变
```

| 开关 | 关掉后 |
|---|---|
| `queue` | 隐藏左侧视频队列，↑ / ↓ 切换失效 |
| `rename` | 标题只读，AI 改写标题也关掉 |
| `tags` | 隐藏标签 |
| `sourceInfo` | 隐藏平台、作者、视频 ID、数据统计和自定义字段 |
| `crop` | 隐藏裁剪页签和裁剪框，任务里 `crop` 为 `null` |
| `delogo` | 隐藏 Delogo，任务里 `delogos` 为空；连带关掉下面两项 |
| `delogoTimeRange` | Delogo 不分时间段：框始终生效，不显示时间输入和时间轴轨道，导入模型结果时同一目标不拆段，任务里每个区域都是 `0` 到时长 |
| `modelImport` | 隐藏“导入模型结果”（`ref.importRegions` 仍可用） |
| `segments` | 隐藏片段页签、时间轴片段轨道和“切开”，任务里 `segments` 为空（导出整段）；I / O 只用来设选中 Delogo 的开始 / 结束 |
| `batchSync` | 隐藏“同步到同分辨率视频” |
| `decision` | 隐藏通过 / 驳回和备注，只保留“保存” |

切换开关不会删除已有数据：重新打开后，之前的裁剪框、片段和时间段都还在。关掉时只是不显示、不导出。

## AI 改写标题

传 `generateTitles` 才会显示（信息页标题下方，以及画面上方标题旁的按钮，快捷键 T）。组件只负责交互，模型调用放在宿主后端，API Key 不进浏览器：

```tsx
<VideoReviewer
  generateTitles={async ({ prompt, video, edits }, signal) => {
    const res = await fetch('/api/titles', { method: 'POST', signal, body: JSON.stringify({ prompt, category: video.source?.category, currentTitle: edits.title }) })
    return (await res.json()).titles // string[]
  }}
  titlePromptTemplate="生成一个{category}的视频标题" // 默认值
/>
```

- 模板变量：`{category}`（取 `source.category`）、`{title}`、`{author}`、`{platform}`、`{project}`、`{tags}`。
- 模板引用的变量都有值时，输入框预填好，直接回车生成；有缺失时输入框留空，由用户自己写。
- 点候选标题直接替换（可撤销）；“换一批”重新生成。
- demo 的后端在 `server/`：Vite 开发服务器上的 `POST /api/titles`，用 `claude-opus-5-5` + 结构化输出返回 3 个候选，开启了拒答时的服务端自动兜底。需要在 `.env.local` 写 `ANTHROPIC_API_KEY=...` 后重启 `pnpm dev`。

## 视频地址有防盗链时

`<video>` 直接请求 `src`。平台 CDN 校验 Referer / UA，或者需要从页面跨域调平台接口时，安装 `extensions/header-bridge` 插件并配置对应规则。demo 里的 B 站视频就是这样加载的（`src/demo/bilibili.ts`）。

## 用模型预设 Delogo

所有适配器都输出统一的 `Detection`（某一时刻的一个归一化框），再用 `detectionsToRegions` 合并成带时间段的区域：

```ts
import { detectionsToRegions, fromSam, fromUltralytics, parseYoloLabels } from '@/review-kit'

// YOLO 标签文本：class cx cy w h [conf] [track_id]（归一化）。单帧结果覆盖整个视频。
const regions = detectionsToRegions(parseYoloLabels(txt, { classNames: ['logo'] }), { model: 'yolo', duration })

// Ultralytics：result.summary() 的数组，或逐帧 [{ time | frame, detections: [...] }]，像素坐标
detectionsToRegions(fromUltralytics(frames, { width, height, fps }), { model: 'yolo', duration })

// SAM：AMG 输出 [{ bbox, segmentation(RLE / 二值数组), predicted_iou }]
// SAM 2 视频：[{ frame_idx, obj_id, mask: { segmentation | bbox } }]
detectionsToRegions(fromSam(items, { width, height, fps }), { model: 'sam2', duration })
```

然后放进 `edits.delogos`，或调用 `ref.current.importRegions(videoId, regions)`。界面里也可以直接粘贴（Delogo 页 → 导入模型结果，自动识别格式）。

合并规则：
- 有 `trackId` 时按 ID 分组；没有时，同类框按 IoU（默认 0.3）匹配到上一帧最接近的目标。
- 同一目标的框取并集，再向外扩 `padding`（默认 0.006）。
- 在正常采样间隔之外又缺失超过 `maxGap` 秒（默认 1）就拆成两段；低于 `minScore`（默认 0.25）的框丢掉。
- 每个区域保留 `origin: { model, label, score, trackId }`，界面上会显示来源，方便复核。

## 保存的任务（onSave）

`ReviewTask` 的坐标已换算成像素：

- `crop`：起点和宽高取偶数（yuv420 要求）
- `delogos`：相对原始画面，四周至少留 1px（ffmpeg delogo 需要边框像素）；应在 crop **之前**处理
- `segments`：为空表示整段保留
- 另带 `title`、`tags`、`status`、`note`、`source`、`media`

前端只产出任务，转码由后端执行。

## 默认快捷键

| 动作 | 键 |
|---|---|
| 播放 / 暂停 | 空格 |
| 后退 / 前进 5 秒 | ← / →（长按 → 2 倍速快进，松开恢复） |
| 上一帧 / 下一帧 | , / . |
| 上一条 / 下一条视频 | ↑ / ↓ |
| 降低 / 提高倍速 | [ / ] |
| 新建 Delogo | N |
| 新建 / 选中裁剪框 | C |
| 删除选中 | Delete / ⌫ |
| 入点 / 出点（作用于选中项；没选中时新建片段） | I / O |
| 在播放头处切开片段 | S |
| 撤销 / 重做 | Z、⌘Z / ⇧Z、⌘⇧Z |
| 保存 | Enter |
| 取消选中 | Esc |

按键按 `KeyboardEvent.code` 匹配，不受中文输入法影响；焦点在输入框里时不触发。鼠标：点画面空白处播放 / 暂停，长按 2 倍速快进；拖框移动，拖控制点缩放，按住 Shift 缩放时保持比例；拖时间轴色条平移，拖两端改开始和结束时间（靠近播放头时自动吸附）。
