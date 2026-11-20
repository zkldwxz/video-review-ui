import { detectionsToRegions, emptyEdits, fromSam, parseYoloLabels, type ReviewVideo } from '@/review-kit'

const size = { width: 1280, height: 720, fps: 25 }

// 演示“模型预设”：台标用 YOLO 单帧结果（覆盖整段），账号水印用 SAM 2 逐帧结果（只在出现的时间段）
const yoloLogo = detectionsToRegions(parseYoloLabels('0 0.887 0.097 0.106 0.074 0.93', { classNames: ['logo'] }), { model: 'yolo', duration: 30 })
const samWatermark = detectionsToRegions(
  fromSam(
    Array.from({ length: 12 }, (_, i) => ({ frame_idx: (8 + i) * 25, obj_id: 2, label: 'watermark', mask: { bbox: [82, 636, 160, 38], predicted_iou: 0.96 } })),
    size,
  ),
  { model: 'sam2', duration: 30 },
)

export const tagOptions = ['风景', '航拍', '自然', '人文', '需二审', '版权存疑', '有台标', '有水印', '可商用']

export const demoVideos: ReviewVideo[] = [
  {
    id: 'v1',
    src: '/samples/shanye-12.mp4',
    poster: '/samples/shanye-12.jpg',
    fileName: 'shanye_ep12_final_v3.mp4',
    ...size,
    duration: 30,
    source: {
      externalId: '7438216590123456789',
      platform: '抖音',
      url: 'https://example.com/video/7438216590123456789',
      author: '@山野记录',
      authorId: 'UID 30451877',
      publishedAt: '2026-11-12 19:30',
      project: '山野记录 第二季',
      category: '户外 / 自然',
      stats: { plays: 3_820_000, likes: 214_300, comments: 5_120, shares: 18_960, favorites: 33_400 },
      extra: { 完播率: '41.6%', 来源批次: 'B-20261120-03', 原始码率: '4.2 Mbps' },
    },
    edits: {
      ...emptyEdits('山野记录 第 12 期：湖边日落'),
      tags: ['风景', '有台标'],
      status: 'marked',
      delogos: [...yoloLogo, ...samWatermark],
      segments: [
        { start: 1.2, end: 13.5 },
        { start: 16, end: 28.4 },
      ],
    },
  },
  {
    id: 'v2',
    src: '/samples/harbor-fog.mp4',
    poster: '/samples/harbor-fog.jpg',
    fileName: 'DJI_0412.mov',
    ...size,
    duration: 24,
    source: {
      externalId: 'BV1xK4y1e7Qp',
      platform: 'B 站',
      author: '港口观察员',
      publishedAt: '2026-11-08 07:12',
      project: '城市空镜采购',
      category: '航拍',
      stats: { plays: 96_400, likes: 3_210, comments: 188, favorites: 1_406 },
    },
    edits: { ...emptyEdits('港口晨雾 航拍'), tags: ['航拍'] },
  },
  {
    id: 'v3',
    src: '/samples/forest-stream.mp4',
    poster: '/samples/forest-stream.jpg',
    fileName: 'forest_stream_4k_graded.mp4',
    ...size,
    duration: 36,
    source: { externalId: 'KS-88213409', platform: '快手', author: '林间小记', project: '山野记录 第二季', category: '户外 / 自然', stats: { plays: 512_000, likes: 40_200 } },
    edits: { ...emptyEdits('林间溪流 空镜'), status: 'approved', crop: { x: 0.05, y: 0.05, w: 0.9, h: 0.9 } },
  },
  {
    id: 'v4',
    src: '/samples/shanye-12.mp4',
    poster: '/samples/shanye-12.jpg',
    fileName: 'shanye_ep13_rough.mp4',
    ...size,
    duration: 30,
    source: { externalId: '7440019283746501234', platform: '抖音', author: '@山野记录', project: '山野记录 第二季', category: '户外 / 自然' },
    edits: { ...emptyEdits('山野记录 第 13 期'), status: 'rejected', note: '片尾有未授权音乐，需替换后重新提交', tags: ['版权存疑'] },
  },
  {
    id: 'v5',
    src: '/samples/harbor-fog.mp4',
    poster: '/samples/harbor-fog.jpg',
    fileName: 'harbor_timelapse.mp4',
    ...size,
    duration: 24,
    source: { platform: '素材库', author: '内部拍摄', project: '城市空镜采购' },
    edits: emptyEdits('港口延时'),
  },
  {
    id: 'v6',
    src: '/samples/missing.mp4',
    fileName: 'interview_cam_a.mp4',
    source: { platform: '素材库', author: '内部拍摄', project: '访谈', category: '人物', extra: { 说明: '演示加载失败的状态' } },
    edits: emptyEdits('访谈片段 A 机位'),
  },
]
