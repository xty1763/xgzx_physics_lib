# 项目交接文档（HANDOFF）

> 给接手的新对话：读完这份即可了解本项目全貌与当前进度。

## 项目简介
- 名称：**高中物理教学资源库**（新钢中学）
- 部署：**GitHub Pages**，纯静态，地址 `https://xty1763.github.io/xgzx_physics_lib/`
- 仓库：`xty1763/xgzx_physics_lib`（内容即 `physics-lib/` 目录，Surge/GitHub Pages 发布用）
- 用途：教师按 教材→章→节 分类浏览、搜索、按类型筛选的教学资源库；管理员可上传/编辑/删除资源。

## 目录结构（physics-lib/）
- `index.html` — 导航首页
- `styles.css` — 样式
- `app.js` — 前端逻辑（渲染/搜索/类型/上传/编辑/删除/资源助手/授权登录）
- `data/course-data.js` — 人教版2019六册教材·章节·小节定义
- `data/resources.json` — 资源清单（前端与后端共用，新增/编辑/删除由系统写入）
- `pages/` — 资源文件（HTML/PDF/Word/PPT…，文件名=资源标题）
- `worker/` — 方案A后端（Cloudflare Worker 版，已弃用）
- `cloudbase/` — 方案A后端（**腾讯云开发云函数版，待部署**）
  - `index.js`（云函数代码，Node18，HTTP触发）、`package.json`、`README.md`（部署指南）
- `publish-local.ps1` — 一键 git pull+commit+push
- `HANDOFF.md` — 本文件

## 已实现功能
- 教材→章→节 三层侧栏导航（默认收起，点开选中，再点收起；顶部 ☰ 可整体收起导航栏）
- 顶部搜索（标题/描述/标签/教材/章节/类型模糊）
- 类型筛选：练习/试卷/课件/教案/仿真资源（试卷不挂小节）
- **上传资源**（仅管理员可见）：选文件→自动识别填表（✨自动识别填表，靠文件名/标题识别章节/类型/标签）→保存
- **编辑 / 删除**资源（仅管理员可见）
- 支持 html/pdf/word/ppt/excel/图片/视频/zip，文件按**资源标题**命名
- 右下角 **🤖 资源助手**：自然语言检索资源（解析 教材/章节/类型/关键词）
- 下载的文件名 = 资源标题

## 关键常量（app.js 顶部）
- `WORKER_URL = "https://physics-lib.xingang-physics.workers.dev"` （**目前指向 Cloudflare Worker，国内连不通，最终应改为腾讯云云函数的 HTTP 触发地址**）
- `ASSET_V = 12`（静态资源版本号，改 app.js/index.html 后需 +1）
- 身份：`gh_publish_token`（站长 GitHub 令牌，走直连 GitHub，国内可用）；`worker_token`（授权老师走 Worker/云函数，暂不可用）

## 当前进度 / 待办

### ✅ 已可用（现阶段重点：把“腾讯云之外”的工作做好）
- 教材→章→节导航、搜索、类型筛选：**可用**。
- 上传 / 编辑 / 删除：用「🔑 管理员登录」（站长 GitHub 令牌直连 GitHub），**国内可用**。清单 `data/resources.json`，写入走 GitHub Contents API。
- 自动识别填表（✨自动识别填表）、文件按标题命名、右下角 🤖 资源助手：**可用**。
- 以上都属于“静态站 + GitHub 直连”范畴，**是本轮可以继续做好、收尾的范围**。

### ⏸️ 已暂停 / 另行规划（暂不要推进）
- 方案A“多用户授权上传（Cloudflare Worker / 腾讯云开发云函数）”**暂缓**，用户将另行布置。
- `worker/`、`cloudbase/` 目录仅供参考，**先不要**做腾讯云部署，也暂时不要把 `WORKER_URL` 指向它。
- 当前 `WORKER_URL` 仍指向 Cloudflare（连不通）；因方案A暂停，保持现状即可，无需改。
- 页面上**「👥 授权登录」按钮已隐藏**（方案A暂停），仅保留「🔑 管理员登录（GitHub 直连）」。

### ✅ 本轮收尾已完成（非腾讯云）
- 清理废弃文件：`data/resources.js`（旧 `window.MANIFEST` 清单）已删除；`_live_resources.js` 未提交的过期副本已删除。
- `data/resources.json` 为唯一资源清单，站点用它渲染与维护。
- 版本号已升至 `ASSET_V = 12`（`index.html` 的 `?v=12` 同步）。
- `README.md` 已更新，纠正了旧资料中对 `data/resources.js`/Cloudflare Worker 的过时表述。

### 其它可做的（非腾讯云，按需）
- 打磨资源助手（更准、更多示例问法）、补充更多章节/示例资源、优化界面/页脚等。

## 已知要点
- Git 直连 `push` 在此环境可能 `Connection was reset`——改用 GitHub Contents API 推文件（用 PAT 的 `PUT /repos/{owner}/{repo}/contents/{path}`，需先 GET 取 sha）。
- `data/resources.json` 用 `JSON.stringify(resources,null,2)` 保存；静态资源版本号 `?v=`（app.js 里 `ASSET_V`）用于破缓存，改动后 +1。

## 推送方式备注
- 分支：`main`；仓库 `xty1763/xgzx_physics_lib`。
- 需要 GitHub PAT（对该仓库 Contents 读写）来 API 推送或 git push。
