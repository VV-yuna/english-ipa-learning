'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const outputDir = path.join(root, 'assets', 'diagrams');

const symbols = {
  'i-long': 'iː', 'i-short': 'ɪ', 'e': 'e', 'ae': 'æ', 'a-long': 'ɑː', 'o-short': 'ɒ',
  'aw-long': 'ɔː', 'u-short': 'ʊ', 'u-long': 'uː', 'caret': 'ʌ', 'er-long': 'ɜː', 'schwa': 'ə',
  'ei': 'eɪ', 'ai': 'aɪ', 'oi': 'ɔɪ', 'oh': 'əʊ', 'au': 'aʊ', 'ia': 'ɪə', 'ea': 'eə', 'ua': 'ʊə',
  'p': 'p', 'b': 'b', 't': 't', 'd': 'd', 'k': 'k', 'g': 'g', 'f': 'f', 'v': 'v',
  'th-voiceless': 'θ', 'th-voiced': 'ð', 's': 's', 'z': 'z', 'sh': 'ʃ', 'zh': 'ʒ',
  'h': 'h', 'ch': 'tʃ', 'j-sound': 'dʒ', 'tr': 'tr', 'dr': 'dr', 'ts': 'ts', 'dz': 'dz',
  'm': 'm', 'n': 'n', 'ng': 'ŋ', 'l': 'l', 'r': 'r', 'y': 'j', 'w': 'w'
};

// [tongue height, tongue backness, lip rounding, jaw opening, end height, end backness, end rounding, end jaw]
const vowelSpecs = {
  'i-long': [0.94, 0.08, 0.02, 0.10],
  'i-short': [0.80, 0.18, 0.02, 0.18],
  'e': [0.60, 0.20, 0.02, 0.34],
  'ae': [0.42, 0.05, 0.02, 0.62],
  'a-long': [0.16, 0.20, 0.10, 0.76],
  'o-short': [0.25, 0.68, 0.72, 0.62],
  'aw-long': [0.34, 0.78, 0.90, 0.50],
  'u-short': [0.72, 0.84, 0.78, 0.20],
  'u-long': [0.94, 0.92, 0.98, 0.10],
  'caret': [0.48, 0.52, 0.05, 0.44],
  'er-long': [0.56, 0.48, 0.05, 0.34],
  'schwa': [0.46, 0.50, 0.05, 0.40],
  'ei': [0.60, 0.20, 0.02, 0.34, 0.80, 0.18, 0.02, 0.18],
  'ai': [0.18, 0.08, 0.02, 0.72, 0.80, 0.18, 0.02, 0.18],
  'oi': [0.34, 0.78, 0.90, 0.50, 0.80, 0.18, 0.02, 0.18],
  'oh': [0.46, 0.50, 0.05, 0.40, 0.72, 0.84, 0.78, 0.20],
  'au': [0.18, 0.08, 0.02, 0.72, 0.72, 0.84, 0.78, 0.20],
  'ia': [0.80, 0.18, 0.02, 0.18, 0.46, 0.50, 0.05, 0.40],
  'ea': [0.60, 0.20, 0.02, 0.34, 0.46, 0.50, 0.05, 0.40],
  'ua': [0.72, 0.84, 0.78, 0.20, 0.46, 0.50, 0.05, 0.40]
};

const consonantSpecs = {
  'p': ['bilabial', 'plosive', false], 'b': ['bilabial', 'plosive', true],
  't': ['alveolar', 'plosive', false], 'd': ['alveolar', 'plosive', true],
  'k': ['velar', 'plosive', false], 'g': ['velar', 'plosive', true],
  'f': ['labiodental', 'fricative', false], 'v': ['labiodental', 'fricative', true],
  'th-voiceless': ['dental', 'fricative', false], 'th-voiced': ['dental', 'fricative', true],
  's': ['alveolar', 'fricative', false], 'z': ['alveolar', 'fricative', true],
  'sh': ['postalveolar', 'fricative', false], 'zh': ['postalveolar', 'fricative', true],
  'h': ['glottal', 'fricative', false], 'ch': ['postalveolar', 'affricate', false],
  'j-sound': ['postalveolar', 'affricate', true], 'tr': ['alveolar', 'cluster', false, 'postalveolar'],
  'dr': ['alveolar', 'cluster', true, 'postalveolar'], 'ts': ['alveolar', 'cluster', false, 'alveolar-fricative'],
  'dz': ['alveolar', 'cluster', true, 'alveolar-fricative'], 'm': ['bilabial', 'nasal', true],
  'n': ['alveolar', 'nasal', true], 'ng': ['velar', 'nasal', true], 'l': ['alveolar', 'lateral', true],
  'r': ['postalveolar', 'approximant', true], 'y': ['palatal', 'approximant', true],
  'w': ['labial-velar', 'approximant', true]
};

