/*
 * 高中物理教学资源库 —— 预置资源清单（manifest）
 *
 * 每个资源为一个对象：
 *   id        唯一标识（必填）
 *   title     资源标题（必填）
 *   desc      一句话描述（可选）
 *   chapter   所属章 id（对应 course-data.js 中的 chapters[].id）
 *   section   所属节 id（对应 sections[].id），可为 null
 *   url       资源地址（相对本网站的路径）。上传型资源不用填。
 *   tags      标签数组，用于搜索
 *   type      类型标签，如 "演示" / "实验" / "动画" / "课件"
 *
 * 说明：
 *   - 如果你想在网站上永久挂一个自己写的 HTML 资源，把文件放进 pages/ 目录，
 *     然后在这里加一条记录，把 url 指到对应文件即可。
 *   - 网页右下角/顶部的“上传资源”按钮，会把上传的 HTML 保存在【当前浏览器】里，
 *     用于快速测试，上传的资源只会在这台设备的这个浏览器里可见。
 */
window.MANIFEST = [
  {
    id: "demo-ch1s1-a",
    title: "第一章示范资源（空页测试）",
    desc: "点击可进入第一章第一个测试网页（空白页）。",
    chapter: "ch1",
    section: "ch1s1",
    url: "pages/ch1-s1.html",
    tags: ["示范", "测试"],
    type: "测试页"
  },
  {
    id: "demo-ch2s1-a",
    title: "第二章示范资源（空页测试）",
    desc: "点击可进入第二章第一个测试网页（空白页）。",
    chapter: "ch2",
    section: "ch2s1",
    url: "pages/ch2-s1.html",
    tags: ["示范", "测试"],
    type: "测试页"
  }
];
