import { emptyEdits, type ReviewVideo } from '@/review-kit'

/**
 * 演示用：BV 号 → ReviewVideo。B 站的视频地址带签名、约两小时过期，所以每次打开页面时现查。
 * 需要“审片台请求头助手”插件：接口会拒绝 localhost 的 Origin，且浏览器默认不允许跨域读取。
 */

type BiliResponse<T> = { code: number; message: string; data: T }

type BiliView = {
  bvid: string
  cid: number
  title: string
  pic: string
  duration: number
  pubdate: number
  tname: string
  owner: { mid: number; name: string }
  stat: { view: number; like: number; reply: number; share: number; favorite: number; coin: number }
  dimension: { width: number; height: number; rotate: number }
}

type BiliPlayUrl = { quality: number; accept_quality: number[]; accept_description: string[]; durl: { url: string }[] }

const API = 'https://api.bilibili.com'

export const EXTENSION_HINT = '浏览器拦截了对 B 站接口的跨域请求。请在 chrome://extensions 打开开发者模式，加载 extensions/header-bridge，并确认“B 站”规则已启用。'

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  let res: Response
  try {
    res = await fetch(url, { signal })
  } catch (e) {
    // 跨域被拦时 fetch 只会抛 TypeError，拿不到状态码
    if (e instanceof TypeError) throw new Error(EXTENSION_HINT)
    throw e
  }
  if (!res.ok) throw new Error(`B 站接口返回 HTTP ${res.status}`)
  const json = (await res.json()) as BiliResponse<T>
  if (json.code !== 0) throw new Error(`B 站接口报错：${json.message}（code ${json.code}）`)
  return json.data
}

const pad = (n: number) => String(n).padStart(2, '0')
const formatDate = (sec: number) => {
  const d = new Date(sec * 1000)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export async function loadBilibiliVideo(bvid: string, signal?: AbortSignal): Promise<ReviewVideo> {
  const v = await getJson<BiliView>(`${API}/x/web-interface/view?bvid=${encodeURIComponent(bvid)}`, signal)
  // platform=html5 返回单个 mp4（durl），浏览器 <video> 可以直接播放；最高 720P
  const play = await getJson<BiliPlayUrl>(`${API}/x/player/playurl?bvid=${v.bvid}&cid=${v.cid}&qn=64&fnval=1&platform=html5&high_quality=1`, signal)
  const rotated = v.dimension.rotate === 1
  const quality = play.accept_description[play.accept_quality.indexOf(play.quality)]

  return {
    id: `bili-${v.bvid}`,
    src: play.durl[0].url,
    poster: v.pic.replace(/^http:/, 'https:'),
    fileName: `${v.bvid}.mp4`,
    width: rotated ? v.dimension.height : v.dimension.width,
    height: rotated ? v.dimension.width : v.dimension.height,
    duration: v.duration,
    source: {
      externalId: v.bvid,
      platform: 'B 站',
      url: `https://www.bilibili.com/video/${v.bvid}`,
      author: v.owner.name,
      authorId: `UID ${v.owner.mid}`,
      publishedAt: formatDate(v.pubdate),
      project: '外部素材测试',
      category: v.tname || undefined,
      stats: { plays: v.stat.view, likes: v.stat.like, comments: v.stat.reply, shares: v.stat.share, favorites: v.stat.favorite },
      extra: { 投币: v.stat.coin, 播放清晰度: quality ?? String(play.quality), cid: v.cid },
    },
    edits: { ...emptyEdits(v.title), tags: ['B 站'] },
  }
}
