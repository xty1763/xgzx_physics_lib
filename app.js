/*
 * 高中物理教学资源库 —— 前端逻辑
 * 依赖：data/course-data.js 提供 window.COURSE
 *       data/resources.js  提供 window.MANIFEST
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
  let baseList = [];                 // 预置清单 + 本地上传
  let uploadedList = [];             // 本地上传（历史遗留，仅本地可见）
  const objUrlCache = {};            // id -> objectURL（只在上传资源用）
  let pendingFile = null;            // 当前选中的待上传文件
  let editingId = null;              // 正在编辑的资源 id（null = 新增）

  const $ = (sel) => document.querySelector(sel);
  const NAV_KEY = "nav_collapsed";

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
    // 合并预置与上传，上传的放在后面
    uploadedList = uploaded;
    baseList = [...(window.MANIFEST || []), ...uploaded];
    render();
  }

  function isUploaded(r) {
    return Object.prototype.hasOwnProperty.call(r, "content");
  }

  // 为上传资源生成可点击的 object URL（复用缓存）
  function openable(r) {
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
      await deleteResource(r);
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

  function b64(text) {
    return btoa(unescape(encodeURIComponent(text)));
  }
  function fromB64(b) {
    return decodeURIComponent(escape(atob(b.replace(/\n/g, ""))));
  }
  // 把文件 byte 数组转成 base64（供 GitHub Contents API 上传二进制文件）
  function bufToBase64(buf) {
    const bytes = new Uint8Array(buf);
    let bin = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(bin);
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .replace(/\r/g, "")
      .replace(/\n/g, "\\n");
  }

  // 生成安全的 ASCII 文件名（保留真实扩展名，便于 GitHub Pages 正确响应）
  function slugPath(name, ext) {
    const fileExt = ext && /^\.[a-z0-9]+$/i.test(ext) ? ext.toLowerCase() : ".html";
    const base =
      String(name || "")
        .replace(/\.[a-zA-Z0-9]+$/, "")
        .replace(/[^a-z0-9]+/gi, "-")
        .replace(/^-+|-+$/g, "")
        .replace(/-+/g, "-")
        .toLowerCase()
        .slice(0, 40) || "resource";
    const rand = Math.random().toString(36).slice(2, 7);
    return "res-" + base + "-" + rand + fileExt;
  }

  async function ghGetContents(token, path) {
    const url =
      "https://api.github.com/repos/" + PUBLISH_OWNER + "/" + PUBLISH_REPO +
      "/contents/" + path + "?ref=" + PUBLISH_BRANCH;
    const res = await fetch(url, { headers: ghHeaders(token) });
    if (!res.ok) throw new Error("读取仓库文件失败（" + res.status + "）");
    const data = await res.json();
    return { sha: data.sha, text: fromB64(data.content) };
  }

  // contentB64 为文件字节的 base64（HTML/二进制均适用）
  async function ghPutFile(token, path, contentB64, message, sha) {
    const body = { message: message, branch: PUBLISH_BRANCH, content: contentB64 };
    if (sha) body.sha = sha;
    const res = await fetch(
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

  async function publishResource(rec) {
    const token = getPublishToken();
    if (!token) throw new Error("请先填写 GitHub 访问令牌");
    const path = "pages/" + slugPath(rec.title, rec.fileExt);
    const message = "新增资源：" + rec.title;
    // 1) 上传文件（HTML / PDF / DOCX 等二进制均可）
    await ghPutFile(token, path, rec.contentB64, message);
    // 2) 更新 data/resources.js 登记（并发冲突时自动重读取并重试）
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        const mf = await ghGetContents(token, "data/resources.js");
        const newSource = manifestInsert(mf.text, buildEntryText(rec, path));
        await ghPutFile(token, "data/resources.js", b64(newSource), "登记资源：" + rec.title, mf.sha);
        return path;
      } catch (e) {
        if (e.message && /409|does not match/i.test(e.message)) continue;
        throw e;
      }
    }
    throw new Error("多人同时修改冲突，请稍后重试");
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

  // 用当前 window.MANIFEST 重新生成完整的 data/resources.js
  function serializeManifest() {
    const list = window.MANIFEST || [];
    return (
      "/*\n" +
      " * 高中物理教学资源库 —— 预置资源清单（manifest）\n" +
      " * 由“资源发布/编辑/删除”自动维护，请勿手工改这份再被覆盖。\n" +
      " */\n" +
      "window.MANIFEST = [\n" +
      list.map((e) => "  " + entryToJs(e)).join(",\n") +
      "\n];\n"
    );
  }

  async function saveManifest(token, message) {
    const newSource = serializeManifest();
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        const mf = await ghGetContents(token, "data/resources.js");
        await ghPutFile(token, "data/resources.js", b64(newSource), message, mf.sha);
        return;
      } catch (e) {
        if (e.message && /409|does not match/i.test(e.message)) continue;
        throw e;
      }
    }
    throw new Error("保存清单冲突，请稍后重试");
  }

  async function ghDeleteFile(token, path, message) {
    const cur = await ghGetContents(token, path);
    const res = await fetch(
      "https://api.github.com/repos/" + PUBLISH_OWNER + "/" + PUBLISH_REPO + "/contents/" + path,
      {
        method: "DELETE",
        headers: Object.assign({}, ghHeaders(token), { "Content-Type": "application/json" }),
        body: JSON.stringify({ message: message, sha: cur.sha, branch: PUBLISH_BRANCH }),
      }
    );
    if (!res.ok) throw new Error("删除文件失败（" + res.status + "）");
    return await res.json();
  }

  // 删除资源：从清单移除并删除 pages/ 下的文件
  async function deleteResource(res) {
    const token = getPublishToken();
    if (!token) throw new Error("请先登录管理员");
    // 尝试删除文件（若文件不存在则跳过）
    if (res.url && res.url.indexOf("pages/") === 0) {
      try {
        await ghDeleteFile(token, res.url, "删除资源：" + res.title);
      } catch (e) {
        if (!/404|422|失败/.test(e.message)) throw e;
      }
    }
    window.MANIFEST = window.MANIFEST.filter((e) => e.id !== res.id);
    await saveManifest(token, "删除资源：" + res.title);
    baseList = [...(window.MANIFEST || []), ...uploadedList];
    render();
  }

  // 编辑资源：更新清单里的字段，并可选换新文件
  async function updateResource(rec) {
    const token = getPublishToken();
    if (!token) throw new Error("请先登录管理员");
    const idx = window.MANIFEST.findIndex((e) => e.id === rec.id);
    const old = window.MANIFEST[idx];
    if (!old) throw new Error("找不到要编辑的资源");

    // 若上传了新文件，则写入并更新 url
    let url = old.url || "";
    if (rec.contentB64) {
      const path = "pages/" + slugPath(rec.title, rec.fileExt);
      await ghPutFile(token, path, rec.contentB64, "更新资源文件：" + rec.title);
      url = path;
      // 文件路径变了则删旧文件
      if (old.url && old.url !== path && old.url.indexOf("pages/") === 0) {
        try { await ghDeleteFile(token, old.url, "移除旧文件：" + rec.title); } catch (e) {}
      }
    }

    window.MANIFEST[idx] = {
      id: old.id,
      title: rec.title,
      desc: rec.desc || "",
      book: rec.book || "",
      chapter: rec.chapter || "",
      section: rec.section || "",
      url: url,
      tags: rec.tags || [],
      type: rec.type || "练习",
    };
    await saveManifest(token, "编辑资源：" + rec.title);
    baseList = [...(window.MANIFEST || []), ...uploadedList];
    render();
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
    const has = !!getPublishToken();
    $("#uploadBtn").style.display = has ? "" : "none";
    $("#adminBtn").textContent = has ? "⚙ 管理员设置" : "🔑 管理员登录";
    $("#adminLoggedInRow").style.display = has ? "block" : "none";
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
      // 新增
      $("#fTitle").value = "";
      $("#fDesc").value = "";
      $("#fTags").value = "";
      $("#modalTitle").textContent = "上传资源";
      $("#saveResource").textContent = "保存资源";
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

  // ---------- 管理员登录 ----------
  const adminMask = $("#adminMask");

  function openAdminModal() {
    $("#adminToken").value = getPublishToken();
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
    closeAdminModal();
    refreshAdminUI();
    toast("已登录，上传入口已开启");
  }

  function clearToken() {
    if (!window.confirm("确定要清除本机保存的管理员令牌吗？清除后上传入口会隐藏。")) return;
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch (e) {}
    closeAdminModal();
    refreshAdminUI();
    toast("已退出，上传入口已隐藏");
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
  }

  function clearPendingFile() {
    pendingFile = null;
    $("#fileInput").value = "";
    $("#filePill").style.display = "none";
    $("#fileName").textContent = "";
  }

  function readFileAsBase64(file) {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(bufToBase64(fr.result));
      fr.onerror = () => reject(fr.error);
      fr.readAsArrayBuffer(file);
    });
  }

  async function saveResource() {
    const title = $("#fTitle").value.trim();
    if (!title) {
      toast("请填写资源名称", true);
      return;
    }
    const isPaper = isPaperType();
    const fileExt = pendingFile
      ? (/\.[^.]*$/.exec(pendingFile.name) || [null, ".html"])[1].toLowerCase()
      : undefined;

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
    };

    // 若选择了新文件，读取其字节
    if (pendingFile) {
      const contentB64 = await readFileAsBase64(pendingFile).catch((e) => {
        toast("读取文件失败：" + (e && e.message), true);
        return null;
      });
      if (!contentB64) return;
      rec.contentB64 = contentB64;
    }

    if (!getPublishToken()) {
      toast("请先点击“🔑 管理员登录”输入令牌", true);
      openAdminModal();
      return;
    }

    if (editingId) {
      // 编辑：更新线上清单（可选替换文件）
      try {
        await updateResource(rec);
        await loadAll();
        closeModal();
        toast("已保存修改");
      } catch (e) {
        toast("保存失败：" + e.message, true);
      }
      return;
    }

    // 新增：发布到线上
    if (!pendingFile) {
      toast("请先选择一个文件", true);
      return;
    }
    try {
      const path = await publishResource(rec);
      const published = {
        id: rec.id,
        title: rec.title,
        desc: rec.desc,
        book: rec.book,
        chapter: rec.chapter,
        section: rec.section,
        url: path,
        tags: rec.tags,
        type: rec.type,
      };
      window.MANIFEST.push(published);
      await loadAll();
      closeModal();
      toast("已发布到线上，其他访客也能看到");
    } catch (e) {
      toast("发布失败：" + e.message, true);
    }
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
    $("#saveResource").onclick = saveResource;

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
