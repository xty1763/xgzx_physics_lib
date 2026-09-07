# 方案A：多用户授权上传（Cloudflare Worker 后端）

这个 Worker 是一个“安全后端”：它**在服务端持有 GitHub 令牌**，负责校验**授权用户**并执行
**上传 / 编辑 / 删除**。这样：

- 前端（静态站）**不需要拿到 GitHub 令牌**；
- 你作为站长，通过一个**授权用户名单**控制**谁能上传**；
- 授权老师在网站用**账号密码登录**（请求发给 Worker），Worker 校验通过后用 GitHub 令牌写入仓库。

## 一、部署 Worker（需要 Cloudflare 账号，免费）

1. 注册/登录 [Cloudflare](https://dash.cloudflare.com/)，免费即可。
2. 安装并登录 CLI（在任意目录）：
   ```bash
   npm install -g wrangler
   wrangler login
   ```
3. 进入本目录 `worker/`，先设置两个 **Secret**（令牌/会话密钥，不进代码）：
   ```bash
   # 1) GitHub 令牌：对 xgzx_physics_lib 有 Contents 读写（fine-grained，只选该仓库）
   wrangler secret put GITHUB_TOKEN
   # 2) 会话签名密钥：随便一段长随机串
   wrangler secret put AUTH_SECRET
   ```
4. 部署：
   ```bash
   wrangler deploy
   ```
   会给你一个地址，形如 `https://physics-lib.<你的子域>.workers.dev`。
5. **配置授权用户名单**：在 Cloudflare Dashboard → 你的 Worker → Settings → Variables，
   编辑 `USERS_JSON`（普通变量），例如：
   ```json
   [{"u":"teacherA","p":"passA"},{"u":"teacherB","p":"passB"}]
   ```
   > 这里每一条就是一个“可上传的授权账号”。**加/删这一行，就是授权/收回某人的上传权限。**

## 二、把 Worker 接到网站

网站前端调用 Worker 的地址在 `physics-lib/app.js` 顶部写死了一个 `WORKER_URL` 常量
（默认 `https://physics-lib.free.workers.dev`）。把它改成你真实的 Worker 地址：

```js
const WORKER_URL = "https://你的-worker.你的子域.workers.dev";
```

改完 `app.js` 后，把它提交到仓库（或告诉我，我用 API 帮你推），网站的 **👥 授权登录** 就能用了。

## 三、授权老师怎么用

1. 打开网站，点右上角 **👥 授权登录**。
2. 输入你在 `USERS_JSON` 里分配的**用户名 + 密码** → 登录。
3. 登录后右上角出现 **⬆ 上传资源**（也可编辑/删除）。
4. 上传的资源通过 Worker 写入仓库并发布。

## 四、权限模型

- **站长（你）**：仍可用「🔑 管理员登录」输入 GitHub 令牌，直接操作（也可用 Worker）。
- **授权老师**：用「👥 授权登录」，只能上传/编辑/删除，不能改网站代码/章节结构。
- **普通访客**：看不到上传入口，只能浏览。

## 五、注意
- `GITHUB_TOKEN`、`AUTH_SECRET` 是 **Secret**，不要写进仓库或公开文件。
- `USERS_JSON` 会随 Worker 配置部署（含明文密码）。若介意，可改用 KV 或 `wrangler kv`，但通常够用。
- 部署后，`wrangler.toml` 里的 `USERS_JSON` 只是本地预览值，线上以 Dashboard 里配置的为准。
