# 高中物理教学资源库

一个纯静态的高中物理教学资源导航站。支持**按教材 → 章 → 节分类**、**按资源类型分类**、
**关键词搜索**，并由管理员用 **GitHub 令牌直连**完成 **上传 / 编辑 / 删除**（写入仓库，所有访客可见）。

> 📂 本目录是一个**独立、自包含**的站点文件夹（发布用 GitHub Pages）。

当前包含**人教版（2019）高中物理全部 6 册**：必修第一/二/三册、选择性必修第一/二/三册，
含各册全部章、节；资源类型分 **练习 / 试卷 / 课件 / 教案 / 仿真资源**（试卷不挂具体小节）。
资源清单存放在 `data/resources.json`，由系统在“上传/编辑/删除”时自动维护。

## 目录结构

```
.
├── index.html              # 资源库导航首页
├── styles.css               # 页面样式
├── app.js                   # 前端逻辑（渲染/搜索/类型/上传/编辑/删除/自动识别/资源助手）
├── publish-local.ps1        # 一键同步本地修改到线上（pull+commit+push）
├── HANDOFF.md               # 项目交接文档
├── data/
│   ├── course-data.js       # 教材/章节/小节定义（改这里扩充章节）
│   └── resources.json       # 资源清单（前端 fetch，上传/编辑/删除由系统写入）
├── pages/                   # 资源文件（HTML/PDF/Word/PPT…）
└── worker/ , cloudbase/     # 方案A 后端（参考用，当前已暂停，见下）
```

## 本地预览

直接用浏览器打开 `index.html` 即可（无需任何服务器、无需构建）。
如果要模拟线上环境，也可以在当前目录起一个静态服务器：

```bash
npx serve .
# 或
python -m http.server 8000
```

## 功能说明

- **教材 → 章 → 节 三层导航**：左侧侧栏按 6 册教材 → 章 → 节 逐级展开，点章名/小节即可筛选。
- **资源类型分类**：顶栏按 **练习 / 试卷 / 课件 / 教案 / 仿真资源** 筛选；试卷类型的资源**不挂具体小节**。
- **搜索**：顶部搜索框，按标题 / 描述 / 标签 / 教材 / 章节 / 类型模糊匹配，输入即时过滤。
- **上传资源（仅管理员可见）**：右上角**只有持有令牌的你**有「上传资源」按钮，其它访客看不到。
  选择文件后点 **✨ 自动识别填表**，可按 文件名/标题 **并读取文件内容（文本类）** 自动识别
  教材/章节/类型/标签 并预填（如 HTML→仿真、PPT→课件，标题类型词优先）。
  保存即发布到线上：文件写入仓库 `pages/`，并自动登记到 `data/resources.json`，push 到 `main` 后
  GitHub Pages 自动重建，**所有访客都能看到**。
- **编辑 / 删除**：已登记的资源卡片右键（卡片上）会出现「✏️ 编辑 / 🗑 删除」，仅持有令牌者可见。
- **支持多种文件类型**：HTML / PDF / Word(.docx) / PPT(.pptx) / Excel(.xlsx) / 图片 / 视频 / 压缩包 等，
  文件按**资源标题**命名，作为文件上传后由浏览器直接打开或下载。
- **🤖 资源助手**：右下角浮窗，用自然语言检索资源（自动解析 教材/章节/类型/关键词），如「必修一 自由落体 课件」。
  默认会尝试调用**免费大模型**更智能地挑资源；接口不通或超时时**自动回退**到本地规则匹配，不影响使用。
- **✨ 智能简介**：上传/编辑表单里有「✨ 智能简介」按钮，自动写一句资源简介。填了 AI key 时用大模型生成；否则用本地规则生成一句
  “资源名+章节+类型”的简介，**不会失败、不会留空**。AI 默认用**智谱 GLM**（`open.bigmodel.cn`，国内可达、浏览器可直连、`glm-4-flash` 免费）。
  启用：在「🔑 管理员登录」弹窗点 `open.bigmodel.cn` 注册并实名 → 生成 API 密钥 → 把 key 粘到「AI Key」→ 登录，模型默认 `glm-4-flash`。
  说明：key 只存在你这台浏览器的 localStorage，**仅站长本机能用 AI**；其它设备/访客走本地规则兜底。

### 如何登录管理员并上传

1. 第一次在你的浏览器里打开网站，点右上角 **🔑 管理员登录**。
2. 输入一个 GitHub 令牌（推荐**仅限该仓库**的 fine-grained token）：
   GitHub → Developer settings → Fine-grained tokens → Generate → Repository access 选
   `xgzx_physics_lib` → Repository permissions 给 **Contents: Read and write** + **Metadata: Read**。