function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function esc(value) { return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function fmt(value) { return Number(value).toFixed(2).replace(/0+$/, '').replace(/\.$/, ''); }

function tongueY(height) { return 215 - clamp(height, 0, 1) * 92; }
function tongueX(backness) { return 348 + clamp(backness, 0, 1) * 112; }
function frontMouthVowel(spec) {
  const [height, backness, rounding, jaw, endHeight, endBackness, endRounding, endJaw] = spec;
  const openH = 22 + jaw * 70;
  const openW = 116 - rounding * 42;
  const lipW = openW + 20;
  const lipH = openH + 18;
  const tongueTipY = 194 + jaw * 18;
  const roundArrows = rounding > 0.45
    ? '<path d="M78 157 Q66 187 78 217" class="motion"/><path d="M242 157 Q254 187 242 217" class="motion"/>'
    : '<path d="M86 190 L68 190" class="motion"/><path d="M234 190 L252 190" class="motion"/>';
  const motionText = rounding > 0.45 ? '双唇收圆' : '嘴角展开';
  const endHint = endHeight == null ? '' :
    '<text x="160" y="323" text-anchor="middle" class="small">起点 → 终点</text>';

  return '<g>' +
    '<text x="35" y="47" class="section-label">正面口型</text>' +
    '<ellipse cx="160" cy="193" rx="73" ry="91" fill="#fff" stroke="#d9d2e8" stroke-width="3"/>' +
    '<ellipse cx="160" cy="190" rx="' + fmt(lipW / 2) + '" ry="' + fmt(lipH / 2) + '" fill="#f1aebe" opacity=".36"/>' +
    '<ellipse cx="160" cy="190" rx="' + fmt(lipW / 2) + '" ry="' + fmt(lipH / 2) + '" fill="none" stroke="#b64b68" stroke-width="5"/>' +
    '<ellipse cx="160" cy="190" rx="' + fmt(openW / 2) + '" ry="' + fmt(openH / 2) + '" fill="#3b3050"/>' +
    '<path d="M' + fmt(160 - openW / 2 + 5) + ' 190 Q160 ' + fmt(190 - openH / 3) + ' ' + fmt(160 + openW / 2 - 5) + ' 190" fill="none" stroke="#f7c2cf" stroke-width="4"/>' +
    '<path d="M' + fmt(160 - openW / 2 + 5) + ' 190 Q160 ' + fmt(190 + openH / 3) + ' ' + fmt(160 + openW / 2 - 5) + ' 190" fill="none" stroke="#f7c2cf" stroke-width="4"/>' +
    '<path d="M128 ' + fmt(tongueTipY) + ' Q160 ' + fmt(tongueTipY - 12 - height * 12) + ' 192 ' + fmt(tongueTipY) + ' Q160 ' + fmt(tongueTipY + 20) + ' 128 ' + fmt(tongueTipY) + 'Z" fill="#ee846f" opacity=".92"/>' +
    roundArrows +
    '<text x="160" y="303" text-anchor="middle" class="small">' + motionText + '</text>' + endHint +
  '</g>';
}

function frontMouthConsonant(place, manner, voiced) {
  let mouth = '';
  let label = '舌位见右图';

  if (place === 'bilabial') {
    mouth = '<path d="M92 194 Q160 176 228 194 Q160 211 92 194Z" fill="#f3b7c6" stroke="#b64b68" stroke-width="5"/>' +
      '<path d="M102 194 Q160 188 218 194" class="contact"/>';
    label = '双唇闭合';
  } else if (place === 'labiodental') {
    mouth = '<path d="M92 172 Q160 158 228 172" class="lip-line"/>' +
      '<path d="M98 218 Q160 198 222 218" class="lip-line"/>' +
      '<path d="M108 186 Q160 174 212 186" stroke="#fff" stroke-width="8" stroke-linecap="round"/>';
    label = '下唇接触上齿';
  } else if (place === 'labial-velar') {
    mouth = '<ellipse cx="160" cy="193" rx="55" ry="49" fill="#3b3050" stroke="#b64b68" stroke-width="7"/>' +
      '<path d="M108 170 Q160 143 212 170" class="lip-line"/>';
    label = '圆唇 + 软腭抬高';
  } else if (place === 'dental') {
    mouth = '<ellipse cx="160" cy="193" rx="61" ry="42" fill="#3b3050"/>' +
      '<path d="M102 176 Q160 185 218 176 L218 187 Q160 198 102 187Z" fill="#fff"/>' +
      '<path d="M126 201 Q160 190 194 201 Q160 236 126 201Z" fill="#ee846f"/>';
    label = '舌尖伸向上下齿间';
  } else {
    mouth = '<ellipse cx="160" cy="193" rx="61" ry="39" fill="#3b3050"/>' +
      '<path d="M102 176 Q160 185 218 176" stroke="#fff" stroke-width="7" stroke-linecap="round"/>' +
      '<path d="M116 219 Q160 201 204 219 Q160 238 116 219Z" fill="#ee846f" opacity=".92"/>';
    label = '舌部抬起，正面开口自然';
  }

  const voice = voiced ? '浊音 · 声带振动' : '清音 · 声带不振动';
  return '<g><text x="35" y="47" class="section-label">正面口型</text>' +
    '<ellipse cx="160" cy="193" rx="73" ry="91" fill="#fff" stroke="#d9d2e8" stroke-width="3"/>' +
    mouth + '<text x="160" y="304" text-anchor="middle" class="small">' + label + '</text>' +
    '<text x="160" y="328" text-anchor="middle" class="small">' + voice + '</text></g>';
}

function profileBase(jaw) {
  const lowerY = 182 + jaw * 30;
  return '<path d="M265 56 C342 37 449 66 470 139 L486 183 C490 202 476 213 460 207 L447 202 C453 232 438 267 405 286 C351 315 286 288 267 242 C253 210 252 151 265 56Z" fill="#fff" stroke="#bfb6d2" stroke-width="3"/>' +
    '<path d="M294 107 Q431 88 461 136" fill="none" stroke="#b8abc9" stroke-width="3" stroke-dasharray="5 5"/>' +
    '<path d="M276 164 Q319 145 352 153" fill="none" stroke="#d89aa9" stroke-width="5" stroke-linecap="round"/>' +
    '<path d="M276 ' + fmt(lowerY) + ' Q317 ' + fmt(lowerY + 18) + ' 354 ' + fmt(lowerY + 4) + '" fill="none" stroke="#d89aa9" stroke-width="5" stroke-linecap="round"/>' +
    '<path d="M346 139 Q405 121 456 139" fill="none" stroke="#6f5d91" stroke-width="4" stroke-linecap="round"/>' +
    '<path d="M424 137 Q434 115 448 113" fill="none" stroke="#6f5d91" stroke-width="4" stroke-linecap="round"/>';
}

function sideVowel(spec) {
  const [height, backness, rounding, jaw, endHeight, endBackness, endRounding, endJaw] = spec;
  const x = tongueX(backness);
  const y = tongueY(height);
  const startTongue = 'M286 218 Q302 194 ' + fmt(x) + ' ' + fmt(y) + ' Q426 174 454 212 L454 238 L286 238Z';
  let extra = '';
  if (endHeight != null) {
    const ex = tongueX(endBackness);
    const ey = tongueY(endHeight);
    const ex2 = 286 + (ex - 286) * 0.72;
    const ey2 = 218 + (ey - 218) * 0.72;
    extra = '<path d="M286 218 Q302 194 ' + fmt(ex2) + ' ' + fmt(ey2) + ' Q415 184 448 213" fill="none" stroke="#b7a7d3" stroke-width="3" stroke-dasharray="6 5"/>' +
      '<path d="M' + fmt(x - 5) + ' ' + fmt(y - 17) + ' Q' + fmt((x + ex) / 2) + ' ' + fmt((y + ey) / 2 - 34) + ' ' + fmt(ex + 5) + ' ' + fmt(ey - 17) + '" fill="none" class="motion"/>' +
      '<circle cx="' + fmt(x) + '" cy="' + fmt(y - 13) + '" r="5" fill="#6d28d9"/><circle cx="' + fmt(ex) + '" cy="' + fmt(ey - 13) + '" r="5" fill="#2563eb"/>';
  }
  const lipX = 278 + rounding * 5;
  const lowerY = 180 + jaw * 29;
  return '<g><text x="306" y="47" class="section-label">侧面舌位</text>' + profileBase(jaw) +
    '<path d="' + startTongue + '" fill="#ee846f" opacity=".92"/>' + extra +
    '<path d="M' + fmt(lipX) + ' 163 Q265 166 265 177 Q265 190 ' + fmt(lipX) + ' ' + fmt(lowerY) + '" fill="none" stroke="#b64b68" stroke-width="6" stroke-linecap="round"/>' +
    '<text x="' + fmt(x) + '" y="' + fmt(y + 45) + '" text-anchor="middle" class="tiny">舌头隆起</text></g>';
}

const placeTargets = {
  bilabial: [286, 166], labiodental: [292, 158], dental: [292, 164], alveolar: [325, 137],
  postalveolar: [357, 128], palatal: [382, 121], velar: [426, 130], glottal: [286, 215],
  'labial-velar': [423, 130]
};

function mannerSymbol(manner, targetX, targetY) {
  if (manner === 'plosive') {
    return '<circle cx="' + targetX + '" cy="' + targetY + '" r="8" fill="#6d28d9"/><path d="M' + (targetX + 12) + ' ' + targetY + ' L' + (targetX + 50) + ' ' + targetY + '" class="motion"/><text x="' + (targetX + 56) + '" y="' + (targetY + 5) + '" class="tiny">释放</text>';
  }
  if (manner === 'fricative') {
    return '<path d="M' + (targetX - 7) + ' ' + (targetY - 8) + ' L' + (targetX + 4) + ' ' + (targetY - 2) + ' L' + (targetX - 4) + ' ' + (targetY + 4) + ' L' + (targetX + 9) + ' ' + (targetY + 10) + '" class="motion"/><text x="' + (targetX + 18) + '" y="' + (targetY - 4) + '" class="tiny">摩擦气流</text>';
  }
  if (manner === 'nasal') {
    return '<path d="M371 111 Q386 63 426 67" class="nasal"/><text x="432" y="77" class="tiny">鼻腔气流</text>';
  }
  if (manner === 'lateral') {
    return '<path d="M' + (targetX - 9) + ' ' + (targetY + 24) + ' Q' + (targetX + 18) + ' ' + (targetY + 48) + ' ' + (targetX + 45) + ' ' + (targetY + 20) + '" class="motion"/><text x="' + (targetX + 27) + '" y="' + (targetY + 42) + '" class="tiny">舌侧气流</text>';
  }
  if (manner === 'affricate') {
    return '<circle cx="' + targetX + '" cy="' + targetY + '" r="7" fill="#6d28d9"/><path d="M' + (targetX + 11) + ' ' + (targetY + 2) + ' Q' + (targetX + 28) + ' ' + (targetY - 9) + ' ' + (targetX + 45) + ' ' + (targetY + 4) + '" class="motion"/><text x="' + (targetX + 15) + '" y="' + (targetY + 28) + '" class="tiny">先阻碍后摩擦</text>';
  }
  return '<path d="M320 176 Q' + targetX + ' ' + (targetY + 14) + ' 444 174" class="motion"/><text x="' + (targetX + 16) + '" y="' + (targetY + 31) + '" class="tiny">气流通过</text>';
}

function sideConsonant(place, manner, voiced, secondary) {
  const target = placeTargets[place] || placeTargets.alveolar;
  const [tx, ty] = target;
  const humpX = place === 'bilabial' || place === 'labiodental' ? 340 : tx - 25;
  const humpY = manner === 'velar' ? 180 : Math.max(148, ty + 34);
  const tongue = 'M286 218 Q304 190 ' + fmt(humpX) + ' ' + fmt(humpY) + ' Q' + fmt(tx + 8) + ' ' + fmt(ty + 10) + ' ' + fmt(tx) + ' ' + fmt(ty + 15) + ' Q' + fmt(tx + 25) + ' ' + fmt(ty + 38) + ' 386 214 Q430 195 458 216 L458 240 L286 240Z';
  const secondaryTarget = secondary === 'postalveolar' ? placeTargets.postalveolar : placeTargets.alveolar;
  const secondaryMark = secondary
    ? '<circle cx="' + secondaryTarget[0] + '" cy="' + secondaryTarget[1] + '" r="5" fill="#2563eb"/><path d="M' + tx + ' ' + (ty - 13) + ' Q' + ((tx + secondaryTarget[0]) / 2) + ' ' + (ty - 42) + ' ' + secondaryTarget[0] + ' ' + (secondaryTarget[1] - 13) + '" class="cluster"/>'
    : '';
  const voice = voiced ? '<circle cx="282" cy="224" r="7" fill="#6d28d9"/>' : '<circle cx="282" cy="224" r="7" fill="#fff" stroke="#6d28d9" stroke-width="3"/>';
  const voiceLabel = voiced ? '浊音' : '清音';
  return '<g><text x="306" y="47" class="section-label">侧面舌位</text>' + profileBase(0.45) +
    '<path d="' + tongue + '" fill="#ee846f" opacity=".94"/>' + secondaryMark +
    mannerSymbol(manner, tx, ty) + voice +
    '<text x="420" y="278" class="small">' + voiceLabel + ' · ' + esc(place) + '</text></g>';
}
function makeSvg(id, symbol, spec, consonantSpec) {
  const isVowel = Boolean(spec);
  const front = isVowel ? frontMouthVowel(spec) : frontMouthConsonant(consonantSpec[0], consonantSpec[1], consonantSpec[2]);
  const side = isVowel ? sideVowel(spec) : sideConsonant(consonantSpec[0], consonantSpec[1], consonantSpec[2], consonantSpec[3]);
  const kind = isVowel ? '元音' : '辅音';
  const desc = '/' + symbol + '/ 的正面口型与侧面舌位示意图';

  return '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 360" role="img" aria-labelledby="title desc">' +
      '<title id="title">/' + esc(symbol) + '/ ' + kind + '发音口型图</title>' +
      '<desc id="desc">' + esc(desc) + '</desc>' +
      '<defs>' +
        '<marker id="arrow" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto"><path d="M0 0 L9 4.5 L0 9Z" fill="#6d28d9"/></marker>' +
        '<marker id="arrow-blue" markerWidth="9" markerHeight="9" refX="7" refY="4.5" orient="auto"><path d="M0 0 L9 4.5 L0 9Z" fill="#2563eb"/></marker>' +
        '<linearGradient id="bg" x1="0" x2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#f7f4ff"/></linearGradient>' +
        '<style>' +
          '.section-label{font:700 15px "Segoe UI","Microsoft YaHei",sans-serif;fill:#4c1d95;letter-spacing:.08em}' +
          '.small{font:600 12px "Segoe UI","Microsoft YaHei",sans-serif;fill:#667085}' +
          '.tiny{font:600 10px "Segoe UI","Microsoft YaHei",sans-serif;fill:#6d28d9}' +
          '.lip-line{fill:none;stroke:#b64b68;stroke-width:6;stroke-linecap:round}' +
          '.contact{fill:none;stroke:#6d28d9;stroke-width:4;stroke-linecap:round;stroke-dasharray:4 4}' +
          '.motion{fill:none;stroke:#6d28d9;stroke-width:3;stroke-linecap:round;stroke-linejoin:round;marker-end:url(#arrow)}' +
          '.nasal{fill:none;stroke:#2563eb;stroke-width:4;stroke-linecap:round;stroke-dasharray:7 5;marker-end:url(#arrow-blue)}' +
          '.cluster{fill:none;stroke:#2563eb;stroke-width:3;stroke-linecap:round;stroke-dasharray:5 4;marker-end:url(#arrow-blue)}' +
        '</style>' +
      '</defs>' +
      '<rect x="2" y="2" width="716" height="356" rx="28" fill="url(#bg)" stroke="#e5dff1" stroke-width="2"/>' +
      '<line x1="282" y1="62" x2="282" y2="330" stroke="#ebe6f3" stroke-width="2"/>' +
      '<circle cx="655" cy="55" r="38" fill="#ede9fe" stroke="#c4b5fd" stroke-width="2"/>' +
      '<text x="655" y="64" text-anchor="middle" font-family="Doulos SIL,Charis SIL,Segoe UI,sans-serif" font-size="31" font-weight="700" fill="#4c1d95">/' + esc(symbol) + '/</text>' +
      front + side +
      '<text x="34" y="344" class="tiny">口型与舌位仅作发音位置参考</text>' +
    '</svg>';
}

if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

Object.keys(symbols).forEach(function (id) {
  const symbol = symbols[id];
  const vowelSpec = vowelSpecs[id];
  const consonantSpec = consonantSpecs[id];
  if (!vowelSpec && !consonantSpec) throw new Error('Missing diagram spec for ' + id);
  const svg = makeSvg(id, symbol, vowelSpec, consonantSpec);
  fs.writeFileSync(path.join(outputDir, id + '.svg'), svg, 'utf8');
});

console.log('Generated ' + Object.keys(symbols).length + ' articulation diagrams in ' + outputDir);
