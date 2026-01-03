const fs = require('fs');
const path = require('path');

const examDir = path.join(__dirname, '..', 'exam');
const sourceFile = path.join(examDir, '期末网页.json');
const refFile = path.join(examDir, '网络技术.json');

function safeReadJSON(filePath) {
  let raw = fs.readFileSync(filePath, 'utf8');
  // strip possible markdown/code fences
  raw = raw.replace(/^```json\s*/i, '').replace(/\s*```\s*$/i, '');
  try {
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse JSON for', filePath, e.message);
    process.exit(2);
  }
}

function normalize(s) {
  if (!s) return '';
  if (typeof s !== 'string') s = String(s);
  // remove html tags like <fillblank/> and entities, lower, trim
  s = s.replace(/<[^>]+>/g, '');
  s = s.replace(/[\u3000\s]+/g, ' ');
  s = s.replace(/["'，、。；：,.?？!！]/g, '');
  return s.toLowerCase().trim();
}

function buildRefMap(refArray) {
  const map = new Map();
  for (const item of refArray) {
    const q = normalize(item.question || item.title || item.titleText || '');
    if (!q) continue;
    // prefer exact question -> type
    if (!map.has(q)) map.set(q, item.type || item.typeId || item.answer || null);
  }
  return map;
}

function main() {
  if (!fs.existsSync(sourceFile)) {
    console.error('source file not found:', sourceFile);
    process.exit(1);
  }
  if (!fs.existsSync(refFile)) {
    console.error('reference file not found:', refFile);
    process.exit(1);
  }

  const src = safeReadJSON(sourceFile);
  const refRaw = safeReadJSON(refFile);

  // refRaw may be array or object; normalize to array
  const refArray = Array.isArray(refRaw) ? refRaw : (refRaw.rows || refRaw.questions || []);
  const refMap = buildRefMap(refArray);

  // backup
  const backupPath = path.join(examDir, '期末网页.backup.json');
  fs.writeFileSync(backupPath, JSON.stringify(src, null, 2), 'utf8');
  console.log('Backup written to', backupPath);

  let matched = 0, unmatched = 0;

  if (!Array.isArray(src.rows)) {
    console.error('unexpected format: expected object with rows array in', sourceFile);
    process.exit(1);
  }

  for (const row of src.rows) {
    const candidates = [row.title, row.titleText, row.question, row.analysis];
    let found = null;
    for (const c of candidates) {
      const k = normalize(c);
      if (!k) continue;
      if (refMap.has(k)) {
        found = refMap.get(k);
        break;
      }
      // try partial match: any ref key included in this string
      for (const [rk, rv] of refMap.entries()) {
        if ((rk && k.includes(rk)) || (rk.includes(k))) {
          found = rv; break;
        }
      }
      if (found) break;
    }

    if (found) {
      // if found is object with .type, use it; otherwise use value
      if (typeof found === 'object' && found !== null && found.type) row.type = found.type;
      else row.type = found;
      matched++;
    } else {
      // fallback: if typeId exists, map some common ids
      const fallbackMap = { '1': 'single_choice', '2': 'multiple_choice', '3': 'true_false', '4': 'short_answer' };
      if (row.typeId && fallbackMap[row.typeId]) {
        row.type = fallbackMap[row.typeId];
      } else {
        row.type = row.type || 'unknown';
      }
      unmatched++;
    }
  }

  // If nothing matched by text, try mapping by index order as a fallback
  if (matched === 0 && Array.isArray(refArray) && refArray.length >= src.rows.length) {
    matched = 0; unmatched = 0;
    for (let i = 0; i < src.rows.length; i++) {
      const ref = refArray[i];
      const t = ref && (ref.type || ref.typeId || ref.answer) ? (ref.type || ref.typeId || ref.answer) : null;
      if (t) {
        src.rows[i].type = t;
        matched++;
      } else {
        // fallback mapping for typeId numbers if present in src
        const fallbackMap = { '1': 'single_choice', '2': 'multiple_choice', '3': 'true_false', '4': 'short_answer' };
        const rtid = ref && ref.typeId;
        if (rtid && fallbackMap[rtid]) src.rows[i].type = fallbackMap[rtid];
        else src.rows[i].type = src.rows[i].type || 'unknown';
        unmatched++;
      }
    }
    console.log('Applied index-based mapping fallback.');
  }

  const outPath = sourceFile; // overwrite
  fs.writeFileSync(outPath, JSON.stringify(src, null, 2), 'utf8');
  console.log('Finished. Matched:', matched, 'Unmatched (fallback applied):', unmatched);
  console.log('Updated file written to', outPath);

  // Build converted array in 网络技术.json style
  const converted = src.rows.map((row, idx) => {
    const rawQuestion = row.titleText || row.title || row.question || '';
    const question = rawQuestion.replace(/<fillblank\/>/g, '____').replace(/<[^>]+>/g, '');

    // try to extract options if present in row.dataJson (if it's a JSON string)
    let options = [];
    try {
      if (row.dataJson && typeof row.dataJson === 'string' && row.dataJson.trim()) {
        const parsed = JSON.parse(row.dataJson);
        if (Array.isArray(parsed.options)) options = parsed.options;
      }
    } catch (e) {
      // ignore
    }

    // if options still empty, leave as empty array
    const answer = (row.answer && String(row.answer).trim()) ? row.answer : (row.analysis ? row.analysis : '');
    const analysis = (row.analysis && String(row.analysis).trim()) ? row.analysis : answer;

    // normalize type to common names
    const typeMap = { '1': 'single_choice', '2': 'multiple_choice', '3': 'true_false', '4': 'short_answer' };
    let type = row.type || row.typeId || '';
    if (typeMap[type]) type = typeMap[type];
    // common uppercase/lowercase normalization
    if (typeof type === 'string') type = type.toLowerCase();

    return {
      id: row.id || String(idx + 1),
      question: question.trim(),
      options: options,
      answer: answer,
      analysis: analysis,
      type: type || 'unknown',
      userName: '成泽辉'
    };
  });

  const convPath = path.join(examDir, '期末网页.converted.json');
  fs.writeFileSync(convPath, JSON.stringify(converted, null, 2), 'utf8');
  console.log('Converted array written to', convPath);
}

main();