3. 点「登录」→ 上传入口出现。令牌只存在**你这台**浏览器的 localStorage，不会写进网页。
4. 之后每次直接在右上角点 **⬆ 上传资源** 即可（已自动带上令牌）。
5. 想换设备/退出：点 **⚙ 管理员设置 → 退出/清除本机令牌**。

> ⚠️ 说明：这个“隐藏上传按钮”只是**方便性**处理——真正拦住别人不能发布的是 GitHub 令牌。
> 就算有人手动填一个假令牌让按钮出现，没有有效令牌也无法写入仓库、无法发布。

## 关于“方案A 多用户授权上传”（已暂停）

- 方案A（多老师授权账号登录后上传，后端持有令牌）原本走 **Cloudflare Worker** 或 **腾讯云开发云函数**，
  **目前已暂停，暂不推进**。
- `worker/`、`cloudbase/` 目录**仅供参考**，不要做腾讯云部署，也不要改动 `WORKER_URL` 指向它。
- `app.js` 顶部 `WORKER_URL` 仍指向旧的 Cloudflare 地址（当前国内连不通）；因方案A暂停，**保持现状即可**。
- 页面上**「👥 授权登录」按钮已隐藏**（已暂停），仅保留「🔑 管理员登录（GitHub 直连）」这一入口。

## 扩充教材 / 章节 / 资源类型

编辑 `data/course-data.js`：在 `books` 数组里按 **book → chapter → section** 追加。
新增教材（含章、节）示例：

```js
{
  id: "b7",
  title: "XXXX教材",
  chapters: [
    {
      id: "b7c1",
      title: "第一章 ……",
      sections: [ { id: "b7c1s1", title: "1.1 ……" } ]
    }
  ]
}
```

资源类型分类在 `COURSE.resourceTypes` 数组里（默认 练习/试卷/课件/教案/仿真资源），
新增一种直接往里加字符串即可。

> 资源对象字段：`book`、`chapter`、`section`、`type`。其中 `type` 取 `resourceTypes` 之一；
> `section` 对“试卷”可为 `""`（不挂小节）。

## 已上线（GitHub Pages）

当前站点已部署到：**https://xty1763.github.io/xgzx_physics_lib/**

### 两种更新方式

- **最简单（推荐，无需本地 Git）**：直接**在网站上“上传资源”**。它会自动把文件写入仓库并登记到
  `data/resources.json`，所有访客可见。**加资源不用碰本地文件、不用记 git 命令。**
- **本地改代码/章节**（如改 `course-data.js` 样式、页面等）：改完后在 `physics-lib` 里一键发布：

```powershell
.\publish-local.ps1 "更新说明"
```

这个脚本会自动 `pull → add → commit → push`，一条命令完成，不用记 git。

> 手动等价命令：
> ```powershell
> git pull --rebase
> git add -A
> git commit -m "更新资源"
> git push
> ```
> 推送到 `main` 后，GitHub Pages 会自动重新发布。
>
> 若 `git push` 直连失败（如 Connection was reset），可用 GitHub Contents API 推文件
> （用 PAT 的 `PUT /repos/{owner}/{repo}/contents/{path}`，先 `GET` 取 `sha`）。

### 版本号说明

改动 `app.js` / `index.html` 后，请把 `app.js` 顶部 `ASSET_V` 和 `index.html` 里的 `?v=` **同步 +1**，
用于破缓存。当前版本号 `ASSET_V = 19`。

## 部署到 GitHub Pages（复现步骤，若换仓库）

1. 在 GitHub 新建一个公开仓库（例如 `xgzx_physics_lib`）。
2. 在本目录执行：
   ```powershell
   git branch -M main
   git remote add origin https://github.com/<用户名>/<仓库名>.git
   git push -u origin main
   ```
3. 到仓库 **Settings → Pages → Source 选 “Deploy from a branch” → 分支 main / 目录 (root) → Save**。
   站点地址为 `https://<用户名>.github.io/<仓库名>/`。

> 页面全部用相对路径，所以在 `/仓库名/` 子路径下也能正常打开。

## 部署到 Surge（可选）

先安装 Surge（如果没有）：

```bash
npm install -g surge
```

在**本目录（`physics-lib/`）**执行：

```bash
# 先 cd 到 physics-lib 目录
surge .
# 首次会要求：登录邮箱 + 密码、设置子域名（例如 my-physics-lib.surge.sh）
```

部署完成后，Surge 会给你一个公网地址，例如：
`https://my-physics-lib.surge.sh`

之后每次更新只需重新运行 `surge .`（会复用登录信息与域名）。

也可以用 PowerShell 脚本一键部署（见 `deploy.ps1`）。

### 部署注意

- Surge 需要登录凭据。若本机未登录过，请按提示输入邮箱 + 密码完成注册/登录。
- 域名格式为 `<你想要的子域名>.surge.sh`，记下它，以后更新都发布到同一域名。
