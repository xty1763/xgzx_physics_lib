/**
 * 高中物理教学资源库 —— 腾讯云开发（CloudBase）云函数（方案A 后端）
 *
 * 作用：校验“授权用户”登录，并在服务端持有 GitHub 令牌，执行 上传/编辑/删除。
 * 前端（静态 GitHub Pages）通过本云函数完成这些写操作，令牌不暴露给浏览器。
 *
 * 部署：在腾讯云开发 CloudBase 新建“云函数”，运行时选 Node.js 18，开启 HTTP 触发。
 *
 * 云函数配置 → 环境变量（云函数配置里的“环境变量”）：
 *   GITHUB_TOKEN   （敏感）对该仓库有 Contents 读写的 GitHub 令牌
 *   AUTH_SECRET    （敏感）会话签名密钥（长随机串）
 *   GITHUB_OWNER   例如 xty1763
 *   GITHUB_REPO    例如 xgzx_physics_lib
 *   GITHUB_BRANCH  例如 main
 *   USERS_JSON     [{"u":"teacherA","p":"passA"}, ...]  授权用户名单
 */

const crypto = require("crypto");

exports.main = async (event) => {
  const method = (event && event.httpMethod) || "POST";
  const path = (event && event.path) || "/";
  let body = {};
  try {
    body = typeof (event && event.body) === "string" ? JSON.parse(event.body || "{}") : (event.body || {});
  } catch (e) { body = {}; }

  const CORS = {
    "content-type": "application/json",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "POST,OPTIONS",
    "access-control-allow-headers": "Content-Type",
  };
  const json = (data, statusCode = 200) => ({ statusCode, headers: CORS, body: JSON.stringify(data) });
  if (method === "OPTIONS") return { statusCode: 204, headers: CORS, body: "" };

  const OWNER = process.env.GITHUB_OWNER;
  const REPO = process.env.GITHUB_REPO || "xgzx_physics_lib";
  const BRANCH = process.env.GITHUB_BRANCH || "main";
  const TOKEN = process.env.GITHUB_TOKEN;
  const AUTH_SECRET = process.env.AUTH_SECRET || "auth";
  let USERS = [];
  try { USERS = JSON.parse(process.env.USERS_JSON || "[]"); } catch (e) { USERS = []; }
  const API = "https://api.github.com";

  const b64 = (s) => Buffer.from(s, "utf8").toString("base64");
  const fromb = (b) => Buffer.from(b, "base64").toString("utf8");
  const hmac = (s) => crypto.createHmac("sha256", AUTH_SECRET).update(s).digest("hex");

  function sign(user, ttlSeconds) {
    const msg = JSON.stringify({ u: user, exp: Date.now() + ttlSeconds * 1000 });
    return b64(msg) + "." + hmac(msg);
  }
  function verify(token) {
    const parts = String(token).split(".");
    if (parts.length !== 2) return null;
    try {
      const msg = fromb(parts[0]);
      const a = Buffer.from(hmac(msg));
      const b = Buffer.from(parts[1]);
      if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
      const o = JSON.parse(msg);
      if (Date.now() > o.exp) return null;
      return o;
    } catch (e) { return null; }
  }

  async function gh(path, opts = {}) {
    const headers = Object.assign({ Authorization: "Bearer " + TOKEN, "User-Agent": "physics-lib", Accept: "application/vnd.github+json" }, opts.headers || {});
    return fetch(API + "/repos/" + OWNER + "/" + REPO + "/contents/" + path, Object.assign({}, opts, { headers }));
  }
  async function getContent(path) {
    const r = await gh(path);
    if (!r.ok) throw new Error("读取失败(" + r.status + ")");
    const d = await r.json();
    return { sha: d.sha, text: fromb(d.content) };
  }
  async function putFile(path, contentB64, message, sha) {
    const b = { message: message, branch: BRANCH, content: contentB64 };
    if (sha) b.sha = sha;
    const r = await gh(path, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(b) });
    if (!r.ok) throw new Error("写入失败(" + r.status + ")");
    return r.json();
  }
  async function deleteFile(path, message) {
    try {
      const s = await getContent(path);
      const r = await gh(path, { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ message: message, branch: BRANCH, sha: s.sha }) });
      return r.ok;
    } catch (e) { return false; }
  }

  const slug = (name, ext) => {
    const fileExt = ext && /^\.[a-z0-9]+$/i.test(ext) ? ext.toLowerCase() : ".html";
    const base = String(name || "").replace(/\.[a-zA-Z0-9]+$/, "").replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50) || "resource";
    return base + fileExt;
  };

  async function withList(mutate, message) {
    let cur = { sha: null, text: "[]" };
    try { cur = await getContent("data/resources.json"); } catch (e) {}
    let list = [];
    try { list = JSON.parse(cur.text); } catch (e) { list = []; }
    list = mutate(list);
    await putFile("data/resources.json", b64(JSON.stringify(list, null, 2)), message || "更新资源清单", cur.sha);
  }

  async function uploadRec(body) {
    let path = "pages/" + slug(body.title, body.fileExt);
    let dup = 0;
    while (true) {
      try { await putFile(path, body.contentB64, "新增资源：" + body.title); break; }
      catch (e) {
        if (dup < 29 && /already exists|sha was not supplied|409|422|does not match/i.test(e.message)) {
          const dot = path.lastIndexOf("."); const stem = dot > -1 ? path.slice(0, dot) : path; const dotExt = dot > -1 ? path.slice(dot) : "";
          path = stem + "-" + (dup + 2) + dotExt; dup++; continue;
        }
        throw e;
      }
    }
    await withList((list) => list.concat([{ id: body.id, title: body.title, desc: body.desc || "", book: body.book || "", chapter: body.chapter || "", section: body.section || "", url: path, tags: body.tags || [], type: body.type || "练习" }]), "登记资源：" + body.title);
    return path;
  }

  async function updateRec(body) {
    let newFileUrl = null;
    if (body.contentB64) {
      const path = "pages/" + slug(body.title, body.fileExt);
      await putFile(path, body.contentB64, "更新资源文件：" + body.title);
      newFileUrl = path;
    }
    await withList((list) => list.map((e) => {
      if (e.id !== body.id) return e;
      return Object.assign({}, e, { title: body.title, desc: body.desc || "", book: body.book || "", chapter: body.chapter || "", section: body.section || "", url: newFileUrl || e.url || "", tags: body.tags || [], type: body.type || "练习" });
    }), "编辑资源：" + body.title);
    if (newFileUrl) {
      try {
        const old = await getContent("data/resources.json");
        const arr = JSON.parse(old.text);
        const orig = arr.find((x) => x.id === body.id);
        if (orig && orig.url && orig.url !== newFileUrl && orig.url.indexOf("pages/") === 0) await deleteFile(orig.url, "移除旧文件：" + body.title);
      } catch (e) {}
    }
    return { ok: true };
  }

  async function deleteRec(body) {
    await withList((list) => list.filter((e) => e.id !== body.id), "删除资源：" + body.title);
    if (body.url && body.url.indexOf("pages/") === 0) await deleteFile(body.url, "删除资源：" + body.title);
    return { ok: true };
  }

  if (path === "/login") {
    const user = USERS.find((u) => u.u === body.u && u.p === body.p);
    if (!user) return json({ error: "账号或密码错误" }, 401);
    return json({ ok: true, token: sign(user.u, 60 * 60 * 24 * 7) });
  }
  if (path === "/whoami") {
    const sess = verify(body.token);
    if (!sess) return json({ error: "未登录" }, 401);
    return json({ ok: true, user: sess.u });
  }
  if (["/upload", "/update", "/delete"].indexOf(path) > -1) {
    const sess = verify(body.token);
    if (!sess) return json({ error: "未授权或登录已过期" }, 403);
    try {
      if (path === "/upload") return json({ ok: true, url: await uploadRec(body) });
      if (path === "/update") return json(await updateRec(body));
      if (path === "/delete") return json(await deleteRec(body));
    } catch (e) { return json({ error: e.message }, 500); }
  }
  return json({ ok: false, error: "not found" }, 404);
};
