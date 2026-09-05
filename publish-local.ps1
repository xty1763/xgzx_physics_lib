# 一键同步本地修改到线上（GitHub Pages）
# 用法：在 physics-lib 目录执行  .\publish-local.ps1  ["提交说明"]
# 它会：拉取最新 -> 暂存改动 -> 提交 -> 推送；一次性完成，不用记 git 命令。
param(
  [string]$Message = "更新资源"
)

$ErrorActionPreference = "Stop"

Write-Host "1/3 拉取线上最新 ..." -ForegroundColor Cyan
git pull --rebase
if ($LASTEXITCODE -ne 0) { throw "拉取失败，请检查网络或先处理冲突" }

Write-Host "2/3 提交本地改动 ..." -ForegroundColor Cyan
git add -A
git commit -m $Message
if ($LASTEXITCODE -eq 0) {
  Write-Host "   已提交：$Message" -ForegroundColor Green
} else {
  Write-Host "   无新改动可提交（或提交失败）" -ForegroundColor Yellow
}

Write-Host "3/3 推送到线上 ..." -ForegroundColor Cyan
git push
if ($LASTEXITCODE -ne 0) { throw "推送失败，请检查网络" }

Write-Host "完成！GitHub Pages 约 1 分钟后自动更新。" -ForegroundColor Green
