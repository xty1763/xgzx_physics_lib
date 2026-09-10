/*
 * 高中物理教学资源库 —— 前端逻辑
 * 依赖：data/course-data.js 提供 window.COURSE
 *       data/resources.json 提供资源清单（前端 fetch，前后端共用）
 */
(function () {
  "use strict";

  // ---------- 状态 ----------
  const state = {
    book: null,      // null=全部教材，或教材 id
    chapter: null,   // null 或章节 id
    section: null,   // null 或小节 id
    search: "",
    type: "all"      // "all" 或资源类型
  };

  const openBooks = new Set();       // 默认收起教材，点开后才展开，便于选择
  const openChapters = new Set();    // 展开的章节
  let baseList = [];                 // 当前展示的资源（清单 + 本地上传）
  let resources = [];                // 资源清单（来自 data/resources.json，前端与后端共用）
  let uploadedList = [];             // 本地上传（历史遗留，仅本地可见）
  const objUrlCache = {};            // id -> objectURL（只在上传资源用）
  const previewUrls = {};            // id -> objectURL（本会话刚保存的资源，可立刻打开，无需等 GitHub Pages）
  let pendingFile = null;            // 当前选中的待上传文件
  let editingId = null;              // 正在编辑的资源 id（null = 新增）
  const ASSET_V = 20;                // 资源版本号（缓存破）
  const WORKER_URL = "https://physics-lib.xingang-physics.workers.dev"; // 方案A 后端（Cloudflare Worker）
  const WORKER_TOKEN_KEY = "worker_token";
  const OWNER_TOKEN_KEY = "gh_publish_token"; // 现有的“管理员（站长）令牌”

  const $ = (sel) => document.querySelector(sel);
  const NAV_KEY = "nav_collapsed";

  // 当前有效身份：优先“授权用户”(Worker 会话)，否则“站长”(GitHub 令牌)
  function getWorkerToken() {
    try { return localStorage.getItem(WORKER_TOKEN_KEY) || ""; } catch (e) { return ""; }
  }
  function setWorkerToken(t) { try { localStorage.setItem(WORKER_TOKEN_KEY, t); } catch (e) {} }
  function clearWorkerToken() { try { localStorage.removeItem(WORKER_TOKEN_KEY); } catch (e) {} }
  const canUpload = () => !!(getWorkerToken() || getPublishToken());

  // 收起/展开左侧导航栏（记住偏好）
  function applyNavState() {
    const hidden = (function () {
      try { return localStorage.getItem(NAV_KEY) === "1"; } catch (e) { return false; }
    })();
    document.querySelector(".layout").classList.toggle("no-sidebar", hidden);
    const btn = $("#navToggle");
    if (btn) btn.textContent = hidden ? "☰ 导航" : "☰";
  }

  // ---------- 工具 ----------
  const bookOf = (id) => COURSE.books.find((b) => b.id === id);
  const allChapters = COURSE.books.reduce((acc, b) => acc.concat(b.chapters), []);
  const chapterOf = (id) => allChapters.find((c) => c.id === id);
  const sectionOf = (id) => {
    for (const b of COURSE.books) {
      for (const c of b.chapters) {
        const s = c.sections.find((x) => x.id === id);
        if (s) return s;
      }
    }
    return null;
  };
  const bookTitle = (id) => (bookOf(id) || {}).title || "";
  const chapterTitle = (id) => (chapterOf(id) || {}).title || "";
  const sectionTitle = (id) => (sectionOf(id) || {}).title || "";
  const chaptersOfBook = (bookId) => (bookOf(bookId) || {}).chapters || [];
  const bookOfChapter = (chapterId) => {
    for (const b of COURSE.books) for (const c of b.chapters) if (c.id === chapterId) return b.id;
    return null;
  };

  function toast(msg, bad) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.toggle("bad", !!bad);
    t.classList.add("show");
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove("show"), 2600);
  }

  // ---------- IndexedDB ----------
  function openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open("phys_resource_lib", 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains("uploads")) {
          const store = db.createObjectStore("uploads", { keyPath: "id" });
          store.createIndex("createdAt", "createdAt");
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function getAllUploads() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("uploads", "readonly");
      const req = tx.objectStore("uploads").getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async function saveUpload(rec) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("uploads", "readwrite");
      tx.objectStore("uploads").put(rec);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async function deleteUpload(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("uploads", "readwrite");
      tx.objectStore("uploads").delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // ---------- 资源列表 ----------
  async function loadAll() {
    // 即使 IndexedDB 不可用（如 file:// 预览），也要能渲染预置资源
    let uploaded = [];
    try {
      uploaded = await getAllUploads();
    } catch (e) {
      uploaded = [];
    }
    // 拉取资源清单（JSON）；cache:no-store 避免浏览器缓存旧清单，导致保存后“不显示/被覆盖”
    try {
      const res = await fetch("data/resources.json?v=" + ASSET_V, { cache: "no-store" });
      if (!res.ok) throw new Error("加载清单失败");
      resources = await res.json();
      if (!Array.isArray(resources)) resources = [];
    } catch (e) {
      resources = [];
    }
    uploadedList = uploaded;
    baseList = [...resources, ...uploaded];
    render();
  }

  function isUploaded(r) {
    return Object.prototype.hasOwnProperty.call(r, "content");
  }

  // 为上传资源生成可点击的 object URL（复用缓存）；本会话刚保存的资源优先用本地预览（无需等部署）
  function openable(r) {
    if (previewUrls[r.id]) return Object.assign({}, r, { url: previewUrls[r.id] });
    if (r.url) return r;
    if (isUploaded(r) && r.content) {
      if (!objUrlCache[r.id]) {
        objUrlCache[r.id] = URL.createObjectURL(
          new Blob([r.content], { type: "text/html" })
        );
      }
      return Object.assign({}, r, { url: objUrlCache[r.id] });
    }
    return r;
  }

  // 记录本会话刚保存的文件预览（管理员立刻可打开）
  function setPreview(id, blob) {
    if (!id || !blob) return;
    if (previewUrls[id]) { try { URL.revokeObjectURL(previewUrls[id]); } catch (e) {} }
    previewUrls[id] = URL.createObjectURL(blob);
  }

  function visible() {
    let list = baseList;
    if (state.book) list = list.filter((r) => r.book === state.book);
    if (state.chapter) list = list.filter((r) => r.chapter === state.chapter);
    if (state.section) list = list.filter((r) => r.section === state.section);
    if (state.type !== "all") list = list.filter((r) => r.type === state.type);

    const q = state.search.trim().toLowerCase();
    if (q) {
      list = list.filter((r) => {
        const hay = [
          r.title,
          r.desc,
          (r.tags || []).join(" "),
          bookTitle(r.book),
          chapterTitle(r.chapter),
          sectionTitle(r.section),
          r.type || "",
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });
    }
    return list;
  }

  // 类型筛选项（全部类型 + COURSE.resourceTypes）
  function typeOptions() {
    return ["all"].concat(COURSE.resourceTypes || []);
  }

  // ---------- 渲染 ----------
  function renderChapterNav() {
    const wrap = $("#chapterNav");
    wrap.innerHTML = "";

    COURSE.books.forEach((book) => {
      const bookCount = baseList.filter((r) => r.book === book.id).length;
      const bookOpen = openBooks.has(book.id);
      const bwrap = document.createElement("div");
      bwrap.className = "book" + (bookOpen ? " is-open" : "");

      const bhead = document.createElement("button");
      bhead.className = "book-head";
      bhead.type = "button";
      bhead.innerHTML =
        "<span>" + book.title + "</span>" +
        "<span class='count'>" + bookCount + "</span>" +
        "<span class='chev'>▶</span>";
      bhead.onclick = () => {
        // 点未选中的教材：选中它并展开章节；点已选中的教材：切换章节列表展开/收起
        if (state.book !== book.id) {
          state.book = book.id;
          state.chapter = null;
          state.section = null;
          openBooks.add(book.id);
        } else if (openBooks.has(book.id)) {
          openBooks.delete(book.id);
        } else {
          openBooks.add(book.id);
        }
        render();
      };
      bwrap.appendChild(bhead);

      const chWrap = document.createElement("div");
      chWrap.className = "chapters";
      book.chapters.forEach((ch) => {
        const chCount = baseList.filter((r) => r.chapter === ch.id).length;
        const chOpen = openChapters.has(ch.id);
        const cwrap = document.createElement("div");
        cwrap.className =
          "chapter" + (state.chapter === ch.id ? " active" : "") + (chOpen ? " is-open" : "");

        const chead = document.createElement("button");
        chead.className = "chapter-head";
        chead.type = "button";
        chead.innerHTML =
          "<span>" + (state.chapter === ch.id ? "📖 " : "") + ch.title + "</span>" +
          "<span class='count'>" + chCount + "</span>" +
          "<span class='chev'>▶</span>";
        chead.onclick = () => {
          // 点未选中的章节：选中它并展开小节；点已选中的章节：切换小节展开/收起
          if (state.chapter !== ch.id) {
            state.chapter = ch.id;
            state.section = null;
            if (state.book !== book.id) state.book = book.id;
            openBooks.add(book.id);
            openChapters.add(ch.id);
          } else if (openChapters.has(ch.id)) {
            openChapters.delete(ch.id);
          } else {
            openChapters.add(ch.id);
          }
          render();
        };
        cwrap.appendChild(chead);

        const sec = document.createElement("div");
        sec.className = "sections";
        ch.sections.forEach((s) => {
          const sbtn = document.createElement("button");
          sbtn.className = "section" + (state.section === s.id ? " active" : "");
          sbtn.type = "button";
          sbtn.textContent = s.title;
          sbtn.onclick = () => {
            state.book = book.id;
            state.chapter = ch.id;
            state.section = s.id;
            render();
          };
          sec.appendChild(sbtn);
        });
        cwrap.appendChild(sec);
        chWrap.appendChild(cwrap);
      });

      bwrap.appendChild(chWrap);
      wrap.appendChild(bwrap);
    });

    $(".nav-all").classList.toggle("active", !state.book && !state.chapter);
  }

  function renderCrumb() {
    const n = visible().length;

    const parts = [];
    if (state.book) {
      parts.push(bookTitle(state.book));
      if (state.chapter) {
        parts.push(chapterTitle(state.chapter));
        if (state.section) parts.push(sectionTitle(state.section));
      }
    }
    const title = parts.length ? parts.shift() : "全部资源";
    const sub = parts.length ? " <small>/ " + parts.join(" / ") + "</small>" : "";
    // 一并输出数量，避免依赖会被覆盖的 #count 元素
    $("#crumb").innerHTML =
      title + sub + ' <small class="crumb-count">' + n + " 个资源</small>";
  }

  function renderTypeFilters() {
    const wrap = $("#typeFilter");
    const opts = typeOptions();
    const typeLabels = { all: "全部类型" };
    wrap.innerHTML = "";
    opts.forEach((t) => {
      const b = document.createElement("button");
      b.className = "chip" + (state.type === t ? " active" : "");
      b.type = "button";
      b.textContent = typeLabels[t] || t;
      b.onclick = () => {
        state.type = t;
        render();
      };
      wrap.appendChild(b);
    });
  }

  function buildCard(raw) {
    const r = openable(raw);
    const card = document.createElement("article");
    card.className = "card";

    const typeBadge =
      '<span class="type' + (isUploaded(r) ? " uploaded" : "") + '">' +
      (r.type || "资源") +
      "</span>";

    const metaParts = [];
    if (bookTitle(r.book)) metaParts.push(bookTitle(r.book));
    if (chapterTitle(r.chapter)) metaParts.push(chapterTitle(r.chapter));
    if (r.section && sectionTitle(r.section)) metaParts.push(sectionTitle(r.section));
    const meta =
      '<div class="meta">' +
      (metaParts.length
        ? metaParts.map((p) => "<b>" + p + "</b>").join(" · ")
        : "<b>未分教材</b>") +
      "</div>";

    const tags =
      r.tags && r.tags.length
        ? '<div class="tags">' +
          r.tags.map((t) => '<span class="tag">' + t + "</span>").join("") +
          "</div>"
        : "";

    card.innerHTML =
      typeBadge +
      "<h3>" +
      (r.title || "未命名资源") +
      "</h3>" +
      (r.desc ? "<p>" + r.desc + "</p>" : "<p></p>") +
      meta +
      tags +
      '<div class="open">↗ 打开资源</div>';

    card.onclick = () => openResource(r);

    // 仅管理员可见：编辑 / 删除
    if (getPublishToken()) {
      const actions = document.createElement("div");
      actions.className = "card-actions";
      const edit = document.createElement("button");
      edit.type = "button";
      edit.className = "btn ghost";
      edit.textContent = "✏️ 编辑";
      edit.onclick = (e) => {
        e.stopPropagation();
        openModal(r);
      };
      const del = document.createElement("button");
      del.type = "button";
      del.className = "btn ghost danger";
      del.textContent = "🗑 删除";
      del.onclick = (e) => {
        e.stopPropagation();
        handleDelete(r);
      };
      actions.appendChild(edit);
      actions.appendChild(del);
      card.appendChild(actions);
    }
    return card;
  }

  async function handleDelete(r) {
    if (!window.confirm("确定要删除资源「" + r.title + "」吗？这会从线上仓库移除。")) return;
    try {
      // 优先用站长 GitHub 令牌直连（国内可达、可靠）；仅授权老师(只有 Worker 令牌)才走 Worker
      if (getPublishToken()) await deleteResource(r);
      else if (getWorkerToken()) await workerDelete(r);
      else throw new Error("请先登录（管理员或授权登录）");
      toast("已删除");
    } catch (e) {
      toast("删除失败：" + e.message, true);
    }
  }

  // 平铺渲染资源卡片；范围由左侧栏/类型/搜索决定（选择章节后只显示该章节内容）
  function renderGrid() {
    const grid = $("#grid");
    const list = visible();
    grid.innerHTML = "";

    if (!list.length) {
      const e = document.createElement("div");
      e.className = "empty";
      e.innerHTML = "<b>暂无匹配的资源</b><br/>试试调整搜索关键词或分类筛选。";
      grid.appendChild(e);
      return;
    }

    list.forEach((raw) => grid.appendChild(buildCard(raw)));
  }

  function render() {
    renderChapterNav();
    renderCrumb();
    renderTypeFilters();
    renderGrid();
  }

  function openResource(r) {
    if (r.url) {
      window.open(r.url, "_blank", "noopener");
    } else {
      toast("该资源暂无可打开的地址", true);
    }
  }

  async function removeUpload(r) {
    if (!window.confirm("确定要删除上传资源「" + r.title + "」吗？")) return;
    try {
      await deleteUpload(r.id);
      if (objUrlCache[r.id]) {
        URL.revokeObjectURL(objUrlCache[r.id]);
        delete objUrlCache[r.id];
      }
      await loadAll();
      toast("已删除");
    } catch (e) {
      toast("删除失败：" + e.message, true);
    }
  }

  // ---------- 在线发布（GitHub Contents API） ----------
  const PUBLISH_OWNER = "xty1763";
  const PUBLISH_REPO = "xgzx_physics_lib";
  const PUBLISH_BRANCH = "main";
  const TOKEN_KEY = "gh_publish_token";

  function getPublishToken() {
    try {
      return localStorage.getItem(TOKEN_KEY) || "";
    } catch (e) {
      return "";
    }
  }
  function setPublishToken(t) {
    try {
      localStorage.setItem(TOKEN_KEY, t);
    } catch (e) {}
  }

  function ghHeaders(token) {
    return {
      Authorization: "Bearer " + token,
      "User-Agent": "physics-lib",
      Accept: "application/vnd.github+json",
    };
  }

  // 带超时的 fetch：避免网络卡住导致“保存/删除一直转圈/无反应”
  async function ghFetch(url, opts, timeout) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeout || 30000);
    try {
      return await fetch(url, Object.assign({}, opts, { signal: ctrl.signal }));
    } catch (e) {
      if (e && e.name === "AbortError") throw new Error("连接 GitHub 超时，请检查网络后重试");
      throw e;
    } finally {
      clearTimeout(timer);
    }
  }

  function b64(text) {
    return btoa(unescape(encodeURIComponent(text)));
  }
  function fromB64(b) {
    return decodeURIComponent(escape(atob(b.replace(/\n/g, ""))));
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .replace(/\r/g, "")
      .replace(/\n/g, "\\n");
  }

  // 用资源标题生成文件名（保留中文，下载时按标题显示；只替换非法字符）
  function slugPath(name, ext) {
    const fileExt = ext && /^\.[a-z0-9]+$/i.test(ext) ? ext.toLowerCase() : ".html";
    const base =
      String(name || "")
        .replace(/\.[a-zA-Z0-9]+$/, "")     // 去掉已有扩展名
        .replace(/[\\/:*?"<>|]/g, "-")      // 非法文件名字符
        .replace(/\s+/g, "-")               // 空格 -> -
        .replace(/-+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 50) || "resource";
    return base + fileExt;
  }

  async function ghGetContents(token, path) {
    const url =
      "https://api.github.com/repos/" + PUBLISH_OWNER + "/" + PUBLISH_REPO +
      "/contents/" + path + "?ref=" + PUBLISH_BRANCH;
    const res = await ghFetch(url, { headers: ghHeaders(token) });
    if (!res.ok) throw new Error("读取仓库文件失败（" + res.status + "）");
    const data = await res.json();
    return { sha: data.sha, text: fromB64(data.content) };
  }

  // contentB64 为文件字节的 base64（HTML/二进制均适用）
  async function ghPutFile(token, path, contentB64, message, sha) {
    const body = { message: message, branch: PUBLISH_BRANCH, content: contentB64 };
    if (sha) body.sha = sha;
    const res = await ghFetch(
      "https://api.github.com/repos/" + PUBLISH_OWNER + "/" + PUBLISH_REPO +
        "/contents/" + path,
      {
        method: "PUT",
        headers: Object.assign({}, ghHeaders(token), {
          "Content-Type": "application/json",
        }),
        body: JSON.stringify(body),
      }
    );
    if (!res.ok) {
      let msg = "";
      try {
        msg = (await res.json()).message || "";
      } catch (e) {}
      throw new Error("写入失败（" + res.status + (msg ? " " + msg : "") + "）");
    }
    return await res.json();
  }

  // 在清单源文件中追加一条资源对象
  function manifestInsert(source, entryText) {
    const idx = source.lastIndexOf("];");
    if (idx === -1) throw new Error("无法定位资源清单");
    const head = source.slice(0, idx).replace(/\s+$/, "");
    const tail = source.slice(idx);
    const hasEntries = /}\s*$/.test(head);
    const sep = hasEntries ? ",\n  " : "\n  ";
    return head + sep + entryText + "\n" + tail;
  }

  function buildEntryText(rec, path) {
    const tags = (rec.tags || []).map((t) => '"' + esc(t) + '"').join(", ");
    return [
      "{",
      '    id: "' + esc(rec.id) + '",',
      '    title: "' + esc(rec.title) + '",',
      '    desc: "' + esc(rec.desc) + '",',
      '    book: "' + esc(rec.book || "") + '",',
      '    chapter: "' + esc(rec.chapter || "") + '",',
      '    section: "' + esc(rec.section || "") + '",',
      '    url: "' + esc(path) + '",',
      "    tags: [" + tags + "],",
      '    type: "' + esc(rec.type || "练习") + '"',
      "  }",
    ].join("\n");
  }

  // 把文件写入仓库 pages/（重名自动加序号），返回最终路径；不改清单
  async function putResourceFile(token, rec) {
    const message = "新增资源：" + rec.title;
    let path = "pages/" + slugPath(rec.title, rec.fileExt);
    for (let dup = 0; dup < 30; dup++) {
      try {
        await ghPutFile(token, path, rec.contentB64, message);
        break;
      } catch (e) {
        if (/409|422|already exists|sha was not supplied|does not match/i.test(e.message) && dup < 29) {
          const dot = path.lastIndexOf(".");
          const stem = dot > -1 ? path.slice(0, dot) : path;
          const dotExt = dot > -1 ? path.slice(dot) : "";
          path = stem + "-" + (dup + 2) + dotExt;
        } else {
          throw e;
        }
      }
    }
    return path;
  }

  async function publishResource(rec) {
    const token = getPublishToken();
    if (!token) throw new Error("请先填写 GitHub 访问令牌");
    const path = await putResourceFile(token, rec);
    resources.push({
      id: rec.id, title: rec.title, desc: rec.desc || "", book: rec.book || "",
      chapter: rec.chapter || "", section: rec.section || "", url: path,
      tags: rec.tags || [], type: rec.type || "练习",
    });
    await saveResources(token, "登记资源：" + rec.title);
    // 本会话里立刻可打开（无需等 GitHub Pages 部署）
    if (rec._blob) setPreview(rec.id, rec._blob);
    return path;
  }

  // ---------- 清单序列化 / 编辑 / 删除 ----------
  function entryToJs(e) {
    const tags = (e.tags || []).map((t) => '"' + esc(t) + '"').join(", ");
    return (
      "{\n" +
      '    id: "' + esc(e.id) + '",\n' +
      '    title: "' + esc(e.title || "") + '",\n' +
      '    desc: "' + esc(e.desc || "") + '",\n' +
      '    book: "' + esc(e.book || "") + '",\n' +
      '    chapter: "' + esc(e.chapter || "") + '",\n' +
      '    section: "' + esc(e.section || "") + '",\n' +
      '    url: "' + esc(e.url || "") + '",\n' +
      "    tags: [" + tags + "],\n" +
      '    type: "' + esc(e.type || "练习") + '"\n' +
      "  }"
    );
  }

  // 把当前 resources 数组保存到 data/resources.json（供站长的 GitHub 令牌直接写入）
  async function saveResources(token, message) {
    const newJson = JSON.stringify(resources, null, 2);
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        const cur = await ghGetContents(token, "data/resources.json");
        await ghPutFile(token, "data/resources.json", b64(newJson), message, cur.sha);
        return;
      } catch (e) {
        if (e.message && /409|does not match/i.test(e.message)) continue;
        throw e;
      }
    }
    throw new Error("保存清单冲突，请稍后重试");
  }

  // 只取文件的 sha，不解码内容（二进制文件解码会抛错）
  async function ghGetSha(token, path) {
    const url =
      "https://api.github.com/repos/" + PUBLISH_OWNER + "/" + PUBLISH_REPO +
      "/contents/" + path + "?ref=" + PUBLISH_BRANCH;
    const res = await ghFetch(url, { headers: ghHeaders(token) });
    if (!res.ok) throw new Error("读取文件失败（" + res.status + "）");
    const data = await res.json();
    return data.sha;
  }

  async function ghDeleteFile(token, path, message) {
    const sha = await ghGetSha(token, path);
    const res = await ghFetch(
      "https://api.github.com/repos/" + PUBLISH_OWNER + "/" + PUBLISH_REPO + "/contents/" + path,
      {
        method: "DELETE",
        headers: Object.assign({}, ghHeaders(token), { "Content-Type": "application/json" }),
        body: JSON.stringify({ message: message, sha: sha, branch: PUBLISH_BRANCH }),
      }
    );
    if (!res.ok) throw new Error("删除文件失败（" + res.status + "）");
    return await res.json();
  }

  // 删除资源：从清单移除并删除 pages/ 下的文件
  async function deleteResource(res) {
    const token = getPublishToken();
    if (!token) throw new Error("请先登录管理员");
    if (res.url && res.url.indexOf("pages/") === 0) {
      try { await ghDeleteFile(token, res.url, "删除资源：" + res.title); }
      catch (e) { if (!/404|422|失败/.test(e.message)) throw e; }
    }
    if (previewUrls[res.id]) { try { URL.revokeObjectURL(previewUrls[res.id]); } catch (e) {} delete previewUrls[res.id]; }
    resources = resources.filter((e) => e.id !== res.id);
    await saveResources(token, "删除资源：" + res.title);
    baseList = [...resources, ...uploadedList];
    render();
  }

  // 编辑资源：更新清单字段，并可选换新文件
  async function updateResource(rec) {
    const token = getPublishToken();
    if (!token) throw new Error("请先登录管理员");
    const idx = resources.findIndex((e) => e.id === rec.id);
    const old = resources[idx];
    if (!old) throw new Error("找不到要编辑的资源");

    let url = old.url || "";
    if (rec.contentB64) {
      // 目标文件：优先沿用/覆盖，避免与其它资源重名冲突
      let path = "pages/" + slugPath(rec.title, rec.fileExt);
      const takenByOther = (p) => resources.some((x) => x.id !== rec.id && x.url === p);
      if (takenByOther(path)) {
        for (let i = 2; i < 30; i++) {
          const dot = path.lastIndexOf(".");
          const stem = dot > -1 ? path.slice(0, dot) : path;
          const dotExt = dot > -1 ? path.slice(dot) : "";
          const cand = stem + "-" + i + dotExt;
          if (!takenByOther(cand)) { path = cand; break; }
        }
      }
      // 取目标的 sha（存在则覆盖；不存在(404)则新建）
      let sha = null;
      try { sha = await ghGetSha(token, path); } catch (e) { sha = null; }
      await ghPutFile(token, path, rec.contentB64, "更新资源文件：" + rec.title, sha || undefined);
      url = path;
      if (rec._blob) setPreview(rec.id, rec._blob);   // 本会话立刻可打开
      if (old.url && old.url !== path && old.url.indexOf("pages/") === 0) {
        try { await ghDeleteFile(token, old.url, "移除旧文件：" + rec.title); } catch (e) {}
      }
    }

    resources[idx] = {
      id: old.id, title: rec.title, desc: rec.desc || "", book: rec.book || "",
      chapter: rec.chapter || "", section: rec.section || "", url: url,
      tags: rec.tags || [], type: rec.type || "练习",
    };
    await saveResources(token, "编辑资源：" + rec.title);
    baseList = [...resources, ...uploadedList];
    render();
  }

  // ---- 授权用户走 Cloudflare Worker（后端持有 GitHub 令牌） ----
  async function workerPost(action, payload) {
    const token = getWorkerToken();
    if (!token) throw new Error("请先通过“授权登录”");
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    try {
      const res = await fetch(WORKER_URL + "/" + action, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.assign({ token: token }, payload)),
        signal: ctrl.signal,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || ("请求失败（" + res.status + "）"));
      return data;
    } catch (e) {
      if (e.name === "AbortError") throw new Error("连接后端超时（请检查 Workers 连接）");
      throw e;
    } finally {
      clearTimeout(timer);
    }
  }
  async function workerDelete(res) {
    await workerPost("delete", { id: res.id, url: res.url, title: res.title });
    await loadAll();
  }
  async function workerUpdate(rec) {
    await workerPost("update", rec);
    await loadAll();
  }

  // ---------- 上传弹窗 ----------
  const mask = $("#modalMask");

  const isPaperType = () => $("#fType").value === "试卷";

  function populateTypeSelect() {
    const sel = $("#fType");
    sel.innerHTML = "";
    COURSE.resourceTypes.forEach((t) => {
      const o = document.createElement("option");
      o.value = t;
      o.textContent = t;
      sel.appendChild(o);
    });
    refreshTypeUI();
  }

  function refreshTypeUI() {
    const paper = isPaperType();
    $("#typeHint").style.display = paper ? "block" : "none";
    $("#fSection").disabled = paper;
  }

  function populateBookSelect() {
    const sel = $("#fBook");
    sel.innerHTML = '<option value="">暂不分教材</option>';
    COURSE.books.forEach((b) => {
      const o = document.createElement("option");
      o.value = b.id;
      o.textContent = b.title;
      sel.appendChild(o);
    });
  }

  function populateChapterSelect() {
    const sel = $("#fChapter");
    sel.innerHTML = '<option value="">暂不选章</option>';
    chaptersOfBook($("#fBook").value).forEach((c) => {
      const o = document.createElement("option");
      o.value = c.id;
      o.textContent = c.title;
      sel.appendChild(o);
    });
    populateSectionSelect();
  }

  function populateSectionSelect() {
    const sel = $("#fSection");
    sel.innerHTML = '<option value="">未指定小节</option>';
    if (isPaperType()) {
      sel.disabled = true;
      return;
    }
    const ch = chapterOf($("#fChapter").value);
    if (ch) {
      ch.sections.forEach((s) => {
        const o = document.createElement("option");
        o.value = s.id;
        o.textContent = s.title;
        sel.appendChild(o);
      });
    }
  }

  // 根据是否有本地令牌，显示/隐藏上传按钮
  function refreshAdminUI() {
    const owner = !!getPublishToken();
    const worker = !!getWorkerToken();
    const has = owner || worker;
    $("#uploadBtn").style.display = has ? "" : "none";
    if ($("#batchUploadBtn")) $("#batchUploadBtn").style.display = has ? "" : "none";
    $("#adminBtn").textContent = owner ? "⚙ 管理员设置" : "🔑 管理员登录";
    $("#adminLoggedInRow").style.display = owner ? "block" : "none";
    if ($("#workeredInRow")) $("#workeredInRow").style.display = worker ? "block" : "none";
  }

  function openModal(res) {
    editingId = res ? res.id : null;
    populateTypeSelect();
    populateBookSelect();

    if (res) {
      // 编辑模式：回填现有字段
      $("#fTitle").value = res.title || "";
      $("#fDesc").value = res.desc || "";
      $("#fTags").value = (res.tags || []).join(" ");
      if (res.type) $("#fType").value = res.type;
      refreshTypeUI();
      if (res.book) $("#fBook").value = res.book;
      populateChapterSelect();
      if (res.chapter) $("#fChapter").value = res.chapter;
      populateSectionSelect();
      if (res.section) $("#fSection").value = res.section;
      var dzSmall = $("#dropzone small");
      if (dzSmall) dzSmall.textContent = "选新文件可替换内容（不选则保留原文件）";
      $("#modalTitle").textContent = "编辑资源";
      $("#saveResource").textContent = "保存修改";
    } else {
      // 新增：整体清空表单，避免残留上一个资源的章节/类型等内容
      $("#fTitle").value = "";
      $("#fDesc").value = "";
      $("#fTags").value = "";
      $("#modalTitle").textContent = "上传资源";
      $("#saveResource").textContent = "保存资源";
      refreshTypeUI();               // 重置“试卷”提示与章节禁用
      populateChapterSelect();       // 重建章节 & 小节下拉，避免残留上一个资源
      var dzSmall2 = $("#dropzone small");
      if (dzSmall2) dzSmall2.textContent = "支持 HTML / PDF / Word / PPT / Excel / 图片 / 视频 / 压缩包等";
    }
    clearPendingFile();
    mask.classList.add("show");
    setTimeout(() => $("#fTitle").focus(), 50);
  }

  function closeModal() {
    mask.classList.remove("show");
  }

  // 依据 标题/文件名 + 文件内容 自动识别 章节/类型/标签 并预填（free，无外部模型）
  const TEXT_EXT_RE = /^(html?|htm|md|txt)$/;
  function extOf(name) {
    const m = /\.([a-z0-9]+)$/i.exec(name || "");
    return m ? m[1].toLowerCase() : "";
  }
  // 只读文件头部约100KB作为文本样本（快，用于内容识别；二进制文件跳过）
  function readTextSample(file) {
    return new Promise((resolve) => {
      if (!file) return resolve("");
      try {
        const fr = new FileReader();
        fr.onload = () => resolve(String(fr.result || ""));
        fr.onerror = () => resolve("");
        fr.readAsText(file.slice(0, 102400));
      } catch (e) {
        resolve("");
      }
    });
  }

  async function smartFill(force) {
    const title = $("#fTitle").value.trim() || (pendingFile ? pendingFile.name : "");
    if (!title) return;
    const ext = pendingFile ? extOf(pendingFile.name) : "";
    // 文本类文件读取头部一小段内容作辅助（HTML/文本）；毫秒级，不阻塞界面
    let content = "";
    if (pendingFile && TEXT_EXT_RE.test(ext)) {
      content = await readTextSample(pendingFile);
    }
    const searchStr = (title + " " + content).trim();

    const type = detectType(title, ext, content);
    let bookId = detectBook(searchStr);
    const loc = detectLoc(title, content, bookId);

    if (force || !$("#fType").value) {
      if (type) { $("#fType").value = type; refreshTypeUI(); }
    }
    // 若识别到章节但没识别到教材，则根据章节反推教材
    if (loc && loc.chapter && !bookId) bookId = bookOfChapter(loc.chapter);
    if ((force || !$("#fBook").value) && bookId) $("#fBook").value = bookId;
    populateChapterSelect();
    if ((force || !$("#fChapter").value) && loc && loc.chapter) $("#fChapter").value = loc.chapter;
    populateSectionSelect();
    if (force && loc && loc.section) $("#fSection").value = loc.section;

    const topic = removeNoise(title);
    const secName = loc && loc.section
      ? sectionTitle(loc.section).replace(/^\s*\d+(\.\d+)*\s*/, "")
      : (loc && loc.chapter ? chapterTitle(loc.chapter).replace(/^第[一二三四五六七八九十]+章\s*/, "") : "");
    const existing = $("#fTags").value.split(/[,，\s]+/).filter(Boolean);
    const tags = [];
    if (topic) tags.push(topic);
    if (secName) tags.push(secName);
    if (type) tags.push(type);
    $("#fTags").value = tags.concat(existing.filter((t) => tags.indexOf(t) < 0)).join(" ");
    toast("已自动识别并预填（可再修改）");
  }

  // ---------- 管理员登录 ----------
  const adminMask = $("#adminMask");

  function openAdminModal() {
    $("#adminToken").value = getPublishToken();
    const ai = getAiConf();
    if ($("#aiEndpoint")) $("#aiEndpoint").value = ai.endpoint || "";
    if ($("#aiModel")) $("#aiModel").value = ai.model || "";
    if ($("#aiKey")) $("#aiKey").value = ai.key || "";
    refreshAdminUI();
    adminMask.classList.add("show");
    setTimeout(() => $("#adminToken").focus(), 50);
  }

  function closeAdminModal() {
    adminMask.classList.remove("show");
  }

  function saveAdmin() {
    const t = $("#adminToken").value.trim();
    if (!t) {
      toast("请输入 GitHub 访问令牌", true);
      return;
    }
    setPublishToken(t);
    // 一并保存 AI 设置（可选）
    setAiConf({
      endpoint: $("#aiEndpoint") ? $("#aiEndpoint").value.trim() : aiConf.endpoint,
      model: $("#aiModel") ? $("#aiModel").value.trim() : aiConf.model,
      key: $("#aiKey") ? $("#aiKey").value.trim() : aiConf.key,
    });
    closeAdminModal();
    refreshAdminUI();
    render(); // 立即让卡片出现“编辑/删除”
    toast("已登录，上传与编辑入口已开启");
  }

  function clearToken() {
    if (!window.confirm("确定要清除本机保存的管理员令牌吗？清除后上传入口会隐藏。")) return;
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch (e) {}
    closeAdminModal();
    refreshAdminUI();
    render(); // 移除卡片上的“编辑/删除”
    toast("已退出，上传入口已隐藏");
  }

  // ---------- 授权登录（其他老师，走 Cloudflare Worker） ----------
  const workerMask = $("#workerMask");
  function openWorkerModal() {
    workerMask.classList.add("show");
    setTimeout(() => $("#workerUser").focus(), 50);
  }
  function closeWorkerModal() {
    workerMask.classList.remove("show");
  }
  async function saveWorkerLogin() {
    const u = $("#workerUser").value.trim();
    const p = $("#workerPass").value;
    if (!u || !p) {
      toast("请输入授权账号和密码", true);
      return;
    }
    try {
      const res = await fetch(WORKER_URL + "/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ u: u, p: p }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || ("登录失败（" + res.status + "）"));
      setWorkerToken(data.token);
      closeWorkerModal();
      refreshAdminUI();
      render();
      toast("已登录（授权用户）");
    } catch (e) {
      toast("登录失败：" + e.message, true);
    }
  }
  function workerLogout() {
    if (!window.confirm("确定要退出授权登录吗？")) return;
    clearWorkerToken();
    refreshAdminUI();
    render();
    toast("已退出授权登录");
  }

  const FILE_RE = /\.(html?|htm|pdf|docx?|pptx?|xlsx?|txt|md|png|jpe?g|webp|gif|mp4|zip)$/i;

  function setPendingFile(file) {
    if (!file) return clearPendingFile();
    if (!FILE_RE.test(file.name)) {
      toast("不支持的文件类型（支持 HTML/PDF/Word/PPT/Excel/图片/视频/压缩包等）", true);
      return;
    }
    pendingFile = file;
    $("#fileName").textContent = file.name + "（" + (file.size / 1024).toFixed(1) + " KB）";
    $("#filePill").style.display = "flex";
    if (!$("#fTitle").value) {
      $("#fTitle").value = file.name.replace(/\.[^.]+$/, "");
    }
    // 选文件后自动温和预填章节/类型/标签（只填空，不覆盖已选）
    smartFill(false);
  }

  function clearPendingFile() {
    pendingFile = null;
    $("#fileInput").value = "";
    $("#filePill").style.display = "none";
    $("#fileName").textContent = "";
  }

  // ================= 批量上传 =================
  let batchItems = [];            // [{file, meta, status, err}]
  let batchUploading = false;
  function escHtml(s) { return String(s == null ? "" : s).replace(/[<>&"]/g, (m) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[m])); }

  function populateBatchSelects() {
    const t = $("#bType"), b = $("#bBook"), c = $("#bChapter"), s = $("#bSection");
    if (t) { t.innerHTML = '<option value="">按文件自动识别</option>'; COURSE.resourceTypes.forEach((x) => { const o = document.createElement("option"); o.value = x; o.textContent = x; t.appendChild(o); }); }
    if (b) { b.innerHTML = '<option value="">按文件自动识别</option>'; COURSE.books.forEach((x) => { const o = document.createElement("option"); o.value = x.id; o.textContent = x.title; b.appendChild(o); }); }
    const fillChapters = () => {
      if (!c) return;
      c.innerHTML = '<option value="">按文件自动识别</option>';
      chaptersOfBook(b ? b.value : "").forEach((x) => { const o = document.createElement("option"); o.value = x.id; o.textContent = x.title; c.appendChild(o); });
      fillSections();
    };
    const fillSections = () => {
      if (!s) return;
      s.innerHTML = '<option value="">按文件自动识别</option>';
      const ch = chapterOf(c ? c.value : "");
      if (ch) ch.sections.forEach((x) => { const o = document.createElement("option"); o.value = x.id; o.textContent = x.title; s.appendChild(o); });
    };
    if (b) b.onchange = fillChapters;
    if (c) c.onchange = fillSections;
    if (t && !t._bound) { t._bound = true; }
  }

  // 依据文件名 + 文本类文件内容，识别 标题/类型/教材/章节/小节
  async function detectForFile(file) {
    const title = file.name.replace(/\.[^.]+$/, "");
    const ext = extOf(file.name);
    let content = "";
    if (TEXT_EXT_RE.test(ext)) { try { content = await readTextSample(file); } catch (e) { content = ""; } }
    const s = (title + " " + content).trim();
    const type = detectType(title, ext, content);
    let book = detectBook(s);
    const loc = detectLoc(title, content, book);
    if (loc && loc.chapter && !book) book = bookOfChapter(loc.chapter);
    return { title: title, ext: ext, type: type || "", book: book || "", chapter: (loc && loc.chapter) || "", section: (loc && loc.section) || "" };
  }

  async function addBatchFiles(files) {
    const arr = Array.prototype.slice.call(files || []);
    let skipped = 0;
    arr.forEach((f) => {
      if (!FILE_RE.test(f.name)) { skipped++; return; }
      if (batchItems.some((it) => it.file.name === f.name && it.file.size === f.size)) return;   // 去重
      batchItems.push({ file: f, meta: null, status: "" });
    });
    if (skipped) toast("已跳过 " + skipped + " 个不支持的文件类型", true);
    renderBatchList();
    for (const it of batchItems) { if (!it.meta) { try { it.meta = await detectForFile(it.file); } catch (e) { it.meta = { title: it.file.name.replace(/\.[^.]+$/, ""), type: "", book: "", chapter: "", section: "" }; } } }
    renderBatchList();
    const prog = $("#batchProgress");
    if (prog && !batchUploading) { prog.style.display = batchItems.length ? "block" : "none"; prog.textContent = batchItems.length ? ("已选 " + batchItems.length + " 个文件；点“开始批量上传”逐个发布并统一登记。") : ""; }
  }

  function renderBatchList() {
    const wrap = $("#batchList");
    if (!wrap) return;
    if (!batchItems.length) { wrap.innerHTML = ""; return; }
    wrap.innerHTML = batchItems.map((it, i) => {
      const m = it.meta;
      const meta = m ? [m.type || "?", bookTitle(m.book) || "未分教材", chapterTitle(m.chapter) || "", sectionTitle(m.section) || ""].filter(Boolean).join(" · ") : "识别中…";
      const st = it.status === "ok" ? '<span class="batch-x batch-ok">✓ 已上传</span>'
        : it.status === "bad" ? '<span class="batch-x batch-bad" title="' + escHtml(it.err || "") + '">✗ 失败</span>'
        : it.status === "ing" ? '<span class="batch-x batch-ing">上传中…</span>'
        : '<span class="batch-x">待上传</span>';
      const cls = it.status === "ok" ? "ok" : it.status === "bad" ? "bad" : "";
      return '<div class="batch-row ' + cls + '"><span class="batch-idx">' + (i + 1) + '</span><span class="batch-name">' + escHtml(it.file.name) + '</span><span class="batch-meta">' + escHtml(meta) + "</span>" + st + "</div>";
    }).join("");
  }

  function clearBatch() {
    if (batchUploading) return;
    batchItems = [];
    const fi = $("#batchFileInput"); if (fi) fi.value = "";
    renderBatchList();
    const prog = $("#batchProgress"); if (prog) { prog.textContent = ""; prog.style.display = "none"; }
  }

  function openBatchModal() {
    populateBatchSelects();
    $("#batchMask").classList.add("show");
    $("#batchProgress").style.display = batchItems.length ? "block" : "none";
    renderBatchList();
  }
  function closeBatchModal() { $("#batchMask").classList.remove("show"); }

  async function startBatchUpload() {
    if (batchUploading) return;
    if (!getPublishToken()) { toast("请先登录（管理员）", true); openAdminModal(); return; }
    if (!batchItems.length) { toast("请先选择要上传的文件", true); return; }
    const btn = $("#startBatch"); const prog = $("#batchProgress");
    batchUploading = true; btn.disabled = true; btn.textContent = "上传中…"; prog.style.display = "block";
    const overType = $("#bType").value, overBook = $("#bBook").value, overChapter = $("#bChapter").value, overSection = $("#bSection").value;
    const token = getPublishToken();
    const newEntries = [];
    let ok = 0, fail = 0;
    for (let i = 0; i < batchItems.length; i++) {
      const it = batchItems[i];
      if (it.status === "ok") { ok++; continue; }
      it.status = "ing"; renderBatchList();
      prog.textContent = "正在上传 " + (i + 1) + " / " + batchItems.length + " …（" + it.file.name + "）";
      try {
        if (it.file.size > 50 * 1024 * 1024) throw new Error("文件过大（>50MB）");
        if (!it.meta) it.meta = await detectForFile(it.file);
        const m = it.meta;
        const type = overType || m.type || "练习";
        const book = overBook || m.book || "";
        const chapter = overChapter || m.chapter || "";
        const section = (type === "试卷") ? "" : (overSection || m.section || "");
        const title = m.title || it.file.name.replace(/\.[^.]+$/, "");
        const em = /\.[^.]*$/.exec(it.file.name);
        const fileExt = em ? em[0].toLowerCase() : ".html";
        const contentB64 = await readFileAsBase64(it.file);
        const rec = { id: "r" + Date.now() + Math.random().toString(36).slice(2, 7), title: title, book: book, chapter: chapter, section: section, desc: "", tags: [], type: type, fileExt: fileExt, contentB64: contentB64, _blob: it.file };
        const path = await putResourceFile(token, rec);
        const entry = { id: rec.id, title: title, desc: "", book: book, chapter: chapter, section: section, url: path, tags: [], type: type };
        resources.push(entry); newEntries.push(entry);
        if (rec._blob) setPreview(rec.id, rec._blob);
        it.status = "ok"; ok++;
      } catch (e) { it.status = "bad"; it.err = (e && e.message) || "失败"; fail++; }
      renderBatchList();
    }
    if (newEntries.length) {
      prog.textContent = "正在统一登记资源清单（" + newEntries.length + " 条）…";
      try { await saveResources(token, "批量新增资源：" + newEntries.length + " 个"); }
      catch (e) { toast("清单保存失败：" + e.message, true); }
    }
    baseList = [...resources, ...uploadedList]; render();
    batchUploading = false; btn.disabled = false; btn.textContent = "开始批量上传";
    prog.textContent = "完成：成功 " + ok + " 个" + (fail ? "，失败 " + fail + " 个" : "") + "。";
    toast("批量上传完成：成功 " + ok + " 个" + (fail ? "，失败 " + fail + " 个" : ""));
  }
  // =============== 批量上传 end ===============

  function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      // 用 readAsDataURL：浏览器原生 base64，比手动分块拼接快且省内存
      fr.onload = () => {
        const dataUrl = String(fr.result || "");
        const comma = dataUrl.indexOf(",");
        resolve(comma > -1 ? dataUrl.slice(comma + 1) : dataUrl);
      };
      fr.onerror = () => reject(fr.error);
      fr.readAsDataURL(file);
    });
  }

  let saving = false;                 // 防止重复点击“保存”
  async function saveResource() {
    const saveBtn = $("#saveResource");
    if (saving) return;               // 防双击重复发布
    const title = $("#fTitle").value.trim();
    if (!title) {
      toast("请填写资源名称", true);
      return;
    }
    const editing = !!editingId;
    const isPaper = isPaperType();
    const extMatch = pendingFile && /\.[^.]*$/.exec(pendingFile.name);
    const fileExt = pendingFile ? (extMatch ? extMatch[0].toLowerCase() : ".html") : undefined;

    const rec = {
      id: editingId || ("r" + Date.now() + Math.random().toString(36).slice(2, 7)),
      title,
      book: $("#fBook").value,
      chapter: $("#fChapter").value,
      // 试卷不挂小节
      section: isPaper ? "" : $("#fSection").value,
      desc: $("#fDesc").value.trim(),
      tags: $("#fTags")
        .value.split(/[,，\s]+/)
        .map((s) => s.trim())
        .filter(Boolean),
      type: isPaper ? "试卷" : $("#fType").value,
      fileExt,
      contentB64: null,
      createdAt: Date.now(),
      _blob: pendingFile,             // 记录原文件，用于本会话立即预览
    };

    // 站长有 GitHub 令牌则直连（可靠）；仅授权老师(只有 Worker 令牌)才走 Worker
    const isWorker = !!getWorkerToken() && !getPublishToken();
    if (!isWorker && !getPublishToken()) {
      toast("请先登录（管理员或授权登录）", true);
      openAdminModal();
      return;
    }

    saving = true;
    saveBtn.disabled = true;
    const origLabel = editing ? "保存修改" : "保存资源";
    saveBtn.textContent = "上传中…";
    toast("正在保存，请稍候…");

    try {
      // 读取并转 base64（用 readAsDataURL，快；较大文件给出提示）
      if (pendingFile) {
        if (pendingFile.size > 50 * 1024 * 1024) throw new Error("文件过大（超过50MB），请压缩后再上传");
        if (pendingFile.size > 20 * 1024 * 1024) toast("文件较大，上传会稍慢…");
        const contentB64 = await readFileAsBase64(pendingFile).catch(() => null);
        if (!contentB64) { toast("读取文件失败，请重试", true); return; }
        rec.contentB64 = contentB64;
      }

      if (editing) {
        if (isWorker) {
          await workerUpdate(rec);
          await loadAll();
        } else {
          await updateResource(rec);   // 内部已更新 resources 并渲染
        }
        closeModal();
        toast("已保存修改");
        return;
      }

      // 新增
      if (!pendingFile) {
        toast("请先选择一个文件", true);
        return;
      }
      if (isWorker) {
        await workerPost("upload", rec);
        await loadAll();
        closeModal();
        toast("已发布到线上（授权用户）");
      } else {
        await publishResource(rec);
        // 直接用内存里的 resources 更新视图：避免再次 fetch 被缓存覆盖而“刚保存就消失”
        baseList = [...resources, ...uploadedList];
        render();
        closeModal();
        toast("已发布：卡片已出现，约1分钟后其它访客也能看到");
      }
    } catch (e) {
      toast((editing ? "保存失败：" : "发布失败：") + (e && e.message), true);
    } finally {
      saving = false;
      saveBtn.disabled = false;
      saveBtn.textContent = origLabel;
    }
  }

  // ---------- 资源助手 ----------
  const CN = {
    "一": 1, "二": 2, "三": 3, "四": 4, "五": 5, "六": 6, "七": 7, "八": 8,
    "九": 9, "十": 10, "十一": 11, "十二": 12, "十三": 13,
  };
  function cnNum(w) {
    if (CN[w] != null) return CN[w];
    if (w.charAt(0) === "十") return 10 + (CN[w.slice(1)] || 0);
    return null;
  }
  function parseChapterNum(s) {
    const m = s.match(/第([一二三四五六七八九十]+|\d{1,2})章/);
    if (!m) return null;
    const w = m[1];
    return /^\d+$/.test(w) ? parseInt(w, 10) : cnNum(w);
  }

  const BOOK_ALIASES = [
    { id: "b1", names: ["必修第一册", "必修一", "必修1", "高一上"] },
    { id: "b2", names: ["必修第二册", "必修二", "必修2", "高一下"] },
    { id: "b3", names: ["必修第三册", "必修三", "必修3", "高二上"] },
    { id: "b4", names: ["选择性必修第一册", "选择性必修一", "选必一", "选必1", "选修一"] },
    { id: "b5", names: ["选择性必修第二册", "选择性必修二", "选必二", "选必2", "选修二"] },
    { id: "b6", names: ["选择性必修第三册", "选择性必修三", "选必三", "选必3", "选修三"] },
  ];
  function detectBook(s) {
    // 选“最长匹配”的别名，避免“必修一”命中“选择性必修一”这类子串误判
    let best = null, bestLen = 0;
    for (const b of BOOK_ALIASES)
      for (const n of b.names)
        if (s.indexOf(n) > -1 && n.length > bestLen) { best = b.id; bestLen = n.length; }
    return best;
  }

  function detectType(s, ext, content) {
    const t = String(s || "").trim();
    const c = String(content || "").slice(0, 3000);
    const hasT = (re) => re.test(t);
    const hasC = (re) => re.test(c);
    // 1) 标题/文件名里的明确类型词（最可靠）
    if (hasT(/教案|教学设计|导学案/)) return "教案";
    if (hasT(/试卷|试题|卷子|考试|月考|期中|期末|测验/)) return "试卷";
    if (hasT(/练习|习题|作业|题目|同步|巩固/)) return "练习";
    if (hasT(/课件|幻灯片|演示文稿|\bppt\b/i)) return "课件";
    if (hasT(/仿真|模拟|动画|交互|演示/)) return "仿真资源";
    // 2) 文件类型兜底（标题没提示时）：HTML 通常是可交互仿真；PPT 通常是课件
    if (/^(html?|htm)$/.test(ext)) return "仿真资源";
    if (/^(pptx?|ppt)$/.test(ext)) return "课件";
    // 3) 读文件内容兜底（仅文本类文件）
    if (hasC(/教案|教学设计|导学案/)) return "教案";
    if (hasC(/试卷|试题|考试|测验/)) return "试卷";
    if (hasC(/练习|习题|作业|题目/)) return "练习";
    if (hasC(/课件|幻灯片|演示文稿/)) return "课件";
    if (hasC(/仿真|模拟|动画|交互|演示|canvas/i)) return "仿真资源";
    return null;
  }

  // 去掉“第X章”、教材名、类型词、标点，得到主题词（用于识别章节/关键词）
  const NOISE = /练习|习题|作业|题目|试卷|试题|考试|测验|课件|幻灯片|演示文稿|教案|教学设计|导学案|仿真|模拟|动画|交互|演示|\bppt\b/gi;
  function removeNoise(s) {
    let t = String(s).replace(/第[一二三四五六七八九十]+\d*章/g, " ");
    for (const b of BOOK_ALIASES) for (const n of b.names) t = t.replace(new RegExp(n, "g"), " ");
    t = t.replace(NOISE, " ");
    t = t.replace(/[，。、,.\s]+/g, " ").trim();
    return t;
  }
  function cleanChapter(c) {
    return c.replace(/^第[一二三四五六七八九十]+章\s*/, "");
  }
  function cleanSection(s) {
    return s.replace(/^\s*\d+(\.\d+)*\s*/, "");
  }

  function detectLoc(s, content, bookId) {
    const books = COURSE.books.filter((b) => !bookId || b.id === bookId);
    const hay = (s || "") + " " + (content || "");
    const wantNum = parseChapterNum(hay);
    const topic = removeNoise(s || "");
    let chapter = null, section = null;
    // 1) 数字章节“第X章”（标题在前，优先命中标题；按教材顺序首个）
    if (wantNum) {
      outer: for (const b of books) for (const c of b.chapters)
        if (parseChapterNum(c.title) === wantNum) { chapter = c.id; break outer; }
    }
    // 2) 标题里的主题词命中某章（章标题 + 各小节标题都算）
    if (!chapter && topic.length >= 2) {
      outer: for (const b of books) for (const c of b.chapters) {
        const sig = cleanChapter(c.title) + " " + c.sections.map((sec) => cleanSection(sec.title)).join(" ");
        if (sig.indexOf(topic) > -1) { chapter = c.id; break outer; }
      }
    }
    // 3) 在“标题+内容”里找章节标题（取“最具体/最长”匹配，避免短名误中）
    if (!chapter) {
      let best = null, bestLen = 0;
      for (const b of books) for (const c of b.chapters) {
        const ct = cleanChapter(c.title);
        if (ct && ct.length > bestLen && hay.indexOf(ct) > -1) { best = c.id; bestLen = ct.length; }
      }
      chapter = best;
    }
    // 5) 内容含小节标题但没给章节标题：反查该小节所属章节（取最长匹配）
    if (!chapter) {
      let bestC = null, bestS = null, bestLen = 0;
      for (const b of books) for (const c of b.chapters) for (const sec of c.sections) {
        const st = cleanSection(sec.title);
        if (st && st.length > bestLen && hay.indexOf(st) > -1) { bestC = c.id; bestS = sec.id; bestLen = st.length; }
      }
      chapter = bestC; section = bestS;
    }
    // 4) 已知章节时，再定位小节（取最长匹配，避免“动量”误中“动量守恒”）
    if (chapter && !section) {
      const ch = allChapters.find((x) => x.id === chapter);
      if (ch) {
        let best = null, bestLen = 0;
        for (const sec of ch.sections) {
          const st = cleanSection(sec.title);
          if (st && st.length > bestLen && hay.indexOf(st) > -1) { best = sec.id; bestLen = st.length; }
        }
        section = best;
      }
    }
    return { chapter: chapter, section: section };
  }

  // ---------- 可选的大模型（AI）配置：浏览器直连、OpenAI 兼容；失败自动回退规则引擎 ----------
  // 默认用智谱（BigModel/GLM）：国内可达、支持浏览器 CORS、`glm-4-flash` 免费。站长在“管理员登录”填入自己的 key 即启用 AI。
  const AI_DEFAULT_ENDPOINT = "https://open.bigmodel.cn/api/paas/v4/chat/completions";
  const AI_DEFAULT_MODEL = "glm-4-flash";
  let aiConf = { endpoint: AI_DEFAULT_ENDPOINT, model: AI_DEFAULT_MODEL, key: "" };
  function getAiConf() {
    try {
      const s = localStorage.getItem("ai_conf");
      if (s) aiConf = Object.assign({ endpoint: AI_DEFAULT_ENDPOINT, model: AI_DEFAULT_MODEL, key: "" }, JSON.parse(s));
    } catch (e) {}
    return aiConf;
  }
  function setAiConf(c) {
    aiConf = Object.assign({}, getAiConf(), c);
    try { localStorage.setItem("ai_conf", JSON.stringify(aiConf)); } catch (e) {}
  }

  // 调用 OpenAI 兼容 /chat/completions；失败或超时返回 null（由调用方回退）
  async function llmChat(system, user, opts) {
    const conf = getAiConf();
    if (!conf.endpoint) return null;
    if (!conf.key) return null;   // 未填写 key 时不开 AI（直接走本地规则，不额外请求）
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), (opts && opts.timeout) || 9000);
    try {
      const headers = { "Content-Type": "application/json", Accept: "application/json" };
      if (conf.key) headers.Authorization = "Bearer " + conf.key;
      const body = {
        model: conf.model || AI_DEFAULT_MODEL,
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
        temperature: (opts && opts.temperature != null) ? opts.temperature : 0.3,
        max_tokens: (opts && opts.maxTokens) || 200,
        stream: false,
      };
      const res = await fetch(conf.endpoint, {
        method: "POST", headers: headers, body: JSON.stringify(body), signal: ctrl.signal,
      });
      if (!res.ok) throw new Error("AI " + res.status);
      const data = await res.json();
      return (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || "";
    } catch (e) {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  // 从模型返回里尽量抠出对象（模型可能用 ```json 包裹或夹带其它文字）
  function parseJsonLoose(text) {
    if (!text) return null;
    const m = String(text).match(/\{[\s\S]*\}/);
    if (!m) return null;
    try { return JSON.parse(m[0]); } catch (e) {
      try { return JSON.parse(m[0].replace(/'/g, '"').replace(/，/g, ",")); } catch (e2) { return null; }
    }
  }

  // 用大模型从资源清单里挑最相关的资源标题
  async function aiPickTitles(q) {
    if (!baseList.length) return null;
    const idx = baseList.map((r) => {
      const loc = [bookTitle(r.book), chapterTitle(r.chapter), sectionTitle(r.section)].filter(Boolean).join(" · ");
      return (r.title || "") + "┃" + loc + "┃" + (r.type || "") + "┃" + (r.desc || "");
    }).join("\n");
    const system =
      "你是高中物理教学资源库的检索助手。下面是仓库里的资源清单，每行格式：标题┃所属教材/章节┃类型┃简介。\n" +
      "请根据用户的查询选出最相关的资源标题。只返回 JSON：{\"titles\":[\"标题1\",\"标题2\"]}，最多 5 个；都不相关则返回 {\"titles\":[]}。只输出 JSON。\n\n资源清单：\n" + idx;
    const resp = await llmChat(system, "查询：" + q, { maxTokens: 300, temperature: 0.2, timeout: 6000 });
    const obj = parseJsonLoose(resp);
    if (obj && Array.isArray(obj.titles)) return obj.titles.map((t) => String(t).trim()).filter(Boolean);
    return null;
  }

  // 大模型助手：优先 AI 挑资源，失败回退规则；仅命中同一章时提供“筛选到右侧”
  async function aiAssistantReply(q) {
    const picked = await aiPickTitles(q);
    let list = [];
    if (picked && picked.length) {
      for (const t of picked) {
        if (!t) continue;
        const r = baseList.find((x) => x.title === t)
          || baseList.find((x) => x.title.indexOf(t) > -1 || (t.length > 1 && t.indexOf(x.title) > -1));
        if (r && !list.some((x) => x.id === r.id)) list.push(r);
      }
    }
    if (!list.length) return assistantReply(q);   // 回退到规则
    let filter = null;
    const chs = [...new Set(list.map((r) => r.chapter).filter(Boolean))];
    if (chs.length === 1) {
      const first = list.find((r) => r.chapter === chs[0]);
      filter = { book: (first && first.book) || null, chapter: chs[0], section: null, type: "all" };
    }
    return { text: "为你找到 " + list.length + " 个相关资源：", resources: list, filter: filter };
  }

  // 生成资源简介（用于上传/编辑表单“✨ 智能简介”）
  // 基于元数据生成一句兜底简介（AI 不可用时也能给出合理描述）
  function fallbackDesc(title, chapterId, sectionId, type) {
    const cleanTitle = String(title || "").replace(/\.[a-z0-9]+$/i, "");
    const seg = [];
    const bid = bookOfChapter(chapterId);
    if (bid) seg.push(bookTitle(bid));
    if (chapterId) seg.push(chapterTitle(chapterId));
    if (sectionId) seg.push(sectionTitle(sectionId));
    const loc = seg
      .filter(Boolean)
      .map((s) => s.replace(/^第[一二三四五六七八九十]+章\s*/, "").replace(/^\s*\d+(\.\d+)*\s*/, ""))
      .join(" · ");
    const t = type || "教学资源";
    return cleanTitle + (loc ? "（" + loc + "）" : "") + " · " + t;
  }

  async function aiDescribe(title, chapterId, sectionId, type, contentSample) {
    const sys = "你是高中物理教学资源库的编辑。请为下面的资源写一句简介，35字以内，只输出简介正文，不要引号、不要“简介：”前缀、不要列表或编号。";
    let info = "资源名称：" + title;
    if (chapterId) info += "\n所属：" + chapterTitle(chapterId) + (sectionId ? " / " + sectionTitle(sectionId) : "");
    if (type) info += "\n类型：" + type;
    if (contentSample) info += "\n文件内容（片段）：" + String(contentSample).slice(0, 300);
    const resp = await llmChat(sys, info, { maxTokens: 80, temperature: 0.6, timeout: 9000 });
    if (resp) {
      let d = String(resp).trim().replace(/^("*|“|「|『|\s*简介[:：]?\s*)/, "").replace(/("*|”|」|』)$/, "").trim();
      d = d.slice(0, 60);
      if (d) return { text: d, ai: true };
    }
    return { text: fallbackDesc(title, chapterId, sectionId, type), ai: false };
  }

  // “✨ 智能简介”按钮：自动生成并填入描述（AI 优先，失败则用本地规则，绝不空着）
  async function aiGenerateDesc() {
    const title = $("#fTitle").value.trim();
    if (!title) { toast("请先填写资源名称", true); return; }
    const btn = $("#aiDescBtn");
    btn.disabled = true;
    btn.textContent = "生成中…";
    try {
      let sample = "";
      if (pendingFile && TEXT_EXT_RE.test(extOf(pendingFile.name))) sample = await readTextSample(pendingFile);
      const res = await aiDescribe(title, $("#fChapter").value, $("#fSection").value, $("#fType").value, sample);
      $("#fDesc").value = res.text;
      toast(res.ai ? "已生成智能简介（可再修改）" : "已生成简介（本地规则；AI 接口暂不可用，可在“管理员登录”里配置）");
    } catch (e) {
      $("#fDesc").value = fallbackDesc(title, $("#fChapter").value, $("#fSection").value, $("#fType").value);
      toast("已生成简介（AI 异常已用本地规则）");
    } finally {
      btn.disabled = false;
      btn.textContent = "✨ 智能简介";
    }
  }

  function searchAssistant(s) {
    const bookId = detectBook(s);
    const type = detectType(s);
    const loc = detectLoc(s, "", bookId);
    const topic = removeNoise(s);

    let pool = baseList.slice();
    if (bookId) pool = pool.filter((r) => r.book === bookId);
    if (type) pool = pool.filter((r) => r.type === type);
    if (loc && loc.chapter) pool = pool.filter((r) => r.chapter === loc.chapter);

    if (topic.length >= 2) {
      const lt = topic.toLowerCase();
      pool = pool.filter((r) => {
        const hay = [
          r.title, r.desc, (r.tags || []).join(" "),
          bookTitle(r.book), chapterTitle(r.chapter), sectionTitle(r.section),
        ].join(" ").toLowerCase();
        return hay.indexOf(lt) > -1;
      });
    }
    return { pool: pool, book: bookId, type: type, loc: loc, keywords: topic };
  }

  function htmlEscape(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function resLabel(r) {
    const parts = [];
    if (bookTitle(r.book)) parts.push(bookTitle(r.book));
    if (chapterTitle(r.chapter)) parts.push(chapterTitle(r.chapter).replace(/第[一二三四五六七八九十]+章\s*/, ""));
    if (r.section && sectionTitle(r.section)) parts.push(sectionTitle(r.section).replace(/^\s*\d+(\.\d+)*\s*/, ""));
    return parts.join(" · ");
  }

  function assistantReply(q) {
    const res = searchAssistant(q);
    const list = res.pool;
    const filter = { book: res.book, chapter: res.loc && res.loc.chapter, section: res.loc && res.loc.section, type: res.type };
    if (list.length === 0) {
      if (res.loc && res.loc.chapter)
        return { text: "这个范围（" + (res.loc.section ? sectionTitle(res.loc.section) : chapterTitle(res.loc.chapter)) + "）暂时还没有已上传的资源。换个关键词或去对应章节看看。", resources: [], filter: filter };
      return {
        text: "没找到相关资源。试试这样问：\n• 必修一 第二章 自由落体 课件\n• 仿真资源\n• 小船过河 ",
        resources: [], filter: filter,
      };
    }
    let text = "为你找到 " + list.length + " 个相关资源：";
    if (res.loc && res.loc.chapter)
      text += "（已定位到 " + (res.loc.section ? sectionTitle(res.loc.section) : chapterTitle(res.loc.chapter)) + "）";
    return { text: text, resources: list, filter: filter };
  }

  function addMsg(html, who) {
    const body = $("#assistMessages");
    const el = document.createElement("div");
    el.className = "assist-msg " + who;
    el.innerHTML = html;
    body.appendChild(el);
    body.scrollTop = body.scrollHeight;
  }

  function applyFilterFromReply(filter) {
    state.book = filter.book || null;
    state.chapter = filter.chapter || null;
    state.section = filter.section || null;
    state.type = filter.type || "all";
    state.search = "";
    render();
    closeAssist();
    const c = document.querySelector(".content");
    if (c && typeof c.scrollIntoView === "function") c.scrollIntoView({ behavior: "smooth" });
  }

  async function assistantSend() {
    const input = $("#assistInput");
    const q = input.value.trim();
    if (!q) return;
    input.value = "";
    addMsg(htmlEscape(q), "user");

    const sendBtn = $("#assistSend");
    sendBtn.disabled = true;
    const origTxt = sendBtn.textContent;
    sendBtn.textContent = "思考中…";
    const think = document.createElement("div");
    think.className = "assist-msg bot";
    think.textContent = "🤖 正在思考…";
    $("#assistMessages").appendChild(think);
    $("#assistMessages").scrollTop = $("#assistMessages").scrollHeight;

    let reply;
    try {
      reply = await aiAssistantReply(q);
    } catch (e) {
      reply = assistantReply(q);
    }
    if (think.parentNode) think.parentNode.removeChild(think);
    sendBtn.disabled = false;
    sendBtn.textContent = origTxt;

    const hitList = reply.resources.length
      ? "<ul>" +
        reply.resources
          .map(
            (r) =>
              "<li><span class='assist-hit' data-id='" + r.id + "'>" + htmlEscape(r.title) + "</span> <small>" + htmlEscape(resLabel(r)) + "</small></li>"
          )
          .join("") +
        "</ul>"
      : "";
    const btn = reply.filter && reply.resources.length
      ? "<div class='assist-btnrow'><button class='btn ghost' type='button' data-applyfilter='1'>筛选到右侧</button></div>"
      : "";
    addMsg(reply.text.replace(/\n/g, "<br/>") + hitList + btn, "bot");

    Array.prototype.forEach.call(document.querySelectorAll("#assistMessages .assist-hit"), (el) => {
      el.onclick = () => {
        const r = baseList.find((x) => x.id === el.getAttribute("data-id"));
        if (r) openResource(r);
      };
    });
    Array.prototype.forEach.call(document.querySelectorAll("#assistMessages [data-applyfilter]"), (b) => {
      b.onclick = () => applyFilterFromReply(reply.filter);
    });
  }

  function openAssist() {
    const p = $("#assistPanel");
    p.hidden = false;
    if ($("#assistMessages").childElementCount === 0) {
      addMsg("你好！我是资源助手。告诉我你想找的教材/章节/类型或关键词，例如“必修一 自由落体 课件”。", "bot");
    }
    setTimeout(() => $("#assistInput").focus(), 50);
  }
  function closeAssist() {
    $("#assistPanel").hidden = true;
  }

  // ---------- 事件绑定 ----------
  function bindEvents() {
    $(".nav-all").onclick = () => {
      state.book = null;
      state.chapter = null;
      state.section = null;
      render();
    };
    let debounce;
    $("#search").addEventListener("input", (e) => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        state.search = e.target.value;
        render();
      }, 150);
    });

    $("#navToggle").onclick = () => {
      const layout = document.querySelector(".layout");
      const hidden = layout.classList.toggle("no-sidebar");
      try { localStorage.setItem(NAV_KEY, hidden ? "1" : "0"); } catch (e) {}
      applyNavState();
    };
    applyNavState();

    $("#uploadBtn").onclick = () => openModal();
    $("#adminBtn").onclick = openAdminModal;
    $("#closeModal").onclick = closeModal;
    $("#cancelModal").onclick = closeModal;
    mask.addEventListener("click", (e) => {
      if (e.target === mask) closeModal();
    });
    $("#fType").addEventListener("change", () => {
      refreshTypeUI();
      populateSectionSelect();
    });
    $("#fBook").addEventListener("change", () => {
      populateChapterSelect();
    });
    $("#fChapter").addEventListener("change", populateSectionSelect);
    $("#autoFillBtn").onclick = async () => { await smartFill(true); aiGenerateDesc(); };
    $("#aiDescBtn").onclick = aiGenerateDesc;
    $("#saveResource").onclick = saveResource;

    // 资源助手
    $("#assistFab").onclick = openAssist;
    $("#assistClose").onclick = closeAssist;
    $("#assistSend").onclick = assistantSend;
    $("#assistInput").addEventListener("keydown", (e) => {
      if (e.key === "Enter") assistantSend();
    });

    // 管理员弹窗
    $("#closeAdminModal").onclick = closeAdminModal;
    $("#cancelAdminModal").onclick = closeAdminModal;
    adminMask.addEventListener("click", (e) => {
      if (e.target === adminMask) closeAdminModal();
    });
    $("#adminSave").onclick = saveAdmin;
    $("#clearTokenBtn").onclick = clearToken;
    $("#adminToken").addEventListener("keydown", (e) => {
      if (e.key === "Enter") saveAdmin();
    });
    $("#workerBtn").onclick = openWorkerModal;
    $("#closeWorkerModal").onclick = closeWorkerModal;
    $("#cancelWorkerModal").onclick = closeWorkerModal;
    workerMask.addEventListener("click", (e) => {
      if (e.target === workerMask) closeWorkerModal();
    });
    $("#workerSave").onclick = saveWorkerLogin;
    $("#workerLogoutBtn").onclick = workerLogout;
    $("#workerPass").addEventListener("keydown", (e) => {
      if (e.key === "Enter") saveWorkerLogin();
    });

    const dz = $("#dropzone");
    const fi = $("#fileInput");
    dz.onclick = () => fi.click();
    fi.addEventListener("change", () => setPendingFile(fi.files[0]));
    ["dragenter", "dragover"].forEach((ev) =>
      dz.addEventListener(ev, (e) => {
        e.preventDefault();
        dz.classList.add("drag");
      })
    );
    ["dragleave", "drop"].forEach((ev) =>
      dz.addEventListener(ev, (e) => {
        e.preventDefault();
        dz.classList.remove("drag");
      })
    );
    dz.addEventListener("drop", (e) => {
      const f = e.dataTransfer.files[0];
      if (f) setPendingFile(f);
    });
    $("#clearFile").onclick = clearPendingFile;

    // ---------- 批量上传 ----------
    const bb = $("#batchUploadBtn"); if (bb) bb.onclick = openBatchModal;
    const cb = $("#closeBatchModal"); if (cb) cb.onclick = closeBatchModal;
    const cbm = $("#cancelBatchModal"); if (cbm) cbm.onclick = closeBatchModal;
    const bmask = $("#batchMask"); if (bmask) bmask.addEventListener("click", (e) => { if (e.target === bmask) closeBatchModal(); });
    const bc = $("#batchClear"); if (bc) bc.onclick = clearBatch;
    const sb = $("#startBatch"); if (sb) sb.onclick = startBatchUpload;
    const bdz = $("#batchDropzone"), bfi = $("#batchFileInput");
    if (bdz && bfi) {
      bdz.onclick = () => bfi.click();
      bfi.addEventListener("change", () => { addBatchFiles(bfi.files); bfi.value = ""; });
      ["dragenter", "dragover"].forEach((ev) => bdz.addEventListener(ev, (e) => { e.preventDefault(); bdz.classList.add("drag"); }));
      ["dragleave", "drop"].forEach((ev) => bdz.addEventListener(ev, (e) => { e.preventDefault(); bdz.classList.remove("drag"); }));
      bdz.addEventListener("drop", (e) => { if (e.dataTransfer && e.dataTransfer.files.length) addBatchFiles(e.dataTransfer.files); });
    }
  }

  // ---------- 启动 ----------
  document.addEventListener("DOMContentLoaded", () => {
    $("#subjectSub").textContent = COURSE.subject || "";
    const yearEl = $("#year");
    if (yearEl) yearEl.textContent = new Date().getFullYear();
    bindEvents();
    refreshAdminUI(); // 依据本地令牌决定是否显示“上传资源”按钮
    loadAll()
      .catch((e) => toast("初始化失败：" + e.message, true));
  });
})();

