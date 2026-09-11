param(
  [string]$Espeak = $env:ESPEAK_NG
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
if (-not $Espeak) {
  $candidates = @(
    (Join-Path $env:TEMP 'espeak-ng-extracted\espeak-ng.exe'),
    (Join-Path $env:TEMP 'espeak-ng-extracted\eSpeak NG\espeak-ng.exe')
  )
  $Espeak = $candidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
}
if (-not $Espeak -or -not (Test-Path -LiteralPath $Espeak)) {
  throw '未找到 espeak-ng.exe。请通过 -Espeak 参数或 ESPEAK_NG 环境变量指定路径。'
}
$espeakDir = Split-Path -Parent $Espeak

$audioKeys = [ordered]@{
  'i-long'='i:'; 'i-short'='I'; 'e'='E'; 'ae'='a'; 'a-long'='A:'; 'o-short'='0';
  'aw-long'='O:'; 'u-short'='U'; 'u-long'='u:'; 'caret'='V'; 'er-long'='3:'; 'schwa'='@';
  'ei'='eI'; 'ai'='aI'; 'oi'='OI'; 'oh'='oU'; 'au'='aU'; 'ia'='I@'; 'ea'='e@'; 'ua'='U@';
  'p'='p'; 'b'='b'; 't'='t'; 'd'='d'; 'k'='k'; 'g'='g'; 'f'='f'; 'v'='v';
  'th-voiceless'='T'; 'th-voiced'='D'; 's'='s'; 'z'='z'; 'sh'='S'; 'zh'='Z'; 'h'='h';
  'ch'='tS'; 'j-sound'='dZ'; 'tr'='tr'; 'dr'='dr'; 'ts'='ts'; 'dz'='dz';
  'm'='m'; 'n'='n'; 'ng'='N'; 'l'='l'; 'r'='r'; 'y'='j'; 'w'='w'
}

$voices = [ordered]@{ uk = 'en-gb'; us = 'en-us' }
$tempRoot = Join-Path $env:TEMP 'espeak-ipa-output'
foreach ($accent in $voices.Keys) {
  $output = Join-Path $root "assets\audio\$accent"
  $tempOutput = Join-Path $tempRoot $accent
  New-Item -ItemType Directory -Force -Path $output | Out-Null
  New-Item -ItemType Directory -Force -Path $tempOutput | Out-Null
}

foreach ($entry in $audioKeys.GetEnumerator()) {
  foreach ($accent in $voices.Keys) {
    $outFile = Join-Path $root "assets\audio\$accent\$($entry.Key).wav"
    $tempFile = Join-Path $tempRoot "$accent\$($entry.Key).wav"
    & $Espeak "--path=$espeakDir" -v $voices[$accent] -s 125 -p 48 -w $tempFile "[[$($entry.Value)]]"
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $tempFile) -or (Get-Item -LiteralPath $tempFile).Length -lt 500) {
      throw "生成失败：$accent /$($entry.Key)/ ($($entry.Value))"
    }
    Copy-Item -LiteralPath $tempFile -Destination $outFile -Force
  }
}

Write-Host "Generated $($audioKeys.Count * $voices.Count) phoneme audio files." -ForegroundColor Green


