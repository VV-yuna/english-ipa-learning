'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const childProcess = require('child_process');

const root = path.resolve(__dirname, '..');
const outputDir = path.join(root, 'assets', 'audio', 'human');
const sourceBase = 'https://www.ipachart.com/wav/';
const sourceCredit = 'IPA Chart / Wikimedia Commons human recordings (Peter Isotalo, Denelson83, UCLA Phonetics Lab Archive 2003, Halibutt, Pmx, Octane)';
const sourceLicense = 'Wikimedia Commons free/copyleft recording; see source URL';

const single = {
  'i-long': 'Close_front_unrounded_vowel',
  'i-short': 'Near-close_near-front_unrounded_vowel',
  'e': 'Open-mid_front_unrounded_vowel',
  'ae': 'Near-open_front_unrounded_vowel',
  'a-long': 'Open_back_unrounded_vowel',
  'o-short': 'Open_back_rounded_vowel',
  'aw-long': 'Open-mid_back_rounded_vowel',
  'u-short': 'Near-close_near-back_rounded_vowel',
  'u-long': 'Close_back_rounded_vowel',
  'caret': 'Open-mid_back_unrounded_vowel',
  'er-long': 'Open-mid_central_unrounded_vowel',
  'schwa': 'Mid-central_vowel',
  'p': 'Voiceless_bilabial_plosive',
  'b': 'Voiced_bilabial_plosive',
  't': 'Voiceless_alveolar_plosive',
  'd': 'Voiced_alveolar_plosive',
  'k': 'Voiceless_velar_plosive',
  'g': 'Voiced_velar_plosive',
  'f': 'Voiceless_labiodental_fricative',
  'v': 'Voiced_labiodental_fricative',
  'th-voiceless': 'Voiceless_dental_fricative',
  'th-voiced': 'Voiced_dental_fricative',
  's': 'Voiceless_alveolar_fricative',
  'z': 'Voiced_alveolar_fricative',
  'sh': 'Voiceless_postalveolar_fricative',
  'zh': 'Voiced_postalveolar_fricative',
  'h': 'Voiceless_glottal_fricative',
  'ch': 'Voiceless_palato-alveolar_affricate',
  'j-sound': 'Voiced_postalveolar_affricate',
  'm': 'Bilabial_nasal',
  'n': 'Alveolar_nasal',
  'ng': 'Velar_nasal',
  'l': 'Alveolar_lateral_approximant',
  'r': 'Alveolar_approximant',
  'y': 'Palatal_approximant',
  'w': 'Voiced_labio-velar_approximant'
};

const auxiliarySources = {
  'open-a': 'Open_front_unrounded_vowel'
};

const composites = {
  'ei': ['e', 'i-short', 0.07],
  'ai': ['open-a', 'i-short', 0.07],
  'oi': ['aw-long', 'i-short', 0.07],
  'oh': ['schwa', 'u-short', 0.07],
  'au': ['open-a', 'u-short', 0.07],
  'ia': ['i-short', 'schwa', 0.07],
  'ea': ['e', 'schwa', 0.07],
  'ua': ['u-short', 'schwa', 0.07],
  'tr': ['t', 'r', 0.025],
  'dr': ['d', 'r', 0.025],
  'ts': ['t', 's', 0.025],
  'dz': ['d', 'z', 0.025]
};

function fetchBuffer(url) {
  const cacheDir = path.join(os.tmpdir(), 'ipa-human-source-cache');
  const fileName = Buffer.from(url).toString('base64url') + '.wav';
  const tempFile = path.join(cacheDir, fileName);
  fs.mkdirSync(cacheDir, { recursive: true });
  if (fs.existsSync(tempFile) && fs.statSync(tempFile).size > 500) {
    return Promise.resolve(fs.readFileSync(tempFile));
  }
  try {
    childProcess.execFileSync('curl.exe', [
      '-L', '--fail', '--silent', '--show-error',
      '--retry', '5', '--retry-all-errors', '--retry-delay', '1',
      '--max-time', '90', '-o', tempFile, url
    ], { stdio: 'pipe' });
    return Promise.resolve(fs.readFileSync(tempFile));
  } catch (error) {
    throw new Error('Download failed: ' + url + ' - ' + error.message);
  }
}

