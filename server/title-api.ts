import type { IncomingMessage } from 'node:http'
import type { Plugin } from 'vite'
import { generateTitles, type TitleRequestInput } from './claude-titles.ts'

const readJson = async (req: IncomingMessage) => {
  let raw = ''
  for await (const chunk of req) raw += chunk
  return JSON.parse(raw) as Partial<TitleRequestInput>
}

/** 开发服务器上的 POST /api/titles：demo 用，正式环境换成自己的后端 */
export function titleApi(apiKey: string | undefined): Plugin {
  return {
    name: 'title-api',
    configureServer(server) {
      server.middlewares.use('/api/titles', async (req, res) => {
        const send = (status: number, body: unknown) => {
          res.statusCode = status
          res.setHeader('content-type', 'application/json; charset=utf-8')
          res.end(JSON.stringify(body))
        }
        if (req.method !== 'POST') return send(405, { error: '只支持 POST' })
        if (!apiKey) return send(503, { error: '开发服务器没有配置 ANTHROPIC_API_KEY：写进项目根目录的 .env.local，或启动前 export，然后重启 pnpm dev。' })
        let body: Partial<TitleRequestInput>
        try {
          body = await readJson(req)
        } catch {
          return send(400, { error: '请求体不是合法 JSON' })
        }
        const prompt = body.prompt?.trim()
        if (!prompt || prompt.length > 500) return send(400, { error: '提示词不能为空，且不超过 500 字' })
        try {
          send(200, { titles: await generateTitles({ ...body, prompt }, apiKey) })
        } catch (e) {
          send(502, { error: e instanceof Error ? e.message : String(e) })
        }
      })
    },
  }
}
