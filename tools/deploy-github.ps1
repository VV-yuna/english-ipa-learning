param(
  [string]$ClientId = '178c6fc778ccc68e1d6a',
  [string]$RepoName = 'english-ipa-learning'
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$commonHeaders = @{
  Accept = 'application/json'
  'User-Agent' = 'Codex-English-IPA-Deploy'
}

Write-Host '正在向 GitHub 请求设备授权码……' -ForegroundColor Cyan
$device = Invoke-RestMethod -Method Post -Uri 'https://github.com/login/device/code' -Headers $commonHeaders -Body @{
  client_id = $ClientId
  scope = 'repo'
}

Write-Host ''
Write-Host '请在打开的 GitHub 页面中输入以下代码：' -ForegroundColor Yellow
Write-Host $device.user_code -ForegroundColor Green -BackgroundColor Black
Write-Host ''
Write-Host "授权页面：$($device.verification_uri)"
Start-Process $device.verification_uri
Write-Host '等待浏览器授权完成……' -ForegroundColor Cyan

$interval = [Math]::Max(5, [int]$device.interval)
$expiresAt = (Get-Date).AddSeconds([int]$device.expires_in)
$token = $null

while ((Get-Date) -lt $expiresAt -and -not $token) {
  Start-Sleep -Seconds $interval
  try {
    $tokenResponse = Invoke-RestMethod -Method Post -Uri 'https://github.com/login/oauth/access_token' -Headers $commonHeaders -Body @{
      client_id = $ClientId
      device_code = $device.device_code
      grant_type = 'urn:ietf:params:oauth:grant-type:device_code'
    }
    if ($tokenResponse.access_token) {
      $token = $tokenResponse.access_token
      break
    }
    switch ($tokenResponse.error) {
      'authorization_pending' { continue }
      'slow_down' { $interval += 5 }
      'expired_token' { throw 'GitHub 授权码已过期，请重新运行部署脚本。' }
      'access_denied' { throw 'GitHub 授权被拒绝。' }
      default { if ($tokenResponse.error) { throw "GitHub 授权失败：$($tokenResponse.error)" } }
    }
  } catch {
    if ($_.Exception.Message -match 'GitHub 授权') { throw }
    Start-Sleep -Seconds 3
  }
}

if (-not $token) { throw '等待 GitHub 授权超时。' }

$apiHeaders = @{
  Authorization = "Bearer $token"
  Accept = 'application/vnd.github+json'
  'User-Agent' = 'Codex-English-IPA-Deploy'
  'X-GitHub-Api-Version' = '2022-11-28'
}

$user = Invoke-RestMethod -Uri 'https://api.github.com/user' -Headers $apiHeaders
$login = $user.login
$repoUrl = "https://github.com/$login/$RepoName"
$pagesUrl = "https://$login.github.io/$RepoName/"

Write-Host "GitHub 授权成功：$login" -ForegroundColor Green

$readmePath = Join-Path $root 'README.md'
$readme = Get-Content -Raw -LiteralPath $readmePath
$readme = $readme -replace '正式部署使用 GitHub Pages。', "永久地址：$pagesUrl`r`n"
Set-Content -LiteralPath $readmePath -Value $readme -Encoding UTF8

git config user.name $login
git config user.email "$login@users.noreply.github.com"
git add -A
$changes = git status --porcelain
if ($changes) {
  git commit -m 'Build mobile-ready English IPA learning site'
}

try {
  $repo = Invoke-RestMethod -Uri "https://api.github.com/repos/$login/$RepoName" -Headers $apiHeaders
  if ($repo.size -gt 0) {
    throw "GitHub 仓库 $RepoName 已存在且不是空仓库，请确认是否可覆盖或改用其他仓库名。"
  }
} catch {
  if ($_.Exception.Message -match '已存在且不是空仓库') { throw }
  $statusCode = $_.Exception.Response.StatusCode.value__
  if ($statusCode -ne 404) { throw }
  $repoBody = @{
    name = $RepoName
    private = $false
    description = 'Mobile-ready English IPA learning website with local phoneme audio and articulation diagrams.'
    has_issues = $true
    has_wiki = $false
    auto_init = $false
  } | ConvertTo-Json
  $repo = Invoke-RestMethod -Method Post -Uri 'https://api.github.com/user/repos' -Headers $apiHeaders -Body $repoBody
}

$repoApi = "https://api.github.com/repos/$login/$RepoName"
$files = Get-ChildItem -LiteralPath $root -Recurse -File -Force | Where-Object {
  $relative = $_.FullName.Substring($root.Length + 1).Replace('\', '/')
  $relative -notmatch '^\.git/' -and $relative -notmatch '^\.edge-' -and $relative -notmatch '^\.chrome-'
}

$parents = @()
try {
  $ref = Invoke-RestMethod -Uri "$repoApi/git/ref/heads/main" -Headers $apiHeaders
  $parents = @($ref.object.sha)
} catch {
  $statusCode = $_.Exception.Response.StatusCode.value__
  if ($statusCode -ne 404 -and $statusCode -ne 409) { throw }
  $bootstrap = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes('bootstrap'))
  $bootstrapBody = @{ message = 'Initialize repository'; content = $bootstrap; branch = 'main' } | ConvertTo-Json -Compress
  Invoke-RestMethod -Method Put -Uri "$repoApi/contents/.bootstrap" -Headers $apiHeaders -Body $bootstrapBody | Out-Null
  for ($attempt = 0; $attempt -lt 10 -and $parents.Count -eq 0; $attempt++) {
    Start-Sleep -Seconds 2
    try {
      $ref = Invoke-RestMethod -Uri "$repoApi/git/ref/heads/main" -Headers $apiHeaders
      $parents = @($ref.object.sha)
    } catch { }
  }
  if ($parents.Count -eq 0) { throw 'GitHub 初始化提交尚未生效，请稍后重试。' }
}

function Get-GitBlobHash([string]$filePath) {
  $bytes = [IO.File]::ReadAllBytes($filePath)
  $header = [Text.Encoding]::ASCII.GetBytes("blob $($bytes.Length)`0")
  $all = New-Object byte[] ($header.Length + $bytes.Length)
  [Array]::Copy($header, 0, $all, 0, $header.Length)
  [Array]::Copy($bytes, 0, $all, $header.Length, $bytes.Length)
  $sha1 = [Security.Cryptography.SHA1]::Create()
  try {
    return ([BitConverter]::ToString($sha1.ComputeHash($all))).Replace('-', '').ToLowerInvariant()
  } finally {
    $sha1.Dispose()
  }
}

$remoteBlobShas = @{}
try {
  $remoteTree = Invoke-RestMethod -Uri "$repoApi/git/trees/main?recursive=1" -Headers $apiHeaders
  foreach ($entry in $remoteTree.tree) {
    if ($entry.type -eq 'blob') { $remoteBlobShas[$entry.sha] = $true }
  }
} catch {
  # The bootstrap commit may not be visible yet; the upload loop will retry.
}

$treeEntries = New-Object System.Collections.Generic.List[object]
$fileIndex = 0
foreach ($file in $files) {
  $fileIndex += 1
  $relative = $file.FullName.Substring($root.Length + 1).Replace('\', '/')
  $localSha = Get-GitBlobHash $file.FullName
  $blobSha = $null
  if ($remoteBlobShas.ContainsKey($localSha)) {
    $blobSha = $localSha
  }

  if (-not $blobSha) {
    $base64 = [Convert]::ToBase64String([IO.File]::ReadAllBytes($file.FullName))
    $blobBody = @{ content = $base64; encoding = 'base64' } | ConvertTo-Json -Compress
    for ($attempt = 1; $attempt -le 5; $attempt++) {
      try {
        $blob = Invoke-RestMethod -Method Post -Uri "$repoApi/git/blobs" -Headers $apiHeaders -Body $blobBody
        $blobSha = $blob.sha
        break
      } catch {
        if ($attempt -eq 5) { throw }
        Start-Sleep -Seconds (2 * $attempt)
      }
    }
  }

  $treeEntries.Add([pscustomobject]@{
    path = $relative
    mode = '100644'
    type = 'blob'
    sha = $blobSha
  })
  if ($fileIndex % 20 -eq 0 -or $fileIndex -eq $files.Count) {
    Write-Host "已处理 $fileIndex / $($files.Count) 个文件……" -ForegroundColor Cyan
  }
}

$treeBody = @{ tree = $treeEntries.ToArray() } | ConvertTo-Json -Depth 6 -Compress
$tree = Invoke-RestMethod -Method Post -Uri "$repoApi/git/trees" -Headers $apiHeaders -Body $treeBody

$commitBody = @{
  message = 'Build mobile-ready English IPA learning site'
  tree = $tree.sha
  parents = $parents
} | ConvertTo-Json -Depth 4 -Compress
$commit = Invoke-RestMethod -Method Post -Uri "$repoApi/git/commits" -Headers $apiHeaders -Body $commitBody

if ($parents.Count -gt 0) {
  $refBody = @{ sha = $commit.sha; force = $false } | ConvertTo-Json -Compress
  Invoke-RestMethod -Method Patch -Uri "$repoApi/git/refs/heads/main" -Headers $apiHeaders -Body $refBody | Out-Null
} else {
  $refBody = @{ ref = 'refs/heads/main'; sha = $commit.sha } | ConvertTo-Json -Compress
  Invoke-RestMethod -Method Post -Uri "$repoApi/git/refs" -Headers $apiHeaders -Body $refBody | Out-Null
}

Start-Sleep -Seconds 3
$pagesBody = @{ source = @{ branch = 'main'; path = '/' } } | ConvertTo-Json -Depth 4
try {
  Invoke-RestMethod -Method Post -Uri "https://api.github.com/repos/$login/$RepoName/pages" -Headers $apiHeaders -Body $pagesBody | Out-Null
} catch {
  $statusCode = $_.Exception.Response.StatusCode.value__
  if ($statusCode -eq 409) {
    Invoke-RestMethod -Method Put -Uri "https://api.github.com/repos/$login/$RepoName/pages" -Headers $apiHeaders -Body $pagesBody | Out-Null
  } else {
    throw
  }
}

for ($attempt = 0; $attempt -lt 40; $attempt++) {
  Start-Sleep -Seconds 5
  $pages = Invoke-RestMethod -Uri "https://api.github.com/repos/$login/$RepoName/pages" -Headers $apiHeaders
  if ($pages.status -eq 'built' -or $pages.html_url) {
    Write-Host "永久地址：$($pages.html_url)" -ForegroundColor Green
    break
  }
}

Write-Host "仓库地址：$repoUrl" -ForegroundColor Green
Write-Host "GitHub Pages：$pagesUrl" -ForegroundColor Green






