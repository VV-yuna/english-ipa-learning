(function () {
  'use strict';

  var MIN_DURATION = 450;
  var MAX_DURATION = 6000;
  var SILENCE_DURATION = 1200;
  var SAMPLE_INTERVAL = 80;
  var VOICE_RMS_THRESHOLD = 0.018;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function average(values) {
    if (!values.length) return 0;
    return values.reduce(function (sum, value) { return sum + value; }, 0) / values.length;
  }

  function standardDeviation(values) {
    if (!values.length) return 0;
    var mean = average(values);
    var variance = average(values.map(function (value) { return Math.pow(value - mean, 2); }));
    return Math.sqrt(variance);
  }

  function normalizeText(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/[^a-z'\s-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function levenshtein(a, b) {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;

    var previous = [];
    var current = [];
    var i;
    var j;

    for (j = 0; j <= b.length; j += 1) previous[j] = j;

    for (i = 1; i <= a.length; i += 1) {
      current[0] = i;
      for (j = 1; j <= b.length; j += 1) {
        current[j] = Math.min(
          current[j - 1] + 1,
          previous[j] + 1,
          previous[j - 1] + (a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1)
        );
      }
      previous = current.slice();
    }

    return previous[b.length];
  }

  function textSimilarity(target, transcript) {
    var wanted = normalizeText(target);
    var heard = normalizeText(transcript);
    if (!wanted || !heard) return 0;
    if (wanted === heard) return 1;
    if ((' ' + heard + ' ').indexOf(' ' + wanted + ' ') !== -1) return 0.96;
    if ((' ' + wanted + ' ').indexOf(' ' + heard + ' ') !== -1 && heard.length >= Math.max(2, wanted.length - 2)) return 0.9;

    var distance = levenshtein(wanted, heard);
    var similarity = 1 - distance / Math.max(wanted.length, heard.length);
    return clamp(Math.pow(Math.max(0, similarity), 0.82), 0, 1);
  }

  function scoreQuality(samples, duration, clippedFrames) {
    if (!samples.length) {
      return {
        score: duration >= MIN_DURATION ? 45 : 0,
        voicedRatio: 0,
        meanVoice: 0,
        durationScore: duration >= MIN_DURATION ? 100 : 0,
        reason: '没有采集到足够的音频数据。'
      };
    }

    var voiced = samples.filter(function (value) { return value >= VOICE_RMS_THRESHOLD; });
    var voicedRatio = voiced.length / samples.length;
    var meanVoice = average(voiced);
    if (!voiced.length || meanVoice < 0.004) {
      return {
        score: duration >= MIN_DURATION ? 12 : 0,
        voicedRatio: 0,
        meanVoice: meanVoice,
        durationScore: duration >= MIN_DURATION ? 100 : 0,
        reason: '没有检测到清楚的人声，请靠近麦克风后再读一次。'
      };
    }
    var stability = meanVoice > 0 ? standardDeviation(voiced) / meanVoice : 1;
    var seconds = duration / 1000;
    var durationScore;

    if (seconds < 0.45) durationScore = clamp((seconds / 0.45) * 55, 0, 55);
    else if (seconds <= 3.8) durationScore = 100;
    else durationScore = clamp(100 - ((seconds - 3.8) / 2.2) * 42, 48, 100);

    var voiceScore = clamp(((voicedRatio - 0.035) / 0.365) * 100, 0, 100);
    var levelScore;
    if (meanVoice < 0.012) levelScore = clamp((meanVoice / 0.012) * 45, 0, 45);
    else if (meanVoice <= 0.28) levelScore = 100;
    else levelScore = clamp(100 - ((meanVoice - 0.28) / 0.35) * 55, 42, 100);

    var stabilityScore = clamp(100 - Math.max(0, stability - 0.42) * 92, 35, 100);
    var clipPenalty = samples.length ? clamp((clippedFrames / samples.length) * 100, 0, 45) : 0;
    var clippingScore = 100 - clipPenalty;
    var score = Math.round(
      durationScore * 0.32 +
      voiceScore * 0.34 +
      levelScore * 0.18 +
      stabilityScore * 0.10 +
      clippingScore * 0.06
    );

    return {
      score: clamp(score, 0, 100),
      voicedRatio: voicedRatio,
      meanVoice: meanVoice,
      durationScore: durationScore,
      reason: voiceScore < 25 ? '有效人声较少，请靠近麦克风并清楚朗读。' : '录音完整度正常。'
    };
  }

  function evaluationFor(score, verified) {
    if (!verified) {
      if (score >= 82) return '录音清晰';
      if (score >= 68) return '录音完整';
      if (score >= 52) return '声音偏弱';
      return '建议重录';
    }
    if (score >= 90) return '非常标准';
    if (score >= 75) return '发音不错';
    if (score >= 60) return '继续练习';
    return '建议再听一遍';
  }

  function makeResult(options, values) {
    var quality = values.quality;
    var transcript = values.transcript;
    var verified = Boolean(transcript);
    var score;
    var accuracyScore = null;

    if (verified) {
      accuracyScore = Math.round(textSimilarity(options.word, transcript) * 100);
      score = Math.round(accuracyScore * 0.7 + quality.score * 0.3);
    } else {
      score = Math.round(Math.min(quality.score, 85));
    }

    return {
      word: options.word,
      accent: options.accent,
      blob: values.blob,
      url: values.url,
      duration: values.duration,
      transcript: transcript || '',
      recognitionError: values.recognitionError || '',
      verified: verified,
      score: clamp(score, 0, 100),
      accuracyScore: accuracyScore,
      qualityScore: Math.round(quality.score),
      qualityReason: quality.reason,
      evaluation: evaluationFor(score, verified)
    };
  }

  function getErrorMessage(error) {
    if (!error) return '录音失败，请重试。';
    if (error.name === 'NotAllowedError' || error.name === 'SecurityError') {
      return '麦克风权限被拒绝。请在浏览器地址栏中允许麦克风权限后重试。';
    }
    if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
      return '没有找到可用的麦克风设备。';
    }
    if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
      return '麦克风正被其他应用占用，请关闭占用设备后重试。';
    }
    if (error.code === 'insecure-context') {
      return '录音功能需要通过 HTTPS 或 localhost 打开。';
    }
    if (error.code === 'unsupported') {
      return '当前浏览器不支持录音。建议使用最新版 Chrome 或 Edge。';
    }
    return error.message || '录音失败，请重试。';
  }

  function FollowRecorder() {
    this.state = 'idle';
    this.samples = [];
    this.clippedFrames = 0;
    this.finalTranscript = '';
    this.interimTranscript = '';
    this.recognitionError = '';
    this.resolve = null;
    this.reject = null;
    this.stream = null;
    this.mediaRecorder = null;
    this.recognition = null;
    this.audioContext = null;
    this.analyser = null;
    this.sourceNode = null;
    this.sampleTimer = null;
    this.durationTimer = null;
    this.finishTimer = null;
    this.lastVoiceAt = 0;
    this.voiceDetected = false;
    this.recorderStopped = false;
    this.recognitionEnded = false;
    this.finalized = false;
    this.currentUrl = '';
    this.options = {};
  }

  FollowRecorder.prototype.start = async function (options) {
    this.destroy(false);
    this.options = Object.assign({ word: '', accent: 'uk' }, options || {});
    this.finalized = false;
    this.recorderStopped = false;
    this.recognitionEnded = false;
    this.samples = [];
    this.clippedFrames = 0;
    this.finalTranscript = '';
    this.interimTranscript = '';
    this.recognitionError = '';

    if (!window.isSecureContext || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      var secureError = new Error(getErrorMessage({ code: 'insecure-context' }));
      secureError.code = 'insecure-context';
      throw secureError;
    }
    if (typeof window.MediaRecorder === 'undefined') {
      var supportError = new Error(getErrorMessage({ code: 'unsupported' }));
      supportError.code = 'unsupported';
      throw supportError;
    }

    this.emit('requesting', { text: '正在请求麦克风权限……' });

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false,
          channelCount: 1
        },
        video: false
      });
    } catch (error) {
      var permissionError = new Error(getErrorMessage(error));
      permissionError.name = error.name;
      throw permissionError;
    }

    var promise = new Promise(function (resolve, reject) {
      this.resolve = resolve;
      this.reject = reject;
    }.bind(this));

    try {
      this.setupAudioAnalysis();
      this.setupRecorder();
      this.setupRecognition();
    } catch (error) {
      this.cleanupStream();
      throw error;
    }

    var startedAt = window.performance && performance.now ? performance.now() : Date.now();
    this.startedAt = startedAt;

    try {
      this.mediaRecorder.start(250);
    } catch (error) {
      this.cleanupStream();
      throw error;
    }

    this.state = 'recording';
    this.emit('recording', {
      text: '正在录音，请清楚朗读“' + this.options.word + '”。',
      recognition: Boolean(this.recognition)
    });
    this.startSampling();

    return promise;
  };

  FollowRecorder.prototype.setupAudioAnalysis = function () {
    var AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    try {
      this.audioContext = new AudioContextClass();
      this.sourceNode = this.audioContext.createMediaStreamSource(this.stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 1024;
      this.analyser.smoothingTimeConstant = 0.55;
      this.sourceNode.connect(this.analyser);
      this.timeData = new Float32Array(this.analyser.fftSize);
    } catch (error) {
      this.audioContext = null;
      this.analyser = null;
    }
  };

  FollowRecorder.prototype.setupRecorder = function () {
    var mimeType = '';
    var preferred = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus'
    ];

    if (window.MediaRecorder.isTypeSupported) {
      mimeType = preferred.find(function (type) { return window.MediaRecorder.isTypeSupported(type); }) || '';
    }

    this.chunks = [];
    this.mediaRecorder = mimeType
      ? new window.MediaRecorder(this.stream, { mimeType: mimeType })
      : new window.MediaRecorder(this.stream);

    this.mediaRecorder.ondataavailable = function (event) {
      if (event.data && event.data.size > 0) this.chunks.push(event.data);
    }.bind(this);

    this.mediaRecorder.onstop = function () {
      this.recorderStopped = true;
      this.maybeFinish();
    }.bind(this);

    this.mediaRecorder.onerror = function (event) {
      this.recognitionError = this.recognitionError || '录音过程发生错误。';
      this.stop();
    }.bind(this);
  };

  FollowRecorder.prototype.setupRecognition = function () {
    var RecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!RecognitionClass) {
      this.recognition = null;
      this.recognitionEnded = true;
      return;
    }

    try {
      var recognition = new RecognitionClass();
      recognition.lang = this.options.accent === 'us' ? 'en-US' : 'en-GB';
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 3;

      recognition.onresult = function (event) {
        var finalText = '';
        var interimText = '';
        for (var i = event.resultIndex; i < event.results.length; i += 1) {
          var text = event.results[i][0] ? event.results[i][0].transcript : '';
          if (event.results[i].isFinal) finalText += ' ' + text;
          else interimText += ' ' + text;
        }
        if (finalText.trim()) this.finalTranscript = (this.finalTranscript + ' ' + finalText).trim();
        this.interimTranscript = interimText.trim();
        this.emit('transcript', {
          final: this.finalTranscript,
          interim: this.interimTranscript
        });
      }.bind(this);

      recognition.onerror = function (event) {
        var map = {
          'not-allowed': '语音识别权限被拒绝。',
          'service-not-allowed': '当前环境不允许在线语音识别。',
          'audio-capture': '无法访问麦克风进行语音识别。',
          'network': '在线语音识别网络不可用。',
          'no-speech': '没有识别到清晰的英文发音。',
          'aborted': ''
        };
        this.recognitionError = map[event.error] || ('语音识别不可用：' + event.error);
      }.bind(this);

      recognition.onend = function () {
        this.recognitionEnded = true;
        this.maybeFinish();
      }.bind(this);

      this.recognition = recognition;
      try {
        recognition.start();
      } catch (error) {
        this.recognition = null;
        this.recognitionEnded = true;
        this.recognitionError = '语音识别未启动，将使用录音质量评分。';
      }
    } catch (error) {
      this.recognition = null;
      this.recognitionEnded = true;
      this.recognitionError = '语音识别不可用，将使用录音质量评分。';
    }
  };

  FollowRecorder.prototype.startSampling = function () {
    this.sampleTimer = window.setInterval(function () {
      var now = window.performance && performance.now ? performance.now() : Date.now();
      var elapsed = now - this.startedAt;
      var rms = this.readRms();

      this.samples.push(rms);
      if (rms >= VOICE_RMS_THRESHOLD) {
        this.voiceDetected = true;
        this.lastVoiceAt = now;
      } else if (this.voiceDetected && now - this.lastVoiceAt >= SILENCE_DURATION) {
        this.stop();
        return;
      }

      if (elapsed >= MAX_DURATION) {
        this.stop();
        return;
      }

      this.emit('level', {
        level: clamp(rms * 12, 0, 1),
        elapsed: elapsed,
        remaining: Math.max(0, MAX_DURATION - elapsed)
      });
    }.bind(this), SAMPLE_INTERVAL);

    this.durationTimer = window.setInterval(function () {
      var now = window.performance && performance.now ? performance.now() : Date.now();
      var elapsed = now - this.startedAt;
      this.emit('timer', {
        elapsed: elapsed,
        remaining: Math.max(0, MAX_DURATION - elapsed)
      });
    }.bind(this), 100);
  };

  FollowRecorder.prototype.readRms = function () {
    if (!this.analyser || !this.timeData) return 0;
    this.analyser.getFloatTimeDomainData(this.timeData);
    var sum = 0;
    var clipped = false;
    for (var i = 0; i < this.timeData.length; i += 1) {
      var value = this.timeData[i];
      sum += value * value;
      if (Math.abs(value) > 0.98) clipped = true;
    }
    if (clipped) this.clippedFrames += 1;
    return Math.sqrt(sum / this.timeData.length);
  };

  FollowRecorder.prototype.stop = function () {
    if (this.state !== 'recording' && this.state !== 'requesting') return;

    this.state = 'stopping';
    if (this.sampleTimer) window.clearInterval(this.sampleTimer);
    if (this.durationTimer) window.clearInterval(this.durationTimer);
    this.sampleTimer = null;
    this.durationTimer = null;

    if (this.recognition) {
      try { this.recognition.stop(); } catch (error) { this.recognitionEnded = true; }
    } else {
      this.recognitionEnded = true;
    }

    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try { this.mediaRecorder.stop(); } catch (error) { this.recorderStopped = true; }
    } else {
      this.recorderStopped = true;
    }

    this.emit('stopping', { text: '正在生成评分……' });
    this.maybeFinish();
  };

  FollowRecorder.prototype.maybeFinish = function () {
    if (!this.recorderStopped || this.finalized) return;

    if (!this.recognitionEnded) {
      if (!this.finishTimer) {
        this.finishTimer = window.setTimeout(function () {
          this.recognitionEnded = true;
          this.finish();
        }.bind(this), 1100);
      }
      return;
    }

    this.finish();
  };

  FollowRecorder.prototype.finish = function () {
    if (this.finalized) return;
    this.finalized = true;

    if (this.finishTimer) window.clearTimeout(this.finishTimer);
    if (this.sampleTimer) window.clearInterval(this.sampleTimer);
    if (this.durationTimer) window.clearInterval(this.durationTimer);
    this.finishTimer = null;
    this.sampleTimer = null;
    this.durationTimer = null;

    var endedAt = window.performance && performance.now ? performance.now() : Date.now();
    var duration = Math.max(0, endedAt - this.startedAt);
    var mimeType = this.mediaRecorder && this.mediaRecorder.mimeType ? this.mediaRecorder.mimeType : 'audio/webm';
    var blob = new Blob(this.chunks || [], { type: mimeType });
    var url = blob.size ? URL.createObjectURL(blob) : '';
    this.currentUrl = url;

    var transcript = (this.finalTranscript || this.interimTranscript || '').trim();
    if (!transcript && this.recognitionError && this.recognition) {
      this.recognitionError = this.recognitionError === '没有识别到清晰的英文发音。'
        ? this.recognitionError
        : this.recognitionError;
    }

    var quality = scoreQuality(this.samples, duration, this.clippedFrames);
    var result = makeResult(this.options, {
      blob: blob,
      url: url,
      duration: duration,
      transcript: transcript,
      recognitionError: this.recognitionError,
      quality: quality
    });

    this.state = 'complete';
    this.cleanupStream();
    this.emit('complete', result);
    if (this.resolve) this.resolve(result);
  };

  FollowRecorder.prototype.cleanupStream = function () {
    if (this.stream) {
      this.stream.getTracks().forEach(function (track) { track.stop(); });
      this.stream = null;
    }
    if (this.sourceNode && this.audioContext) {
      try { this.sourceNode.disconnect(); } catch (error) { /* no-op */ }
    }
    if (this.audioContext) {
      try { this.audioContext.close().catch(function () {}); } catch (error) { /* no-op */ }
    }
    this.sourceNode = null;
    this.analyser = null;
    this.audioContext = null;
  };

  FollowRecorder.prototype.destroy = function (releaseUrl) {
    if (this.state === 'recording' || this.state === 'requesting') this.stop();
    if (this.sampleTimer) window.clearInterval(this.sampleTimer);
    if (this.durationTimer) window.clearInterval(this.durationTimer);
    if (this.finishTimer) window.clearTimeout(this.finishTimer);
    this.sampleTimer = null;
    this.durationTimer = null;
    this.finishTimer = null;
    this.cleanupStream();
    if (releaseUrl !== false && this.currentUrl) {
      URL.revokeObjectURL(this.currentUrl);
      this.currentUrl = '';
    }
    this.state = 'idle';
  };

  FollowRecorder.prototype.emit = function (name, detail) {
    if (typeof this.options['on' + name.charAt(0).toUpperCase() + name.slice(1)] === 'function') {
      this.options['on' + name.charAt(0).toUpperCase() + name.slice(1)](detail);
    }
  };

  window.IPARecorder = {
    FollowRecorder: FollowRecorder,
    isRecognitionSupported: function () {
      return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
    },
    getErrorMessage: getErrorMessage,
    normalizeText: normalizeText,
    textSimilarity: textSimilarity,
    scoreQuality: scoreQuality,
    evaluationFor: evaluationFor
  };
})();


