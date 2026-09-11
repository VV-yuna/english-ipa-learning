# 英语音标学习网页

一个无需后端、无需构建工具的响应式静态网站，包含 48 个传统教学口径的英语国际音标。

## 本地运行

录音和语音识别需要通过 `localhost` 或 HTTPS 打开。项目附带一个只使用 Node.js 内置模块的本地服务器：

```powershell
node server.js
```

然后在浏览器打开 <http://localhost:4173>。

## 已实现功能

- 按元音、辅音及发音方式分组展示 48 个音标
- 96 个本地单音素 WAV：每个音标均有英音和美音版本，不播放示例单词
- 48 张本地 SVG 口型图，同时展示正面口型和侧面舌位
- 每个音标提供 5 个例词，可分别播放英音和美音
- 音素播放采用 HTML Audio 直接播放和 Web Audio 兜底，适配手机用户手势限制
- 浏览器录音、语音识别、本地录音质量分析和 0–100 分评价
- 录音回放与重新跟读
- 录音不会上传或持久化，刷新页面后即释放

## 资源说明

音素音频由 eSpeak NG 1.52.0 离线生成，详细许可见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。口型图由项目的 SVG 生成脚本创建。

重新生成资源：

```powershell
# 使用已安装的 espeak-ng.exe
.\tools\generate-audio.ps1 -Espeak "C:\path\to\espeak-ng.exe"
node .\tools\generate-diagrams.js
node .\tools\verify-assets.js
```

例词音频优先来自金山词霸/爱词霸网页词典，失败时回退其他在线词典和浏览器英文语音合成。孤立音素音频和 SVG 口型图均不依赖网络。

## 临时公网分享

需要临时分享时运行：

```powershell
powershell -ExecutionPolicy Bypass -File .\start-public.ps1
```

该方式依赖当前电脑和终端进程，不适合长期使用。永久地址：https://VV-yuna.github.io/english-ipa-learning/











