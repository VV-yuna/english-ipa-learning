(function () {
  'use strict';

  var API_ROOT = 'https://api.dictionaryapi.dev/api/v2/entries/en/';
  var CACHE_TTL = 1000 * 60 * 30;
  var REQUEST_TIMEOUT = 6500;
  var wordCache = new Map();
  var activeId = 0;
  var activeAudio = null;
  var activeUtterance = null;
  var activePhonemeElement = null;
  var activePhonemeFinish = null;
  var activeBufferSource = null;
  var phonemeBufferCache = new Map();
  var phonemeBufferLoads = new Map();
  var audioContext = null;
  var unlocked = false;

  function normalizeAccent(accent) {
    return accent === 'us' ? 'us' : 'uk';
  }

  function languageFor(accent) {
    return normalizeAccent(accent) === 'us' ? 'en-US' : 'en-GB';
  }

  function regionFor(accent) {
    return normalizeAccent(accent) === 'us' ? 'us' : 'uk';
  }

  function normalizeAudioUrl(url) {
    if (!url) return '';
    if (url.indexOf('//') === 0) return 'https:' + url;
    if (url.indexOf('http://') === 0) return 'https://' + url.slice(7);
    return url;
  }

  function looksLikeAccent(text, accent) {
    var value = String(text || '').toLowerCase();
    var region = regionFor(accent);
    return new RegExp('(^|[^a-z])' + region + '([^a-z]|$)').test(value) ||
      value.indexOf('-' + region) !== -1 ||
      value.indexOf('_' + region) !== -1;
  }

  function pickAudio(entries, accent) {
    var candidates = [];
    var seen = {};

    (entries || []).forEach(function (entry) {
      (entry.phonetics || []).forEach(function (item) {
        var url = normalizeAudioUrl(item.audio);
        if (!url || seen[url]) return;
        seen[url] = true;
        var regionText = [url, item.sourceUrl || '', item.text || ''].join(' ');
        candidates.push({
          url: url,
          score: looksLikeAccent(regionText, accent) ? 3 : 0
        });
      });
    });

    candidates.sort(function (a, b) { return b.score - a.score; });
    return candidates.length ? candidates[0].url : '';
  }

  function fetchEntries(word) {
    var key = String(word || '').trim().toLowerCase();
    var now = Date.now();
    var cached = wordCache.get(key);

    if (cached && cached.expires > now) return cached.promise;

    var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = controller ? window.setTimeout(function () { controller.abort(); }, REQUEST_TIMEOUT) : null;

    var promise = fetch(API_ROOT + encodeURIComponent(key), {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller ? controller.signal : undefined
    }).then(function (response) {
      if (!response.ok) throw new Error('Dictionary response: ' + response.status);
      return response.json();
    }).then(function (entries) {
      return {
        uk: pickAudio(entries, 'uk'),
        us: pickAudio(entries, 'us')
      };
    }).catch(function () {
      return { uk: '', us: '' };
    }).then(function (result) {
      if (timer) window.clearTimeout(timer);
      return result;
    });

    wordCache.set(key, { promise: promise, expires: now + CACHE_TTL });
    return promise;
  }

  function stop() {
    activeId += 1;
    if (activePhonemeFinish) {
      var phonemeFinish = activePhonemeFinish;
      activePhonemeFinish = null;
      phonemeFinish({ source: 'cancelled' });
    }
    if (activePhonemeElement) {
      try { activePhonemeElement.pause(); } catch (error) { /* no-op */ }
      activePhonemeElement = null;
    }
    if (activeBufferSource) {
      try { activeBufferSource.stop(); } catch (error) { /* no-op */ }
      activeBufferSource = null;
    }
    if (activeAudio) {
      try {
        activeAudio.pause();
        activeAudio.removeAttribute('src');
        activeAudio.load();
      } catch (error) {
        // Ignore cleanup failures from old media elements.
      }
      activeAudio = null;
    }
    if (activeUtterance && 'speechSynthesis' in window) {
      try { window.speechSynthesis.cancel(); } catch (error) { /* no-op */ }
      activeUtterance = null;
    }
  }

  function speak(word, accent, id) {
    return new Promise(function (resolve) {
      if (!('speechSynthesis' in window) || typeof window.SpeechSynthesisUtterance === 'undefined') {
        resolve({ source: 'unavailable', word: word, accent: normalizeAccent(accent) });
        return;
      }

      var lang = languageFor(accent);
      var utterance = new SpeechSynthesisUtterance(String(word));
      var voices = window.speechSynthesis.getVoices ? window.speechSynthesis.getVoices() : [];
      var exact = voices.find(function (voice) { return voice.lang === lang; });
      var partial = voices.find(function (voice) { return voice.lang.toLowerCase().indexOf(lang.toLowerCase().slice(0, 2)) === 0; });

      utterance.lang = lang;
      utterance.rate = 0.78;
      utterance.pitch = 1;
      utterance.volume = 1;
      if (exact || partial) utterance.voice = exact || partial;

      activeUtterance = utterance;
      var settled = false;
      var timeout = window.setTimeout(function () { finish({ source: 'speech', word: word, accent: normalizeAccent(accent) }); }, 9000);

      function finish(result) {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeout);
        if (activeUtterance === utterance) activeUtterance = null;
        resolve(result);
      }

      utterance.onend = function () {
        finish(id === activeId
          ? { source: 'speech', word: word, accent: normalizeAccent(accent) }
          : { source: 'cancelled' });
      };
      utterance.onerror = function () {
        finish(id === activeId
          ? { source: 'speech-failed', word: word, accent: normalizeAccent(accent) }
          : { source: 'cancelled' });
      };

      try {
        window.speechSynthesis.speak(utterance);
      } catch (error) {
        finish({ source: 'speech-failed', word: word, accent: normalizeAccent(accent) });
      }
    });
  }

  function playUrl(url, id) {
    return new Promise(function (resolve) {
      var audio = new Audio();
      var settled = false;
      activeAudio = audio;
      audio.preload = 'auto';
      audio.src = url;

      function finish(result) {
        if (settled) return;
        settled = true;
        audio.onended = null;
        audio.onerror = null;
        if (activeAudio === audio && id === activeId) activeAudio = null;
        resolve(result);
      }

      audio.onended = function () {
        finish(id === activeId ? { source: 'dictionary' } : { source: 'cancelled' });
      };
      audio.onerror = function () {
        finish(id === activeId ? { source: 'audio-error' } : { source: 'cancelled' });
      };

      var playPromise = audio.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(function () {
          if (id === activeId) finish({ source: 'audio-error' });
        });
      }
    });
  }

  async function play(word, accent, options) {
    var normalizedAccent = normalizeAccent(accent);
    var opts = options || {};
    stop();
    var id = activeId;

    if (navigator.onLine === false) {
      var offlineResult = await speak(word, normalizedAccent, id);
      return Object.assign(offlineResult, { reason: 'offline' });
    }

    var urls;
    try {
      urls = await fetchEntries(word);
    } catch (error) {
      urls = { uk: '', us: '' };
    }

    if (id !== activeId) return { source: 'cancelled' };

    var url = urls[normalizedAccent] || urls.uk || urls.us || '';
    if (url) {
      var audioResult = await playUrl(url, id);
      if (id !== activeId) return { source: 'cancelled' };
      if (audioResult.source === 'dictionary') {
        return Object.assign(audioResult, { word: word, accent: normalizedAccent });
      }
    }

    var speechResult = await speak(word, normalizedAccent, id);
    return Object.assign(speechResult, {
      word: word,
      accent: normalizedAccent,
      reason: url ? 'audio-error' : 'no-dictionary-audio'
    });
  }

  function preload(word) {
    if (navigator.onLine === false) return Promise.resolve({ uk: '', us: '' });
    return fetchEntries(word).catch(function () { return { uk: '', us: '' }; });
  }

  function getAudioContext() {
    var AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!audioContext) audioContext = new AudioContextClass();
    if (audioContext.state === 'suspended' && audioContext.resume) audioContext.resume().catch(function () {});
    return audioContext;
  }

  function phonemeRecord(id) {
    return window.IPA_BY_ID && window.IPA_BY_ID[id] ? window.IPA_BY_ID[id] : null;
  }

  function phonemeElement(id, accent) {
    var element = document.getElementById('phoneme-audio-' + normalizeAccent(accent));
    var item = phonemeRecord(id);
    if (!element || !item) return null;
    if (element.dataset.phonemeId !== id) {
      element.dataset.phonemeId = id;
      element.src = item.audio[normalizeAccent(accent)];
      element.load();
    }
    return element;
  }

  function loadPhonemeBuffer(id, accent) {
    var normalizedAccent = normalizeAccent(accent);
    var key = id + ':' + normalizedAccent;
    if (phonemeBufferCache.has(key)) return Promise.resolve(phonemeBufferCache.get(key));
    if (phonemeBufferLoads.has(key)) return phonemeBufferLoads.get(key);
    var item = phonemeRecord(id);
    var context = getAudioContext();
    if (!item || !context) return Promise.resolve(null);
    var url = new URL(item.audio[normalizedAccent], document.baseURI).href;
    var load = fetch(url).then(function (response) {
      if (!response.ok) throw new Error('Audio response: ' + response.status);
      return response.arrayBuffer();
    }).then(function (data) {
      return new Promise(function (resolve, reject) {
        var result = context.decodeAudioData(data, resolve, reject);
        if (result && result.then) result.then(resolve, reject);
      });
    }).then(function (buffer) {
      phonemeBufferCache.set(key, buffer);
      return buffer;
    }).catch(function () { return null; }).finally(function () { phonemeBufferLoads.delete(key); });
    phonemeBufferLoads.set(key, load);
    return load;
  }
  function playBuffer(buffer, id) {
    var context = getAudioContext();
    if (!context || !buffer) return Promise.resolve({ source: 'phoneme-error' });
    return new Promise(function (resolve) {
      var source = context.createBufferSource();
      var settled = false;
      source.buffer = buffer;
      source.connect(context.destination);
      activeBufferSource = source;
      function finish(result) {
        if (settled) return;
        settled = true;
        source.onended = null;
        if (activeBufferSource === source) activeBufferSource = null;
        resolve(result);
      }
      source.onended = function () {
        finish(id === activeId ? { source: 'web-audio', phoneme: true } : { source: 'cancelled' });
      };
      try { source.start(0); }
      catch (error) { finish({ source: 'phoneme-error' }); }
      window.setTimeout(function () {
        finish(id === activeId ? { source: 'web-audio', phoneme: true } : { source: 'cancelled' });
      }, (buffer.duration + 0.5) * 1000);
    });
  }

  function waitForPhonemeElement(element, id, fallback) {
    return new Promise(function (resolve) {
      var settled = false;
      var fallbackStarted = false;
      var timeout = window.setTimeout(function () { finish({ source: 'phoneme-error' }); }, 4000);
      function cleanup() {
        window.clearTimeout(timeout);
        element.removeEventListener('ended', onEnded);
        element.removeEventListener('error', onError);
        if (activePhonemeFinish === finish) activePhonemeFinish = null;
      }
      function finish(result) {
        if (settled) return;
        settled = true;
        cleanup();
        if (activePhonemeElement === element) activePhonemeElement = null;
        resolve(result);
      }
      function onEnded() {
        finish(id === activeId ? { source: 'local-audio', phoneme: true } : { source: 'cancelled' });
      }
      function runFallback() {
        if (fallbackStarted || settled) return;
        fallbackStarted = true;
        Promise.resolve(fallback ? fallback() : null).then(function (result) {
          finish(result && result.source ? result : { source: 'phoneme-error', phoneme: true });
        });
      }
      function onError() {
        if (id !== activeId) { finish({ source: 'cancelled' }); return; }
        runFallback();
      }
      activePhonemeFinish = finish;
      element.addEventListener('ended', onEnded);
      element.addEventListener('error', onError, { once: true });
      element.pause();
      element.currentTime = 0;
      element.muted = false;
      element.volume = 1;
      var playPromise;
      try { playPromise = element.play(); }
      catch (error) { onError(); return; }
      if (playPromise && playPromise.catch) {
        playPromise.catch(function () {
          if (id !== activeId) { finish({ source: 'cancelled' }); return; }
          runFallback();
        });
      }
    });
  }

  function playPhoneme(id, accent) {
    var normalizedAccent = normalizeAccent(accent);
    stop();
    var idToken = activeId;
    getAudioContext();
    var element = phonemeElement(id, normalizedAccent);
    if (!element) return Promise.resolve({ source: 'phoneme-error', id: id, accent: normalizedAccent, phoneme: true });
    activePhonemeElement = element;
    return waitForPhonemeElement(element, idToken, function () {
      return loadPhonemeBuffer(id, normalizedAccent).then(function (buffer) {
        return buffer ? playBuffer(buffer, idToken) : { source: 'phoneme-error', phoneme: true };
      });
    }).then(function (result) {
      return Object.assign(result, { id: id, accent: normalizedAccent });
    });
  }

  function preloadPhoneme(id) {
    return Promise.all([loadPhonemeBuffer(id, 'uk'), loadPhonemeBuffer(id, 'us')]);
  }
  function unlock() {
    if (unlocked) return;
    unlocked = true;
    getAudioContext();
    try {
      if ('speechSynthesis' in window && window.speechSynthesis.getVoices) window.speechSynthesis.getVoices();
    } catch (error) {
      // Voice warm-up is best effort.
    }
  }

  window.IPAAudio = {
    playPhoneme: playPhoneme,
    playWord: play,
    play: play,
    preloadPhoneme: preloadPhoneme,
    preloadWord: preload,
    preload: preload,
    stop: stop,
    unlock: unlock,
    languageFor: languageFor
  };
})();






