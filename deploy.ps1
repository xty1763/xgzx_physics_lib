# 一键部署到 Surge
# 用法：在 PowerShell 中执行  .\deploy.ps1
# 可选：.\deploy.ps1 my-subdomain   （指定子域名，默认用 surgename）

param(
  [string]$Domain = ""
)

$ErrorActionPreference = "Stop"

Write-Host "检查 Surge ..." -ForegroundColor Cyan
try {
  surge --version | Out-Null
} catch {
  Write-Host "未检测到 surge，尝试全局安装 ..." -ForegroundColor Yellow
  npm install -g surge
  if ($LASTEXITCODE -ne 0) { throw "安装 surge 失败，请手动执行 npm install -g surge" }
}

# 首次执行会要求登录 + 输入域名；以后会复用登录信息
if ($Domain) {
  surge . $Domain
} else {
  surge .
}

Write-Host ""
Write-Host "部署完成。若要发布到同样的地址，直接在 ./deploy.ps1 后加域名，或重复运行 surge ." -ForegroundColor Green