function parseWav(buffer) {
  if (buffer.length < 44 || buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WAVE') {
    throw new Error('Invalid WAV');
  }
  let offset = 12;
  let format = null;
  let dataOffset = 0;
  let dataSize = 0;
  while (offset + 8 <= buffer.length) {
    const id = buffer.toString('ascii', offset, offset + 4);
    const size = buffer.readUInt32LE(offset + 4);
    const content = offset + 8;
    if (id === 'fmt ') {
      format = {
        audioFormat: buffer.readUInt16LE(content),
        channels: buffer.readUInt16LE(content + 2),
        sampleRate: buffer.readUInt32LE(content + 4),
        bitsPerSample: buffer.readUInt16LE(content + 14)
      };
    } else if (id === 'data') {
      dataOffset = content;
      dataSize = size;
      break;
    }
    offset = content + size + (size % 2);
  }
  const isPcm16 = format && format.audioFormat === 1 && format.bitsPerSample === 16;
  const isFloat32 = format && format.audioFormat === 3 && format.bitsPerSample === 32;
  const isPcm8 = format && format.audioFormat === 1 && format.bitsPerSample === 8;
  if (!format || !dataOffset || (!isPcm16 && !isFloat32 && !isPcm8)) {
    throw new Error('Unsupported WAV format: format=' + (format && format.audioFormat) + ', bits=' + (format && format.bitsPerSample));
  }
  const bytesPerSample = format.bitsPerSample / 8;
  const frameCount = Math.floor(dataSize / bytesPerSample / format.channels);
  const samples = new Float32Array(frameCount);
  for (let i = 0; i < frameCount; i += 1) {
    let sum = 0;
    for (let channel = 0; channel < format.channels; channel += 1) {
      const sampleOffset = dataOffset + (i * format.channels + channel) * bytesPerSample;
      if (isFloat32) sum += buffer.readFloatLE(sampleOffset);
      else if (isPcm16) sum += buffer.readInt16LE(sampleOffset) / 32768;
      else sum += (buffer.readUInt8(sampleOffset) - 128) / 128;
    }
    samples[i] = sum / format.channels;
  }
  return { sampleRate: format.sampleRate, samples: samples };
}

function resample(samples, fromRate, toRate) {
  if (fromRate === toRate) return new Float32Array(samples);
  const ratio = fromRate / toRate;
  const length = Math.max(1, Math.round(samples.length / ratio));
  const output = new Float32Array(length);
  for (let i = 0; i < length; i += 1) {
    const position = i * ratio;
    const left = Math.floor(position);
    const right = Math.min(samples.length - 1, left + 1);
    const mix = position - left;
    output[i] = samples[left] * (1 - mix) + samples[right] * mix;
  }
  return output;
}

function trimAndNormalize(samples, sampleRate) {
  let peak = 0;
  for (let i = 0; i < samples.length; i += 1) peak = Math.max(peak, Math.abs(samples[i]));
  const threshold = Math.max(0.006, peak * 0.08);
  let start = 0;
  let end = samples.length - 1;
  while (start < samples.length && Math.abs(samples[start]) < threshold) start += 1;
  while (end > start && Math.abs(samples[end]) < threshold) end -= 1;
  const pad = Math.round(sampleRate * 0.012);
  start = Math.max(0, start - pad);
  end = Math.min(samples.length - 1, end + pad);
  const output = new Float32Array(samples.slice(start, end + 1));
  let outputPeak = 0;
  for (let i = 0; i < output.length; i += 1) outputPeak = Math.max(outputPeak, Math.abs(output[i]));
  const gain = outputPeak > 0 ? 0.92 / outputPeak : 0;
  const fade = Math.min(Math.round(sampleRate * 0.012), Math.floor(output.length / 3));
  for (let i = 0; i < output.length; i += 1) {
    let value = output[i] * gain;
    if (i < fade) value *= i / fade;
    if (i >= output.length - fade) value *= (output.length - 1 - i) / fade;
    output[i] = value;
  }
  return output;
}

