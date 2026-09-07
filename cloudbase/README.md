# 方案A 后端：腾讯云开发（CloudBase）云函数

这是一个 CloudBase 云函数，作用与 Cloudflare Worker 相同：**在服务端持有 GitHub 令牌**，
校验**授权用户**并执行 上传/编辑/删除。让授权老师在网站上登录即可上传，令牌不暴露给浏览器。

相比 `.workers.dev`，腾讯云云函数走国内网络，**可达性要好得多**，适合新钢中学。

## 一、部署（需要腾讯云账号 + 实名认证）

1. 注册/登录腾讯云：https://console.cloud.tencent.com/ ，完成**实名认证**（必需）。
2. 控制台 → **云开发 CloudBase** → **新建环境**（选按量计费即可，有免费额度）。
3. 进入环境 → **云函数** → **新建云函数**：
   - 函数名：`physicsLibBackend`（或你喜欢的名字）
   - 运行环境：**Node.js 18**
   - 提交方式：把本目录 `index.js` 的内容粘贴进去（或本地 `tcb` CLI 上传）。
4. **配置环境变量**（云函数 → 配置 → 环境变量），添加：
   | 变量 | 说明 |
   |---|---|
   | `GITHUB_TOKEN` | 对该仓库有 Contents 读写的 GitHub 令牌 |
   | `AUTH_SECRET` | 会话签名密钥（一段长随机串） |
   | `GITHUB_OWNER` | 例如 `xty1763` |
   | `GITHUB_REPO` | 例如 `xgzx_physics_lib` |
   | `GITHUB_BRANCH` | `main` |
   | `USERS_JSON` | `[{"u":"teacherA","p":"passA"}]` ——授权用户名单（在此增删） |
5. **开启 HTTP 触发**：云函数 → **触发管理** → 添加 **HTTP 触发**（云接入）。记下**访问地址**。
   - 形如 `https://<你的环境ID>.service.tcloudbase.com/physicsLibBackend` 或自定义路径。
   - 前端会把请求发到这个地址的 `/login`、`/upload`、`/update`、`/delete`。
6. 保存并部署函数。

## 二、把后端接进网站

前端调用地址在 `physics-lib/app.js` 顶部的 `WORKER_URL` 常量里。
把它改成你的 HTTP 触发地址（去掉末尾 `/`），例如：

```js
const WORKER_URL = "https://xxxx.service.tcloudbase.com/physicsLibBackend";
```

改完 `app.js` 后提交到仓库（或让我用 API 帮你推）。网站「👥 授权登录」即可用。

## 三、授权老师怎么用

1. 网站右上角 **👥 授权登录** → 输入你在 `USERS_JSON` 里的 用户名+密码。
2. 登录后右上角出现 **⬆ 上传资源**（也可编辑/删除）。
3. 上传/删除都走这个云函数（用你配置的 GitHub 令牌）。

## 四、权限模型
- **站长**：仍可用「🔑 管理员登录」输入 GitHub 令牌直连操作（国内可达，也是兜底）。
- **授权老师**：用「👥 授权登录」（走云函数），只能上传/编辑/删除。
- **访客**：看不到上传入口。

## 五、注意
- `GITHUB_TOKEN`、`AUTH_SECRET` 放环境变量即可（云开发云函数无独立 Secret 库，环境变量对云环境管理员可见，避免泄露给无关人员）。
- `USERS_JSON` 是明文名单；介意可改用云开发数据库存储用户（可另做，更安全）。
- 部署后用浏览器测：访问函数地址/ 应返回 `{"ok":false,"error":"not found"}`。
