# 英语音标学习网页

一个无需后端、无需构建工具的响应式静态网站，包含 48 个传统教学口径的英语国际音标。

## 永久地址

<https://vv-yuna.github.io/english-ipa-learning/>

外部重新打开网站时会先显示包含全部 48 个音标的主页。单个音标详情只在用户主动点击后打开。

## 本地运行

录音和语音识别需要通过 `localhost` 或 HTTPS 打开。项目附带一个只使用 Node.js 内置模块的本地服务器：

```powershell
node server.js
```

然后打开 <http://localhost:4173>。

## 已实现功能

- 48 个音标按元音、辅音及发音方式分组展示
- 元音和双元音使用公开真人录音
- 24 个英语辅音直接使用爱荷华大学 Sounds of Speech 的独立真人示范
- `/tr dr ts dz/` 使用完整真人例词，不截取或拼接
- 不使用 eSpeak、AI 或浏览器语音合成
- 英音和美音相同的音素只显示一个播放按钮
- 48 张本地 SVG 口型图，同时展示正面口型和侧面舌位
- 每个音标提供 5 个例词，优先播放金山词霸/爱词霸真人词典音频
- 手机优先播放逻辑、录音、语音识别、本地质量分析和回放
- 录音不会上传或持久化，刷新页面后即释放

## 重新生成资源

```powershell
node .\tools\build-human-audio.js
node .\tools\generate-word-audio-map.js
node .\tools\generate-diagrams.js
node .\tools\verify-assets.js
```

真人音素来源和许可证见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。例词音频失败时会提示重试，不会改用 AI 发音。




