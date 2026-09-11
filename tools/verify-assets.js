'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const errors = [];
global.window = {};
eval(fs.readFileSync(path.join(root, 'data.js'), 'utf8'));
eval(fs.readFileSync(path.join(root, 'human-audio-manifest.js'), 'utf8'));
const data = window.IPA_DATA;

function checkFile(relativePath) {
  const filePath = path.join(root, relativePath);
  if (!fs.existsSync(filePath)) {
    errors.push('Missing file: ' + relativePath);
    return null;
  }
  return filePath;
}

function wavDuration(filePath) {
  const buffer = fs.readFileSync(filePath);
  if (buffer.length < 44 || buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WAVE') {
    errors.push('Not a RIFF/WAVE file: ' + path.relative(root, filePath));
    return 0;
  }
  let offset = 12;
  let byteRate = 0;
  let dataSize = 0;
  while (offset + 8 <= buffer.length) {
    const chunkId = buffer.toString('ascii', offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    const contentOffset = offset + 8;
    if (chunkId === 'fmt ' && chunkSize >= 16) byteRate = buffer.readUInt32LE(contentOffset + 8);
    if (chunkId === 'data') dataSize = chunkSize;
    offset = contentOffset + chunkSize + (chunkSize % 2);
  }
  if (!byteRate || !dataSize) errors.push('Invalid WAV chunks: ' + path.relative(root, filePath));
  return byteRate ? dataSize / byteRate : 0;
}

if (data.length !== 48) errors.push('Expected 48 phonemes, found ' + data.length);
if (data.filter((item) => item.type === 'vowel').length !== 20) errors.push('Expected 20 vowels');
if (data.filter((item) => item.type === 'consonant').length !== 28) errors.push('Expected 28 consonants');
if (new Set(data.map((item) => item.id)).size !== 48) errors.push('Duplicate phoneme ids');
if (!window.IPA_HUMAN_AUDIO || Object.keys(window.IPA_HUMAN_AUDIO).length !== 48) errors.push('Expected 48 human audio manifest entries');

const checkedAudio = new Set();
let shortest = Infinity;
let longest = 0;
let totalAudioBytes = 0;
let compositeCount = 0;
let fullWordCount = 0;

data.forEach((item) => {
  const audio = item.audio;
  if (!audio || !audio.uk || !audio.us) {
    errors.push(item.id + ': missing accent audio paths');
  } else {
    if (!audio.credit || !audio.sourceUrl || !audio.license) errors.push(item.id + ': incomplete human audio provenance');
    if (!['human', 'human-composite', 'human-word'].includes(audio.kind)) errors.push(item.id + ': invalid human audio kind');
    if (audio.kind === 'human-composite') compositeCount += 1;
    if (audio.kind === 'human-word') fullWordCount += 1;
    ['uk', 'us'].forEach((accent) => {
      const audioPath = audio[accent];
      if (!audioPath || checkedAudio.has(audioPath)) return;
      checkedAudio.add(audioPath);
      if (/^https:\/\//.test(audioPath)) {
        if (!/^https:\/\/(soundsofspeech\.uiowa\.edu|res\.iciba\.com)\//.test(audioPath)) {
          errors.push(item.id + ': untrusted remote audio host');
        }
        return;
      }
      const filePath = checkFile(audioPath);
      if (!filePath) return;
      totalAudioBytes += fs.statSync(filePath).size;
      const duration = wavDuration(filePath);
      shortest = Math.min(shortest, duration);
      longest = Math.max(longest, duration);
      if (duration < 0.08 || duration > 2.5) errors.push(item.id + ': ' + accent + ' audio duration ' + duration.toFixed(2) + 's');
    });
  }

  if (!item.diagram || !item.diagram.src || !item.diagram.alt) errors.push(item.id + ': missing diagram');
  if (!item.examples || item.examples.length !== 5) errors.push(item.id + ': expected 5 examples');

  const diagramPath = item.diagram && checkFile(item.diagram.src);
  if (diagramPath) {
    const svg = fs.readFileSync(diagramPath, 'utf8');
    if (!svg.includes('<svg') || !svg.includes('<title') || !svg.includes('<desc')) errors.push(item.id + ': invalid SVG');
  }
});

['audio.js', 'app.js', 'data.js'].forEach((fileName) => {
  const source = fs.readFileSync(path.join(root, fileName), 'utf8');
  if (/speechSynthesis|SpeechSynthesisUtterance|eSpeak|espeak|audioKey/.test(source)) {
    errors.push(fileName + ': forbidden AI/TTS/eSpeak reference');
  }
});

console.log(JSON.stringify({
  phonemes: data.length,
  uniqueHumanAudioFiles: checkedAudio.size,
  localVowelAndCompositeFiles: Array.from(checkedAudio).filter((value) => !/^https:/.test(value)).length,
  remoteOfficialConsonantFiles: Array.from(checkedAudio).filter((value) => /soundsofspeech\.uiowa\.edu/.test(value)).length,
  fullWordTeachingFiles: fullWordCount,
  compositeFiles: compositeCount,
  diagrams: data.length,
  audioSizeMiB: Number((totalAudioBytes / 1024 / 1024).toFixed(2)),
  shortestAudioSeconds: Number(shortest.toFixed(2)),
  longestAudioSeconds: Number(longest.toFixed(2)),
  errors
}, null, 2));

if (errors.length) process.exit(1);

