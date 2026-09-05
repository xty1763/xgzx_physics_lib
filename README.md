# 高中物理教学资源库

一个纯静态的高中物理教学资源导航站。支持**按章节分类**、**关键词搜索**、**类型筛选**，
以及**直接上传 HTML 资源**（保存在当前浏览器，便于快速测试）。

> 📂 本目录是一个**独立、自包含**的站点文件夹。你工作目录里其它文件（`interactive_sim/`、
> `export/`、`preview.png`、Python 脚本等）与资源库无关，**Surge 只会发布本文件夹**，
> 因此请把资源库的所有文件都放在这里维护。

当前章节数据：高中物理（人教版 必修第一册）**第一章 运动的描述**、**第二章 匀变速直线运动的研究**，
并内置两个可点击进入的空白测试页。

## 目录结构

```
.
├── index.html              # 资源库导航首页
├── styles.css               # 页面样式
├── app.js                   # 前端逻辑（渲染/搜索/分类/上传）
├── data/
│   ├── course-data.js       # 章节、小节定义（改这里扩充章节）
│   └── resources.js         # 预置资源清单（改这里永久挂资源）
└── pages/
    ├── ch1-s1.html          # 第一章空白测试页
    └── ch2-s1.html          # 第二章空白测试页
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

- **章节分类**：左侧侧栏按「章 → 节」展开。点章名=筛选该章，点小节=精确定位到该节。
- **搜索**：顶部搜索框，按标题 / 描述 / 标签 / 章节名 / 类型模糊匹配，输入即时过滤。
- **类型筛选**：顶栏 chips 按资源类型（演示/实验/动画/测试页…）过滤。
- **章节分类 / 搜索 / 类型筛选**：同前。
- **上传资源（仅管理员可见）**：右上角**只有你有「上传资源」按钮**，其它访客看不到，因为他们没有本机令牌。
  上传即发布到线上：HTML 写入仓库 `pages/`，并自动登记到 `data/resources.js`，push 到 `main` 后
  GitHub Pages 自动重建，**所有访客都能看到**。

### 如何登录管理员并上传

1. 第一次在你的浏览器里打开网站，点右上角 **🔑 管理员登录**。
2. 输入一个 GitHub 令牌（推荐**仅限该仓库**的 fine-grained token）：
   GitHub → Developer settings → Fine-grained tokens → Generate → Repository access 选
   `xgzx_physics_lib` → Repository permissions 给 **Contents: Read and write** + **Metadata: Read**。
3. 点「登录」→ 上传入口出现。令牌只存在**你这台**浏览器的 localStorage，不会写进网页。
4. 之后每次直接在右上角点 **⬆ 上传资源** 即可（已自动带上令牌）。
5. 想换设备/退出：点 **⚙ 管理员设置 → 退出/清除本机令牌**。

> ⚠️ 说明：这个“隐藏上传按钮”是**方便性**处理——真正拦住别人不能发布的是 GitHub 令牌。
> 就算有人手动在浏览器里填一个假令牌让按钮出现，没有有效令牌也无法写入仓库、无法发布。
>
> ⚠️ 发布成功后，你的**本地**仓库里 `data/resources.js` 会落后于线上。下次在本地改动前，先 `git pull`。

## 扩充章节

编辑 `data/course-data.js`，在 `chapters` 数组里追加章节 / 小节对象：

```js
{
  id: "ch3",
  title: "第三章 相互作用 —— 力",
  sections: [
    { id: "ch3s1", title: "3.1 重力与弹力" },
    // ...
  ]
}
```

## 已上线（GitHub Pages）

当前站点已部署到：**https://xty1763.github.io/xgzx_physics_lib/**

之后的每次更新，只需在 `physics-lib` 目录里：

```powershell
git add -A
git commit -m "更新资源"
git push
```

推送到 `main` 分支后，GitHub Pages 会自动重新发布。

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
