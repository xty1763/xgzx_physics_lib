# 把「高中物理教师智能教学工作台」部署到自己的 Linux VPS

> 本站是**纯静态**站点：不需要 Node/PHP/数据库，只要一个 Web 服务器（nginx 或 caddy）托管这个文件夹。
> 「上传 / 编辑 / 删除」由浏览器**直连 GitHub API**（用站长令牌写仓库），所以**服务器不需要任何后端**。
> 资源清单会**自动从 GitHub 拉最新**（多源自动尝试：raw → GitHub Pages → jsDelivr → 本地副本），
> 所以站点部署在**任何服务器**上都能看到最新数据，上传后刷新即可见。

---

## 一、把文件传上去

**方式 1：从本地 Windows 上传（推荐，WinSCP / MobaXterm 图形界面也行）**

```powershell
# 在本地 PowerShell 执行（把 IP 换成你服务器 IP）
scp -r .\workbench root@<你的服务器IP>:/var/www/physics-workbench
```

**方式 2：在服务器上直接拉仓库**

```bash
sudo mkdir -p /var/www
git clone --depth 1 https://github.com/xty1763/xgzx_physics_lib.git /tmp/pwl
sudo cp -r /tmp/pwl/workbench /var/www/physics-workbench
```

> 需要准备的文件：`index.html`、`styles.css`、`app.js`、`data/`（course-data.js、catalog.js、modules.js、resources.json）。
> `data/resources.json` 只是**兜底副本**，线上数据以 GitHub 为准。

---

## 二、用 nginx 托管（最常用）

```bash
sudo apt update && sudo apt install -y nginx
sudo mkdir -p /var/www/physics-workbench      # 若已 scp 上来可跳过
# 把本目录的 nginx.conf 放到站点配置
sudo cp nginx.conf /etc/nginx/sites-available/physics-workbench
sudo ln -sf /etc/nginx/sites-available/physics-workbench /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

放行防火墙（若开了 ufw / 云厂商安全组）：

```bash
sudo ufw allow 80/tcp && sudo ufw allow 443/tcp
```

然后浏览器访问 `http://<你的服务器IP>/` 即可。

---

## 三、绑域名 + 自动 HTTPS（推荐用 Caddy，最省事）

```bash
sudo apt install -y caddy
sudo tee /etc/caddy/Caddyfile >/dev/null <<'EOF'
your.domain.com {
    root * /var/www/physics-workbench
    file_server
    encode gzip
}
EOF
sudo systemctl reload caddy
```

Caddy 会**自动申请并续期** Let's Encrypt 证书，无需手工配证书。
（记得把域名 A 记录解析到服务器 IP。）

---

## 四、日常更新

站点内容更新有两种方式：

1. **在网页上直接改**（推荐）：管理员登录后在页面上传/编辑/删除 → 写入 GitHub 仓库 → 本站**刷新即见**（清单是从 GitHub 拉的），无需动服务器。
2. **改了代码**（index.html / app.js / styles.css）：重新上传这几个文件到 `/var/www/physics-workbench/` 覆盖即可；或 `git pull` 后复制。

> 小提示：给 `app.js` / `index.html` 改版后，记得把 `app.js` 顶部 `ASSET_V` 与 `index.html` 的 `?v=` 一起 +1，用于破浏览器缓存。

---

## 五、可选：把大文件（课件 PPTX）也放自己服务器

现在 1.4GB 课件挂在 **GitHub Releases**（下载走 GitHub）。
如果你想让它**从你自己的服务器下载**（国内通常更快、也不占 GitHub）：

1. 把课件放到服务器，例如 `/var/www/physics-workbench/files/`；
2. 在 `nginx.conf` 里加一段（大文件直接由 nginx 提供下载）：
   ```nginx
   location /files/ { alias /var/www/physics-workbench/files/; add_header Cache-Control "public, max-age=86400"; }
   ```
3. 把 `data/resources.json` 里这些资源的 `url` 从
   `https://github.com/.../releases/download/...` 改成
   `https://你的域名/files/xxx.pptx`。

> 需要的话我可以直接帮你把清单里的链接批量改成你服务器的地址（给我域名即可）。

---

## 六、常见问题

- **页面能开但资源点不开？** 检查 `data/resources.json` 里相对路径（如 `pages/xxx.html`）——本站会把它解析到
  `https://xty1763.github.io/xgzx_physics_lib/`（GitHub Pages），所以**不依赖服务器上有这些文件**；若是 Release 链接则是绝对地址，直接下载。
- **上传报 401/403？** 是 GitHub 令牌问题，重新在「管理员登录」填一个有 `Contents: Read and write` 权限的令牌。
- **想加后端（多老师授权上传 / AI 代理）？** 有了服务器就能做了，告诉我，我帮你写个小服务（这段属于之前暂停的“方案A”）。
