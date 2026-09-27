/*
 * 把工作台打包成「单文件 HTML」：样式+数据+逻辑全部内联，
 * 部署时只需把 1 个文件放到服务器上即可（无需 CDN、无需 clone）。
 * 用法：node workbench/build-single.js
 */
const fs = require('fs');
const path = require('path');
const WB = path.join(__dirname);
const read = (p) => fs.readFileSync(path.join(WB, p), 'utf8');
const safe = (js) => js.replace(/<\/script/gi, '<\\/script');

let html = read('index.html');

// 1) 内联样式
html = html.replace(/<link rel="stylesheet" href="styles\.css\?v=\d+"\s*\/>/, '<style>\n' + safe(read('styles.css')) + '\n</style>');

// 2) 内联脚本（保持原顺序：course-data → catalog → modules → app）
const scripts = [
  ['data/course-data.js', 'data/course-data.js'],
  ['data/catalog.js', 'data/catalog.js'],
  ['data/modules.js', 'data/modules.js'],
  ['app.js', 'app.js'],
];
for (const [tagPath, file] of scripts) {
  const re = new RegExp('<script src="' + tagPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\?v=\\d+"><\\/script>');
  if (!re.test(html)) { console.error('未找到脚本标签: ' + tagPath); process.exit(1); }
  html = html.replace(re, '<script>\n' + safe(read(file)) + '\n</script>');
}

// 3) 加个说明注释
html = html.replace('<head>', '<head>\n  <!-- 单文件版：样式/数据/逻辑已全部内联；部署时只需这一个文件（或改名为 index.html） -->');

const out = path.join(WB, 'workbench-single.html');
fs.writeFileSync(out, html, 'utf8');
console.log('已生成 ' + out + '  大小=' + (fs.statSync(out).size / 1024).toFixed(0) + ' KB');
console.log('内联脚本: ' + scripts.map((s) => s[1]).join(', '));
