(function () {
  'use strict';

  var GROUP_META = {
    monophthong: { title: '单元音', description: '口型与舌位相对稳定，注意长短和松紧差别。', type: 'vowel' },
    diphthong: { title: '双元音', description: '从一个音滑向另一个音，前一个音通常更清晰。', type: 'vowel' },
    plosive: { title: '爆破音', description: '先形成气流阻碍，再突然释放。', type: 'consonant' },
    fricative: { title: '摩擦音', description: '让气流通过狭窄通道，产生持续摩擦。', type: 'consonant' },
    affricate: { title: '破擦音', description: '先形成阻碍，再以摩擦方式释放。', type: 'consonant' },
    nasal: { title: '鼻音', description: '口腔形成阻碍，气流从鼻腔通过。', type: 'consonant' },
    lateral: { title: '舌侧音', description: '舌尖形成阻碍，气流从舌两侧通过。', type: 'consonant' },
    approximant: { title: '半元音与近音', description: '发音器官靠近但不产生明显摩擦，快速滑向元音。', type: 'consonant' }
  };

  function examples(rows) {
    return rows.map(function (row) {
      return { word: row[0], ukIpa: row[1], usIpa: row[2] };
    });
  }

  function p(id, symbol, type, group, uk, us, tip, anchor, rows) {
    return {
      id: id,
      symbol: symbol,
      type: type,
      group: group,
      uk: uk,
      us: us,
      tip: tip,
      anchor: anchor,
      examples: examples(rows)
    };
  }

  window.IPA_GROUPS = GROUP_META;

  window.IPA_DATA = [
    p('i-long', 'iː', 'vowel', 'monophthong', 'iː', 'iː',
      '嘴角向两边拉开，舌尖轻抵下齿，舌前部抬高；声音要拉长。', 'see', [
        ['see', 'siː', 'siː'], ['tea', 'tiː', 'tiː'], ['green', 'ɡriːn', 'ɡriːn'],
        ['key', 'kiː', 'kiː'], ['machine', 'məˈʃiːn', 'məˈʃiːn']
      ]),
    p('i-short', 'ɪ', 'vowel', 'monophthong', 'ɪ', 'ɪ',
      '口型自然微开，舌位比 /iː/ 稍低、稍后，发音短促放松。', 'sit', [
        ['sit', 'sɪt', 'sɪt'], ['fish', 'fɪʃ', 'fɪʃ'], ['live', 'lɪv', 'lɪv'],
        ['milk', 'mɪlk', 'mɪlk'], ['big', 'bɪɡ', 'bɪɡ']
      ]),
    p('e', 'e', 'vowel', 'monophthong', 'e', 'ɛ',
      '嘴张开约一指宽，舌尖抵下齿，舌前部抬起，声音短。', 'bed', [
        ['bed', 'bed', 'bɛd'], ['pen', 'pen', 'pɛn'], ['red', 'red', 'rɛd'],
        ['bread', 'bred', 'brɛd'], ['friend', 'frend', 'frɛnd']
      ]),
    p('ae', 'æ', 'vowel', 'monophthong', 'æ', 'æ',
      '嘴张大，舌尖抵下齿，舌前部压低，下颌放松，声音短而有力。', 'cat', [
        ['cat', 'kæt', 'kæt'], ['bad', 'bæd', 'bæd'], ['hand', 'hænd', 'hænd'],
        ['apple', 'ˈæpəl', 'ˈæpəl'], ['family', 'ˈfæməli', 'ˈfæməli']
      ]),
    p('a-long', 'ɑː', 'vowel', 'monophthong', 'ɑː', 'ɑ',
      '嘴张大，舌身后缩并放低，像医生检查喉咙；英音拉长，美音在词尾常带卷舌。', 'car', [
        ['car', 'kɑː', 'kɑːr'], ['far', 'fɑː', 'fɑːr'], ['start', 'stɑːt', 'stɑːrt'],
        ['park', 'pɑːk', 'pɑːrk'], ['heart', 'hɑːt', 'hɑːrt']
      ]),
    p('o-short', 'ɒ', 'vowel', 'monophthong', 'ɒ', 'ɑː',
      '双唇略圆，舌身后缩，发音短；美音通常接近 /ɑ/。', 'hot', [
        ['hot', 'hɒt', 'hɑːt'], ['box', 'bɒks', 'bɑːks'], ['stop', 'stɒp', 'stɑːp'],
        ['job', 'dʒɒb', 'dʒɑːb'], ['lot', 'lɒt', 'lɑːt']
      ]),
    p('aw-long', 'ɔː', 'vowel', 'monophthong', 'ɔː', 'ɔː',
      '双唇收圆并略向前突出，舌身后缩，声音拉长。', 'talk', [
        ['talk', 'tɔːk', 'tɔːk'], ['ball', 'bɔːl', 'bɔːl'], ['saw', 'sɔː', 'sɔː'],
        ['horse', 'hɔːs', 'hɔːrs'], ['door', 'dɔː', 'dɔːr']
      ]),
    p('u-short', 'ʊ', 'vowel', 'monophthong', 'ʊ', 'ʊ',
      '双唇略圆但不要噘得太紧，舌身后缩，发音短。', 'book', [
        ['book', 'bʊk', 'bʊk'], ['good', 'ɡʊd', 'ɡʊd'], ['put', 'pʊt', 'pʊt'],
        ['foot', 'fʊt', 'fʊt'], ['could', 'kʊd', 'kʊd']
      ]),
    p('u-long', 'uː', 'vowel', 'monophthong', 'uː', 'uː',
      '双唇收圆向前，舌身后缩抬高，保持圆唇并拉长声音。', 'food', [
        ['food', 'fuːd', 'fuːd'], ['blue', 'bluː', 'bluː'], ['moon', 'muːn', 'muːn'],
        ['school', 'skuːl', 'skuːl'], ['new', 'njuː', 'nuː']
      ]),
    p('caret', 'ʌ', 'vowel', 'monophthong', 'ʌ', 'ʌ',
      '嘴自然半开，舌中部抬起，双唇放松，声音短而居中。', 'cup', [
        ['cup', 'kʌp', 'kʌp'], ['bus', 'bʌs', 'bʌs'], ['love', 'lʌv', 'lʌv'],
        ['money', 'ˈmʌni', 'ˈmʌni'], ['young', 'jʌŋ', 'jʌŋ']
      ]),
    p('er-long', 'ɜː', 'vowel', 'monophthong', 'ɜː', 'ɝː',
      '双唇自然放松，舌中部居中，声音拉长；美音通常带卷舌。', 'bird', [
        ['bird', 'bɜːd', 'bɝːd'], ['work', 'wɜːk', 'wɝːk'], ['learn', 'lɜːn', 'lɝːn'],
        ['nurse', 'nɜːs', 'nɝːs'], ['turn', 'tɜːn', 'tɝːn']
      ]),
    p('schwa', 'ə', 'vowel', 'monophthong', 'ə', 'ə',
      '嘴和舌完全放松，声音轻而短，常见于非重读音节。', 'about', [
        ['about', 'əˈbaʊt', 'əˈbaʊt'], ['teacher', 'ˈtiːtʃə', 'ˈtiːtʃər'],
        ['banana', 'bəˈnɑːnə', 'bəˈnænə'], ['sofa', 'ˈsəʊfə', 'ˈsoʊfə'],
        ['support', 'səˈpɔːt', 'səˈpɔːrt']
      ]),
    p('ei', 'eɪ', 'vowel', 'diphthong', 'eɪ', 'eɪ',
      '从 /e/ 滑向 /ɪ/，前音清楚、后音轻短，口型逐渐收小。', 'face', [
        ['face', 'feɪs', 'feɪs'], ['day', 'deɪ', 'deɪ'], ['name', 'neɪm', 'neɪm'],
        ['late', 'leɪt', 'leɪt'], ['rain', 'reɪn', 'reɪn']
      ]),
    p('ai', 'aɪ', 'vowel', 'diphthong', 'aɪ', 'aɪ',
      '从开口较大的 /a/ 快速滑向 /ɪ/，下颌逐渐抬高。', 'time', [
        ['time', 'taɪm', 'taɪm'], ['my', 'maɪ', 'maɪ'], ['light', 'laɪt', 'laɪt'],
        ['five', 'faɪv', 'faɪv'], ['high', 'haɪ', 'haɪ']
      ]),
    p('oi', 'ɔɪ', 'vowel', 'diphthong', 'ɔɪ', 'ɔɪ',
      '从圆唇的 /ɔ/ 滑向扁唇的 /ɪ/，前长后短。', 'boy', [
        ['boy', 'bɔɪ', 'bɔɪ'], ['toy', 'tɔɪ', 'tɔɪ'], ['voice', 'vɔɪs', 'vɔɪs'],
        ['choice', 'tʃɔɪs', 'tʃɔɪs'], ['enjoy', 'ɪnˈdʒɔɪ', 'ɪnˈdʒɔɪ']
      ]),
    p('oh', 'əʊ', 'vowel', 'diphthong', 'əʊ', 'oʊ',
      '从放松的 /ə/ 滑向圆唇的 /ʊ/，口型逐渐收圆；美音常写作 /oʊ/。', 'go', [
        ['go', 'ɡəʊ', 'ɡoʊ'], ['home', 'həʊm', 'hoʊm'], ['no', 'nəʊ', 'noʊ'],
        ['open', 'ˈəʊpən', 'ˈoʊpən'], ['road', 'rəʊd', 'roʊd']
      ]),
    p('au', 'aʊ', 'vowel', 'diphthong', 'aʊ', 'aʊ',
      '嘴先张大发 /a/，再快速滑向圆唇的 /ʊ/。', 'now', [
        ['now', 'naʊ', 'naʊ'], ['house', 'haʊs', 'haʊs'], ['out', 'aʊt', 'aʊt'],
        ['how', 'haʊ', 'haʊ'], ['town', 'taʊn', 'taʊn']
      ]),
    p('ia', 'ɪə', 'vowel', 'diphthong', 'ɪə', 'ɪr',
      '从 /ɪ/ 向放松的 /ə/ 滑动；美音在 r 前通常卷舌。', 'near', [
        ['near', 'nɪə', 'nɪr'], ['here', 'hɪə', 'hɪr'], ['idea', 'aɪˈdɪə', 'aɪˈdiːə'],
        ['ear', 'ɪə', 'ɪr'], ['beer', 'bɪə', 'bɪr']
      ]),
    p('ea', 'eə', 'vowel', 'diphthong', 'eə', 'er',
      '从 /e/ 向 /ə/ 滑动；美音在 r 前通常读作 /er/。', 'hair', [
        ['hair', 'heə', 'her'], ['bear', 'beə', 'ber'], ['care', 'keə', 'ker'],
        ['there', 'ðeə', 'ðer'], ['air', 'eə', 'er']
      ]),
    p('ua', 'ʊə', 'vowel', 'diphthong', 'ʊə', 'ʊr',
      '从圆唇的 /ʊ/ 向放松的 /ə/ 滑动；现代英音中也常与 /ɔː/ 合并。', 'tour', [
        ['tour', 'tʊə', 'tʊr'], ['poor', 'pʊə', 'pʊr'], ['sure', 'ʃʊə', 'ʃʊr'],
        ['cure', 'kjʊə', 'kjʊr'], ['tourist', 'ˈtʊərɪst', 'ˈtʊrɪst']
      ]),

    p('p', 'p', 'consonant', 'plosive', 'p', 'p',
      '双唇紧闭，气流积蓄后突然放开，声带不振动。', 'pen', [
        ['pen', 'pen', 'pen'], ['pin', 'pɪn', 'pɪn'], ['map', 'mæp', 'mæp'],
        ['happy', 'ˈhæpi', 'ˈhæpi'], ['stop', 'stɒp', 'stɑːp']
      ]),
    p('b', 'b', 'consonant', 'plosive', 'b', 'b',
      '口型与 /p/ 相同，但双唇释放时声带振动。', 'book', [
        ['book', 'bʊk', 'bʊk'], ['bag', 'bæɡ', 'bæɡ'], ['baby', 'ˈbeɪbi', 'ˈbeɪbi'],
        ['job', 'dʒɒb', 'dʒɑːb'], ['public', 'ˈpʌblɪk', 'ˈpʌblɪk']
      ]),
    p('t', 't', 'consonant', 'plosive', 't', 't',
      '舌尖抵住上齿龈，蓄气后快速放开，声带不振动。', 'tea', [
        ['tea', 'tiː', 'tiː'], ['top', 'tɒp', 'tɑːp'], ['ten', 'ten', 'tɛn'],
        ['table', 'ˈteɪbəl', 'ˈteɪbəl'], ['cat', 'kæt', 'kæt']
      ]),
    p('d', 'd', 'consonant', 'plosive', 'd', 'd',
      '舌尖位置与 /t/ 相同，但释放时声带振动。', 'dog', [
        ['dog', 'dɒɡ', 'dɔːɡ'], ['day', 'deɪ', 'deɪ'], ['red', 'red', 'rɛd'],
        ['food', 'fuːd', 'fuːd'], ['desk', 'desk', 'dɛsk']
      ]),
    p('k', 'k', 'consonant', 'plosive', 'k', 'k',
      '舌后部抵住软腭，蓄气后突然放开，声带不振动。', 'cat', [
        ['cat', 'kæt', 'kæt'], ['key', 'kiː', 'kiː'], ['book', 'bʊk', 'bʊk'],
        ['school', 'skuːl', 'skuːl'], ['clock', 'klɒk', 'klɑːk']
      ]),
    p('g', 'g', 'consonant', 'plosive', 'ɡ', 'ɡ',
      '舌位与 /k/ 相同，但释放时声带振动。', 'go', [
        ['go', 'ɡəʊ', 'ɡoʊ'], ['big', 'bɪɡ', 'bɪɡ'], ['bag', 'bæɡ', 'bæɡ'],
        ['girl', 'ɡɜːl', 'ɡɝːl'], ['green', 'ɡriːn', 'ɡriːn']
      ]),
    p('f', 'f', 'consonant', 'fricative', 'f', 'f',
      '上齿轻触下唇，让气流从缝隙摩擦通过，声带不振动。', 'fish', [
        ['fish', 'fɪʃ', 'fɪʃ'], ['fine', 'faɪn', 'faɪn'], ['coffee', 'ˈkɒfi', 'ˈkɔːfi'],
        ['phone', 'fəʊn', 'foʊn'], ['leaf', 'liːf', 'liːf']
      ]),
    p('v', 'v', 'consonant', 'fricative', 'v', 'v',
      '口型与 /f/ 相同，但让声带振动。', 'very', [
        ['very', 'ˈveri', 'ˈvɛri'], ['love', 'lʌv', 'lʌv'], ['seven', 'ˈsevən', 'ˈsɛvən'],
        ['voice', 'vɔɪs', 'vɔɪs'], ['river', 'ˈrɪvə', 'ˈrɪvər']
      ]),
    p('th-voiceless', 'θ', 'consonant', 'fricative', 'θ', 'θ',
      '舌尖轻放在上下齿之间，气流摩擦通过，声带不振动。', 'think', [
        ['think', 'θɪŋk', 'θɪŋk'], ['three', 'θriː', 'θriː'], ['thank', 'θæŋk', 'θæŋk'],
        ['bath', 'bɑːθ', 'bæθ'], ['mouth', 'maʊθ', 'maʊθ']
      ]),
    p('th-voiced', 'ð', 'consonant', 'fricative', 'ð', 'ð',
      '舌位与 /θ/ 相同，但让声带振动。', 'this', [
        ['this', 'ðɪs', 'ðɪs'], ['that', 'ðæt', 'ðæt'], ['mother', 'ˈmʌðə', 'ˈmʌðər'],
        ['brother', 'ˈbrʌðə', 'ˈbrʌðər'], ['breathe', 'briːð', 'briːð']
      ]),
    p('s', 's', 'consonant', 'fricative', 's', 's',
      '舌尖靠近上齿龈，气流从窄沟中摩擦通过，声带不振动。', 'sun', [
        ['sun', 'sʌn', 'sʌn'], ['see', 'siː', 'siː'], ['bus', 'bʌs', 'bʌs'],
        ['school', 'skuːl', 'skuːl'], ['sister', 'ˈsɪstə', 'ˈsɪstər']
      ]),
    p('z', 'z', 'consonant', 'fricative', 'z', 'z',
      '口型与 /s/ 相同，但让声带振动。', 'zoo', [
        ['zoo', 'zuː', 'zuː'], ['zero', 'ˈzɪərəʊ', 'ˈzɪroʊ'], ['music', 'ˈmjuːzɪk', 'ˈmjuːzɪk'],
        ['is', 'ɪz', 'ɪz'], ['easy', 'ˈiːzi', 'ˈiːzi']
      ]),
    p('sh', 'ʃ', 'consonant', 'fricative', 'ʃ', 'ʃ',
      '双唇略圆，舌前部靠近硬腭，气流摩擦通过，声带不振动。', 'she', [
        ['she', 'ʃiː', 'ʃiː'], ['ship', 'ʃɪp', 'ʃɪp'], ['fish', 'fɪʃ', 'fɪʃ'],
        ['wash', 'wɒʃ', 'wɑːʃ'], ['station', 'ˈsteɪʃən', 'ˈsteɪʃən']
      ]),
    p('zh', 'ʒ', 'consonant', 'fricative', 'ʒ', 'ʒ',
      '口型与 /ʃ/ 相同，但让声带振动。', 'vision', [
        ['vision', 'ˈvɪʒən', 'ˈvɪʒən'], ['measure', 'ˈmeʒə', 'ˈmeʒər'],
        ['usually', 'ˈjuːʒuəli', 'ˈjuːʒuəli'], ['television', 'ˈtelɪvɪʒən', 'ˈtelɪvɪʒən'],
        ['decision', 'dɪˈsɪʒən', 'dɪˈsɪʒən']
      ]),
    p('h', 'h', 'consonant', 'fricative', 'h', 'h',
      '声带不振动，像轻叹气一样让气流从张开的喉部通过。', 'hat', [
        ['hat', 'hæt', 'hæt'], ['home', 'həʊm', 'hoʊm'], ['hello', 'helˈəʊ', 'helˈoʊ'],
        ['behind', 'bɪˈhaɪnd', 'bɪˈhaɪnd'], ['perhaps', 'pəˈhæps', 'pərˈhæps']
      ]),
    p('ch', 'tʃ', 'consonant', 'affricate', 'tʃ', 'tʃ',
      '舌尖先抵住上齿龈，再迅速滑向 /ʃ/，声带不振动。', 'chair', [
        ['chair', 'tʃeə', 'tʃer'], ['cheese', 'tʃiːz', 'tʃiːz'],
        ['teacher', 'ˈtiːtʃə', 'ˈtiːtʃər'], ['watch', 'wɒtʃ', 'wɑːtʃ'],
        ['lunch', 'lʌntʃ', 'lʌntʃ']
      ]),
    p('j-sound', 'dʒ', 'consonant', 'affricate', 'dʒ', 'dʒ',
      '起始舌位像 /tʃ/，但让声带振动。', 'job', [
        ['job', 'dʒɒb', 'dʒɑːb'], ['age', 'eɪdʒ', 'eɪdʒ'], ['bridge', 'brɪdʒ', 'brɪdʒ'],
        ['jump', 'dʒʌmp', 'dʒʌmp'], ['orange', 'ˈɒrɪndʒ', 'ˈɔːrɪndʒ']
      ]),
    p('tr', 'tr', 'consonant', 'affricate', 'tr', 'tr',
      '舌尖从 /t/ 的位置快速滑向 /r/，中间气流连续。', 'tree', [
        ['tree', 'triː', 'triː'], ['train', 'treɪn', 'treɪn'], ['try', 'traɪ', 'traɪ'],
        ['travel', 'ˈtrævəl', 'ˈtrævəl'], ['country', 'ˈkʌntri', 'ˈkʌntri']
      ]),
    p('dr', 'dr', 'consonant', 'affricate', 'dr', 'dr',
      '舌尖从 /d/ 的位置快速滑向 /r/，声带振动。', 'dream', [
        ['dream', 'driːm', 'driːm'], ['drive', 'draɪv', 'draɪv'], ['dress', 'dres', 'drɛs'],
        ['draw', 'drɔː', 'drɔː'], ['children', 'ˈtʃɪldrən', 'ˈtʃɪldrən']
      ]),
    p('ts', 'ts', 'consonant', 'affricate', 'ts', 'ts',
      '舌尖先形成 /t/ 的阻碍，再迅速滑向 /s/，声带不振动。', 'cats', [
        ['cats', 'kæts', 'kæts'], ['sits', 'sɪts', 'sɪts'], ['lots', 'lɒts', 'lɑːts'],
        ['streets', 'striːts', 'striːts'], ['guests', 'ɡests', 'ɡests']
      ]),
    p('dz', 'dz', 'consonant', 'affricate', 'dz', 'dz',
      '舌尖先形成 /d/ 的阻碍，再迅速滑向 /z/，声带振动。', 'beds', [
        ['beds', 'bedz', 'bɛdz'], ['needs', 'niːdz', 'niːdz'], ['friends', 'frendz', 'frɛndz'],
        ['cards', 'kɑːdz', 'kɑːrdz'], ['hands', 'hændz', 'hændz']
      ]),
    p('m', 'm', 'consonant', 'nasal', 'm', 'm',
      '双唇闭合并振动声带，气流从鼻腔通过。', 'map', [
        ['map', 'mæp', 'mæp'], ['mum', 'mʌm', 'mʌm'], ['come', 'kʌm', 'kʌm'],
        ['summer', 'ˈsʌmə', 'ˈsʌmər'], ['room', 'ruːm', 'ruːm']
      ]),
    p('n', 'n', 'consonant', 'nasal', 'n', 'n',
      '舌尖抵住上齿龈，振动声带，气流从鼻腔通过。', 'name', [
        ['name', 'neɪm', 'neɪm'], ['no', 'nəʊ', 'noʊ'], ['sun', 'sʌn', 'sʌn'],
        ['dinner', 'ˈdɪnə', 'ˈdɪnər'], ['nine', 'naɪn', 'naɪn']
      ]),
    p('ng', 'ŋ', 'consonant', 'nasal', 'ŋ', 'ŋ',
      '舌后部抵住软腭，振动声带，气流从鼻腔通过。', 'sing', [
        ['sing', 'sɪŋ', 'sɪŋ'], ['long', 'lɒŋ', 'lɔːŋ'], ['king', 'kɪŋ', 'kɪŋ'],
        ['morning', 'ˈmɔːnɪŋ', 'ˈmɔːrnɪŋ'], ['English', 'ˈɪŋɡlɪʃ', 'ˈɪŋɡlɪʃ']
      ]),
    p('l', 'l', 'consonant', 'lateral', 'l', 'l',
      '舌尖抵住上齿龈，声带振动，让气流从舌头两侧通过。', 'like', [
        ['like', 'laɪk', 'laɪk'], ['light', 'laɪt', 'laɪt'], ['school', 'skuːl', 'skuːl'],
        ['hello', 'helˈəʊ', 'helˈoʊ'], ['full', 'fʊl', 'fʊl']
      ]),
    p('r', 'r', 'consonant', 'approximant', 'r', 'r',
      '舌尖略卷起但不碰触上颚，双唇微圆；英音词尾 r 通常不发音，美音常卷舌。', 'red', [
        ['red', 'red', 'rɛd'], ['right', 'raɪt', 'raɪt'], ['room', 'ruːm', 'ruːm'],
        ['carry', 'ˈkæri', 'ˈkæri'], ['tree', 'triː', 'triː']
      ]),
    p('y', 'j', 'consonant', 'approximant', 'j', 'j',
      '舌前部抬近硬腭但不摩擦，迅速滑向后面的元音，声带振动。', 'yes', [
        ['yes', 'jes', 'jes'], ['you', 'juː', 'juː'], ['year', 'jɪə', 'jɪr'],
        ['yellow', 'ˈjeləʊ', 'ˈjeloʊ'], ['music', 'ˈmjuːzɪk', 'ˈmjuːzɪk']
      ]),
    p('w', 'w', 'consonant', 'approximant', 'w', 'w',
      '双唇先收圆前突，再迅速滑向元音，声带振动。', 'we', [
        ['we', 'wiː', 'wiː'], ['water', 'ˈwɔːtə', 'ˈwɔːtər'], ['window', 'ˈwɪndəʊ', 'ˈwɪndoʊ'],
        ['one', 'wʌn', 'wʌn'], ['quick', 'kwɪk', 'kwɪk']
      ])
  ];

  window.IPA_DATA.forEach(function (item) {
    item.diagram = {
      src: 'assets/diagrams/' + item.id + '.svg',
      alt: '/' + item.symbol + '/ 的正面口型与侧面舌位示意图'
    };
  });

  window.IPA_BY_ID = window.IPA_DATA.reduce(function (map, item) {
    map[item.id] = item;
    return map;
  }, {});
})();


