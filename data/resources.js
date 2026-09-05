/*
 * 高中物理教学资源库 —— 预置资源清单（manifest）
 *
 * 每个资源为一个对象：
 *   id        唯一标识（必填）
 *   title     资源标题（必填）
 *   desc      一句话描述（可选）
 *   book      所属教材 id   （对应 course-data.js 中的 books[].id）
 *   chapter   所属章 id     （corresponds chapters[].id）
 *   section   所属节 id     （corresponds sections[].id）；试卷资源可为 ""（不挂小节）
 *   url       资源地址（相对本网站的路径）。上传型资源不用填。
 *   tags      标签数组，用于搜索
 *   type      资源类型，取 COURSE.resourceTypes 之一：练习/试卷/课件/教案/仿真资源
 *
 * 说明：
 *   - 永久挂载资源：把 HTML 放进 pages/ 目录，在这里加一条记录，url 指到对应文件即可。
 *   - 管理员通过网页“上传资源”发布的内容，会自动写入这个文件（并同步到仓库）。
 *   - type 为 “试卷” 的资源可不填 section。
 */
window.MANIFEST = [
  {
    id: "demo-ch1s1-a",
    title: "第一章示范资源（空页测试）",
    desc: "点击可进入必修一第一章第一个测试网页（空白页）。",
    book: "b1",
    chapter: "b1c1",
    section: "b1c1s1",
    url: "pages/ch1-s1.html",
    tags: ["示范", "测试"],
    type: "课件"
  },
  {
    id: "demo-ch2s1-a",
    title: "第二章示范资源（空页测试）",
    desc: "点击可进入必修一第二章第一个测试网页（空白页）。",
    book: "b1",
    chapter: "b1c2",
    section: "b1c2s1",
    url: "pages/ch2-s1.html",
    tags: ["示范", "测试"],
    type: "练习"
  }
];