function combineHumanRecordings(first, second, sampleRate, overlapSeconds) {
  const isTeachingCluster = overlapSeconds <= 0.03;
  const maxComponent = Math.round(sampleRate * 0.42);
  const firstPart = isTeachingCluster ? first.slice(0, Math.min(first.length, maxComponent)) : first;
  const secondPart = isTeachingCluster ? second.slice(0, Math.min(second.length, maxComponent)) : second;
  const overlap = Math.max(1, Math.min(Math.round(sampleRate * overlapSeconds), firstPart.length, secondPart.length));
  const total = firstPart.length + secondPart.length - overlap;
  const output = new Float32Array(total);
  output.set(firstPart, 0);
  for (let i = 0; i < overlap; i += 1) {
    const mix = i / Math.max(1, overlap - 1);
    output[firstPart.length - overlap + i] = firstPart[firstPart.length - overlap + i] * (1 - mix) + secondPart[i] * mix;
  }
  output.set(secondPart.slice(overlap), firstPart.length);
  return output;
}

function encodeWav(samples, sampleRate) {
  const dataSize = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < samples.length; i += 1) {
    const value = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.round(value * 32767), 44 + i * 2);
  }
  return buffer;
}

async function main() {
  fs.mkdirSync(outputDir, { recursive: true });
  const allSources = Object.assign({}, single, auxiliarySources);
  const parsed = new Map();
  const downloaded = new Map();

  const sourceIds = Object.keys(allSources);
  for (let index = 0; index < sourceIds.length; index += 1) {
    const id = sourceIds[index];
    const sourceName = allSources[id];
    const url = sourceBase + encodeURIComponent(sourceName) + '.wav';
    let wav = downloaded.get(sourceName);
    if (!wav) {
      wav = await fetchBuffer(url);
      downloaded.set(sourceName, wav);
    }
    const parsedWav = parseWav(wav);
    parsed.set(id, trimAndNormalize(resample(parsedWav.samples, parsedWav.sampleRate, 44100), 44100));
    if (index % 10 === 9 || index === sourceIds.length - 1) {
      console.log('Downloaded ' + (index + 1) + ' / ' + sourceIds.length + ' human source recordings');
    }
  }

  const manifest = {};
  for (const id of Object.keys(single)) {
    const sourceName = single[id];
    const sourceUrl = sourceBase + encodeURIComponent(sourceName) + '.wav';
    const file = path.join(outputDir, id + '.wav');
    const samples = parsed.get(id);
    fs.writeFileSync(file, encodeWav(samples, 44100));
    manifest[id] = {
      uk: 'assets/audio/human/' + id + '.wav',
      us: 'assets/audio/human/' + id + '.wav',
      shared: true,
      kind: 'human',
      credit: sourceCredit,
      sourceUrl: sourceUrl,
      license: sourceLicense
    };
  }

  for (const [id, recipe] of Object.entries(composites)) {
    const first = parsed.get(recipe[0]);
    const second = parsed.get(recipe[1]);
    const samples = combineHumanRecordings(first, second, 44100, recipe[2]);
    const file = path.join(outputDir, id + '.wav');
    fs.writeFileSync(file, encodeWav(samples, 44100));
    manifest[id] = {
      uk: 'assets/audio/human/' + id + '.wav',
      us: 'assets/audio/human/' + id + '.wav',
      shared: true,
      kind: 'human-composite',
      credit: 'Human recording composite from IPA Chart / Wikimedia Commons recordings',
      sourceUrl: recipe.slice(0, 2).map(function (component) {
        if (component === 'open-a') return sourceBase + encodeURIComponent(auxiliarySources['open-a']) + '.wav';
        if (single[component]) return sourceBase + encodeURIComponent(single[component]) + '.wav';
        return '';
      }),
      license: sourceLicense,
      components: recipe.slice(0, 2)
    };
  }

  const manifestSource = '/* Generated by tools/build-human-audio.js. Do not edit manually. */\n' +
    'window.IPA_HUMAN_AUDIO = Object.freeze(' + JSON.stringify(manifest, null, 2) + ');\n' +
    'if (window.IPA_DATA) { window.IPA_DATA.forEach(function (item) { item.audio = window.IPA_HUMAN_AUDIO[item.id]; }); }\n';
  fs.writeFileSync(path.join(root, 'human-audio-manifest.js'), manifestSource, 'utf8');
  fs.writeFileSync(path.join(root, 'audio-sources.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf8');
  console.log('Generated ' + Object.keys(manifest).length + ' local human phoneme files.');
}

main().catch(function (error) {
  console.error(error);
  process.exit(1);
});




