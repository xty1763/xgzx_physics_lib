/**
 * 高中物理教学资源库 —— Cloudflare Worker（方案A 后端）
 *
 * 作用：校验“授权用户”登录，并在服务端持有 GitHub 令牌，执行 上传/编辑/删除。
 * 前端（静态 GitHub Pages）通过本 Worker 完成这些写操作，令牌不会暴露给浏览器。
 *
 * 部署后需配置（Worker Settings → Variables / Secrets）：
 *   Secret:
 *     GITHUB_TOKEN   能对 <GITHUB_REPO> 有 Contents 读写的 GitHub 令牌
 *     AUTH_SECRET    用于签名登录会话的随机字符串（随便一段长随机串）
 *   Var:
 *     GITHUB_OWNER   例如 xty1763
 *     GITHUB_REPO    例如 xgzx_physics_lib
 *     GITHUB_BRANCH  例如 main
 *     USERS_JSON     [{"u":"teacherA","p":"passA"},{"u":"teacherB","p":"passB"}]
 *                    这就是“可上传的授权用户名单”（在此增删即可授权/收回）
 */

const OWNER = GITHUB_OWNER;
const REPO = GITHUB_REPO;
const BRANCH = GITHUB_BRANCH || "main";
const API = "https://api.github.com";
let USERS = [];
try { USERS = JSON.parse(USERS_JSON || "[]"); } catch (e) { USERS = []; }

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", ...cors() },
  });
const cors = () => ({
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
});

function b64encode(s) { return btoa(unescape(encodeURIComponent(s))); }
function b64decode(b) { return decodeURIComponent(escape(atob(String(b).replace(/\n/g, "")))); }

async function hmac(data) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(AUTH_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return btoa(String.fromCharCode.apply(null, new Uint8Array(sig)));
}
async function sign(user, ttlSeconds) {
  const msg = JSON.stringify({ u: user, exp: Date.now() + ttlSeconds * 1000 });
  return b64encode(msg) + "." + (await hmac(msg));
}
async function verify(token) {
  const parts = String(token).split(".");
  if (parts.length !== 2) return null;
  try {
    const msg = b64decode(parts[0]);
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(AUTH_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
    const sig = Uint8Array.from(atob(parts[1]), (c) => c.charCodeAt(0));
    const ok = await crypto.subtle.verify("HMAC", key, sig, new TextEncoder().encode(msg));
    if (!ok) return null;
    const obj = JSON.parse(msg);
    if (Date.now() > obj.exp) return null;
    return obj;
  } catch (e) { return null; }
}

async function gh(path, opts = {}) {
  const headers = Object.assign({ Authorization: "Bearer " + GITHUB_TOKEN, "User-Agent": "physics-lib-worker" }, opts.headers || {});
  return fetch(API + "/repos/" + OWNER + "/" + REPO + "/contents/" + path, Object.assign({}, opts, { headers: headers }));
}
async function getContent(path) {
  const r = await gh(path);
  if (!r.ok) throw new Error("读取失败(" + r.status + ")");
  const d = await r.json();
  return { sha: d.sha, text: b64decode(d.content) };
}
async function putFile(path, contentB64, message, sha) {
  const body = { message: message, branch: BRANCH, content: contentB64 };
  if (sha) body.sha = sha;
  const r = await gh(path, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  if (!r.ok) { const m = await r.text(); throw new Error("写入失败(" + r.status + ")" + (m ? " " + m : "")); }
  return r.json();
}
async function deleteFile(path, message) {
  try {
    const s = await getContent(path);
    const r = await gh(path, { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ message: message, branch: BRANCH, sha: s.sha }) });
    return r.ok;
  } catch (e) { return false; }
}

function slug(name, ext) {
  const fileExt = ext && /^\.[a-z0-9]+$/i.test(ext) ? ext.toLowerCase() : ".html";
  const base = String(name || "")
    .replace(/\.[a-zA-Z0-9]+$/, "")
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50) || "resource";
  return base + fileExt;
}

async function withList(mutate, message) {
  let cur = { sha: null, text: "[]" };
  try { cur = await getContent("data/resources.json"); } catch (e) {}
  let list = [];
  try { list = JSON.parse(cur.text); } catch (e) { list = []; }
  list = mutate(list);
  await putFile("data/resources.json", b64encode(JSON.stringify(list, null, 2)), message || "更新资源清单", cur.sha);
}

async function uploadRec(body) {
  let path = "pages/" + slug(body.title, body.fileExt);
  let dup = 0;
  while (true) {
    try { await putFile(path, body.contentB64, "新增资源：" + body.title); break; }
    catch (e) {
      if (dup < 29 && /already exists|sha was not supplied|409|422|does not match/i.test(e.message)) {
        const dot = path.lastIndexOf(".");
        const stem = dot > -1 ? path.slice(0, dot) : path;
        const dotExt = dot > -1 ? path.slice(dot) : "";
        path = stem + "-" + (dup + 2) + dotExt;
        dup++; continue;
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
    const url = newFileUrl || e.url || "";
    return Object.assign({}, e, { title: body.title, desc: body.desc || "", book: body.book || "", chapter: body.chapter || "", section: body.section || "", url: url, tags: body.tags || [], type: body.type || "练习" });
  }), "编辑资源：" + body.title);
  if (newFileUrl) {
    // 删除旧文件（若已知旧 url 且不同）
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

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors() });

    if (url.pathname === "/login") {
      const body = await request.json().catch(() => ({}));
      const user = USERS.find((u) => u.u === body.u && u.p === body.p);
      if (!user) return json({ error: "账号或密码错误" }, 401);
      const token = await sign(user.u, 60 * 60 * 24 * 7);
      return json({ ok: true, token: token });
    }

    if (url.pathname === "/whoami") {
      const body = await request.json().catch(() => ({}));
      const sess = await verify(body.token);
      if (!sess) return json({ error: "未登录" }, 401);
      return json({ ok: true, user: sess.u });
    }

    if (url.pathname === "/upload" || url.pathname === "/update" || url.pathname === "/delete") {
      const body = await request.json().catch(() => ({}));
      const sess = await verify(body.token);
      if (!sess) return json({ error: "未授权或登录已过期" }, 403);
      try {
        if (url.pathname === "/upload") return json({ ok: true, url: await uploadRec(body) });
        if (url.pathname === "/update") return json(await updateRec(body));
        if (url.pathname === "/delete") return json(await deleteRec(body));
      } catch (e) {
        return json({ error: e.message }, 500);
      }
    }

    return json({ ok: false, error: "not found" }, 404);
  },
};
