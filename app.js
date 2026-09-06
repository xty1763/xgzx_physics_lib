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

  const openBooks = new Set();       // 展开的教材
  const openChapters = new Set();    // 展开的章节
  let baseList = [];                 // 预置清单 + 本地上传
  const objUrlCache = {};            // id -> objectURL（只在上传资源用）
  let pendingFile = null;            // 当前选中的待上传文件

  const $ = (sel) => document.querySelector(sel);

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
    baseList = [...MANIFEST, ...uploaded];
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
        if (openBooks.has(book.id)) openBooks.delete(book.id);
        else openBooks.add(book.id);
        if (state.book !== book.id) {
          state.book = book.id;
          state.chapter = null;
          state.section = null;
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
          if (openChapters.has(ch.id)) openChapters.delete(ch.id);
          else openChapters.add(ch.id);
          if (state.chapter !== ch.id) {
            state.chapter = ch.id;
            state.section = null;
            state.book = book.id;
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
    $("#count").textContent = n + " 个资源";

    const parts = [];
    if (state.book) {
      parts.push(bookTitle(state.book));
      if (state.chapter) {
        parts.push(chapterTitle(state.chapter));
        if (state.section) parts.push(sectionTitle(state.section));
      }
    }
    const title = parts.length ? parts.shift() : "全部资源";
    $("#crumb").innerHTML =
      title + (parts.length ? " <small>/ " + parts.join(" / ") + "</small>" : "");
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

    if (isUploaded(r)) {
      const del = document.createElement("button");
      del.className = "close";
      del.type = "button";
      del.setAttribute("aria-label", "删除");
      del.style.cssText =
        "position:absolute;top:12px;left:12px;background:none;border:none;font-size:14px;cursor:pointer;color:var(--text-soft);";
      del.textContent = "🗑";
      del.title = "删除该上传资源";
      del.onclick = (e) => {
        e.stopPropagation();
        removeUpload(r);
      };
      card.appendChild(del);
    }
    return card;
  }

  // 按“教材 · 章节”分组渲染资源卡片（保持课程顺序）
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

    // 先按章节分组（未分章归为一组）
    const groupMap = new Map();
    const groupOrder = [];
    list.forEach((raw) => {
      const cid = raw.chapter || "";
      if (!groupMap.has(cid)) {
        groupMap.set(cid, []);
        groupOrder.push(cid);
      }
      groupMap.get(cid).push(raw);
    });

    // 重组顺序：优先按课程里的教材→章节顺序，其余（旧数据/未分章）放最后
    const ordered = [];
    const seen = new Set();
    COURSE.books.forEach((b) =>
      b.chapters.forEach((c) => {
        if (groupMap.has(c.id)) {
          ordered.push(c.id);
          seen.add(c.id);
        }
      })
    );
    groupOrder.forEach((cid) => {
      if (cid !== "" && !seen.has(cid)) {
        ordered.push(cid);
        seen.add(cid);
      }
    });
    if (groupMap.has("")) ordered.push("");

    ordered.forEach((cid) => {
      const items = groupMap.get(cid);
      let label;
      if (cid) label = (bookTitle(items[0].book) || "") + " · " + chapterTitle(cid);
      else label = "未分章节";
      const head = document.createElement("div");
      head.className = "group-head";
      head.innerHTML =
        "<span class='g-title'>" + label + "</span>" +
        "<span class='g-count'>" + items.length + "</span>";
      grid.appendChild(head);
      items.forEach((raw) => grid.appendChild(buildCard(raw)));
    });
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
    throw new Error("多次冲突，请稍后重试");
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

  function openModal() {
    populateTypeSelect();
    populateBookSelect();
    populateChapterSelect();
    populateSectionSelect();
    $("#fTitle").value = "";
    $("#fDesc").value = "";
    $("#fTags").value = "";
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

  async function saveResource() {
    const title = $("#fTitle").value.trim();
    if (!title) {
      toast("请填写资源名称", true);
      return;
    }
    if (!pendingFile) {
      toast("请先选择一个 HTML 文件", true);
      return;
    }

    // 读取文件字节并转 base64（HTML 与二进制统一处理）
    const contentB64 = await new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(bufToBase64(fr.result));
      fr.onerror = () => reject(fr.error);
      fr.readAsArrayBuffer(pendingFile);
    }).catch((e) => {
      toast("读取文件失败：" + (e && e.message), true);
    });
    if (!contentB64) return;

    const fileExt = (/\.[^.]*$/.exec(pendingFile.name) || [null, ".html"])[1].toLowerCase();
    const isPaper = isPaperType();
    const rec = {
      id: "r" + Date.now() + Math.random().toString(36).slice(2, 7),
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
      contentB64,
      createdAt: Date.now(),
    };

    if (!getPublishToken()) {
      toast("请先点击“🔑 管理员登录”输入令牌", true);
      openAdminModal();
      return;
    }

    // 只有管理员（有令牌）能上传：发布到线上，写入仓库并登记，所有人可见
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

    $("#uploadBtn").onclick = openModal;
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
    bindEvents();
    refreshAdminUI(); // 依据本地令牌决定是否显示“上传资源”按钮
    loadAll()
      .catch((e) => toast("初始化失败：" + e.message, true));
  });
})();
