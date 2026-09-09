/*
 * 高中物理教师智能教学工作台 —— 应用逻辑
 * 依赖：data/course-data.js 提供 window.COURSE
 *       data/resources.json 提供资源清单（前端 fetch，前后端共用）
 * 界面为深色工作台：左侧 7 个模块导航，模块1=人教资源库（教材→章→节 + 文件卡片），模块2~7=建设中占位。
 * 上传/编辑/删除 走站长 GitHub 令牌直连；自动识别填表 + 资源助手 + 智能简介(可选大模型)。
 */
(function () {
  "use strict";

  // ---------- 状态 ----------
  const state = { book: null, chapter: null, section: null, search: "", type: "all" };
  let currentModule = "materials";
  let currentView = "grid";           // grid | list
  let treeSearch = "";                // 目录树内的搜索
  const openChapters = new Set();
  let baseList = [];
  let resources = [];
  let uploadedList = [];             // 保留（历史 IndexedDB 上传），多数场景为空
  const objUrlCache = {};
  const previewUrls = {};            // 本会话刚保存的文件，可立刻打开
  let pendingFile = null;
  let editingId = null;
  const ASSET_V = 20;
  const WORKER_URL = "https://physics-lib.xingang-physics.workers.dev";
  const WORKER_TOKEN_KEY = "worker_token";
  const TOKEN_KEY = "gh_publish_token";

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.prototype.slice.call(document.querySelectorAll(sel));

  // ---------- 工具 ----------
  const bookOf = (id) => COURSE.books.find((b) => b.id === id);
  const allChapters = COURSE.books.reduce((acc, b) => acc.concat(b.chapters), []);
  const chapterOf = (id) => allChapters.find((c) => c.id === id);
  const sectionOf = (id) => { for (const b of COURSE.books) for (const c of b.chapters) { const s = c.sections.find((x) => x.id === id); if (s) return s; } return null; };
  const bookTitle = (id) => (bookOf(id) || {}).title || "";
  const chapterTitle = (id) => (chapterOf(id) || {}).title || "";
  const sectionTitle = (id) => (sectionOf(id) || {}).title || "";
  const chaptersOfBook = (bookId) => (bookOf(bookId) || {}).chapters || [];
  const bookOfChapter = (chapterId) => { for (const b of COURSE.books) for (const c of b.chapters) if (c.id === chapterId) return b.id; return null; };

  let toastTimer;
  function toast(msg, bad) {
    const c = $("#toast-container");
    if (!c) return;
    const t = document.createElement("div");
    t.className = "toast-item";
    t.innerHTML = '<span style="font-size:16px;">' + (bad ? "⚠️" : "✅") + "</span> <span>" + String(msg).replace(/[<>&]/g, (m) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[m])) + "</span>";
    c.appendChild(t);
    setTimeout(() => { t.style.opacity = "0"; t.style.transform = "translateX(40px)"; t.style.transition = "all .3s ease"; setTimeout(() => t.remove(), 300); }, 3200);
  }

  // ---------- 资源列表 ----------
  async function loadAll() {
    try {
      const res = await fetch("data/resources.json?v=" + ASSET_V, { cache: "no-store" });
      if (!res.ok) throw new Error("加载清单失败");
      resources = await res.json();
      if (!Array.isArray(resources)) resources = [];
    } catch (e) { resources = []; }
    baseList = [...resources];
    hydrateCounts();
    render();
    // 非阻塞地合并历史 IndexedDB 本地上传（多数为空，仅为兼容）
    try {
      const uploaded = await getAllUploads();
      uploadedList = uploaded;
      baseList = [...resources, ...uploadedList];
      hydrateCounts();
      render();
    } catch (e) { /* 忽略 IndexedDB 异常 */ }
  }

  function hydrateCounts() {
    const sections = COURSE.books.reduce((a, b) => a + b.chapters.reduce((x, c) => x + c.sections.length, 0), 0);
    const el = $("#stat-sections"); if (el) el.textContent = sections + "节";
    const ef = $("#stat-files"); if (ef) ef.textContent = baseList.length + "份";
    const em = $("#count-materials"); if (em) em.textContent = COURSE.books.length + "册 / " + baseList.length + "份";
  }

  // 本会话刚保存的文件预览（管理员立刻可打开，无需等 GitHub Pages）
  function setPreview(id, blob) {
    if (!id || !blob) return;
    if (previewUrls[id]) { try { URL.revokeObjectURL(previewUrls[id]); } catch (e) {} }
    previewUrls[id] = URL.createObjectURL(blob);
  }
  function openable(r) {
    if (previewUrls[r.id]) return Object.assign({}, r, { url: previewUrls[r.id] });
    if (r.url) return r;
    if (isUploaded(r) && r.content) {
      if (!objUrlCache[r.id]) objUrlCache[r.id] = URL.createObjectURL(new Blob([r.content], { type: "text/html" }));
      return Object.assign({}, r, { url: objUrlCache[r.id] });
    }
    return r;
  }
  function isUploaded(r) { return Object.prototype.hasOwnProperty.call(r, "content"); }

  function visible() {
    let list = baseList;
    if (state.book) list = list.filter((r) => r.book === state.book);
    if (state.chapter) list = list.filter((r) => r.chapter === state.chapter);
    if (state.section) list = list.filter((r) => r.section === state.section);
    if (state.type !== "all") list = list.filter((r) => r.type === state.type);
    const q = state.search.trim().toLowerCase();
    if (q) list = list.filter((r) => [r.title, r.desc, (r.tags || []).join(" "), bookTitle(r.book), chapterTitle(r.chapter), sectionTitle(r.section), r.type || ""].filter(Boolean).join(" ").toLowerCase().includes(q));
    return list;
  }

  // ---------- IndexedDB（历史遗留本地上传，保持向后兼容） ----------
  function openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open("phys_resource_lib", 1);
      req.onupgradeneeded = () => { const db = req.result; if (!db.objectStoreNames.contains("uploads")) db.createObjectStore("uploads", { keyPath: "id" }); };
      req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error);
    });
  }
  async function getAllUploads() {
    const db = await openDB();
    return new Promise((resolve, reject) => { const req = db.transaction("uploads", "readonly").objectStore("uploads").getAll(); req.onsuccess = () => resolve(req.result || []); req.onerror = () => reject(req.error); });
  }

  function openResource(r) {
    if (r && r.url) window.open(r.url, "_blank", "noopener"); else toast("该资源暂无可打开的地址", true);
  }

  // ---------- 在线发布（GitHub Contents API） ----------
  const PUBLISH_OWNER = "xty1763", PUBLISH_REPO = "xgzx_physics_lib", PUBLISH_BRANCH = "main";
  // 本工作台部署在子目录 workbench/ ：数据与页面文件都放在 workbench/ 下，与根站点的资源库互相独立
  const BASE_DIR = "workbench/";
  function getPublishToken() { try { return localStorage.getItem(TOKEN_KEY) || ""; } catch (e) { return ""; } }
  function setPublishToken(t) { try { localStorage.setItem(TOKEN_KEY, t); } catch (e) {} }
  const getWorkerToken = () => { try { return localStorage.getItem(WORKER_TOKEN_KEY) || ""; } catch (e) { return ""; } };

  function ghHeaders(token) { return { Authorization: "Bearer " + token, "User-Agent": "physics-lib", Accept: "application/vnd.github+json" }; }
  function b64(text) { return btoa(unescape(encodeURIComponent(text))); }
  function fromB64(b) { return decodeURIComponent(escape(atob(b.replace(/\n/g, "")))); }
  function esc(s) { return String(s == null ? "" : s).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r/g, "").replace(/\n/g, "\\n"); }
  function slugPath(name, ext) {
    const fileExt = ext && /^\.[a-z0-9]+$/i.test(ext) ? ext.toLowerCase() : ".html";
    const base = String(name || "").replace(/\.[a-zA-Z0-9]+$/, "").replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50) || "resource";
    return base + fileExt;
  }
  async function ghFetch(url, opts, timeout) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeout || 30000);
    try { return await fetch(url, Object.assign({}, opts, { signal: ctrl.signal })); }
    catch (e) { if (e && e.name === "AbortError") throw new Error("连接 GitHub 超时，请检查网络后重试"); throw e; }
    finally { clearTimeout(timer); }
  }
  async function ghGetContents(token, path) {
    const res = await ghFetch("https://api.github.com/repos/" + PUBLISH_OWNER + "/" + PUBLISH_REPO + "/contents/" + path + "?ref=" + PUBLISH_BRANCH, { headers: ghHeaders(token) });
    if (!res.ok) throw new Error("读取仓库文件失败（" + res.status + "）");
    const data = await res.json(); return { sha: data.sha, text: fromB64(data.content) };
  }
  async function ghGetSha(token, path) {
    const res = await ghFetch("https://api.github.com/repos/" + PUBLISH_OWNER + "/" + PUBLISH_REPO + "/contents/" + path + "?ref=" + PUBLISH_BRANCH, { headers: ghHeaders(token) });
    if (!res.ok) throw new Error("读取文件失败（" + res.status + "）"); return (await res.json()).sha;
  }
  async function ghPutFile(token, path, contentB64, message, sha) {
    const body = { message: message, branch: PUBLISH_BRANCH, content: contentB64 };
    if (sha) body.sha = sha;
    const res = await ghFetch("https://api.github.com/repos/" + PUBLISH_OWNER + "/" + PUBLISH_REPO + "/contents/" + path, { method: "PUT", headers: Object.assign({}, ghHeaders(token), { "Content-Type": "application/json" }), body: JSON.stringify(body) });
    if (!res.ok) { let msg = ""; try { msg = (await res.json()).message || ""; } catch (e) {} throw new Error("写入失败（" + res.status + (msg ? " " + msg : "") + "）"); }
    return await res.json();
  }
  async function ghDeleteFile(token, path, message) {
    const sha = await ghGetSha(token, path);
    const res = await ghFetch("https://api.github.com/repos/" + PUBLISH_OWNER + "/" + PUBLISH_REPO + "/contents/" + path, { method: "DELETE", headers: Object.assign({}, ghHeaders(token), { "Content-Type": "application/json" }), body: JSON.stringify({ message: message, sha: sha, branch: PUBLISH_BRANCH }) });
    if (!res.ok) throw new Error("删除文件失败（" + res.status + "）"); return await res.json();
  }
  async function saveResources(token, message) {
    const newJson = JSON.stringify(resources, null, 2);
    const repoPath = BASE_DIR + "data/resources.json";
    for (let attempt = 0; attempt < 4; attempt++) {
      try { const cur = await ghGetContents(token, repoPath); await ghPutFile(token, repoPath, b64(newJson), message, cur.sha); return; }
      catch (e) { if (e.message && /409|does not match/i.test(e.message)) continue; throw e; }
    }
    throw new Error("保存清单冲突，请稍后重试");
  }

  async function publishResource(rec) {
    const token = getPublishToken();
    if (!token) throw new Error("请先填写 GitHub 访问令牌");
    const message = "新增资源：" + rec.title;
    let rel = "pages/" + slugPath(rec.title, rec.fileExt);
    let path = BASE_DIR + rel;
    for (let dup = 0; dup < 30; dup++) {
      try { await ghPutFile(token, path, rec.contentB64, message); break; }
      catch (e) {
        if (/409|422|already exists|sha was not supplied|does not match/i.test(e.message) && dup < 29) {
          const dot = rel.lastIndexOf("."), stem = dot > -1 ? rel.slice(0, dot) : rel, dotExt = dot > -1 ? rel.slice(dot) : "";
          rel = stem + "-" + (dup + 2) + dotExt; path = BASE_DIR + rel;
        } else throw e;
      }
    }
    resources.push({ id: rec.id, title: rec.title, desc: rec.desc || "", book: rec.book || "", chapter: rec.chapter || "", section: rec.section || "", url: rel, tags: rec.tags || [], type: rec.type || "练习" });
    await saveResources(token, "登记资源：" + rec.title);
    if (rec._blob) setPreview(rec.id, rec._blob);
    return path;
  }

  async function updateResource(rec) {
    const token = getPublishToken();
    if (!token) throw new Error("请先登录管理员");
    const idx = resources.findIndex((e) => e.id === rec.id);
    const old = resources[idx];
    if (!old) throw new Error("找不到要编辑的资源");
    let url = old.url || "";
    if (rec.contentB64) {
      let path = "pages/" + slugPath(rec.title, rec.fileExt);
      const taken = (p) => resources.some((x) => x.id !== rec.id && x.url === p);
      if (taken(path)) { for (let i = 2; i < 30; i++) { const dot = path.lastIndexOf("."), stem = dot > -1 ? path.slice(0, dot) : path, dotExt = dot > -1 ? path.slice(dot) : "", cand = stem + "-" + i + dotExt; if (!taken(cand)) { path = cand; break; } } }
      let sha = null; try { sha = await ghGetSha(token, BASE_DIR + path); } catch (e) { sha = null; }
      await ghPutFile(token, BASE_DIR + path, rec.contentB64, "更新资源文件：" + rec.title, sha || undefined);
      url = path;
      if (rec._blob) setPreview(rec.id, rec._blob);
      if (old.url && old.url !== path && old.url.indexOf("pages/") === 0) { try { await ghDeleteFile(token, BASE_DIR + old.url, "移除旧文件：" + rec.title); } catch (e) {} }
    }
    resources[idx] = { id: old.id, title: rec.title, desc: rec.desc || "", book: rec.book || "", chapter: rec.chapter || "", section: rec.section || "", url: url, tags: rec.tags || [], type: rec.type || "练习" };
    await saveResources(token, "编辑资源：" + rec.title);
    baseList = [...resources, ...uploadedList]; hydrateCounts(); render();
  }

  async function deleteResource(res) {
    const token = getPublishToken();
    if (!token) throw new Error("请先登录管理员");
    if (res.url && res.url.indexOf("pages/") === 0) { try { await ghDeleteFile(token, BASE_DIR + res.url, "删除资源：" + res.title); } catch (e) { if (!/404|422|失败/.test(e.message)) throw e; } }
    if (previewUrls[res.id]) { try { URL.revokeObjectURL(previewUrls[res.id]); } catch (e) {} delete previewUrls[res.id]; }
    resources = resources.filter((e) => e.id !== res.id);
    await saveResources(token, "删除资源：" + res.title);
    baseList = [...resources, ...uploadedList]; hydrateCounts(); render();
  }

  async function handleDelete(r) {
    if (!window.confirm("确定要删除资源「" + r.title + "」吗？这会从线上仓库移除。")) return;
    try {
      if (getPublishToken()) await deleteResource(r);
      else throw new Error("请先登录（管理员）");
      toast("已删除");
    } catch (e) { toast("删除失败：" + e.message, true); }
  }

  // 授权老师走 Worker（方案A 已暂停，仅为兼容保留）
  async function workerPost(action, payload) {
    const token = getWorkerToken(); if (!token) throw new Error("请先通过“授权登录”");
    const ctrl = new AbortController(); const timer = setTimeout(() => ctrl.abort(), 15000);
    try {
      const res = await fetch(WORKER_URL + "/" + action, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.assign({ token: token }, payload)), signal: ctrl.signal });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || ("请求失败（" + res.status + "）")); return data;
    } catch (e) { if (e.name === "AbortError") throw new Error("连接后端超时"); throw e; }
    finally { clearTimeout(timer); }
  }
  async function workerUpdate(rec) { await workerPost("update", rec); await loadAll(); }
  async function workerDelete(res) { await workerPost("delete", { id: res.id, url: res.url, title: res.title }); await loadAll(); }

  // ---------- 上传弹窗 ----------
  function isPaperType() { return $("#fType").value === "试卷"; }
  function populateTypeSelect() {
    const sel = $("#fType"); sel.innerHTML = "";
    COURSE.resourceTypes.forEach((t) => { const o = document.createElement("option"); o.value = t; o.textContent = t; sel.appendChild(o); });
    refreshTypeUI();
  }
  function refreshTypeUI() { const paper = isPaperType(); $("#typeHint").style.display = paper ? "block" : "none"; $("#fSection").disabled = paper; }
  function populateBookSelect() {
    const sel = $("#fBook"); sel.innerHTML = '<option value="">暂不分教材</option>';
    COURSE.books.forEach((b) => { const o = document.createElement("option"); o.value = b.id; o.textContent = b.title; sel.appendChild(o); });
  }
  function populateChapterSelect() {
    const sel = $("#fChapter"); sel.innerHTML = '<option value="">暂不选章</option>';
    chaptersOfBook($("#fBook").value).forEach((c) => { const o = document.createElement("option"); o.value = c.id; o.textContent = c.title; sel.appendChild(o); });
    populateSectionSelect();
  }
  function populateSectionSelect() {
    const sel = $("#fSection"); sel.innerHTML = '<option value="">未指定小节</option>';
    if (isPaperType()) { sel.disabled = true; return; }
    const ch = chapterOf($("#fChapter").value);
    if (ch) ch.sections.forEach((s) => { const o = document.createElement("option"); o.value = s.id; o.textContent = s.title; sel.appendChild(o); });
  }
  function refreshAdminUI() {
    const owner = !!getPublishToken(); const has = owner || !!getWorkerToken();
    const ubtn = $("#quick-add-btn"); if (ubtn) ubtn.style.display = has ? "" : "none";
    const row = $("#adminLoggedInRow"); if (row) row.style.display = owner ? "block" : "none";
  }
  function openModal(res) {
    editingId = res ? res.id : null;
    populateTypeSelect(); populateBookSelect();
    if (res) {
      $("#fTitle").value = res.title || ""; $("#fDesc").value = res.desc || ""; $("#fTags").value = (res.tags || []).join(" ");
      if (res.type) $("#fType").value = res.type; refreshTypeUI();
      if (res.book) $("#fBook").value = res.book; populateChapterSelect();
      if (res.chapter) $("#fChapter").value = res.chapter; populateSectionSelect();
      if (res.section) $("#fSection").value = res.section;
      $("#modalTitle").textContent = "编辑资源"; $("#saveResource").textContent = "保存修改";
    } else {
      $("#fTitle").value = ""; $("#fDesc").value = ""; $("#fTags").value = "";
      refreshTypeUI(); populateChapterSelect();
      $("#modalTitle").textContent = "上传资源"; $("#saveResource").textContent = "保存资源";
    }
    clearPendingFile();
    $("#modalMask").classList.remove("hidden");
    setTimeout(() => $("#fTitle").focus(), 50);
  }
  function closeModal() { $("#modalMask").classList.add("hidden"); }

  const FILE_RE = /\.(html?|htm|pdf|docx?|pptx?|xlsx?|txt|md|png|jpe?g|webp|gif|mp4|zip)$/i;
  function setPendingFile(file) {
    if (!file) return clearPendingFile();
    if (!FILE_RE.test(file.name)) { toast("不支持的文件类型（支持 HTML/PDF/Word/PPT/Excel/图片/视频/压缩包等）", true); return; }
    pendingFile = file;
    $("#fileName").textContent = file.name + "（" + (file.size / 1024).toFixed(1) + " KB）";
    $("#filePill").style.display = "flex";
    if (!$("#fTitle").value) $("#fTitle").value = file.name.replace(/\.[^.]+$/, "");
    smartFill(false);
  }
  function clearPendingFile() { pendingFile = null; $("#fileInput").value = ""; $("#filePill").style.display = "none"; $("#fileName").textContent = ""; }
  function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => { const u = String(fr.result || ""), c = u.indexOf(","); resolve(c > -1 ? u.slice(c + 1) : u); };
      fr.onerror = () => reject(fr.error); fr.readAsDataURL(file);
    });
  }

  let saving = false;
  async function saveResource() {
    const btn = $("#saveResource");
    if (saving) return;
    const title = $("#fTitle").value.trim();
    if (!title) { toast("请填写资源名称", true); return; }
    const editing = !!editingId;
    const isPaper = isPaperType();
    const em = pendingFile && /\.[^.]*$/.exec(pendingFile.name);
    const fileExt = pendingFile ? (em ? em[0].toLowerCase() : ".html") : undefined;
    const rec = { id: editingId || ("r" + Date.now() + Math.random().toString(36).slice(2, 7)), title, book: $("#fBook").value, chapter: $("#fChapter").value, section: isPaper ? "" : $("#fSection").value, desc: $("#fDesc").value.trim(), tags: $("#fTags").value.split(/[,，\s]+/).map((s) => s.trim()).filter(Boolean), type: isPaper ? "试卷" : $("#fType").value, fileExt, contentB64: null, createdAt: Date.now(), _blob: pendingFile };
    const isWorker = !!getWorkerToken() && !getPublishToken();
    if (!isWorker && !getPublishToken()) { toast("请先登录（管理员）", true); openAdminModal(); return; }
    saving = true; btn.disabled = true; const origLabel = editing ? "保存修改" : "保存资源"; btn.textContent = "上传中…"; toast("正在保存，请稍候…");
    try {
      if (pendingFile) {
        if (pendingFile.size > 50 * 1024 * 1024) throw new Error("文件过大（超过50MB），请压缩后再上传");
        if (pendingFile.size > 20 * 1024 * 1024) toast("文件较大，上传会稍慢…");
        const b = await readFileAsBase64(pendingFile).catch(() => null);
        if (!b) { toast("读取文件失败，请重试", true); return; }
        rec.contentB64 = b;
      }
      if (editing) {
        if (isWorker) { await workerUpdate(rec); await loadAll(); } else { await updateResource(rec); }
        closeModal(); toast("已保存修改"); return;
      }
      if (!pendingFile) { toast("请先选择一个文件", true); return; }
      if (isWorker) { await workerPost("upload", rec); await loadAll(); closeModal(); toast("已发布到线上（授权用户）"); }
      else {
        await publishResource(rec);
        baseList = [...resources, ...uploadedList]; hydrateCounts(); render(); closeModal();
        toast("已发布：卡片已出现，约1分钟后其它访客也能看到");
      }
    } catch (e) { toast((editing ? "保存失败：" : "发布失败：") + (e && e.message), true); }
    finally { saving = false; btn.disabled = false; btn.textContent = origLabel; }
  }

  // ---------- 自动识别填表（标题/文件名 + 文件内容） ----------
  const TEXT_EXT_RE = /^(html?|htm|md|txt)$/;
  function extOf(name) { const m = /\.([a-z0-9]+)$/i.exec(name || ""); return m ? m[1].toLowerCase() : ""; }
  function readTextSample(file) {
    return new Promise((resolve) => {
      if (!file) return resolve("");
      try { const fr = new FileReader(); fr.onload = () => resolve(String(fr.result || "")); fr.onerror = () => resolve(""); fr.readAsText(file.slice(0, 102400)); } catch (e) { resolve(""); }
    });
  }
  async function smartFill(force) {
    const title = $("#fTitle").value.trim() || (pendingFile ? pendingFile.name : "");
    if (!title) return;
    const ext = pendingFile ? extOf(pendingFile.name) : "";
    let content = "";
    if (pendingFile && TEXT_EXT_RE.test(ext)) content = await readTextSample(pendingFile);
    const searchStr = (title + " " + content).trim();
    const type = detectType(title, ext, content);
    let bookId = detectBook(searchStr);
    const loc = detectLoc(title, content, bookId);
    if (force || !$("#fType").value) { if (type) { $("#fType").value = type; refreshTypeUI(); } }
    if (loc && loc.chapter && !bookId) bookId = bookOfChapter(loc.chapter);
    if ((force || !$("#fBook").value) && bookId) $("#fBook").value = bookId;
    populateChapterSelect();
    if ((force || !$("#fChapter").value) && loc && loc.chapter) $("#fChapter").value = loc.chapter;
    populateSectionSelect();
    if (force && loc && loc.section) $("#fSection").value = loc.section;
    const topic = removeNoise(title);
    const secName = loc && loc.section ? sectionTitle(loc.section).replace(/^\s*\d+(\.\d+)*\s*/, "") : (loc && loc.chapter ? chapterTitle(loc.chapter).replace(/^第[一二三四五六七八九十]+章\s*/, "") : "");
    const existing = $("#fTags").value.split(/[,，\s]+/).filter(Boolean);
    const tags = [];
    if (topic) tags.push(topic);
    if (secName) tags.push(secName);
    if (type) tags.push(type);
    $("#fTags").value = tags.concat(existing.filter((t) => tags.indexOf(t) < 0)).join(" ");
    toast("已自动识别并预填（可再修改）");
  }

  const BOOK_ALIASES = [
    { id: "b1", names: ["必修第一册", "必修一", "必修1", "高一上"] },
    { id: "b2", names: ["必修第二册", "必修二", "必修2", "高一下"] },
    { id: "b3", names: ["必修第三册", "必修三", "必修3", "高二上"] },
    { id: "b4", names: ["选择性必修第一册", "选择性必修一", "选必一", "选必1", "选修一"] },
    { id: "b5", names: ["选择性必修第二册", "选择性必修二", "选必二", "选必2", "选修二"] },
    { id: "b6", names: ["选择性必修第三册", "选择性必修三", "选必三", "选必3", "选修三"] },
  ];
  function detectBook(s) { let best = null, bl = 0; for (const b of BOOK_ALIASES) for (const n of b.names) if (s.indexOf(n) > -1 && n.length > bl) { best = b.id; bl = n.length; } return best; }
  function detectType(s, ext, content) {
    const t = String(s || "").trim(), c = String(content || "").slice(0, 3000);
    const hasT = (re) => re.test(t), hasC = (re) => re.test(c);
    if (hasT(/教案|教学设计|导学案/)) return "教案";
    if (hasT(/试卷|试题|卷子|考试|月考|期中|期末|测验/)) return "试卷";
    if (hasT(/练习|习题|作业|题目|同步|巩固/)) return "练习";
    if (hasT(/课件|幻灯片|演示文稿|\bppt\b/i)) return "课件";
    if (hasT(/仿真|模拟|动画|交互|演示/)) return "仿真资源";
    if (/^(html?|htm)$/.test(ext)) return "仿真资源";
    if (/^(pptx?|ppt)$/.test(ext)) return "课件";
    if (hasC(/教案|教学设计|导学案/)) return "教案";
    if (hasC(/试卷|试题|考试|测验/)) return "试卷";
    if (hasC(/练习|习题|作业|题目/)) return "练习";
    if (hasC(/课件|幻灯片|演示文稿/)) return "课件";
    if (hasC(/仿真|模拟|动画|交互|演示|canvas/i)) return "仿真资源";
    return null;
  }
  const NOISE = /练习|习题|作业|题目|试卷|试题|考试|测验|课件|幻灯片|演示文稿|教案|教学设计|导学案|仿真|模拟|动画|交互|演示|\bppt\b/gi;
  function removeNoise(s) { let t = String(s).replace(/第[一二三四五六七八九十]+\d*章/g, " "); for (const b of BOOK_ALIASES) for (const n of b.names) t = t.replace(new RegExp(n, "g"), " "); t = t.replace(NOISE, " "); t = t.replace(/[，。、,.\s]+/g, " ").trim(); return t; }
  function cleanChapter(c) { return c.replace(/^第[一二三四五六七八九十]+章\s*/, ""); }
  function cleanSection(s) { return s.replace(/^\s*\d+(\.\d+)*\s*/, ""); }
  const CN = { "一": 1, "二": 2, "三": 3, "四": 4, "五": 5, "六": 6, "七": 7, "八": 8, "九": 9, "十": 10, "十一": 11, "十二": 12, "十三": 13 };
  function cnNum(w) { if (CN[w] != null) return CN[w]; if (w.charAt(0) === "十") return 10 + (CN[w.slice(1)] || 0); return null; }
  function parseChapterNum(s) { const m = s.match(/第([一二三四五六七八九十]+|\d{1,2})章/); if (!m) return null; const w = m[1]; return /^\d+$/.test(w) ? parseInt(w, 10) : cnNum(w); }
  function detectLoc(s, content, bookId) {
    const books = COURSE.books.filter((b) => !bookId || b.id === bookId);
    const hay = (s || "") + " " + (content || "");
    const wantNum = parseChapterNum(hay), topic = removeNoise(s || "");
    let chapter = null, section = null;
    if (wantNum) { outer: for (const b of books) for (const c of b.chapters) if (parseChapterNum(c.title) === wantNum) { chapter = c.id; break outer; } }
    if (!chapter && topic.length >= 2) { outer: for (const b of books) for (const c of b.chapters) { const sig = cleanChapter(c.title) + " " + c.sections.map((sec) => cleanSection(sec.title)).join(" "); if (sig.indexOf(topic) > -1) { chapter = c.id; break outer; } } }
    if (!chapter) { let best = null, bl = 0; for (const b of books) for (const c of b.chapters) { const ct = cleanChapter(c.title); if (ct && ct.length > bl && hay.indexOf(ct) > -1) { best = c.id; bl = ct.length; } } chapter = best; }
    if (!chapter) { let bestC = null, bestS = null, bl = 0; for (const b of books) for (const c of b.chapters) for (const sec of c.sections) { const st = cleanSection(sec.title); if (st && st.length > bl && hay.indexOf(st) > -1) { bestC = c.id; bestS = sec.id; bl = st.length; } } chapter = bestC; section = bestS; }
    if (chapter && !section) { const ch = allChapters.find((x) => x.id === chapter); if (ch) { let best = null, bl = 0; for (const sec of ch.sections) { const st = cleanSection(sec.title); if (st && st.length > bl && hay.indexOf(st) > -1) { best = sec.id; bl = st.length; } } section = best; } }
    return { chapter: chapter, section: section };
  }

  // ---------- 资源助手 ----------
  function searchAssistant(s) {
    const bookId = detectBook(s), type = detectType(s), loc = detectLoc(s, "", bookId), topic = removeNoise(s);
    let pool = baseList.slice();
    if (bookId) pool = pool.filter((r) => r.book === bookId);
    if (type) pool = pool.filter((r) => r.type === type);
    if (loc && loc.chapter) pool = pool.filter((r) => r.chapter === loc.chapter);
    if (topic.length >= 2) { const lt = topic.toLowerCase(); pool = pool.filter((r) => [r.title, r.desc, (r.tags || []).join(" "), bookTitle(r.book), chapterTitle(r.chapter), sectionTitle(r.section)].join(" ").toLowerCase().indexOf(lt) > -1); }
    return { pool: pool, book: bookId, type: type, loc: loc, keywords: topic };
  }
  function htmlEscape(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function resLabel(r) { const p = []; if (bookTitle(r.book)) p.push(bookTitle(r.book)); if (chapterTitle(r.chapter)) p.push(chapterTitle(r.chapter).replace(/第[一二三四五六七八九十]+章\s*/, "")); if (r.section && sectionTitle(r.section)) p.push(sectionTitle(r.section).replace(/^\s*\d+(\.\d+)*\s*/, "")); return p.join(" · "); }
  function assistantReply(q) {
    const res = searchAssistant(q), list = res.pool;
    const filter = { book: res.book, chapter: res.loc && res.loc.chapter, section: res.loc && res.loc.section, type: res.type };
    if (list.length === 0) {
      if (res.loc && res.loc.chapter) return { text: "这个范围（" + (res.loc.section ? sectionTitle(res.loc.section) : chapterTitle(res.loc.chapter)) + "）暂时还没有已上传的资源。换个关键词或去对应章节看看。", resources: [], filter: filter };
      return { text: "没找到相关资源。试试这样问：\n• 必修一 第二章 自由落体 课件\n• 仿真资源\n• 小船过河 ", resources: [], filter: filter };
    }
    let text = "为你找到 " + list.length + " 个相关资源：";
    if (res.loc && res.loc.chapter) text += "（已定位到 " + (res.loc.section ? sectionTitle(res.loc.section) : chapterTitle(res.loc.chapter)) + "）";
    return { text: text, resources: list, filter: filter };
  }
  function addMsg(html, who) { const body = $("#assistMessages"); const el = document.createElement("div"); el.className = "assist-msg " + who; el.innerHTML = html; body.appendChild(el); body.scrollTop = body.scrollHeight; }
  function applyFilterFromReply(filter) { state.book = filter.book || null; state.chapter = filter.chapter || null; state.section = filter.section || null; state.type = filter.type || "all"; state.search = ""; render(); closeAssist(); const c = $(".workbench-main"); if (c && typeof c.scrollIntoView === "function") c.scrollIntoView({ behavior: "smooth" }); }

  // ---------- 大模型（AI，可选） ----------
  const AI_DEFAULT_ENDPOINT = "https://open.bigmodel.cn/api/paas/v4/chat/completions";
  const AI_DEFAULT_MODEL = "glm-4-flash";
  let aiConf = { endpoint: AI_DEFAULT_ENDPOINT, model: AI_DEFAULT_MODEL, key: "" };
  function getAiConf() { try { const s = localStorage.getItem("ai_conf"); if (s) aiConf = Object.assign({ endpoint: AI_DEFAULT_ENDPOINT, model: AI_DEFAULT_MODEL, key: "" }, JSON.parse(s)); } catch (e) {} return aiConf; }
  function setAiConf(c) { aiConf = Object.assign({}, getAiConf(), c); try { localStorage.setItem("ai_conf", JSON.stringify(aiConf)); } catch (e) {} }
  async function llmChat(system, user, opts) {
    const conf = getAiConf();
    if (!conf.endpoint || !conf.key) return null;
    const ctrl = new AbortController(); const timer = setTimeout(() => ctrl.abort(), (opts && opts.timeout) || 9000);
    try {
      const headers = { "Content-Type": "application/json", Accept: "application/json" };
      if (conf.key) headers.Authorization = "Bearer " + conf.key;
      const body = { model: conf.model || AI_DEFAULT_MODEL, messages: [{ role: "system", content: system }, { role: "user", content: user }], temperature: (opts && opts.temperature != null) ? opts.temperature : 0.3, max_tokens: (opts && opts.maxTokens) || 200, stream: false };
      const res = await fetch(conf.endpoint, { method: "POST", headers: headers, body: JSON.stringify(body), signal: ctrl.signal });
      if (!res.ok) throw new Error("AI " + res.status);
      const data = await res.json();
      return (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || "";
    } catch (e) { return null; } finally { clearTimeout(timer); }
  }
  function parseJsonLoose(text) { if (!text) return null; const m = String(text).match(/\{[\s\S]*\}/); if (!m) return null; try { return JSON.parse(m[0]); } catch (e) { try { return JSON.parse(m[0].replace(/'/g, '"').replace(/，/g, ",")); } catch (e2) { return null; } } }
  async function aiPickTitles(q) {
    if (!baseList.length) return null;
    const idx = baseList.map((r) => { const loc = [bookTitle(r.book), chapterTitle(r.chapter), sectionTitle(r.section)].filter(Boolean).join(" · "); return (r.title || "") + "┃" + loc + "┃" + (r.type || "") + "┃" + (r.desc || ""); }).join("\n");
    const system = "你是高中物理教学资源库的检索助手。下面是仓库里的资源清单，每行格式：标题┃所属教材/章节┃类型┃简介。\n请根据用户的查询选出最相关的资源标题。只返回 JSON：{\"titles\":[\"标题1\",\"标题2\"]}，最多 5 个；都不相关则返回 {\"titles\":[]}。只输出 JSON。\n\n资源清单：\n" + idx;
    const resp = await llmChat(system, "查询：" + q, { maxTokens: 300, temperature: 0.2, timeout: 6000 });
    const obj = parseJsonLoose(resp);
    if (obj && Array.isArray(obj.titles)) return obj.titles.map((t) => String(t).trim()).filter(Boolean);
    return null;
  }
  async function aiAssistantReply(q) {
    const picked = await aiPickTitles(q);
    let list = [];
    if (picked && picked.length) {
      for (const t of picked) { if (!t) continue; const r = baseList.find((x) => x.title === t) || baseList.find((x) => x.title.indexOf(t) > -1 || (t.length > 1 && t.indexOf(x.title) > -1)); if (r && !list.some((x) => x.id === r.id)) list.push(r); }
    }
    if (!list.length) return assistantReply(q);
    let filter = null;
    const chs = [...new Set(list.map((r) => r.chapter).filter(Boolean))];
    if (chs.length === 1) { const first = list.find((r) => r.chapter === chs[0]); filter = { book: (first && first.book) || null, chapter: chs[0], section: null, type: "all" }; }
    return { text: "为你找到 " + list.length + " 个相关资源：", resources: list, filter: filter };
  }
  function fallbackDesc(title, chapterId, sectionId, type) {
    const cleanTitle = String(title || "").replace(/\.[a-z0-9]+$/i, "");
    const seg = []; const bid = bookOfChapter(chapterId);
    if (bid) seg.push(bookTitle(bid));
    if (chapterId) seg.push(chapterTitle(chapterId));
    if (sectionId) seg.push(sectionTitle(sectionId));
    const loc = seg.filter(Boolean).map((s) => s.replace(/^第[一二三四五六七八九十]+章\s*/, "").replace(/^\s*\d+(\.\d+)*\s*/, "")).join(" · ");
    return cleanTitle + (loc ? "（" + loc + "）" : "") + " · " + (type || "教学资源");
  }
  async function aiDescribe(title, chapterId, sectionId, type, contentSample) {
    const sys = "你是高中物理教学资源库的编辑。请为下面的资源写一句简介，35字以内，只输出简介正文，不要引号、不要“简介：”前缀、不要列表或编号。";
    let info = "资源名称：" + title;
    if (chapterId) info += "\n所属：" + chapterTitle(chapterId) + (sectionId ? " / " + sectionTitle(sectionId) : "");
    if (type) info += "\n类型：" + type;
    if (contentSample) info += "\n文件内容（片段）：" + String(contentSample).slice(0, 300);
    const resp = await llmChat(sys, info, { maxTokens: 80, temperature: 0.6, timeout: 9000 });
    if (resp) { let d = String(resp).trim().replace(/^("*|“|「|『|\s*简介[:：]?\s*)/, "").replace(/("*|”|」|』)$/, "").trim(); d = d.slice(0, 60); if (d) return { text: d, ai: true }; }
    return { text: fallbackDesc(title, chapterId, sectionId, type), ai: false };
  }
  async function aiGenerateDesc() {
    const title = $("#fTitle").value.trim();
    if (!title) { toast("请先填写资源名称", true); return; }
    const btn = $("#aiDescBtn"); btn.disabled = true; btn.textContent = "生成中…";
    try {
      let sample = "";
      if (pendingFile && TEXT_EXT_RE.test(extOf(pendingFile.name))) sample = await readTextSample(pendingFile);
      const res = await aiDescribe(title, $("#fChapter").value, $("#fSection").value, $("#fType").value, sample);
      $("#fDesc").value = res.text;
      toast(res.ai ? "已生成智能简介（可再修改）" : "已生成简介（本地规则；AI 接口暂不可用，可在“管理员登录”里配置）");
    } catch (e) { $("#fDesc").value = fallbackDesc(title, $("#fChapter").value, $("#fSection").value, $("#fType").value); toast("已生成简介（AI 异常已用本地规则）"); }
    finally { btn.disabled = false; btn.textContent = "✨ 智能简介"; }
  }
  async function assistantSend() {
    const input = $("#assistInput"), q = input.value.trim();
    if (!q) return;
    input.value = "";
    addMsg(htmlEscape(q), "user");
    const sendBtn = $("#assistSend"); sendBtn.disabled = true; sendBtn.textContent = "思考中…";
    const think = document.createElement("div"); think.className = "assist-msg bot"; think.textContent = "🤖 正在思考…";
    $("#assistMessages").appendChild(think); $("#assistMessages").scrollTop = $("#assistMessages").scrollHeight;
    let reply;
    try { reply = await aiAssistantReply(q); } catch (e) { reply = assistantReply(q); }
    if (think.parentNode) think.parentNode.removeChild(think);
    sendBtn.disabled = false; sendBtn.textContent = "发送";
    const hitList = reply.resources.length ? "<ul>" + reply.resources.map((r) => "<li><span class='assist-hit' data-id='" + r.id + "'>" + htmlEscape(r.title) + "</span> <small>" + htmlEscape(resLabel(r)) + "</small></li>").join("") + "</ul>" : "";
    const btn = reply.filter && reply.resources.length ? "<div class='assist-btnrow'><button class='btn btn-secondary btn-sm' type='button' data-applyfilter='1'>筛选到右侧</button></div>" : "";
    addMsg(reply.text.replace(/\n/g, "<br/>") + hitList + btn, "bot");
    $$("#assistMessages .assist-hit").forEach((el) => { el.onclick = () => { const r = baseList.find((x) => x.id === el.getAttribute("data-id")); if (r) openResource(r); }; });
    $$("#assistMessages [data-applyfilter]").forEach((b) => { b.onclick = () => applyFilterFromReply(reply.filter); });
  }
  function openAssist() { $("#assistPanel").hidden = false; if ($("#assistMessages").childElementCount === 0) addMsg("你好！我是资源助手。告诉我你想找的教材/章节/类型或关键词，例如“必修一 自由落体 课件”。", "bot"); setTimeout(() => $("#assistInput").focus(), 50); }
  function closeAssist() { $("#assistPanel").hidden = true; }

  // ---------- 管理员 / AI 登录 ----------
  function openAdminModal() {
    $("#adminToken").value = getPublishToken();
    const ai = getAiConf(); if ($("#aiEndpoint")) $("#aiEndpoint").value = ai.endpoint || ""; if ($("#aiModel")) $("#aiModel").value = ai.model || ""; if ($("#aiKey")) $("#aiKey").value = ai.key || "";
    refreshAdminUI(); $("#adminMask").classList.remove("hidden"); setTimeout(() => $("#adminToken").focus(), 50);
  }
  function closeAdminModal() { $("#adminMask").classList.add("hidden"); }
  function saveAdmin() {
    const t = $("#adminToken").value.trim();
    if (!t) { toast("请输入 GitHub 访问令牌", true); return; }
    setPublishToken(t);
    setAiConf({ endpoint: $("#aiEndpoint") ? $("#aiEndpoint").value.trim() : aiConf.endpoint, model: $("#aiModel") ? $("#aiModel").value.trim() : aiConf.model, key: $("#aiKey") ? $("#aiKey").value.trim() : aiConf.key });
    closeAdminModal(); refreshAdminUI(); hydrateCounts(); render();
    toast("已登录，上传与编辑入口已开启");
  }
  function clearToken() {
    if (!window.confirm("确定要清除本机保存的管理员令牌吗？清除后上传入口会隐藏。")) return;
    try { localStorage.removeItem(TOKEN_KEY); } catch (e) {}
    closeAdminModal(); refreshAdminUI(); hydrateCounts(); render(); toast("已退出，上传入口已隐藏");
  }

  // ---------- 渲染：模块切换 ----------
  const MODULE_INFO = {
    materials: { name: "1. 教学材料上传", sub: "人教版各章节 · 小节文件浏览目录" },
    plans: { name: "2. 教学计划安排", sub: "2025-2026 学年教学进度 / 大单元排课" },
    goals: { name: "3. 教学目标评估", sub: "核心素养评价量规 / 达标分析" },
    analytics: { name: "4. 班级成绩分析", sub: "阶段考试统计 / 考点易错谱系" },
    students: { name: "5. 学生重点跟进", sub: "拔尖培优 / 临界生提分" },
    innovation: { name: "6. 创新思路记录", sub: "自制教具 / 跨学科 STEAM" },
    gaokao: { name: "7. 高考题目分析", sub: "真题微专题 / 命题趋势预测" },
  };

  function render() {
    const info = MODULE_INFO[currentModule] || MODULE_INFO.materials;
    $("#header-module-name").textContent = info.name;
    if (currentModule === "materials") {
      $("#header-sub-name").textContent = info.sub;
      $("#subtabs-bar").style.display = "none";
      renderMaterials();
    } else {
      $("#header-sub-name").textContent = info.sub;
      $("#subtabs-bar").style.display = "flex";
      $("#subtabs-container").innerHTML = '<button class="subtab-btn active">概览</button>';
      $("#subtabs-actions").innerHTML = '<button class="btn btn-secondary btn-sm">建设中</button>';
      renderPlaceholder(currentModule, info);
    }
    $$("#main-nav-menu .nav-item").forEach((b) => b.classList.toggle("active", b.getAttribute("data-module") === currentModule));
  }

  function renderPlaceholder(id, info) {
    const desc = {
      plans: "教学计划安排模块正在建设中。规划接入各学期大单元排课、实验周历与课时进度表。",
      goals: "教学目标评估模块正在建设中。规划接入核心素养四维评价量规与课堂达标数据分析。",
      analytics: "班级成绩分析模块正在建设中。规划接入联考小分统计、班级对比与考点易错谱系。",
      students: "学生重点跟进模块正在建设中。规划接入拔尖培优档案与临界生提分方案。",
      innovation: "创新思路记录模块正在建设中。规划接入自制教具方案与 STEAM 跨学科项目。",
      gaokao: "高考题目分析模块正在建设中。规划接入真题微专题拆解与命题趋势预测。",
    }[id] || "该模块正在建设中。";
    $("#content-viewport").innerHTML = '<div class="module-placeholder"><div class="ph-icon">🚧</div><h3>' + (info.name.replace(/^\d+\.\s*/, "")) + "</h3><p>" + desc + '</p><span class="ph-badge">建设中 · 敬请期待</span></div>';
  }

  // ---------- 渲染：人教资源库（教材→章→节 + 文件卡片） ----------
  function bookCount(bookId) { return baseList.filter((r) => r.book === bookId).length; }
  function chCount(ch) { return baseList.filter((r) => r.chapter === ch.id).length; }
  function secCount(ch, sec) { return baseList.filter((r) => r.chapter === ch.id && r.section === sec.id).length; }

  // 智能默认选择：优先停靠在“第一个有资源的教材→章”；当前项无资源则在有资源的书/章间切换
  function smartDefault() {
    if (!state.book || bookCount(state.book) === 0) {
      const fw = COURSE.books.find((b) => bookCount(b.id) > 0);
      state.book = (fw || COURSE.books[0]).id;
    }
    const book = bookOf(state.book) || COURSE.books[0];
    const curCh = chapterOf(state.chapter);
    if (!state.chapter || chCount(curCh) === 0) {
      const ch = book.chapters.find((c) => chCount(c) > 0) || book.chapters[0];
      state.chapter = (ch || book.chapters[0]).id;
      state.section = null;
    }
  }

  function renderMaterials() {
    smartDefault();
    const book = bookOf(state.book) || COURSE.books[0];
    const activeChapter = chapterOf(state.chapter) || book.chapters[0];
    if (state.section && !(activeChapter.sections || []).some((s) => s.id === state.section)) state.section = null; // 失效小节则回到“全章”

    const typeOptions = ["all"].concat(COURSE.resourceTypes || []);
    const typeLabels = { all: "全部类型", 练习: "练习", 试卷: "试卷", 课件: "课件", 教案: "教案", 仿真资源: "仿真资源" };
    const vis = visible();

    const treeHtml = book.chapters.map((ch) => {
      const open = openChapters.has(ch.id) || ch.id === state.chapter;
      const selCh = ch.id === state.chapter;
      let secs = ch.sections;
      if (treeSearch.trim()) { const t = treeSearch.trim().toLowerCase(); secs = secs.filter((s) => s.title.toLowerCase().includes(t)); }
      return '<div class="chapter-node ' + (open ? "expanded" : "") + (selCh ? " selected-chapter" : "") + '">' +
        '<div class="chapter-head" data-chapter-id="' + ch.id + '">' +
        '<span class="chapter-toggle-icon">▶</span>' +
        '<div class="chapter-title-wrap"><div class="chapter-code-title"><span>' + ch.title.replace(/^第[一二三四五六七八九十]+章\s*/, "") + "</span></div>" +
        '<div class="chapter-meta"><span>' + ch.sections.length + "个小节</span><span class=\"chapter-count-tag\">" + chCount(ch) + "份</span></div></div></div>" +
        '<div class="section-list">' +
        '<div class="section-node' + (selCh && state.section === null ? " active-section" : "") + '" data-chapter-id="' + ch.id + '" data-section-id="">' +
        '<span class="section-bullet"></span><span class="section-title">📂 全章资源</span><span class="section-badge">' + chCount(ch) + "</span></div>" +
        secs.map((s) => {
          const act = selCh && state.section === s.id;
          return '<div class="section-node' + (act ? " active-section" : "") + '" data-chapter-id="' + ch.id + '" data-section-id="' + s.id + '">' +
            '<span class="section-bullet"></span><span class="section-title">' + s.title + "</span><span class=\"section-badge\">" + secCount(ch, s) + "</span></div>";
        }).join("") +
        "</div></div>";
    }).join("");

    const secLabel = activeChapter.title.replace(/^第[一二三四五六七八九十]+章\s*/, "");
    const overview = '<div class="section-overview-card">' +
      '<div class="section-path-nav"><div class="section-path-crumbs"><span>人教版高中物理</span><span>&gt;</span><span>' + book.title + '</span><span>&gt;</span><strong>' + activeChapter.title + '</strong></div></div>' +
      '<div class="section-overview-main"><div class="section-heading-block"><h2><span>' + activeChapter.title + '</span><span class="section-highlight-badge">共' + activeChapter.sections.length + '小节</span></h2>' +
      '<div class="section-meta-row"><div class="section-meta-item"><span>当前范围资源:</span><strong style="color:var(--primary);">' + vis.length + ' 份</strong></div></div></div></div>' +
      '<div class="section-teaching-targets"><div class="target-title"><span>🎯</span><span>所属章节 · 小节资源：</span></div><div class="target-desc">' + secLabel + ' —— 请从左侧“教材小节精准目录”选择具体小节查看对应资源。</div></div>' +
      "</div>";

    const uploadZone = '<div class="chapter-upload-zone" id="chapter-dropzone">' +
      '<div class="upload-zone-left"><div class="upload-zone-icon"><span>📤</span></div><div class="upload-zone-text"><h4>精准上传教学材料至『' + activeChapter.title + '』</h4><p>支持 HTML/PDF/Word/PPT/Excel/图片/视频/压缩包，保存即发布到线上仓库并登记到资源清单。</p></div></div>' +
      '<div class="upload-zone-right"><button class="btn btn-primary btn-sm" id="btn-open-upload-modal"><span>+ 上传到本节</span></button></div></div>';

    const catBtns = '<div class="category-filter-group">' + typeOptions.map((t) => '<button class="cat-btn' + (state.type === t ? " active" : "") + '" data-cat="' + t + '">' + typeLabels[t] + "</button>").join("") + '</div><div class="view-mode-group"><button class="view-btn' + (currentView === "grid" ? " active" : "") + '" data-view="grid">▦ 卡片</button><button class="view-btn' + (currentView === "list" ? " active" : "") + '" data-view="list">☰ 列表</button></div>';

    const cardsHtml = currentView === "grid"
      ? '<div class="pep-files-grid">' + (vis.length ? vis.map(buildCard).join("") : emptyHtml()) + "</div>"
      : buildTable(vis);

    $("#content-viewport").innerHTML =
      '<div class="pep-module-wrap">' +
      '<div class="pep-book-tabs">' + COURSE.books.map((b) => '<button class="pep-book-tab' + (b.id === state.book ? " active" : "") + '" data-book-id="' + b.id + '"><span class="book-tab-badge">' + (b.title.replace(/必修|选择性/g, "").slice(0, 2)) + '</span><div class="book-tab-info"><span class="book-tab-title">' + b.title + '</span><span class="book-tab-sub">' + b.chapters.length + "章 / " + b.chapters.reduce((x, c) => x + c.sections.length, 0) + "小节 (" + bookCount(b.id) + "份)</span></div></button>").join("") + "</div>" +
      '<div class="pep-main-layout">' +
      '<div class="pep-tree-panel"><div class="tree-header"><div class="tree-title-row"><span>📂</span><h3>教材小节精准目录</h3></div></div>' +
      '<div class="tree-search-wrap"><span class="tree-search-icon">🔍</span><input type="text" id="tree-filter-input" placeholder="输入小节名/考点检索..." value="' + treeSearch.replace(/"/g, "&quot;") + '" /></div>' +
      '<div class="tree-nodes-container">' + treeHtml + "</div></div>" +
      '<div class="pep-content-panel">' + overview + uploadZone +
      '<div class="pep-toolbar">' + catBtns + "</div>" +
      '<div class="pep-files-container">' + cardsHtml + "</div></div>" +
      "</div></div>";
  }

  function emptyHtml() {
    return '<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--text-dim);"><div style="font-size:40px;margin-bottom:10px;">🗂️</div><b>暂无匹配的资源</b><br/>试试调整搜索关键词或分类筛选。</div>';
  }

  function iconBadge(url) {
    const ext = (url || "").split(".").pop().toLowerCase();
    let cls = "icon-doc", label = "DOC";
    if (/pptx?/.test(ext)) { cls = "icon-ppt"; label = "PPT"; }
    else if (/pdf/.test(ext)) { cls = "icon-pdf"; label = "PDF"; }
    else if (/xlsx?/.test(ext)) { cls = "icon-xls"; label = "XLS"; }
    else if (/mp4|webm|mov/.test(ext)) { cls = "icon-mp4"; label = "MP4"; }
    else if (/html?/.test(ext)) { cls = "icon-doc"; label = "HTML"; }
    return '<div class="file-icon-badge ' + cls + '">' + label + "</div>";
  }

  function buildCard(raw) {
    const r = openable(raw);
    const meta = [bookTitle(r.book), chapterTitle(r.chapter), r.section ? sectionTitle(r.section) : ""].filter(Boolean).join(" · ");
    const tags = (r.tags || []).slice(0, 3).map((t) => '<span class="tag-pill">' + htmlEscape(t) + "</span>").join("");
    let actions = "";
    if (getPublishToken()) actions = '<button class="btn btn-secondary btn-xs" data-act="edit" data-id="' + r.id + '">✏️ 编辑</button><button class="btn btn-secondary btn-xs" style="color:var(--accent-rose);" data-act="del" data-id="' + r.id + '">🗑 删除</button>';
    return '<article class="pep-file-card" data-id="' + r.id + '">' +
      '<div class="card-top-row">' + iconBadge(r.url) +
      '<div class="file-title-wrap"><div class="file-item-name">' + htmlEscape(r.title || "未命名资源") + '</div><span class="file-section-badge">' + htmlEscape(r.type || "资源") + "</span>" + (tags ? '<div class="file-tags-row">' + tags + "</div>" : "") + "</div></div>" +
      (r.desc ? '<p style="font-size:12px;color:var(--text-muted);line-height:1.5;">' + htmlEscape(r.desc) + "</p>" : "<p></p>") +
      '<div class="file-card-footer"><span style="font-size:11px;color:var(--text-dim);">' + htmlEscape(meta || "未分教材") + '</span><div class="file-actions-row"><button class="btn btn-primary btn-xs" data-act="open" data-id="' + r.id + '">↗ 打开</button>' + actions + "</div></div>" +
      "</article>";
  }

  function buildTable(list) {
    if (!list.length) return emptyHtml();
    const rows = list.map((raw) => {
      const r = openable(raw);
      const meta = [bookTitle(r.book), chapterTitle(r.chapter), r.section ? sectionTitle(r.section) : ""].filter(Boolean).join(" · ");
      let actions = '<button class="btn btn-primary btn-xs" data-act="open" data-id="' + r.id + '">打开</button>';
      if (getPublishToken()) actions += '<button class="btn btn-secondary btn-xs" data-act="edit" data-id="' + r.id + '">编辑</button><button class="btn btn-secondary btn-xs" style="color:var(--accent-rose);" data-act="del" data-id="' + r.id + '">删除</button>';
      return "<tr data-id='" + r.id + "'><td>" + htmlEscape(r.title || "") + "</td><td>" + htmlEscape(r.type || "") + "</td><td>" + htmlEscape(meta) + "</td><td class=\"td-actions\">" + actions + "</td></tr>";
    }).join("");
    return '<table class="pep-files-table"><thead><tr><th>资源名称</th><th>类型</th><th>所属</th><th>操作</th></tr></thead><tbody>' + rows + "</tbody></table>";
  }

  // ---------- 事件绑定 ----------
  function onTreeOrCardClick(e) {
    const bookBtn = e.target.closest(".pep-book-tab");
    if (bookBtn) { state.book = bookBtn.getAttribute("data-book-id"); state.chapter = null; state.section = null; openChapters.clear(); render(); return; }
    const chHead = e.target.closest(".chapter-head");
    if (chHead) { const cid = chHead.getAttribute("data-chapter-id"); if (state.chapter !== cid) { state.chapter = cid; state.section = null; const b = bookOfChapter(cid); if (b) state.book = b; openChapters.add(cid); } else if (openChapters.has(cid)) openChapters.delete(cid); else openChapters.add(cid); render(); return; }
    const node = e.target.closest(".section-node");
    if (node) { state.chapter = node.getAttribute("data-chapter-id"); state.section = node.getAttribute("data-section-id") || null; const b = bookOfChapter(state.chapter); if (b) state.book = b; render(); return; }
    const cat = e.target.closest(".cat-btn");
    if (cat) { state.type = cat.getAttribute("data-cat"); render(); return; }
    const view = e.target.closest(".view-btn");
    if (view) { currentView = view.getAttribute("data-view"); render(); return; }
    const act = e.target.closest("[data-act]");
    if (act) {
      const id = act.getAttribute("data-id"); const r = baseList.find((x) => x.id === id);
      if (!r) return;
      const a = act.getAttribute("data-act");
      if (a === "open") openResource(r);
      else if (a === "edit") openModal(r);
      else if (a === "del") handleDelete(r);
      return;
    }
    if (e.target.closest("#btn-open-upload-modal")) { openModal(); return; }
  }

  function bindEvents() {
    $$("#main-nav-menu .nav-item").forEach((b) => { b.onclick = () => { currentModule = b.getAttribute("data-module"); render(); }; });

    let deb;
    $("#global-search").addEventListener("input", (e) => { clearTimeout(deb); deb = setTimeout(() => { state.search = e.target.value.trim(); render(); }, 150); });
    $("#content-viewport").addEventListener("click", onTreeOrCardClick);
    $("#content-viewport").addEventListener("input", (e) => { if (e.target && e.target.id === "tree-filter-input") { treeSearch = e.target.value.trim(); render(); } });

    $("#quick-add-btn").onclick = () => openModal();
    $("#btn-notifications").onclick = openAdminModal;

    // 上传弹窗
    $("#closeModal").onclick = closeModal;
    $("#cancelModal").onclick = closeModal;
    let mask = $("#modalMask"); if (mask) mask.addEventListener("click", (e) => { if (e.target === mask) closeModal(); });
    $("#fType").addEventListener("change", () => { refreshTypeUI(); populateSectionSelect(); });
    $("#fBook").addEventListener("change", populateChapterSelect);
    $("#fChapter").addEventListener("change", populateSectionSelect);
    $("#autoFillBtn").onclick = async () => { await smartFill(true); aiGenerateDesc(); };
    $("#aiDescBtn").onclick = aiGenerateDesc;
    $("#saveResource").onclick = saveResource;

    // 资源助手
    $("#assistFab").onclick = openAssist;
    $("#assistClose").onclick = closeAssist;
    $("#assistSend").onclick = assistantSend;
    $("#assistInput").addEventListener("keydown", (e) => { if (e.key === "Enter") assistantSend(); });

    // 管理员/AI
    $("#closeAdminModal").onclick = closeAdminModal;
    $("#cancelAdminModal").onclick = closeAdminModal;
    let am = $("#adminMask"); if (am) am.addEventListener("click", (e) => { if (e.target === am) closeAdminModal(); });
    $("#adminSave").onclick = saveAdmin;
    $("#clearTokenBtn").onclick = clearToken;
    $("#adminToken").addEventListener("keydown", (e) => { if (e.key === "Enter") saveAdmin(); });

    // 文件选择
    const dz = $("#dropzone"), fi = $("#fileInput");
    dz.onclick = () => fi.click();
    fi.addEventListener("change", () => setPendingFile(fi.files[0]));
    ["dragenter", "dragover"].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add("drag"); }));
    ["dragleave", "drop"].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.remove("drag"); }));
    dz.addEventListener("drop", (e) => { const f = e.dataTransfer.files[0]; if (f) setPendingFile(f); });
    $("#clearFile").onclick = clearPendingFile;
  }

  // ---------- 启动 ----------
  document.addEventListener("DOMContentLoaded", () => {
    try { const yearEl = $("#year"); if (yearEl) yearEl.textContent = new Date().getFullYear(); } catch (e) {}
    bindEvents();
    refreshAdminUI();
    render();                       // 先用 COURSE 立即画出目录树（不等网络/IndexedDB）
    loadAll().catch((e) => toast("初始化失败：" + (e && e.message), true));
  });
})();
