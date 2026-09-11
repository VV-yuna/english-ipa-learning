(function () {
  'use strict';

  var appView = document.getElementById('app-view');
  var toastRegion = document.getElementById('toast-region');
  var audio = window.IPAAudio;
  var data = window.IPA_DATA || [];
  var byId = window.IPA_BY_ID || {};
  var groupMeta = window.IPA_GROUPS || {};
  var activeRecorder = null;
  var selectedAccent = 'uk';
  var routeToken = 0;
  var initialRouteHandled = false;

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function escapeAttribute(value) { return escapeHtml(value); }
  function groupTitle(key) { return groupMeta[key] ? groupMeta[key].title : key; }
  function accentLabel(accent) { return accent === 'us' ? '美音' : '英音'; }

  function speakerIcon() {
    return '<svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4V5Z"></path><path d="M15 9a4 4 0 0 1 0 6"></path><path d="M18 6.5a7.5 7.5 0 0 1 0 11"></path></svg>';
  }

  function arrowIcon() {
    return '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"></path></svg>';
  }

  function micIcon() {
    return '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"></rect><path d="M5 10a7 7 0 0 0 14 0"></path><path d="M12 17v4"></path><path d="M8 21h8"></path></svg>';
  }

  function stopIcon() {
    return '<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="5" width="14" height="14" rx="2"></rect></svg>';
  }

  function showToast(message, kind) {
    if (!message) return;
    var toast = document.createElement('div');
    toast.className = 'toast' + (kind === 'warning' ? ' is-warning' : '');
    toast.textContent = message;
    toastRegion.appendChild(toast);
    window.setTimeout(function () {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(6px)';
      window.setTimeout(function () { toast.remove(); }, 180);
    }, kind === 'warning' ? 5200 : 3500);
  }

  function reportAudioResult(result) {
    if (!result || result.source === 'dictionary' || result.source === 'local-audio' ||
        result.source === 'web-audio' || result.source === 'cancelled') return;
    if (result.source === 'phoneme-error') {
      showToast('音素音频未能播放，请检查媒体音量或手机静音开关后重试。', 'warning');
      return;
    }
    if (result.source === 'no-human-audio' || result.source === 'unavailable') {
      showToast('真人音频暂时不可用，请检查网络后重试；网站不会改用 AI 发音。', 'warning');
    }
  }

  async function playWithButton(button, value, accent, kind) {
    if (button.disabled) return null;
    audio.unlock();
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    try {
      var result = kind === 'phoneme'
        ? await audio.playPhoneme(value, accent)
        : await audio.playWord(value, accent);
      reportAudioResult(result);
      return result;
    } finally {
      button.disabled = false;
      button.removeAttribute('aria-busy');
    }
  }

  async function playExampleWithButton(button, elementId, word, accent) {
    if (button.disabled) return null;
    audio.unlock();
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    try {
      var result = await audio.playWordElement(elementId, word, accent);
      reportAudioResult(result);
      return result;
    } finally {
      button.disabled = false;
      button.removeAttribute('aria-busy');
    }
  }

  function teardownPractice() {
    audio.stop();
    if (activeRecorder) {
      activeRecorder.destroy(true);
      activeRecorder = null;
    }
  }

  function renderHome() {
    teardownPractice();
    routeToken += 1;
    document.title = '英语音标学习｜48 个国际音标';
    var vowels = data.filter(function (item) { return item.type === 'vowel'; });
    var consonants = data.filter(function (item) { return item.type === 'consonant'; });

    function cardHtml(item) {
      return '<a class="phoneme-card" href="#/phoneme/' + encodeURIComponent(item.id) + '" aria-label="学习音标 /' + escapeAttribute(item.symbol) + '/">' +
        '<span class="phoneme-card-symbol">/' + escapeHtml(item.symbol) + '/</span>' +
        '<span class="phoneme-card-label">' + escapeHtml(groupTitle(item.group)) + '</span>' +
      '</a>';
    }

    function section(type, title, description, items) {
      var groupKeys = Object.keys(groupMeta).filter(function (key) { return groupMeta[key].type === type; });
      var groups = groupKeys.map(function (key) {
        var groupItems = items.filter(function (item) { return item.group === key; });
        if (!groupItems.length) return '';
        return '<div class="group-block" id="group-' + key + '">' +
          '<h3 class="group-title">' + escapeHtml(groupMeta[key].title) + '</h3>' +
          '<p class="group-description">' + escapeHtml(groupMeta[key].description) + '</p>' +
          '<div class="phoneme-grid">' + groupItems.map(cardHtml).join('') + '</div>' +
        '</div>';
      }).join('');

      return '<section class="catalog-section" id="' + type + 's">' +
        '<div class="section-heading"><div><h2>' + escapeHtml(title) + '</h2><p>' + escapeHtml(description) + '</p></div>' +
        '<span class="section-count">' + items.length + ' 个</span></div>' + groups + '</section>';
    }

    appView.innerHTML =
      '<section class="hero"><span class="eyebrow">从听清到读准</span>' +
        '<h1>认识 48 个<span>国际音标</span></h1>' +
        '<p class="hero-copy">点击任意音标，查看英音与美音发音、口型提示和单词示例，还可以录音跟读并获得即时反馈。</p>' +
        '<nav class="quick-nav" aria-label="音标分类快捷导航"><a href="#vowels">元音 · 20</a><a href="#consonants">辅音 · 28</a>' +
        '<a href="#group-monophthong">单元音</a><a href="#group-diphthong">双元音</a></nav></section>' +
      '<div class="catalog">' +
        section('vowel', '元音', '气流不受明显阻碍，重点感受口型、舌位和长短。', vowels) +
        section('consonant', '辅音', '注意发音部位、清浊差别，以及气流释放方式。', consonants) +
      '</div>';
    window.scrollTo(0, 0);
  }

  function detailHtml(item) {
    var isSameSymbol = item.uk === item.us;
    var accentSummary = isSameSymbol
      ? '英音与美音使用相同符号，但实际语音和重音细节仍可能不同。'
      : '美音常用符号为 /' + escapeHtml(item.us) + '/，请结合例词观察实际变化。';

    return '<div class="detail-page">' +
      '<div class="phoneme-audio-bank" aria-hidden="true">' +
        '<audio id="phoneme-audio-uk" preload="auto" playsinline src="' + escapeAttribute(item.audio.uk) + '"></audio>' +
        '<audio id="phoneme-audio-us" preload="auto" playsinline src="' + escapeAttribute(item.audio.us) + '"></audio>' +
      '</div>' + wordAudioBankHtml(item) +
      '<div class="detail-toolbar">' +
        '<a class="back-button" href="#/">' + arrowIcon() + '返回全部音标</a>' +
        '<span class="toolbar-index">' + escapeHtml(groupTitle(item.group)) + ' · ' + (item.type === 'vowel' ? '元音' : '辅音') + '</span></div>' +
      '<section class="detail-hero" aria-labelledby="phoneme-title">' +
        '<div class="symbol-panel"><div class="detail-symbol" aria-label="音标 /' + escapeAttribute(item.symbol) + '/">/' + escapeHtml(item.symbol) + '/</div>' +
          '<div class="symbol-type">' + escapeHtml(groupTitle(item.group)) + '</div></div>' +
        '<figure class="articulation-panel"><a class="diagram-link" href="' + escapeAttribute(item.diagram.src) + '" target="_blank" rel="noopener" aria-label="放大查看音标 /' + escapeAttribute(item.symbol) + '/ 的口型舌位图">' +
          '<img src="' + escapeAttribute(item.diagram.src) + '" alt="' + escapeAttribute(item.diagram.alt) + '" width="720" height="360">' +
          '</a><figcaption>正面口型 + 侧面舌位 · 点击放大查看</figcaption></figure>' +
        '<div class="detail-info"><h1 id="phoneme-title">音标 <span class="inline-ipa">/' + escapeHtml(item.symbol) + '/</span></h1>' +
          '<p>' + accentSummary + '</p><div class="tip-box"><strong>口型提示</strong><span>' + escapeHtml(item.tip) + '</span></div>' +
          '<div class="anchor-line">跟读锚定词：<strong>' + escapeHtml(item.anchor) + '</strong> · 可帮助稳定判断目标音</div></div>' +
      '</section>' +
      '<section class="panel" aria-labelledby="accent-heading"><div class="panel-heading"><div><h2 id="accent-heading">英音与美音</h2><p>选择跟读口音，或播放真人录音；标注“共用”的音素两版相同。</p></div></div>' +
        '<div class="accent-grid' + (item.audio.shared ? ' accent-grid-single' : '') + '">' +
          (item.audio.shared ? sharedAudioCardHtml(item) : accentCardHtml(item, 'uk') + accentCardHtml(item, 'us')) +
        '</div></section>' +
      '<section class="panel" aria-labelledby="examples-heading"><div class="panel-heading"><div><h2 id="examples-heading">5 个单词示例</h2>' +
        '<p>单词使用深蓝色显示，每个例词都可分别播放英音和美音。</p></div></div>' +
        '<div class="example-list">' + item.examples.map(exampleHtml).join('') + '</div>' +
        '<div class="speech-note">' + speakerIcon() + '<span>音素使用公开许可真人录音，不使用 AI 发音；例词使用金山词霸/爱词霸真人词典音频。</span></div></section>' +
      practiceHtml(item) + '</div>';
  }

  function wordAudioBankHtml(item) {
    return '<div class="word-audio-bank" aria-hidden="true">' + item.examples.map(function (example, index) {
      return ['uk', 'us'].map(function (accent) {
        return '<audio id="word-audio-' + index + '-' + accent + '" preload="none" playsinline></audio>';
      }).join('');
    }).join('') + '</div>';
  }

  function sharedAudioCardHtml(item) {
    var isComposite = item.audio.kind === 'human-composite';
    var isHumanWord = item.audio.kind === 'human-word';
    var description = isHumanWord
      ? '该教学连缀没有独立单音录音，使用完整真人例词示范，不截取、不拼接。'
      : (isComposite ? '由公开真人单音录制的组合音；英音和美音共用。' : '爱荷华大学 Sounds of Speech 独立真人音素示范；英音和美音相同。');
    var buttonText = isHumanWord ? '播放真人例词：' + item.audio.label : '播放真人发音';
    return '<article class="accent-card is-selected shared-accent-card" data-accent-card="shared">' +
      '<div class="accent-card-top"><span class="accent-name">真人发音</span><span class="accent-symbol">英/美相同</span></div>' +
      '<p>' + description + '</p><div class="record-controls">' +
        '<button class="primary-button" type="button" data-play-phoneme="uk" data-phoneme-id="' + escapeAttribute(item.id) + '">' + speakerIcon() + buttonText + '</button>' +
      '</div><div class="demo-note">' + (isHumanWord ? '完整真人例词' : (isComposite ? '真人录音组合' : '官方独立真人音素')) + '</div></article>';
  }

  function accentCardHtml(item, accent) {
    var selected = selectedAccent === accent;
    var symbol = accent === 'us' ? item.us : item.uk;
    var shared = item.audio && item.audio.shared;
    var isComposite = item.audio && item.audio.kind === 'human-composite';
    var description = shared
      ? (isComposite ? '真人录音组合；英音和美音共用同一标准录音。' : '公开许可真人单音；英音和美音共用同一标准录音。')
      : (accent === 'us' ? '播放美式真人单音。' : '播放英式真人单音。');
    return '<article class="accent-card' + (selected ? ' is-selected' : '') + '" data-accent-card="' + accent + '">' +
      '<div class="accent-card-top"><span class="accent-name">' + accentLabel(accent) + '</span><span class="accent-symbol">/' + escapeHtml(symbol) + '/</span></div>' +
      '<p>' + description + '</p><div class="record-controls">' +
        '<button class="secondary-button" type="button" data-select-accent="' + accent + '" aria-pressed="' + String(selected) + '">' + (selected ? '当前跟读口音' : '选择' + accentLabel(accent)) + '</button>' +
        '<button class="primary-button" type="button" data-play-phoneme="' + accent + '" data-phoneme-id="' + escapeAttribute(item.id) + '">' + speakerIcon() + '播放' + accentLabel(accent) + '真人音素</button>' +
      '</div><div class="demo-note">' + (isComposite ? '真人录音组合' : '真人单音') + (shared ? ' · 英/美共用' : '') + '</div></article>';
  }

  function exampleHtml(example, index) {
    return '<div class="example-row"><div class="example-word">' + escapeHtml(example.word) + '</div>' +
      '<div class="transcription transcription-uk"><small>英音</small>/' + escapeHtml(example.ukIpa) + '/</div>' +
      '<div class="transcription transcription-us"><small>美音</small>/' + escapeHtml(example.usIpa) + '/</div>' +
      '<div class="example-actions">' +
        '<button class="example-play" type="button" data-example-word="' + escapeAttribute(example.word) + '" data-example-index="' + index + '" data-example-accent="uk" aria-label="播放 ' + escapeAttribute(example.word) + ' 的英音">英</button>' +
        '<button class="example-play" type="button" data-example-word="' + escapeAttribute(example.word) + '" data-example-index="' + index + '" data-example-accent="us" aria-label="播放 ' + escapeAttribute(example.word) + ' 的美音">美</button>' +
      '</div></div>';
  }

  function practiceHtml(item) {
    var recognitionHint = window.IPARecorder.isRecognitionSupported()
      ? '录音时会尝试在线语音识别；不可用时会自动改为录音质量评分。'
      : '当前浏览器不支持英文语音识别，将使用录音质量评分。';
    var audioLabel = item.audio.shared ? '真人发音（英/美共用）' : accentLabel(selectedAccent);
    return '<section class="panel" aria-labelledby="practice-heading"><div class="panel-heading"><div><h2 id="practice-heading">跟读练习</h2>' +
      '<p>先听孤立音素，再录音朗读锚定例词；录音只保存在当前设备。</p></div></div>' +
      '<p class="practice-copy">当前目标：朗读 <strong id="practice-word">' + escapeHtml(item.anchor) + '</strong>，使用 <strong id="practice-accent">' + escapeHtml(audioLabel) + '</strong>。' + recognitionHint + '</p>' +
      '<div class="practice-shell"><div class="record-zone"><div class="record-controls">' +
        '<button class="primary-button record-button" type="button" id="follow-button">' + micIcon() + '开始跟读</button>' +
        '<button class="secondary-button stop-button" type="button" id="stop-button">' + stopIcon() + '停止录音</button>' +
      '</div><div class="recording-status" id="recording-status">点击按钮后，会先播放标准示范，再开始录音。</div>' +
      '<div class="level-meter" aria-hidden="true"><span id="level-bar"></span></div>' +
      '<div class="recording-timer" id="recording-timer">00:00 / 00:06</div></div>' +
      '<div class="result-zone" id="result-zone" aria-live="polite"><div class="result-placeholder"><strong>/ˈrɛdi/</strong><p>完成录音后，这里会显示评分与回放。</p></div></div>' +
      '</div></section>';
  }

  function renderDetail(id) {
    teardownPractice();
    routeToken += 1;
    var item = byId[id];
    if (!item) { renderNotFound(); return; }

    document.title = '/' + item.symbol + '/ 音标学习｜英语音标学习';
    appView.innerHTML = detailHtml(item);
    audio.preloadPhoneme(item.id);
    audio.preloadWords(item.examples.map(function (example) { return example.word; }));

    var followButton = document.getElementById('follow-button');
    var stopButton = document.getElementById('stop-button');
    followButton.addEventListener('click', function () { startFollow(item); });
    stopButton.addEventListener('click', function () {
      if (activeRecorder) activeRecorder.stop();
    });

    appView.querySelectorAll('[data-select-accent]').forEach(function (button) {
      button.addEventListener('click', function () {
        selectedAccent = button.getAttribute('data-select-accent') === 'us' ? 'us' : 'uk';
        updateAccentSelection();
      });
    });
    appView.querySelectorAll('[data-play-phoneme]').forEach(function (button) {
      button.addEventListener('click', function () {
        playWithButton(button, button.getAttribute('data-phoneme-id'), button.getAttribute('data-play-phoneme'), 'phoneme');
      });
    });
    appView.querySelectorAll('[data-example-word]').forEach(function (button) {
      button.addEventListener('click', function () {
        var accent = button.getAttribute('data-example-accent');
        var index = button.getAttribute('data-example-index');
        playExampleWithButton(button, 'word-audio-' + index + '-' + accent, button.getAttribute('data-example-word'), accent);
      });
    });
    window.scrollTo(0, 0);
  }

  function updateAccentSelection() {
    appView.querySelectorAll('[data-accent-card]').forEach(function (card) {
      var accent = card.getAttribute('data-accent-card');
      var selected = accent === selectedAccent;
      card.classList.toggle('is-selected', selected);
      var selectButton = card.querySelector('[data-select-accent]');
      if (selectButton) {
        selectButton.setAttribute('aria-pressed', String(selected));
        selectButton.textContent = selected ? '当前跟读口音' : '选择' + accentLabel(accent);
      }
    });
    var currentItem = byId[getRouteId()];
    var label = document.getElementById('practice-accent');
    if (label) label.textContent = currentItem && currentItem.audio && currentItem.audio.shared ? '真人发音（英/美共用）' : accentLabel(selectedAccent);
  }

  function setRecordingUi(mode) {
    var followButton = document.getElementById('follow-button');
    var stopButton = document.getElementById('stop-button');
    if (!followButton || !stopButton) return;
    var controlsLocked = mode !== 'idle' && mode !== 'complete';
    appView.querySelectorAll('[data-select-accent], [data-play-phoneme], [data-example-word]').forEach(function (button) {
      button.disabled = controlsLocked;
    });
    if (mode === 'preparing') {
      followButton.disabled = true;
      followButton.innerHTML = micIcon() + '播放示范中';
      stopButton.classList.remove('is-visible');
    } else if (mode === 'recording') {
      followButton.disabled = true;
      followButton.innerHTML = micIcon() + '正在跟读';
      stopButton.classList.add('is-visible');
    } else if (mode === 'stopping') {
      followButton.disabled = true;
      stopButton.disabled = true;
      stopButton.classList.remove('is-visible');
    } else if (mode === 'complete') {
      followButton.disabled = false;
      followButton.innerHTML = micIcon() + '重新跟读';
      stopButton.disabled = false;
      stopButton.classList.remove('is-visible');
    } else {
      followButton.disabled = false;
      followButton.innerHTML = micIcon() + '开始跟读';
      stopButton.disabled = false;
      stopButton.classList.remove('is-visible');
    }
  }

  function setStatus(text, live) {
    var status = document.getElementById('recording-status');
    if (status) status.innerHTML = '<span class="status-dot' + (live ? ' is-live' : '') + '"></span>' + escapeHtml(text);
  }

  function formatTime(milliseconds) {
    var seconds = Math.max(0, Math.floor(milliseconds / 1000));
    return '00:' + String(seconds).padStart(2, '0') + ' / 00:06';
  }

  function setLevel(level) {
    var bar = document.getElementById('level-bar');
    if (bar) bar.style.width = Math.round(clamp(level * 100, 4, 100)) + '%';
  }

  function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }

  function showRecorderError(error) {
    var resultZone = document.getElementById('result-zone');
    if (!resultZone) return;
    resultZone.innerHTML = '<div class="error-panel">' + escapeHtml(window.IPARecorder.getErrorMessage(error)) + '</div>' +
      '<div class="result-actions"><button class="secondary-button" type="button" data-retry-follow>再试一次</button></div>';
    setStatus('录音未完成，请按提示检查权限或设备。', false);
    setRecordingUi('idle');
    var retry = resultZone.querySelector('[data-retry-follow]');
    if (retry) retry.addEventListener('click', function () {
      var item = byId[getRouteId()];
      if (item) startFollow(item);
    });
  }

  async function startFollow(item) {
    if (!item || !window.IPARecorder) return;
    var token = routeToken;
    var followButton = document.getElementById('follow-button');
    if (!followButton || followButton.disabled) return;
    if (activeRecorder) {
      activeRecorder.destroy(true);
      activeRecorder = null;
    }

    var accent = selectedAccent;
    setRecordingUi('preparing');
    setStatus('正在播放' + (item.audio.shared ? '真人' : accentLabel(accent)) + '音素 /' + item.symbol + '/……', false);
    setLevel(0.04);
    var resultZone = document.getElementById('result-zone');
    if (resultZone) resultZone.innerHTML = '<div class="result-placeholder"><strong>···</strong><p>正在准备录音。</p></div>';

    audio.unlock();
    var playback = await audio.playPhoneme(item.id, accent);
    reportAudioResult(playback);
    if (token !== routeToken) return;
    if (!playback || playback.source === 'cancelled') {
      setRecordingUi('idle');
      setStatus('播放已取消。', false);
      return;
    }

    setStatus('请清楚朗读“' + item.anchor + '”。', true);
    var recorder = new window.IPARecorder.FollowRecorder();
    activeRecorder = recorder;
    try {
      var result = await recorder.start({
        word: item.anchor,
        accent: accent,
        onRecording: function (detail) {
          if (token !== routeToken) return;
          setRecordingUi('recording');
          setStatus(detail.text, true);
        },
        onLevel: function (detail) {
          if (token !== routeToken) return;
          setLevel(detail.level);
          var timer = document.getElementById('recording-timer');
          if (timer) timer.textContent = formatTime(detail.elapsed);
        },
        onTimer: function (detail) {
          if (token !== routeToken) return;
          var timer = document.getElementById('recording-timer');
          if (timer) timer.textContent = formatTime(detail.elapsed);
        },
        onTranscript: function (detail) {
          if (token !== routeToken) return;
          var heard = detail.final || detail.interim;
          if (heard) setStatus('正在识别：' + heard, true);
        },
        onStopping: function () {
          if (token !== routeToken) return;
          setRecordingUi('stopping');
          setStatus('录音完成，正在分析发音……', false);
        }
      });
      if (token !== routeToken) return;
      setRecordingUi('complete');
      setLevel(0.04);
      setStatus(result.verified ? '评分完成，可以回放并再次练习。' : '录音质量评分完成，未验证具体发音。', false);
      renderRecorderResult(result, item);
    } catch (error) {
      recorder.destroy(true);
      if (activeRecorder === recorder) activeRecorder = null;
      if (token !== routeToken) return;
      showRecorderError(error);
    }
  }

  function renderRecorderResult(result, item) {
    var resultZone = document.getElementById('result-zone');
    if (!resultZone) return;
    var verifiedText = result.verified
      ? '发音匹配 ' + result.accuracyScore + ' 分 · 录音质量 ' + result.qualityScore + ' 分'
      : '录音质量 ' + result.qualityScore + ' 分 · 未验证发音';
    var transcriptText = result.transcript
      ? '识别结果：' + result.transcript
      : (result.recognitionError || '未获得可靠的语音识别结果。');

    resultZone.innerHTML = '<div class="score-summary"><div class="score-ring" style="--score:' + result.score + '">' +
        '<span class="score-number">' + result.score + '<small>分</small></span></div>' +
        '<div><div class="score-label">' + escapeHtml(result.evaluation) + '</div><div class="score-detail">' + escapeHtml(verifiedText) + '</div></div></div>' +
      '<p class="result-transcript">' + escapeHtml(transcriptText) + '</p>' +
      (result.url ? '<audio class="recording-audio" controls preload="metadata" src="' + escapeAttribute(result.url) + '">你的浏览器不支持音频回放。</audio>' : '<div class="error-panel">没有生成可回放的录音文件。</div>') +
      '<div class="result-actions"><button class="secondary-button" type="button" data-retry-follow>再读一次</button></div>';
    var retry = resultZone.querySelector('[data-retry-follow]');
    if (retry) retry.addEventListener('click', function () { startFollow(item); });
  }

  function getRouteId() {
    var match = location.hash.match(/^#\/phoneme\/([^/?#]+)/);
    if (!match) return '';
    try { return decodeURIComponent(match[1]); } catch (error) { return match[1]; }
  }

  function renderNotFound() {
    document.title = '未找到音标｜英语音标学习';
    appView.innerHTML = '<section class="not-found"><div class="not-found-symbol">/??/</div><h1>没有找到这个音标</h1>' +
      '<p>它可能已经从课程中移除，或链接地址不完整。</p><a class="primary-button" href="#/">返回全部音标</a></section>';
    window.scrollTo(0, 0);
  }

  function route() {
    if (!initialRouteHandled) {
      initialRouteHandled = true;
      if (getRouteId()) {
        history.replaceState(null, '', location.pathname + location.search + '#/');
      }
      renderHome();
      return;
    }

    var id = getRouteId();
    if (id) {
      renderDetail(id);
      return;
    }

    renderHome();
    var targetId = location.hash && location.hash !== '#/' ? location.hash.slice(1) : '';
    if (targetId) {
      window.requestAnimationFrame(function () {
        var target = document.getElementById(targetId);
        if (target) target.scrollIntoView({ block: 'start', behavior: 'smooth' });
      });
    }
  }

  window.addEventListener('hashchange', route);
  window.addEventListener('beforeunload', function () {
    audio.stop();
    if (activeRecorder) activeRecorder.destroy(true);
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', route);
  } else {
    route();
  }
})();





























