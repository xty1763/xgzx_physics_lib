/*
 * 高中物理教师智能教学工作台 (workbench) —— 应用逻辑
 * 完全按 物理界面1.html 设计稿：教材目录 PEP_TEXTBOOKS(带课时/难点/目标/核心概念/公式)
 * + 资源分类(教案/课件/练习/实验) + 标签/难度体系 + 文件卡片(keypoints/预览/下载)。
 * 数据底座仍是 resources.json(旧模型)：加载后映射为设计的 store(章节→PEP id、分类/标签由类型派生)。
 * 上传/编辑/删除 走站长 GitHub 令牌直连(写入 workbench/data/resources.json)；含自动识别填表、资源助手、智能简介。
 */
(function () {
  "use strict";

  const ASSET_V = 24;
  const PEP = window.PEP_TEXTBOOKS || [];
  const COURSE = window.COURSE || { books: [], resourceTypes: [] };
  const WORKER_URL = "https://physics-lib.xingang-physics.workers.dev";
  const WORKER_TOKEN_KEY = "worker_token";
  const TOKEN_KEY = "gh_publish_token";
  const BASE_DIR = "workbench/";

  // ---------- 状态 ----------
  const state = { bookId: null, chapterId: null, sectionId: null, cat: "all", secTag: "all", search: "", view: "grid", treeSearch: "" };
  const treeExpanded = new Set();
  function openUploadAtCurrent() { openModal(null, state.bookId, state.chapterId, state.sectionId); }
  function toggleExpandAll() {
    const book = bookOf(state.bookId) || COURSE.books[0];
    const allOpen = book.chapters.every((c) => treeExpanded.has(c.id));
    if (allOpen) treeExpanded.clear(); else { treeExpanded.add(state.chapterId); book.chapters.forEach((c) => treeExpanded.add(c.id)); }
    render();
  }
  let currentModule = "materials";
  let store = [];                 // 设计格式的资源(映射后)
  let resources = [];             // 原始 resources.json(旧模型)
  const previewUrls = {};
  let pendingFile = null, editingId = null, saving = false;

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.prototype.slice.call(document.querySelectorAll(sel));

  const bookTitle = (id) => (COURSE.books.find((b) => b.id === id) || {}).title || "";
  const chapterTitle = (id) => { for (const b of COURSE.books) for (const c of b.chapters) if (c.id === id) return c.title; return ""; };
  const sectionTitle = (id) => { for (const b of COURSE.books) for (const c of b.chapters) { const s = c.sections.find((x) => x.id === id); if (s) return s.title; } return ""; };
  const bookOf = (id) => COURSE.books.find((b) => b.id === id);
  const courseChapter = (id) => { for (const b of COURSE.books) for (const c of b.chapters) if (c.id === id) return c; return null; };
  const courseSection = (id) => { for (const b of COURSE.books) for (const c of b.chapters) { const s = c.sections.find((x) => x.id === id); if (s) return s; } return null; };
  // 设计稿元信息索引：按“规范化小节名”匹配，给完整目录补 难度/课时/目标/核心概念/公式
  const _pepByTitle = {};
  (PEP || []).forEach((b) => b.chapters.forEach((c) => c.sections.forEach((s) => { const k = norm(s.title); if (k) _pepByTitle[k] = s; })));
  function pepMeta(title) { return _pepByTitle[norm(title)] || null; }
  function enrichSection(sec) { const m = pepMeta(sec && sec.title); return { sec: sec, diff: (m && m.difficulty) || "", hours: (m && m.hours) || "", target: (m && m.target) || "", concepts: (m && m.keyConcepts) || [], formulas: (m && m.formulas) || [] }; }

  function toast(msg, bad) {
    const c = $("#toast-container"); if (!c) return;
    const t = document.createElement("div"); t.className = "toast-item";
    t.innerHTML = '<span style="font-size:16px;">' + (bad ? "⚠️" : "✅") + "</span> <span>" + String(msg).replace(/[<>&]/g, (m) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[m])) + "</span>";
    c.appendChild(t); setTimeout(() => { t.style.opacity = "0"; t.style.transform = "translateX(40px)"; t.style.transition = "all .3s ease"; setTimeout(() => t.remove(), 300); }, 3200);
  }

  // ---------- 数据映射：旧 resources.json -> 设计 store ----------
  function norm(s) { return String(s || "").replace(/第[一二三四五六七八九十]+章\s*/, "").replace(/^\s*\d+(\.\d+)*\s*/, "").replace(/\s+/g, "").toLowerCase(); }
  function categoryOf(type) { if (type === "教案") return "lesson"; if (type === "课件") return "slide"; if (type === "练习" || type === "试卷") return "exercise"; if (type === "仿真资源") return "experiment"; return "lesson"; }
  function tagOf(type) { if (type === "教案") return "名校公开课"; if (type === "课件") return "动态课件"; if (type === "练习") return "分层作业"; if (type === "试卷") return "模拟试题"; if (type === "仿真资源") return "创新实验"; return "教学资源"; }
  const BOOK_IDX = { b1: 0, b2: 1, b3: 2, b4: 3, b5: 4, b6: 5 };
  function mapResource(r) {
    const ext = (r.url || "").split(".").pop().toLowerCase();
    return Object.assign({}, r, {
      bookId: r.book || "", chapterId: r.chapter || "", sectionId: r.section || "",
      pepKind: ext, category: categoryOf(r.type), tag: tagOf(r.type),
      keypoints: (r.tags && r.tags.length) ? r.tags.slice() : [String(r.title || "").replace(/\.[a-z0-9]+$/i, "")],
      downloads: 0, author: "物理教研组",
      previewContent: "<h4>" + (r.title || "") + "</h4>" + (r.desc ? "<p>" + r.desc + "</p>" : "") + '<p class="hint">点击右下角“打开资源”查看/使用该文件。</p>'
    });
  }
  function rebuildStore() { store = resources.map(mapResource).filter(Boolean); }

  // ---------- 资源列表 ----------
  async function loadAll() {
    try {
      const res = await fetch("data/resources.json?v=" + ASSET_V, { cache: "no-store" });
      if (!res.ok) throw new Error("加载清单失败");
      resources = await res.json(); if (!Array.isArray(resources)) resources = [];
    } catch (e) { resources = []; }
    rebuildStore();
    smartDefault();
    hydrateCounts();
    render();
  }
  function hydrateCounts() {
    const secs = PEP.reduce((a, b) => a + b.chapters.reduce((x, c) => x + c.sections.length, 0), 0);
    const set = (id, v) => { const el = $(id); if (el) el.textContent = v; };
    set("#stat-sections", secs + "节"); set("#stat-files", resources.length + "份"); set("#count-materials", PEP.length + "册 / " + resources.length + "份");
  }

  function show(target) { if (previewUrls[target.id]) return Object.assign({}, target, { url: previewUrls[target.id] }); return target; }
  function setPreview(id, blob) { if (!id || !blob) return; if (previewUrls[id]) { try { URL.revokeObjectURL(previewUrls[id]); } catch (e) {} } previewUrls[id] = URL.createObjectURL(blob); }
  function openResource(r) { if (r && r.url) window.open(r.url, "_blank", "noopener"); else toast("该资源暂无可打开的地址", true); }

  // 设计稿的文件详情/预览弹窗
  let previewId = null;
  function openPreview(s) {
    if (!s) return;
    previewId = s.id;
    const sec = courseSection(s.sectionId);
    const kps = (s.keypoints || []).length ? '<div class="key-concepts-chips">' + s.keypoints.slice(0, 8).map((k) => '<span class="concept-chip">🔹 ' + htmlEscape(k) + "</span>").join("") + "</div>" : "";
    $("#previewTitle").textContent = s.title || "资源详情";
    $("#previewBody").innerHTML = '<div class="file-tags-row" style="margin-bottom:12px;"><span class="tag-pill">' + htmlEscape(s.tag || "") + "</span><span class=\"tag-pill\">" + htmlEscape(s.category === "lesson" ? "教案" : s.category === "slide" ? "课件" : s.category === "exercise" ? "练习" : "实验") + '</span></div>' +
      '<div style="font-size:12px;color:var(--text-muted);margin-bottom:12px;">' + htmlEscape((sec ? sec.code + " " + sec.title : "") + " · " + (sec ? sec.difficulty : "")) + "</div>" +
      (s.desc ? "<p>" + htmlEscape(s.desc) + "</p>" : "") + (s.previewContent && s.previewContent.indexOf("<h4>") < 0 ? "<p>" + s.previewContent + "</p>" : "") + kps;
    $("#previewMask").classList.remove("hidden");
  }
  function closePreview() { $("#previewMask").classList.add("hidden"); }

  // ---------- GitHub 发布 ----------
  const PUBLISH_OWNER = "xty1763", PUBLISH_REPO = "xgzx_physics_lib", PUBLISH_BRANCH = "main";
  function getPublishToken() { try { return localStorage.getItem(TOKEN_KEY) || ""; } catch (e) { return ""; } }
  function setPublishToken(t) { try { localStorage.setItem(TOKEN_KEY, t); } catch (e) {} }
  const getWorkerToken = () => { try { return localStorage.getItem(WORKER_TOKEN_KEY) || ""; } catch (e) { return ""; } };
  function ghHeaders(token) { return { Authorization: "Bearer " + token, "User-Agent": "physics-lib", Accept: "application/vnd.github+json" }; }
  function b64(t) { return btoa(unescape(encodeURIComponent(t))); }
  function fromB64(b) { return decodeURIComponent(escape(atob(b.replace(/\n/g, "")))); }
  function esc(s) { return String(s == null ? "" : s).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r/g, "").replace(/\n/g, "\\n"); }
  function slugPath(name, ext) {
    const fileExt = ext && /^\.[a-z0-9]+$/i.test(ext) ? ext.toLowerCase() : ".html";
    const base = String(name || "").replace(/\.[a-zA-Z0-9]+$/, "").replace(/[\\/:*?"<>|]/g, "-").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50) || "resource";
    return base + fileExt;
  }
  async function ghFetch(url, opts, timeout) { const ctrl = new AbortController(); const timer = setTimeout(() => ctrl.abort(), timeout || 30000); try { return await fetch(url, Object.assign({}, opts, { signal: ctrl.signal })); } catch (e) { if (e && e.name === "AbortError") throw new Error("连接 GitHub 超时"); throw e; } finally { clearTimeout(timer); } }
  async function ghGetContents(token, path) { const res = await ghFetch("https://api.github.com/repos/" + PUBLISH_OWNER + "/" + PUBLISH_REPO + "/contents/" + path + "?ref=" + PUBLISH_BRANCH, { headers: ghHeaders(token) }); if (!res.ok) throw new Error("读取仓库文件失败（" + res.status + "）"); const d = await res.json(); return { sha: d.sha, text: fromB64(d.content) }; }
  async function ghGetSha(token, path) { const res = await ghFetch("https://api.github.com/repos/" + PUBLISH_OWNER + "/" + PUBLISH_REPO + "/contents/" + path + "?ref=" + PUBLISH_BRANCH, { headers: ghHeaders(token) }); if (!res.ok) throw new Error("读取文件失败（" + res.status + "）"); return (await res.json()).sha; }
  async function ghPutFile(token, path, contentB64, message, sha) {
    const body = { message: message, branch: PUBLISH_BRANCH, content: contentB64 }; if (sha) body.sha = sha;
    const res = await ghFetch("https://api.github.com/repos/" + PUBLISH_OWNER + "/" + PUBLISH_REPO + "/contents/" + path, { method: "PUT", headers: Object.assign({}, ghHeaders(token), { "Content-Type": "application/json" }), body: JSON.stringify(body) });
    if (!res.ok) { let m = ""; try { m = (await res.json()).message || ""; } catch (e) {} throw new Error("写入失败（" + res.status + (m ? " " + m : "") + "）"); } return await res.json();
  }
  async function ghDeleteFile(token, path, message) { const sha = await ghGetSha(token, path); const res = await ghFetch("https://api.github.com/repos/" + PUBLISH_OWNER + "/" + PUBLISH_REPO + "/contents/" + path, { method: "DELETE", headers: Object.assign({}, ghHeaders(token), { "Content-Type": "application/json" }), body: JSON.stringify({ message: message, sha: sha, branch: PUBLISH_BRANCH }) }); if (!res.ok) throw new Error("删除文件失败（" + res.status + "）"); return await res.json(); }
  async function saveResources(token, message) {
    const newJson = JSON.stringify(resources, null, 2), repoPath = BASE_DIR + "data/resources.json";
    for (let a = 0; a < 4; a++) { try { const cur = await ghGetContents(token, repoPath); await ghPutFile(token, repoPath, b64(newJson), message, cur.sha); return; } catch (e) { if (e.message && /409|does not match/i.test(e.message)) continue; throw e; } }
    throw new Error("保存清单冲突，请稍后重试");
  }
  async function publishResource(rec) {
    const token = getPublishToken(); if (!token) throw new Error("请先填写 GitHub 访问令牌");
    const message = "新增资源：" + rec.title;
    let rel = "pages/" + slugPath(rec.title, rec.fileExt), path = BASE_DIR + rel;
    for (let dup = 0; dup < 30; dup++) { try { await ghPutFile(token, path, rec.contentB64, message); break; } catch (e) { if (/409|422|already exists|sha was not supplied|does not match/i.test(e.message) && dup < 29) { const d = rel.lastIndexOf("."), s = d > -1 ? rel.slice(0, d) : rel, de = d > -1 ? rel.slice(d) : ""; rel = s + "-" + (dup + 2) + de; path = BASE_DIR + rel; } else throw e; } }
    resources.push({ id: rec.id, title: rec.title, desc: rec.desc || "", book: rec.book || "", chapter: rec.chapter || "", section: rec.section || "", url: rel, tags: rec.tags || [], type: rec.type || "练习" });
    await saveResources(token, "登记资源：" + rec.title); if (rec._blob) setPreview(rec.id, rec._blob); return rel;
  }
  async function updateResource(rec) {
    const token = getPublishToken(); if (!token) throw new Error("请先登录管理员");
    const idx = resources.findIndex((e) => e.id === rec.id); const old = resources[idx]; if (!old) throw new Error("找不到要编辑的资源");
    let url = old.url || "";
    if (rec.contentB64) {
      let p = "pages/" + slugPath(rec.title, rec.fileExt); const taken = (pp) => resources.some((x) => x.id !== rec.id && x.url === pp);
      if (taken(p)) for (let i = 2; i < 30; i++) { const d = p.lastIndexOf("."), s = d > -1 ? p.slice(0, d) : p, de = d > -1 ? p.slice(d) : "", c = s + "-" + i + de; if (!taken(c)) { p = c; break; } }
      let sha = null; try { sha = await ghGetSha(token, BASE_DIR + p); } catch (e) { sha = null; }
      await ghPutFile(token, BASE_DIR + p, rec.contentB64, "更新资源文件：" + rec.title, sha || undefined); url = p;
      if (rec._blob) setPreview(rec.id, rec._blob);
      if (old.url && old.url !== p && old.url.indexOf("pages/") === 0) { try { await ghDeleteFile(token, BASE_DIR + old.url, "移除旧文件：" + rec.title); } catch (e) {} }
    }
    resources[idx] = { id: old.id, title: rec.title, desc: rec.desc || "", book: rec.book || "", chapter: rec.chapter || "", section: rec.section || "", url: url, tags: rec.tags || [], type: rec.type || "练习" };
    await saveResources(token, "编辑资源：" + rec.title); rebuildStore(); hydrateCounts(); render();
  }
  async function deleteResource(res) {
    const token = getPublishToken(); if (!token) throw new Error("请先登录管理员");
    if (res.url && res.url.indexOf("pages/") === 0) { try { await ghDeleteFile(token, BASE_DIR + res.url, "删除资源：" + res.title); } catch (e) { if (!/404|422|失败/.test(e.message)) throw e; } }
    if (previewUrls[res.id]) { try { URL.revokeObjectURL(previewUrls[res.id]); } catch (e) {} delete previewUrls[res.id]; }
    resources = resources.filter((e) => e.id !== res.id); await saveResources(token, "删除资源：" + res.title); rebuildStore(); hydrateCounts(); render();
  }
  async function handleDelete(r) { if (!window.confirm("确定要删除资源「" + r.title + "」吗？")) return; try { if (getPublishToken()) await deleteResource(r); else throw new Error("请先登录（管理员）"); toast("已删除"); } catch (e) { toast("删除失败：" + e.message, true); } }

  // ---------- 上传弹窗 ----------
  function isPaperType() { return $("#fType").value === "试卷"; }
  function populateTypeSelect() { const sel = $("#fType"); sel.innerHTML = ""; COURSE.resourceTypes.forEach((t) => { const o = document.createElement("option"); o.value = t; o.textContent = t; sel.appendChild(o); }); refreshTypeUI(); }
  function refreshTypeUI() { const p = isPaperType(); $("#typeHint").style.display = p ? "block" : "none"; $("#fSection").disabled = p; }
  function populateBookSelect() { const sel = $("#fBook"); sel.innerHTML = '<option value="">暂不分教材</option>'; COURSE.books.forEach((b) => { const o = document.createElement("option"); o.value = b.id; o.textContent = b.title; sel.appendChild(o); }); }
  function populateChapterSelect() { const sel = $("#fChapter"); sel.innerHTML = '<option value="">暂不选章</option>'; (bookOf($("#fBook").value) || {}).chapters.forEach((c) => { const o = document.createElement("option"); o.value = c.id; o.textContent = c.title; sel.appendChild(o); }); populateSectionSelect(); }
  function populateSectionSelect() { const sel = $("#fSection"); sel.innerHTML = '<option value="">未指定小节</option>'; if (isPaperType()) { sel.disabled = true; return; } const ch = (bookOf($("#fBook").value) || { chapters: [] }).chapters.find((c) => c.id === $("#fChapter").value); if (ch) ch.sections.forEach((s) => { const o = document.createElement("option"); o.value = s.id; o.textContent = s.title; sel.appendChild(o); }); }
  function refreshAdminUI() { const owner = !!getPublishToken(); const has = owner || !!getWorkerToken(); const u = $("#quick-add-btn"); if (u) u.style.display = has ? "" : "none"; const row = $("#adminLoggedInRow"); if (row) row.style.display = owner ? "block" : "none"; }
  function openModal(res, presetBook, presetChapter, presetSection) {
    editingId = res ? res.id : null; populateTypeSelect(); populateBookSelect();
    if (res) { $("#fTitle").value = res.title || ""; $("#fDesc").value = res.desc || ""; $("#fTags").value = (res.tags || []).join(" "); if (res.type) $("#fType").value = res.type; refreshTypeUI(); if (res.book) $("#fBook").value = res.book; populateChapterSelect(); if (res.chapter) $("#fChapter").value = res.chapter; populateSectionSelect(); if (res.section) $("#fSection").value = res.section; $("#modalTitle").textContent = "编辑资源"; $("#saveResource").textContent = "保存修改"; }
    else { $("#fTitle").value = ""; $("#fDesc").value = ""; $("#fTags").value = ""; refreshTypeUI(); populateChapterSelect(); if (presetBook) { $("#fBook").value = presetBook; populateChapterSelect(); } if (presetChapter) { $("#fChapter").value = presetChapter; populateSectionSelect(); } if (presetSection) $("#fSection").value = presetSection; $("#modalTitle").textContent = "上传资源"; $("#saveResource").textContent = "保存资源"; }
    clearPendingFile(); $("#modalMask").classList.remove("hidden"); setTimeout(() => $("#fTitle").focus(), 50);
  }
  function closeModal() { $("#modalMask").classList.add("hidden"); }
  const FILE_RE = /\.(html?|htm|pdf|docx?|pptx?|xlsx?|txt|md|png|jpe?g|webp|gif|mp4|zip)$/i;
  function setPendingFile(file) {
    if (!file) return clearPendingFile(); if (!FILE_RE.test(file.name)) { toast("不支持的文件类型", true); return; }
    pendingFile = file; $("#fileName").textContent = file.name + "（" + (file.size / 1024).toFixed(1) + " KB）"; $("#filePill").style.display = "flex";
    if (!$("#fTitle").value) $("#fTitle").value = file.name.replace(/\.[^.]+$/, ""); smartFill(false);
  }
  function clearPendingFile() { pendingFile = null; $("#fileInput").value = ""; $("#filePill").style.display = "none"; $("#fileName").textContent = ""; }
  function readFileAsBase64(file) { return new Promise((resolve, reject) => { const fr = new FileReader(); fr.onload = () => { const u = String(fr.result || ""), c = u.indexOf(","); resolve(c > -1 ? u.slice(c + 1) : u); }; fr.onerror = () => reject(fr.error); fr.readAsDataURL(file); }); }
  async function saveResource() {
    const btn = $("#saveResource"); if (saving) return;
    const title = $("#fTitle").value.trim(); if (!title) { toast("请填写资源名称", true); return; }
    const editing = !!editingId, isPaper = isPaperType();
    const em = pendingFile && /\.[^.]*$/.exec(pendingFile.name); const fileExt = pendingFile ? (em ? em[0].toLowerCase() : ".html") : undefined;
    const rec = { id: editingId || ("r" + Date.now() + Math.random().toString(36).slice(2, 7)), title, book: $("#fBook").value, chapter: $("#fChapter").value, section: isPaper ? "" : $("#fSection").value, desc: $("#fDesc").value.trim(), tags: $("#fTags").value.split(/[,，\s]+/).map((s) => s.trim()).filter(Boolean), type: isPaper ? "试卷" : $("#fType").value, fileExt, contentB64: null, _blob: pendingFile };
    const isWorker = !!getWorkerToken() && !getPublishToken();
    if (!isWorker && !getPublishToken()) { toast("请先登录（管理员）", true); openAdminModal(); return; }
    saving = true; btn.disabled = true; const og = editing ? "保存修改" : "保存资源"; btn.textContent = "上传中…"; toast("正在保存，请稍候…");
    try {
      if (pendingFile) { if (pendingFile.size > 50 * 1024 * 1024) throw new Error("文件过大（超过50MB）"); const b = await readFileAsBase64(pendingFile).catch(() => null); if (!b) { toast("读取文件失败", true); return; } rec.contentB64 = b; }
      if (editing) { await updateResource(rec); closeModal(); toast("已保存修改"); return; }
      if (!pendingFile) { toast("请先选择一个文件", true); return; }
      await publishResource(rec); rebuildStore(); hydrateCounts(); render(); closeModal(); toast("已发布：卡片已出现，约1分钟后其它访客也能看到");
    } catch (e) { toast((editing ? "保存失败：" : "发布失败：") + (e && e.message), true); }
    finally { saving = false; btn.disabled = false; btn.textContent = og; }
  }

  // ---------- 自动识别填表 ----------
  const TEXT_EXT_RE = /^(html?|htm|md|txt)$/;
  function extOf(n) { const m = /\.([a-z0-9]+)$/i.exec(n || ""); return m ? m[1].toLowerCase() : ""; }
  function readTextSample(file) { return new Promise((resolve) => { if (!file) return resolve(""); try { const fr = new FileReader(); fr.onload = () => resolve(String(fr.result || "")); fr.onerror = () => resolve(""); fr.readAsText(file.slice(0, 102400)); } catch (e) { resolve(""); } }); }
  async function smartFill(force) {
    const title = $("#fTitle").value.trim() || (pendingFile ? pendingFile.name : ""); if (!title) return;
    const ext = pendingFile ? extOf(pendingFile.name) : ""; let content = ""; if (pendingFile && TEXT_EXT_RE.test(ext)) content = await readTextSample(pendingFile);
    const searchStr = (title + " " + content).trim(); const type = detectType(title, ext, content); let bookId = detectBook(searchStr); const loc = detectLoc(title, content, bookId);
    if (force || !$("#fType").value) { if (type) { $("#fType").value = type; refreshTypeUI(); } }
    if (loc && loc.chapter && !bookId) bookId = loc && bookOfChapter(loc.chapter);
    if ((force || !$("#fBook").value) && bookId) $("#fBook").value = bookId; populateChapterSelect();
    if ((force || !$("#fChapter").value) && loc && loc.chapter) $("#fChapter").value = loc.chapter; populateSectionSelect();
    if (force && loc && loc.section) $("#fSection").value = loc.section;
    const topic = removeNoise(title); const secName = loc && loc.section ? sectionTitle(loc.section).replace(/^\s*\d+(\.\d+)*\s*/, "") : (loc && loc.chapter ? chapterTitle(loc.chapter).replace(/^第[一二三四五六七八九十]+章\s*/, "") : "");
    const existing = $("#fTags").value.split(/[,，\s]+/).filter(Boolean); const tags = []; if (topic) tags.push(topic); if (secName) tags.push(secName); if (type) tags.push(type);
    $("#fTags").value = tags.concat(existing.filter((t) => tags.indexOf(t) < 0)).join(" "); toast("已自动识别并预填（可再修改）");
  }
  const BOOK_ALIASES = [{ id: "b1", names: ["必修第一册", "必修一", "必修1", "高一上"] }, { id: "b2", names: ["必修第二册", "必修二", "必修2", "高一下"] }, { id: "b3", names: ["必修第三册", "必修三", "必修3", "高二上"] }, { id: "b4", names: ["选择性必修第一册", "选择性必修一", "选必一", "选必1", "选修一"] }, { id: "b5", names: ["选择性必修第二册", "选择性必修二", "选必二", "选必2", "选修二"] }, { id: "b6", names: ["选择性必修第三册", "选择性必修三", "选必三", "选必3", "选修三"] }];
  function detectBook(s) { let best = null, bl = 0; for (const b of BOOK_ALIASES) for (const n of b.names) if (s.indexOf(n) > -1 && n.length > bl) { best = b.id; bl = n.length; } return best; }
  const allChapters = () => { const a = []; for (const b of COURSE.books) for (const c of b.chapters) a.push(c); return a; };
  const bookOfChapter = (chapterId) => { for (const b of COURSE.books) for (const c of b.chapters) if (c.id === chapterId) return b.id; return null; };
  const chapterOf = (id) => allChapters().find((c) => c.id === id);
  function detectType(s, ext, content) { const t = String(s || "").trim(), c = String(content || "").slice(0, 3000); const hasT = (re) => re.test(t), hasC = (re) => re.test(c); if (hasT(/教案|教学设计|导学案/)) return "教案"; if (hasT(/试卷|试题|卷子|考试|月考|期中|期末|测验/)) return "试卷"; if (hasT(/练习|习题|作业|题目|同步|巩固/)) return "练习"; if (hasT(/课件|幻灯片|演示文稿|\bppt\b/i)) return "课件"; if (hasT(/仿真|模拟|动画|交互|演示/)) return "仿真资源"; if (/^(html?|htm)$/.test(ext)) return "仿真资源"; if (/^(pptx?|ppt)$/.test(ext)) return "课件"; if (hasC(/教案|教学设计|导学案/)) return "教案"; if (hasC(/试卷|试题|考试|测验/)) return "试卷"; if (hasC(/练习|习题|作业|题目/)) return "练习"; if (hasC(/课件|幻灯片|演示文稿/)) return "课件"; if (hasC(/仿真|模拟|动画|交互|演示|canvas/i)) return "仿真资源"; return null; }
  const NOISE = /练习|习题|作业|题目|试卷|试题|考试|测验|课件|幻灯片|演示文稿|教案|教学设计|导学案|仿真|模拟|动画|交互|演示|\bppt\b/gi;
  function removeNoise(s) { let t = String(s).replace(/第[一二三四五六七八九十]+\d*章/g, " "); for (const b of BOOK_ALIASES) for (const n of b.names) t = t.replace(new RegExp(n, "g"), " "); t = t.replace(NOISE, " "); t = t.replace(/[，。、,.\s]+/g, " ").trim(); return t; }
  function cleanChapter(c) { return c.replace(/^第[一二三四五六七八九十]+章\s*/, ""); }
  function cleanSection(s) { return s.replace(/^\s*\d+(\.\d+)*\s*/, ""); }
  const CN = { "一": 1, "二": 2, "三": 3, "四": 4, "五": 5, "六": 6, "七": 7, "八": 8, "九": 9, "十": 10, "十一": 11, "十二": 12, "十三": 13 };
  function cnNum(w) { if (CN[w] != null) return CN[w]; if (w.charAt(0) === "十") return 10 + (CN[w.slice(1)] || 0); return null; }
  function parseChapterNum(s) { const m = s.match(/第([一二三四五六七八九十]+|\d{1,2})章/); if (!m) return null; const w = m[1]; return /^\d+$/.test(w) ? parseInt(w, 10) : cnNum(w); }
  function detectLoc(s, content, bookId) { const books = COURSE.books.filter((b) => !bookId || b.id === bookId); const hay = (s || "") + " " + (content || ""); const wantNum = parseChapterNum(hay), topic = removeNoise(s || ""); let chapter = null, section = null; if (wantNum) { outer: for (const b of books) for (const c of b.chapters) if (parseChapterNum(c.title) === wantNum) { chapter = c.id; break outer; } } if (!chapter && topic.length >= 2) { outer: for (const b of books) for (const c of b.chapters) { const sig = cleanChapter(c.title) + " " + c.sections.map((sec) => cleanSection(sec.title)).join(" "); if (sig.indexOf(topic) > -1) { chapter = c.id; break outer; } } } if (!chapter) { let best = null, bl = 0; for (const b of books) for (const c of b.chapters) { const ct = cleanChapter(c.title); if (ct && ct.length > bl && hay.indexOf(ct) > -1) { best = c.id; bl = ct.length; } } chapter = best; } if (!chapter) { let bc = null, bs = null, bl = 0; for (const b of books) for (const c of b.chapters) for (const sec of c.sections) { const st = cleanSection(sec.title); if (st && st.length > bl && hay.indexOf(st) > -1) { bc = c.id; bs = sec.id; bl = st.length; } } chapter = bc; section = bs; } if (chapter && !section) { const ch = chapterOf(chapter); if (ch) { let best = null, bl = 0; for (const sec of ch.sections) { const st = cleanSection(sec.title); if (st && st.length > bl && hay.indexOf(st) > -1) { best = sec.id; bl = st.length; } } section = best; } } return { chapter: chapter, section: section }; }

  // ---------- 资源助手 ----------
  function searchAssistant(s) { const bookId = detectBook(s), type = detectType(s), loc = detectLoc(s, "", bookId), topic = removeNoise(s); let pool = resources.slice(); if (bookId) pool = pool.filter((r) => r.book === bookId); if (type) pool = pool.filter((r) => r.type === type); if (loc && loc.chapter) pool = pool.filter((r) => r.chapter === loc.chapter); if (topic.length >= 2) { const lt = topic.toLowerCase(); pool = pool.filter((r) => [r.title, r.desc, (r.tags || []).join(" "), bookTitle(r.book), chapterTitle(r.chapter), sectionTitle(r.section)].join(" ").toLowerCase().indexOf(lt) > -1); } return { pool: pool, book: bookId, type: type, loc: loc, keywords: topic }; }
  function htmlEscape(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function resLabel(r) { const p = []; if (bookTitle(r.book)) p.push(bookTitle(r.book)); if (chapterTitle(r.chapter)) p.push(chapterTitle(r.chapter)); if (r.section && sectionTitle(r.section)) p.push(sectionTitle(r.section)); return p.join(" · "); }
  function assistantReply(q) { const res = searchAssistant(q), list = res.pool; const filter = { book: res.book, chapter: res.loc && res.loc.chapter, section: res.loc && res.loc.section, type: res.type }; if (list.length === 0) { if (res.loc && res.loc.chapter) return { text: "这个范围（" + (res.loc.section ? sectionTitle(res.loc.section) : chapterTitle(res.loc.chapter)) + "）暂时还没有已上传的资源。换个关键词或去对应章节看看。", resources: [], filter: filter }; return { text: "没找到相关资源。试试这样问：\n• 必修一 第二章 自由落体 课件\n• 仿真资源\n• 小船过河 ", resources: [], filter: filter }; } let text = "为你找到 " + list.length + " 个相关资源："; if (res.loc && res.loc.chapter) text += "（已定位到 " + (res.loc.section ? sectionTitle(res.loc.section) : chapterTitle(res.loc.chapter)) + "）"; return { text: text, resources: list, filter: filter }; }
  function addMsg(html, who) { const body = $("#assistMessages"); const el = document.createElement("div"); el.className = "assist-msg " + who; el.innerHTML = html; body.appendChild(el); body.scrollTop = body.scrollHeight; }

  // ---------- 大模型（AI 可选） ----------
  const AI_DEFAULT_ENDPOINT = "https://open.bigmodel.cn/api/paas/v4/chat/completions", AI_DEFAULT_MODEL = "glm-4-flash";
  let aiConf = { endpoint: AI_DEFAULT_ENDPOINT, model: AI_DEFAULT_MODEL, key: "" };
  function getAiConf() { try { const s = localStorage.getItem("ai_conf"); if (s) aiConf = Object.assign({ endpoint: AI_DEFAULT_ENDPOINT, model: AI_DEFAULT_MODEL, key: "" }, JSON.parse(s)); } catch (e) {} return aiConf; }
  function setAiConf(c) { aiConf = Object.assign({}, getAiConf(), c); try { localStorage.setItem("ai_conf", JSON.stringify(aiConf)); } catch (e) {} }
  async function llmChat(system, user, opts) { const conf = getAiConf(); if (!conf.endpoint || !conf.key) return null; const ctrl = new AbortController(); const timer = setTimeout(() => ctrl.abort(), (opts && opts.timeout) || 9000); try { const headers = { "Content-Type": "application/json", Accept: "application/json" }; if (conf.key) headers.Authorization = "Bearer " + conf.key; const body = { model: conf.model || AI_DEFAULT_MODEL, messages: [{ role: "system", content: system }, { role: "user", content: user }], temperature: (opts && opts.temperature != null) ? opts.temperature : 0.3, max_tokens: (opts && opts.maxTokens) || 200, stream: false }; const res = await fetch(conf.endpoint, { method: "POST", headers: headers, body: JSON.stringify(body), signal: ctrl.signal }); if (!res.ok) throw new Error("AI " + res.status); const data = await res.json(); return (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || ""; } catch (e) { return null; } finally { clearTimeout(timer); } }
  function parseJsonLoose(t) { if (!t) return null; const m = String(t).match(/\{[\s\S]*\}/); if (!m) return null; try { return JSON.parse(m[0]); } catch (e) { try { return JSON.parse(m[0].replace(/'/g, '"').replace(/，/g, ",")); } catch (e2) { return null; } } }
  async function aiPickTitles(q) { if (!resources.length) return null; const idx = resources.map((r) => { const loc = [bookTitle(r.book), chapterTitle(r.chapter), sectionTitle(r.section)].filter(Boolean).join(" · "); return (r.title || "") + "┃" + loc + "┃" + (r.type || "") + "┃" + (r.desc || ""); }).join("\n"); const system = "你是高中物理教学资源库的检索助手。下面是资源清单，每行：标题┃所属教材/章节┃类型┃简介。\n请根据查询选出最相关的资源标题。只返回 JSON：{\"titles\":[\"标题1\"]}，最多5个；都不相关则 {\"titles\":[]}。只输出JSON。\n\n资源清单：\n" + idx; const resp = await llmChat(system, "查询：" + q, { maxTokens: 300, temperature: 0.2, timeout: 6000 }); const o = parseJsonLoose(resp); if (o && Array.isArray(o.titles)) return o.titles.map((x) => String(x).trim()).filter(Boolean); return null; }
  async function aiAssistantReply(q) { const picked = await aiPickTitles(q); let list = []; if (picked && picked.length) { for (const t of picked) { if (!t) continue; const r = resources.find((x) => x.title === t) || resources.find((x) => x.title.indexOf(t) > -1 || (t.length > 1 && t.indexOf(x.title) > -1)); if (r && !list.some((x) => x.id === r.id)) list.push(r); } } if (!list.length) return assistantReply(q); let filter = null; const chs = [...new Set(list.map((r) => r.chapter).filter(Boolean))]; if (chs.length === 1) { const f = list.find((r) => r.chapter === chs[0]); filter = { book: (f && f.book) || null, chapter: chs[0], section: null, type: "all" }; } return { text: "为你找到 " + list.length + " 个相关资源：", resources: list, filter: filter }; }
  function fallbackDesc(title, chapterId, sectionId, type) { const cleanTitle = String(title || "").replace(/\.[a-z0-9]+$/i, ""); const seg = []; const bid = bookOfChapter(chapterId); if (bid) seg.push(bookTitle(bid)); if (chapterId) seg.push(chapterTitle(chapterId)); if (sectionId) seg.push(sectionTitle(sectionId)); const loc = seg.filter(Boolean).map((s) => s.replace(/^第[一二三四五六七八九十]+章\s*/, "").replace(/^\s*\d+(\.\d+)*\s*/, "")).join(" · "); return cleanTitle + (loc ? "（" + loc + "）" : "") + " · " + (type || "教学资源"); }
  async function aiDescribe(title, chapterId, sectionId, type, contentSample) { const sys = "你是高中物理教学资源库的编辑。请为下面的资源写一句简介，35字以内，只输出简介正文，不要引号、不要“简介：”前缀、不要列表。"; let info = "资源名称：" + title; if (chapterId) info += "\n所属：" + chapterTitle(chapterId) + (sectionId ? " / " + sectionTitle(sectionId) : ""); if (type) info += "\n类型：" + type; if (contentSample) info += "\n文件内容（片段）：" + String(contentSample).slice(0, 300); const resp = await llmChat(sys, info, { maxTokens: 80, temperature: 0.6 }); if (resp) { let d = String(resp).trim().replace(/^("*|“|「|『|\s*简介[:：]?\s*)/, "").replace(/("*|”|」|』)$/, "").trim(); if (d) return { text: d.slice(0, 60), ai: true }; } return { text: fallbackDesc(title, chapterId, sectionId, type), ai: false }; }
  async function aiGenerateDesc() { const title = $("#fTitle").value.trim(); if (!title) { toast("请先填写资源名称", true); return; } const btn = $("#aiDescBtn"); btn.disabled = true; btn.textContent = "生成中…"; try { let sample = ""; if (pendingFile && TEXT_EXT_RE.test(extOf(pendingFile.name))) sample = await readTextSample(pendingFile); const res = await aiDescribe(title, $("#fChapter").value, $("#fSection").value, $("#fType").value, sample); $("#fDesc").value = res.text; toast(res.ai ? "已生成智能简介（可再修改）" : "已生成简介（本地规则；AI 接口暂不可用，可在管理员登录里配置）"); } catch (e) { $("#fDesc").value = fallbackDesc(title, $("#fChapter").value, $("#fSection").value, $("#fType").value); toast("已生成简介（AI 异常已用本地规则）"); } finally { btn.disabled = false; btn.textContent = "✨ 智能简介"; } }
  async function assistantSend() { const input = $("#assistInput"), q = input.value.trim(); if (!q) return; input.value = ""; addMsg(htmlEscape(q), "user"); const sb = $("#assistSend"); sb.disabled = true; sb.textContent = "思考中…"; const th = document.createElement("div"); th.className = "assist-msg bot"; th.textContent = "🤖 正在思考…"; $("#assistMessages").appendChild(th); $("#assistMessages").scrollTop = $("#assistMessages").scrollHeight; let reply; try { reply = await aiAssistantReply(q); } catch (e) { reply = assistantReply(q); } if (th.parentNode) th.parentNode.removeChild(th); sb.disabled = false; sb.textContent = "发送"; const hit = reply.resources.length ? "<ul>" + reply.resources.map((r) => "<li><span class='assist-hit' data-id='" + r.id + "'>" + htmlEscape(r.title) + "</span> <small>" + htmlEscape(resLabel(r)) + "</small></li>").join("") + "</ul>" : ""; const fb = reply.filter && reply.resources.length ? "<div class='assist-btnrow'><button class='btn btn-secondary btn-sm' data-applyfilter='1'>筛选到右侧</button></div>" : ""; addMsg(reply.text.replace(/\n/g, "<br/>") + hit + fb, "bot"); $$("#assistMessages .assist-hit").forEach((el) => { el.onclick = () => { const r = resources.find((x) => x.id === el.getAttribute("data-id")); if (r) openResource(r); }; }); $$("#assistMessages [data-applyfilter]").forEach((b) => { b.onclick = () => { const f = reply.filter; state.bookId = BOOK_IDX[f.book] != null ? PEP[BOOK_IDX[f.book]].id : null; state.chapterId = f.chapter ? mapChId(f.chapter) : null; state.sectionId = null; state.cat = "all"; render(); closeAssist(); }; }); }
  function mapChId(oldChapter) { for (const b of PEP) for (const c of b.chapters) { if (norm(c.title) === norm(chapterTitle(oldChapter))) return c.id; } return null; }
  function openAssist() { $("#assistPanel").hidden = false; if ($("#assistMessages").childElementCount === 0) addMsg("你好！我是资源助手。告诉我你想找的教材/章节/类型或关键词。", "bot"); setTimeout(() => $("#assistInput").focus(), 50); }
  function closeAssist() { $("#assistPanel").hidden = true; }

  // ---------- 管理员 / AI 登录 ----------
  function openAdminModal() { $("#adminToken").value = getPublishToken(); const ai = getAiConf(); if ($("#aiEndpoint")) $("#aiEndpoint").value = ai.endpoint || ""; if ($("#aiModel")) $("#aiModel").value = ai.model || ""; if ($("#aiKey")) $("#aiKey").value = ai.key || ""; refreshAdminUI(); $("#adminMask").classList.remove("hidden"); setTimeout(() => $("#adminToken").focus(), 50); }
  function closeAdminModal() { $("#adminMask").classList.add("hidden"); }
  function saveAdmin() { const t = $("#adminToken").value.trim(); if (!t) { toast("请输入 GitHub 访问令牌", true); return; } setPublishToken(t); setAiConf({ endpoint: $("#aiEndpoint") ? $("#aiEndpoint").value.trim() : aiConf.endpoint, model: $("#aiModel") ? $("#aiModel").value.trim() : aiConf.model, key: $("#aiKey") ? $("#aiKey").value.trim() : aiConf.key }); closeAdminModal(); refreshAdminUI(); hydrateCounts(); render(); toast("已登录，上传与编辑入口已开启"); }
  function clearToken() { if (!window.confirm("确定要清除本机保存的管理员令牌吗？")) return; try { localStorage.removeItem(TOKEN_KEY); } catch (e) {} closeAdminModal(); refreshAdminUI(); hydrateCounts(); render(); toast("已退出，上传入口已隐藏"); }

  // ---------- 渲染 ----------
  const MODULE_INFO = { materials: { name: "1. 教学材料上传", sub: "人教版各章节 · 小节文件浏览目录" }, plans: { name: "2. 教学计划安排", sub: "教学进度 / 大单元排课" }, goals: { name: "3. 教学目标评估", sub: "核心素养评价量规" }, analytics: { name: "4. 班级成绩分析", sub: "阶段考试统计" }, students: { name: "5. 学生重点跟进", sub: "拔尖培优" }, innovation: { name: "6. 创新思路记录", sub: "自制教具 / STEAM" }, gaokao: { name: "7. 高考题目分析", sub: "真题微专题" } };
  let stateSubtab = "";
  let previewIsModule = false;
  function render() {
    const info = MODULE_INFO[currentModule] || MODULE_INFO.materials; $("#header-module-name").textContent = info.name;
    if (currentModule === "materials") { $("#header-sub-name").textContent = info.sub; $("#subtabs-bar").style.display = "none"; renderMaterials(); }
    else { $("#header-sub-name").textContent = info.sub; renderModule(currentModule, info); }
    $$("#main-nav-menu .nav-item").forEach((b) => b.classList.toggle("active", b.getAttribute("data-module") === currentModule));
  }
  // 按设计稿渲染 2~7 模块：头部横幅 + 副标签页 + 示例文件卡片 + 图表框
  function renderModule(id, info) {
    const WB = window.WORKBENCH_DATA || {}; const mod = WB[id];
    if (!mod || !mod.subtabs || !mod.subtabs.length) { renderPlaceholder(id, info); return; }
    const stabs = mod.subtabs;
    if (!stateSubtab || !stabs.some((s) => s.id === stateSubtab)) stateSubtab = stabs[0].id;
    $("#subtabs-bar").style.display = "flex";
    $("#subtabs-container").innerHTML = stabs.map((s) => '<button class="subtab-btn' + (s.id === stateSubtab ? " active" : "") + '" data-subtab-id="' + s.id + '">' + s.name + "</button>").join("");
    $("#subtabs-actions").innerHTML = '<button class="btn btn-secondary btn-sm">示例数据</button>';
    const active = stabs.find((s) => s.id === stateSubtab) || stabs[0];
    const hero = '<div class="module-hero-banner"><div class="banner-text"><h2><span>' + (mod.icon || "") + " " + mod.name.replace(/^\d+\.\s*/, "") + '</span><span class="ph-badge" style="margin-left:10px;">示例占位数据</span></h2><p>' + (mod.desc || "") + "</p></div></div>";
    const chartHtml = active.hasChart ? '<div class="chart-container-box"><div class="chart-header-row"><h4><span>📊</span> 数据看板</h4><span style="font-size:11px;color:var(--text-dim);">示例（无真实数据）</span></div><div class="chart-canvas-wrap"><div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:var(--text-dim);font-size:13px;text-align:center;">📈 示例图表占位<br/><span style="font-size:11px;">（接入真实分析模块后自动生成）</span></div></div></div>' : "";
    const cards = (active.sampleFiles || []).map((f) => moduleCard(f)).join("");
    const files = cards ? '<div class="pep-files-grid">' + cards + "</div>" : '<div class="module-placeholder"><div class="ph-icon">🗂️</div><h3>暂无示例文件</h3></div>';
    $("#content-viewport").innerHTML = hero + '<div class="pep-module-wrap"><div class="pep-toolbar"><div class="tree-filter-pills"><button class="tree-filter-pill active">' + active.name + '</button></div><span style="font-size:12px;color:var(--text-dim);">' + (active.subtitle || "") + "</span></div>" + chartHtml + files + "</div>";
  }
  function moduleCard(f) {
    const icon = iconBadge(f.type);
    const kp = (f.keypoints || []).slice(0, 3).map((k) => '<span class="tag-pill">' + htmlEscape(k) + "</span>").join("");
    return '<article class="pep-file-card" data-modfile="' + f.id + '"><div class="card-top-row">' + icon + '<div class="file-title-wrap"><div class="file-item-name">' + htmlEscape(f.name) + '</div><span class="file-section-badge">' + htmlEscape(f.tag || "") + '</span>' + (kp ? '<div class="file-tags-row">' + kp + "</div>" : "") + '</div></div><div class="file-card-footer"><span class="section-badge">' + htmlEscape((f.author || "") + " · " + (f.date || "")) + '</span><div class="file-actions-row"><button class="btn btn-primary btn-xs" data-modfile-open="' + f.id + '">👁 预览</button></div></div></article>';
  }
  function openModuleFile(fid) {
    const mod = (window.WORKBENCH_DATA || {})[currentModule]; if (!mod) return;
    for (const st of mod.subtabs) for (const f of (st.sampleFiles || [])) if (f.id === fid) { previewModuleFile(f); return; }
  }
  function previewModuleFile(f) {
    previewIsModule = true;
    $("#previewTitle").textContent = f.name || "文件预览";
    $("#previewBody").innerHTML = (f.previewContent || "") + '<div class="file-tags-row" style="margin-top:12px;">' + (f.tag ? '<span class="tag-pill">' + htmlEscape(f.tag) + "</span>" : "") + (f.author ? '<span class="tag-pill">' + htmlEscape(f.author) + "</span>" : "") + (f.size ? '<span class="tag-pill">' + htmlEscape(f.size) + "</span>" : "") + (f.downloads != null ? '<span class="tag-pill">↓ ' + f.downloads + "</span>" : "") + "</div>";
    $("#previewMask").classList.remove("hidden");
  }
  function renderPlaceholder(id, info) { $("#content-viewport").innerHTML = '<div class="module-placeholder"><div class="ph-icon">🚧</div><h3>' + info.name.replace(/^\d+\.\s*/, "") + '</h3><p>该模块正在建设中。</p><span class="ph-badge">敬请期待</span></div>'; }
  function openPreviewSet(s, isModule) { previewIsModule = !!isModule; openPreview(s); }

  function smartDefault() {
    if (!state.bookId || !resources.some((r) => r.book === state.bookId)) { const b = COURSE.books.find((x) => resources.some((r) => r.book === x.id)) || COURSE.books[0]; state.bookId = b ? b.id : COURSE.books[0].id; }
    const book = bookOf(state.bookId) || COURSE.books[0];
    if (!state.chapterId || !resources.some((r) => r.chapter === state.chapterId)) { const ch = book.chapters.find((c) => resources.some((r) => r.chapter === c.id)) || book.chapters[0]; state.chapterId = ch ? ch.id : book.chapters[0].id; state.sectionId = null; }
    if (state.chapterId) treeExpanded.add(state.chapterId);
  }

  function bookCount(bookId) { return store.filter((s) => s.bookId === bookId).length; }
  function chCount(chId) { return store.filter((s) => s.chapterId === chId).length; }
  function secCount(chId, secId) { return store.filter((s) => s.chapterId === chId && s.sectionId === secId).length; }

  function visibleStore() {
    let list = store.slice();
    if (state.chapterId) list = list.filter((s) => s.chapterId === state.chapterId);
    if (state.sectionId) list = list.filter((s) => s.sectionId === state.sectionId);
    if (state.cat !== "all") list = list.filter((s) => s.category === state.cat);
    if (state.search.trim()) { const q = state.search.trim().toLowerCase(); list = list.filter((s) => [s.title, s.desc, (s.tags || []).join(" "), s.tag].filter(Boolean).join(" ").toLowerCase().indexOf(q) > -1); }
    return list;
  }

  function iconBadge(ext) { let cls = "icon-doc", label = "DOC"; if (/pptx?/.test(ext)) { cls = "icon-ppt"; label = "PPT"; } else if (/pdf/.test(ext)) { cls = "icon-pdf"; label = "PDF"; } else if (/xlsx?/.test(ext)) { cls = "icon-xls"; label = "XLS"; } else if (/mp4|webm|mov/.test(ext)) { cls = "icon-mp4"; label = "MP4"; } else if (/html?/.test(ext)) { cls = "icon-doc"; label = "HTML"; } return '<div class="file-icon-badge ' + cls + '">' + label + "</div>"; }
  function difficultyClass(difficulty) { if (/实验|探究/.test(difficulty || "")) return "section-tag-exp"; return "section-tag-mini"; }

  function buildCard(s) {
    const r = show(s);
    const sec = courseSection(s.sectionId);
    let actions = "";
    if (getPublishToken()) actions = '<button class="btn btn-secondary btn-xs" data-act="edit" data-id="' + r.id + '">✏️ 编辑</button><button class="btn btn-secondary btn-xs" style="color:var(--accent-rose);" data-act="del" data-id="' + r.id + '">🗑 删除</button>';
    const kp = (s.keypoints || []).slice(0, 3).map((k) => '<span class="tag-pill">' + htmlEscape(k) + "</span>").join("");
    const diff = (pepMeta(sec && sec.title) || {}).difficulty || "";
    const catColor = { lesson: "#38bdf8", slide: "#f43f5e", exercise: "#10b981", experiment: "#8b5cf6" }[s.category] || "#38bdf8";
    const catLabel = s.category === "lesson" ? "教案" : s.category === "slide" ? "课件" : s.category === "exercise" ? "练习" : "实验";
    return '<article class="pep-file-card" data-id="' + r.id + '" style="border-left:3px solid ' + catColor + ';">' +
      '<div class="card-top-row">' + iconBadge(s.pepKind) +
      '<div class="file-title-wrap"><div class="file-item-name">' + htmlEscape(r.title || "未命名资源") + '</div><span class="file-section-badge" style="color:' + catColor + ';">' + catLabel + "</span>" + (kp ? '<div class="file-tags-row">' + kp + "</div>" : "") + "</div></div>" +
      (r.desc ? '<p style="font-size:12px;color:var(--text-muted);line-height:1.5;">' + htmlEscape(r.desc) + "</p>" : "<p></p>") +
      '<div class="file-card-footer"><span class="section-badge">' + htmlEscape(s.tag || "") + " · " + htmlEscape(diff || (sec && sec.title) || "") + '</span><div class="file-actions-row"><button class="btn btn-primary btn-xs" data-act="open" data-id="' + r.id + '">↗ 打开</button>' + actions + "</div></div>" +
      "</article>";
  }

  function renderMaterials() {
    smartDefault();
    const book = bookOf(state.bookId) || COURSE.books[0];
    const activeChapter = courseChapter(state.chapterId) || book.chapters[0];
    if (state.sectionId && !activeChapter.sections.some((s) => s.id === state.sectionId)) state.sectionId = null;
    const vis = visibleStore();

    const catLabels = { all: "全部类型", lesson: "教案", slide: "课件", exercise: "练习", experiment: "实验" };
    const catBtns = '<div class="category-filter-group">' + Object.keys(catLabels).map((k) => '<button class="cat-btn' + (state.cat === k ? " active" : "") + '" data-cat="' + k + '">' + catLabels[k] + "</button>").join("") + '</div><div class="view-mode-group"><button class="view-btn' + (state.view === "grid" ? " active" : "") + '" data-view="grid">▦ 卡片</button><button class="view-btn' + (state.view === "list" ? " active" : "") + '" data-view="list">☰ 列表</button></div>';

    const chHead = (ch) => { const code = (ch.title.match(/^第[一二三四五六七八九十]+章/) || [""])[0]; const tit = ch.title.replace(/^第[一二三四五六七八九十]+章\s*/, ""); return code ? code + " " + tit : tit; };
    const secTitle = (s) => s.title;
    const treeHtml = book.chapters.map((ch) => {
      const open = treeExpanded.has(ch.id); const selCh = ch.id === state.chapterId;
      let secs = ch.sections;
      if (state.treeSearch.trim()) { const q = state.treeSearch.trim().toLowerCase(); secs = secs.filter((s) => (s.title + " " + (enrichSection(s).concepts || []).join(" ")).toLowerCase().indexOf(q) > -1); }
      if (state.secTag === "core") secs = secs.filter((s) => /重点|核心考点|高考热点/.test(enrichSection(s).diff || ""));
      else if (state.secTag === "exp") secs = secs.filter((s) => /实验|探究/.test(enrichSection(s).diff || ""));
      else if (state.secTag === "hard") secs = secs.filter((s) => /难点|核心考点/.test(enrichSection(s).diff || ""));
      return '<div class="chapter-node ' + (open ? "expanded" : "") + (selCh ? " selected-chapter" : "") + '"><div class="chapter-head" data-chapter-id="' + ch.id + '"><span class="chapter-toggle-icon">▶</span><div class="chapter-title-wrap"><div class="chapter-code-title"><span>' + chHead(ch) + '</span></div><div class="chapter-meta"><span>' + ch.sections.length + "个小节</span><span class=\"chapter-count-tag\">" + chCount(ch.id) + "份</span></div></div></div>" +
        '<div class="section-list">' +
        '<div class="section-node' + (selCh && state.sectionId === null ? " active-section" : "") + '" data-chapter-id="' + ch.id + '" data-section-id=""><span class="section-bullet"></span><span class="section-title">📂 全章资源</span><span class="section-badge">' + chCount(ch.id) + "</span></div>" +
        secs.map((s) => { const act = selCh && state.sectionId === s.id; const d = enrichSection(s).diff; return '<div class="section-node' + (act ? " active-section" : "") + '" data-chapter-id="' + ch.id + '" data-section-id="' + s.id + '"><span class="section-bullet"></span><span class="section-title">' + secTitle(s) + '</span>' + (d ? '<span class="' + difficultyClass(d) + '">' + d + "</span>" : "") + '<span class="section-badge">' + secCount(ch.id, s.id) + "</span></div>"; }).join("") +
        "</div></div>";
    }).join("");

    const activeSec = state.sectionId ? courseSection(state.sectionId) : null;
    const enr = enrichSection(activeSec);
    const overview = '<div class="section-overview-card"><div class="section-path-nav"><div class="section-path-crumbs"><span>人教版高中物理</span><span>&gt;</span><span>' + book.title + '</span><span>&gt;</span><span>' + activeChapter.title + '</span>' + (activeSec ? '<span>&gt;</span><strong>' + activeSec.title + "</strong>" : '<span>&gt;</span><strong>(全章汇总)</strong>') + '</div></div>' +
      '<div class="section-overview-main"><div class="section-heading-block"><h2><span>' + (activeSec ? activeSec.title : activeChapter.title) + '</span><span class="section-highlight-badge">' + (enr.diff || "共" + activeChapter.sections.length + "小节") + '</span></h2><div class="section-meta-row"><div class="section-meta-item"><span>课时建议:</span><strong>' + (enr.hours || "—") + "</strong></div><div class=\"section-meta-item\"><span>所属大单元:</span><strong>" + book.title + " · " + activeChapter.title + '</strong></div><div class="section-meta-item"><span>当前范围资源:</span><strong style="color:var(--primary);">' + vis.length + " 份</strong></div></div></div></div>" +
      '<div class="section-teaching-targets"><div class="target-title"><span>🎯</span><span>小节课标要求与素养导向：</span></div><div class="target-desc">' + ((enr.target || activeChapter.desc) || "") + '</div>' + (enr.concepts.length ? '<div class="key-concepts-chips"><span style="font-size:11px;color:var(--text-dim);margin-right:4px;">核心概念:</span>' + enr.concepts.map((kc) => '<span class="concept-chip">🔹 ' + htmlEscape(kc) + "</span>").join("") + enr.formulas.map((f) => '<span class="formula-badge">📐 ' + htmlEscape(f) + "</span>").join("") + "</div>" : "") + "</div></div>";

    const uploadZone = '<div class="chapter-upload-zone" id="chapter-dropzone"><div class="upload-zone-left"><div class="upload-zone-icon"><span>📤</span></div><div class="upload-zone-text"><h4>精准上传教学材料至当前【' + (activeSec ? activeSec.title : activeChapter.title) + '】</h4><p>支持 HTML/PDF/Word/PPT/Excel/图片/视频/压缩包，保存即发布到线上并登记到资源清单。</p></div></div><div class="upload-zone-right"><button class="btn btn-primary btn-sm" id="btn-open-upload-modal"><span>+ 精准上传到本节</span></button></div></div>';

    const cardsHtml = state.view === "grid" ? '<div class="pep-files-grid">' + (vis.length ? vis.map(buildCard).join("") : emptyHtml()) + "</div>" : buildTable(vis);

    const allExpanded = book.chapters.length && book.chapters.every((c) => treeExpanded.has(c.id));
    const treeSearchEsc = (state.treeSearch || "").replace(/"/g, "&quot;");
    const bookBadge = (t) => t.replace(/必修|选择性|册/g, "").slice(0, 2);
    $("#content-viewport").innerHTML = '<div class="pep-module-wrap">' +
      '<div class="pep-book-tabs">' + COURSE.books.map((b) => '<button class="pep-book-tab' + (b.id === state.bookId ? " active" : "") + '" data-book-id="' + b.id + '"><span class="book-tab-badge">' + bookBadge(b.title) + '</span><div class="book-tab-info"><span class="book-tab-title">' + b.title + '</span><span class="book-tab-sub">' + b.chapters.reduce((x, c) => x + c.sections.length, 0) + "小节 (" + bookCount(b.id) + "份)</span></div></button>").join("") + "</div>" +
      '<div class="pep-main-layout"><div class="pep-tree-panel"><div class="tree-header"><div class="tree-title-row"><span>📂</span><h3>教材小节精准目录</h3></div><div style="display:flex;gap:4px;"><button class="btn btn-secondary btn-xs" id="btn-expand-all' + '" title="全部展开/收起">' + (allExpanded ? "收起" : "展开") + '</button></div></div>' +
      '<div class="tree-search-wrap"><span class="tree-search-icon">🔍</span><input type="text" id="tree-filter-input" placeholder="输入小节名/考点检索..." value="' + treeSearchEsc + '" /></div>' +
      '<div class="tree-filter-pills"><button class="tree-filter-pill ' + (state.secTag === "all" ? "active" : "") + '" data-sec-tag="all">全部小节</button><button class="tree-filter-pill ' + (state.secTag === "core" ? "active" : "") + '" data-sec-tag="core">重点/热点</button><button class="tree-filter-pill ' + (state.secTag === "exp" ? "active" : "") + '" data-sec-tag="exp">实验探究</button><button class="tree-filter-pill ' + (state.secTag === "hard" ? "active" : "") + '" data-sec-tag="hard">核心难点</button></div>' +
      '<div class="tree-nodes-container">' + treeHtml + "</div></div>" +
      '<div class="pep-content-panel">' + overview + uploadZone + '<div class="pep-toolbar">' + catBtns + "</div><div class=\"pep-files-container\">" + cardsHtml + "</div></div></div></div>";
  }
  function emptyHtml() { return '<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--text-dim);"><div style="font-size:40px;margin-bottom:10px;">🗂️</div><b>暂无匹配的资源</b><br/>试试调整搜索关键词或分类筛选。</div>'; }
  function buildTable(list) { if (!list.length) return emptyHtml(); const rows = list.map((s) => { const r = show(s); const sec = courseSection(s.sectionId); let a = '<button class="btn btn-primary btn-xs" data-act="open" data-id="' + r.id + '">打开</button>'; if (getPublishToken()) a += '<button class="btn btn-secondary btn-xs" data-act="edit" data-id="' + r.id + '">编辑</button><button class="btn btn-secondary btn-xs" style="color:var(--accent-rose);" data-act="del" data-id="' + r.id + '">删除</button>'; return "<tr data-id='" + r.id + "'><td>" + htmlEscape(r.title || "") + "</td><td>" + htmlEscape(s.tag || "") + "</td><td>" + htmlEscape((sec && sec.title) || "") + "</td><td class=\"td-actions\">" + a + "</td></tr>"; }).join(""); return '<table class="pep-files-table"><thead><tr><th>资源名称</th><th>标签</th><th>所属小节</th><th>操作</th></tr></thead><tbody>' + rows + "</tbody></table>"; }

  function onTreeOrCardClick(e) {
    const b = e.target.closest(".pep-book-tab"); if (b) { state.bookId = b.getAttribute("data-book-id"); state.chapterId = null; state.sectionId = null; treeExpanded.clear(); render(); return; }
    const chh = e.target.closest(".chapter-head"); if (chh) { const cid = chh.getAttribute("data-chapter-id"); if (state.chapterId !== cid) { state.chapterId = cid; state.sectionId = null; treeExpanded.add(cid); } else if (treeExpanded.has(cid)) treeExpanded.delete(cid); else treeExpanded.add(cid); render(); return; }
    const nd = e.target.closest(".section-node"); if (nd) { const tag = nd.getAttribute("data-sec-tag"); if (tag) { state.secTag = tag; render(); return; } state.chapterId = nd.getAttribute("data-chapter-id"); state.sectionId = nd.getAttribute("data-section-id") || null; render(); return; }
    const cat = e.target.closest(".cat-btn"); if (cat) { state.cat = cat.getAttribute("data-cat"); render(); return; }
    const v = e.target.closest(".view-btn"); if (v) { state.view = v.getAttribute("data-view"); render(); return; }
    const act = e.target.closest("[data-act]"); if (act) { const id = act.getAttribute("data-id"); const r = resources.find((x) => x.id === id); if (!r) return; const a = act.getAttribute("data-act"); if (a === "open") openResource(r); else if (a === "edit") openModal(r); else if (a === "del") handleDelete(r); return; }
    const card = e.target.closest(".pep-file-card");
    if (card && !e.target.closest("button")) { const s = store.find((x) => x.id === card.getAttribute("data-id")); if (s) openPreview(s); return; }
    const mf = e.target.closest("[data-modfile-open]"); if (mf) { openModuleFile(mf.getAttribute("data-modfile-open")); return; }
    if (e.target.closest("#btn-expand-all")) { toggleExpandAll(); return; }
    if (e.target.closest("#btn-open-upload-modal")) { openUploadAtCurrent(); return; }
  }

  function bindEvents() {
    $$("#main-nav-menu .nav-item").forEach((b) => { b.onclick = () => { currentModule = b.getAttribute("data-module"); render(); }; });
    let deb;
    $("#global-search").addEventListener("input", (e) => { clearTimeout(deb); deb = setTimeout(() => { state.search = e.target.value.trim(); render(); }, 150); });
    $("#content-viewport").addEventListener("click", onTreeOrCardClick);
    $("#content-viewport").addEventListener("input", (e) => { if (e.target && e.target.id === "tree-filter-input") { state.treeSearch = e.target.value.trim(); render(); } });
    $("#quick-add-btn").onclick = () => openModal(); $("#btn-notifications").onclick = openAdminModal;
    $("#closeModal").onclick = closeModal; $("#cancelModal").onclick = closeModal; let mm = $("#modalMask"); if (mm) mm.addEventListener("click", (e) => { if (e.target === mm) closeModal(); });
    $("#fType").addEventListener("change", () => { refreshTypeUI(); populateSectionSelect(); });
    $("#fBook").addEventListener("change", populateChapterSelect); $("#fChapter").addEventListener("change", populateSectionSelect);
    $("#autoFillBtn").onclick = async () => { await smartFill(true); aiGenerateDesc(); }; $("#aiDescBtn").onclick = aiGenerateDesc; $("#saveResource").onclick = saveResource;
    $("#assistFab").onclick = openAssist; $("#assistClose").onclick = closeAssist; $("#assistSend").onclick = assistantSend; $("#assistInput").addEventListener("keydown", (e) => { if (e.key === "Enter") assistantSend(); });
    $("#closePreview").onclick = closePreview; $("#previewCancel").onclick = closePreview; $("#previewOpen").onclick = () => { if (previewIsModule) { toast("示例数据，暂无实际文件可打开"); return; } const r = resources.find((x) => x.id === previewId); if (r) openResource(r); else { const s = store.find((x) => x.id === previewId); if (s) openResource(s); } }; let pv = $("#previewMask"); if (pv) pv.addEventListener("click", (e) => { if (e.target === pv) closePreview(); });
    const stc = $("#subtabs-container"); if (stc) stc.addEventListener("click", (e) => { const b = e.target.closest("[data-subtab-id]"); if (b) { stateSubtab = b.getAttribute("data-subtab-id"); render(); } });
    $("#closeAdminModal").onclick = closeAdminModal; $("#cancelAdminModal").onclick = closeAdminModal; let am = $("#adminMask"); if (am) am.addEventListener("click", (e) => { if (e.target === am) closeAdminModal(); });
    $("#adminSave").onclick = saveAdmin; $("#clearTokenBtn").onclick = clearToken; $("#adminToken").addEventListener("keydown", (e) => { if (e.key === "Enter") saveAdmin(); });
    const dz = $("#dropzone"), fi = $("#fileInput"); dz.onclick = () => fi.click(); fi.addEventListener("change", () => setPendingFile(fi.files[0]));
    ["dragenter", "dragover"].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add("drag"); }));
    ["dragleave", "drop"].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.remove("drag"); }));
    dz.addEventListener("drop", (e) => { const f = e.dataTransfer.files[0]; if (f) setPendingFile(f); }); $("#clearFile").onclick = clearPendingFile;
  }

  document.addEventListener("DOMContentLoaded", () => { const hm = /\bm=([a-z]+)/.exec((location.hash || "").replace(/^#/, "")); if (hm && MODULE_INFO[hm[1]]) currentModule = hm[1]; bindEvents(); refreshAdminUI(); render(); loadAll().catch((e) => toast("初始化失败：" + (e && e.message), true)); });
})();



