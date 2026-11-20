# video-review-ui

多视频审核前端：裁剪（crop）、Delogo（可设时间段）、视频片段剪切，导出处理任务。

## 技术栈
Vite 8 + React 19 + TypeScript 7 + Tailwind v4 + shadcn/ui（radix 基座，mira 预设，hugeicons 图标）。纯 SPA，不用 Next.js。

## 约定
- 包管理只用 pnpm。不用 npm / npx。
- shadcn CLI 只用 `pnpm exec shadcn <cmd>`（锁定在 package.json 的版本），不要用 `npx shadcn@latest` / `pnpm dlx shadcn@latest`。
- 供应链：`pnpm-workspace.yaml` 里有 `minimumReleaseAge` 和 `strictDepBuilds`。新依赖需要构建脚本时，必须先说明原因，再加入 `onlyBuiltDependencies`。尽量不加新依赖。
- 改完代码跑：`pnpm lint && pnpm typecheck && pnpm test`。

## 结构
- `src/review-kit/`：可接入的审核组件（`core` 纯逻辑 / `adapters` 模型适配 / `react` 组件），接入说明见 `src/review-kit/README.md`。新逻辑优先放 `core` 并写测试。
- `src/demo/`：设计规范页 + 接入示例；`public/samples/` 是用 ffmpeg 生成的演示视频。
- `extensions/header-bridge/`：Chrome MV3 插件，给审片台页面发出的请求改写 Referer / Origin / UA（过 CDN 防盗链）。不需要构建，规则逻辑在 `rules.js`。
- `server/`：只在 Vite 开发服务器里跑的 demo 后端（`POST /api/titles` 调 Claude 生成标题），Key 从 `.env.local` 的 `ANTHROPIC_API_KEY` 读取。
- 设计规范见 `DESIGN.md`。
