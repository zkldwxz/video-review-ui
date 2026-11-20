# 审片台请求头助手（Chrome 插件）

视频 CDN 和平台接口常做防盗链：校验 Referer、Origin、User-Agent，或者不允许跨域读取。这个插件只改写**从审片台页面发出的**请求，平时浏览不受影响。

## 安装

1. 打开 `chrome://extensions`，右上角打开“开发者模式”
2. 点“加载已解压的扩展程序”，选择本目录 `extensions/header-bridge`
3. 点工具栏里的插件图标，确认“B 站”规则显示“已生效”

改了代码后在 `chrome://extensions` 里点插件卡片上的刷新按钮。

## 规则

每条规则包含：

| 字段 | 说明 |
|---|---|
| 目标域名 | 被改写的请求，自动包含子域名，例如 `bilivideo.com` 覆盖 `cn-xj-ct-01-02.bilivideo.com` |
| 生效页面 | 发起请求的页面域名，默认 `localhost`、`127.0.0.1`。部署到内网后加上审片台的域名 |
| Referer / Origin / User-Agent | 留空表示不改；UA 有常用预设 |
| 其他请求头 | 每行 `Name: value` |
| 允许跨域读取 | 给响应加 `Access-Control-Allow-Origin: *`，页面 `fetch` 平台接口时需要（不带 Cookie） |

新增的域名需要授权，保存时 Chrome 会弹窗确认。规则保存在 `chrome.storage.local`，由后台脚本转换成 `declarativeNetRequest` 动态规则（转换逻辑在 `rules.js`，有单测）。

改写只对视频、fetch/XHR、图片和其他资源类型的请求生效，不碰页面导航。

## B 站预设为什么这样配

实测（2026-11-20）：

- `api.bilibili.com` 看到 `Origin: http://localhost:5199` 会返回 403，换成 `https://www.bilibili.com` 正常 → 需要改 Origin，并放行跨域读取。
- `platform=html5` 的 mp4 地址（`*.bilivideo.com`）校验 UA：curl 默认 UA 返回 403，浏览器 UA 正常；Referer 不影响。浏览器本身带的就是正常 UA，所以 UA 默认不改。
- 封面图在 `hdslb.com`，一起带上 B 站 Referer。

其他平台的 CDN 规则不同，按实际返回的状态码逐项加：先试 Referer，再试 Origin 和 UA。
