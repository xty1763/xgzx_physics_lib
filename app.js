/*
 * 高中物理教学资源库 —— 前端逻辑
 * 依赖：data/course-data.js 提供 window.COURSE
 *       data/resources.js  提供 window.MANIFEST
 */
(function () {
  "use strict";

  // ---------- 状态 ----------
  const state = {
    chapter: "all",      // "all" 或章节 id
    section: null,       // 小节 id 或 null
    search: "",
    type: "all",         // 类型筛选项
    onlyUploaded: false  // 只看“我上传的资源”
  };

  const openChapters = new Set(COURSE.chapters.map((c) => c.id));
  let baseList = [];                 // 预置清单 + 本地上传
  const objUrlCache = {};            // id -> objectURL（只在上传资源用）
  let pendingFile = null;            // 当前选中的待上传文件

  const $ = (sel) => document.querySelector(sel);

  // ---------- 工具 ----------
  const chapterOf = (id) => COURSE.chapters.find((c) => c.id === id);
  const sectionOf = (id) => {
    for (const c of COURSE.chapters) {
      const s = c.sections.find((x) => x.id === id);
      if (s) return s;
    }
    return null;
  };
  const chapterTitle = (id) => (chapterOf(id) || {}).title || "";
  const sectionTitle = (id) => (sectionOf(id) || {}).title || "";

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
    if (state.onlyUploaded) list = list.filter(isUploaded);
    if (state.chapter !== "all") list = list.filter((r) => r.chapter === state.chapter);
    if (state.section) list = list.filter((r) => r.section === state.section);
    if (state.type !== "all") list = list.filter((r) => r.type === state.type);

    const q = state.search.trim().toLowerCase();
    if (q) {
      list = list.filter((r) => {
        const hay = [
          r.title,
          r.desc,
          (r.tags || []).join(" "),
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

  // 类型筛选项（忽略搜索与类型本身）
  function typeOptions() {
    let list = baseList;
    if (state.onlyUploaded) list = list.filter(isUploaded);
    if (state.chapter !== "all") list = list.filter((r) => r.chapter === state.chapter);
    if (state.section) list = list.filter((r) => r.section === state.section);
    const set = new Set();
    list.forEach((r) => {
      if (r.type) set.add(r.type);
      else set.add("其他");
    });
    return ["all", ...set];
  }

  // ---------- 渲染 ----------
  function renderChapterNav() {
    const wrap = $("#chapterNav");
    wrap.innerHTML = "";

    COURSE.chapters.forEach((ch) => {
      const count = baseList.filter((r) => r.chapter === ch.id).length;
      const isOpen = openChapters.has(ch.id);
      const el = document.createElement("div");
      el.className = "chapter" + (isOpen ? " is-open" : "");

      const head = document.createElement("button");
      head.className = "chapter-head";
      head.type = "button";
      head.innerHTML =
        "<span>" +
        (ch.id === state.chapter ? "📖 " : "") +
        ch.title +
        "</span><span class='count'>" +
        count +
        "</span><span class='chev'>▶</span>";
      head.onclick = () => {
        if (openChapters.has(ch.id)) openChapters.delete(ch.id);
        else openChapters.add(ch.id);
        if (state.chapter !== ch.id) {
          state.chapter = ch.id;
          state.section = null;
        }
        render();
      };
      el.appendChild(head);

      const sec = document.createElement("div");
      sec.className = "sections";
      ch.sections.forEach((s) => {
        const b = document.createElement("button");
        b.className = "section" + (state.section === s.id ? " active" : "");
        b.type = "button";
        b.textContent = s.title;
        b.onclick = () => {
          state.chapter = ch.id;
          state.section = s.id;
          render();
        };
        sec.appendChild(b);
      });
      el.appendChild(sec);
      wrap.appendChild(el);
    });

    $(".nav-all").classList.toggle("active", state.chapter === "all");
  }

  function renderCrumb() {
    const n = visible().length;
    $("#count").textContent = n + " 个资源";

    let title;
    if (state.onlyUploaded) title = "我上传的资源";
    else if (state.chapter === "all") title = "全部资源";
    else title = chapterTitle(state.chapter);

    const sec = state.section ? sectionTitle(state.section) : null;
    $("#crumb").innerHTML =
      title + (sec ? " <small>/ " + sec + "</small>" : "");
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

  function renderGrid() {
    const grid = $("#grid");
    const list = visible();
    grid.innerHTML = "";

    if (!list.length) {
      const e = document.createElement("div");
      e.className = "empty";
      e.innerHTML =
        "<b>暂无匹配的资源</b><br/>试试调整搜索关键词或分类筛选。";
      grid.appendChild(e);
      return;
    }

    list.forEach((raw) => {
      const r = openable(raw);
      const card = document.createElement("article");
      card.className = "card";

      const typeBadge =
        '<span class="type' + (isUploaded(r) ? " uploaded" : "") + '">' +
        (r.type || "资源") +
        "</span>";

      const meta =
        '<div class="meta"><b>' +
        (chapterTitle(r.chapter) || "未分章") +
        "</b>" +
        (sectionTitle(r.section)
          ? " · <b>" + sectionTitle(r.section) + "</b>"
          : "") +
        "</div>";

      const tags =
        (r.tags && r.tags.length
          ? '<div class="tags">' +
            r.tags
              .map((t) => '<span class="tag">' + t + "</span>")
              .join("") +
            "</div>"
          : "");

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

      grid.appendChild(card);
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

  // ---------- 上传弹窗 ----------
  const mask = $("#modalMask");

  function populateChapterSelect() {
    const sel = $("#fChapter");
    sel.innerHTML = '<option value="">暂不分章</option>';
    COURSE.chapters.forEach((c) => {
      const o = document.createElement("option");
      o.value = c.id;
      o.textContent = c.title;
      sel.appendChild(o);
    });
  }

  function populateSectionSelect() {
    const sel = $("#fSection");
    sel.innerHTML = '<option value="">未指定小节</option>';
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

  function openModal() {
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

  function setPendingFile(file) {
    if (!file) return clearPendingFile();
    const ok = /\.(html?|htm)$/i.test(file.name);
    if (!ok) {
      toast("请选择 .html 或 .htm 文件", true);
      return;
    }
    pendingFile = file;
    $("#fileName").textContent = file.name + "（" + (file.size / 1024).toFixed(1) + " KB）";
    $("#filePill").style.display = "flex";
    if (!$("#fTitle").value) {
      $("#fTitle").value = file.name.replace(/\.(html?|htm)$/i, "");
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

    const content = await new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = () => reject(fr.error);
      fr.readAsText(pendingFile, "utf-8");
    }).catch((e) => {
      toast("读取文件失败：" + (e && e.message), true);
    });
    if (content === undefined) return;

    const rec = {
      id: "u" + Date.now() + Math.random().toString(36).slice(2, 7),
      title,
      chapter: $("#fChapter").value,
      section: $("#fSection").value,
      desc: $("#fDesc").value.trim(),
      tags: $("#fTags")
        .value.split(/[,，\s]+/)
        .map((s) => s.trim())
        .filter(Boolean),
      type: "上传",
      content,
      createdAt: Date.now(),
    };

    try {
      await saveUpload(rec);
      await loadAll();
      closeModal();
      toast("已上传「" + title + "」");
    } catch (e) {
      toast("保存失败：" + e.message, true);
    }
  }

  // ---------- 事件绑定 ----------
  function bindEvents() {
    $(".nav-all").onclick = () => {
      state.chapter = "all";
      state.section = null;
      render();
    };
    $("#manageBtn").onclick = () => {
      state.onlyUploaded = !state.onlyUploaded;
      if (state.onlyUploaded) {
        state.chapter = "all";
        state.section = null;
        $("#manageBtn").textContent = "⬅ 查看全部";
      } else {
        $("#manageBtn").textContent = "🗂 我上传的资源";
      }
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
    $("#closeModal").onclick = closeModal;
    $("#cancelModal").onclick = closeModal;
    mask.addEventListener("click", (e) => {
      if (e.target === mask) closeModal();
    });
    $("#fChapter").addEventListener("change", populateSectionSelect);
    $("#saveResource").onclick = saveResource;

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
    loadAll()
      .catch((e) => toast("初始化失败：" + e.message, true));
  });
})();
