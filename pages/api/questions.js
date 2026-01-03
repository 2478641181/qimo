import fs from 'fs'
import path from 'path'

const normalizeRows = (payload) => {
  if (!payload) return []
  if (Array.isArray(payload?.rows)) return payload.rows
  if (Array.isArray(payload)) return payload
  if (typeof payload === 'object') {
    return Object.values(payload).flatMap((value) => {
      if (Array.isArray(value)) return value
      if (value && typeof value === 'object') return [value]
      return []
    })
  }
  return []
}

const withBankTag = (rows = [], bank) => rows
  .filter((row) => row && typeof row === 'object')
  .map((row) => ({ ...row, bank: bank || row.bank || null }))

// map letter/number answers to option text
const pickOptionText = (options = [], ans) => {
  if (!Array.isArray(options) || options.length === 0 || !ans) return null
  const letter = String(ans).trim()
  // match A/B/C/D etc.
  const m = letter.match(/([A-Za-z])/)
  if (m) {
    const idx = m[1].toUpperCase().charCodeAt(0) - 'A'.charCodeAt(0)
    if (idx >= 0 && idx < options.length) return options[idx]
  }
  const n = Number(letter)
  if (!Number.isNaN(n) && n >= 1 && n <= options.length) return options[n - 1]
  // exact match option
  const hit = options.find((op) => String(op).trim() === letter)
  return hit || null
}

const normalizeAnswers = (answer, options = []) => {
  if (answer == null) return []
  if (Array.isArray(answer)) return answer.flatMap((a) => normalizeAnswers(a, options))
  const raw = String(answer).trim()
  if (!raw) return []
  // split by comma/space/semicolon
  const parts = raw.split(/[，,;；\s]+/).filter(Boolean)
  if (parts.length === 0) return []
  // map each to option text if possible
  return parts.map((p) => pickOptionText(options, p) || p)
}

export default function handler(req, res) {
  const cwd = process.cwd()
  const examDir = path.join(cwd, 'exam')
  const fallbackFile = path.join(cwd, 'data.json')

  try {
    let items = []

    if (fs.existsSync(examDir)) {
      const files = fs.readdirSync(examDir).filter((name) => name.toLowerCase().endsWith('.json'))
      files.forEach((file) => {
        const filePath = path.join(examDir, file)
        try {
              let raw = fs.readFileSync(filePath, 'utf8')

              // strip possible markdown/code fences like ```json
              raw = raw.replace(/^```json\s*/i, '').replace(/\s*```\s*$/i, '')

              // try robust JSON parse: first normal, then try extract [...] or {...}
              let data
              try {
                data = JSON.parse(raw)
              } catch (errJson) {
                // try extract array fragment
                const firstArr = raw.indexOf('[')
                const lastArr = raw.lastIndexOf(']')
                if (firstArr !== -1 && lastArr !== -1 && lastArr > firstArr) {
                  try { data = JSON.parse(raw.slice(firstArr, lastArr + 1)) } catch (e) { /* ignore */ }
                }
                // try object fragment
                if (!data) {
                  const firstObj = raw.indexOf('{')
                  const lastObj = raw.lastIndexOf('}')
                  if (firstObj !== -1 && lastObj !== -1 && lastObj > firstObj) {
                    try { data = JSON.parse(raw.slice(firstObj, lastObj + 1)) } catch (e) { /* ignore */ }
                  }
                }
                if (!data) throw errJson
              }

              const bankName = path.basename(file, path.extname(file))

              // map rows to unified shape: support old and new formats
              const normalizeRowObject = (r) => {
                if (!r || typeof r !== 'object') return r
                const out = { ...r }
                // new-format: question -> title/titleText
                if (r.question && !r.title) out.title = r.question
                if (r.question && !r.titleText) out.titleText = r.question
                // options: keep as-is if array, or try to parse from string
                if (r.options && !Array.isArray(r.options) && typeof r.options === 'string') {
                  // try split by newline or semicolon
                  out.options = r.options.split(/\r?\n|;|\|/).map(s => s.trim()).filter(Boolean)
                }
                // answer/analysis/type/userName keep
                if (r.answer && !out.answer) out.answer = r.answer
                if (r.analysis && !out.analysis) out.analysis = r.analysis
                if (!out.answer && out.analysis) out.answer = out.analysis
                if (r.type && !out.type) out.type = r.type
                if (r.userName && !out.userName) out.userName = r.userName

                // auto add fillblank placeholders for （）、()、___ patterns
                const baseQuestion = out.titleText || out.title || out.question
                const buildFillText = (text) => {
                  if (!text || typeof text !== 'string') return text
                  // replace long underscores or spaces inside parentheses with <fillblank/>
                  let s = text
                  s = s.replace(/\(\s*_{2,}\s*\)/g, '(<fillblank/>)')
                  s = s.replace(/（\s*_{2,}\s*）/g, '（<fillblank/>）')
                  s = s.replace(/\(\s*\)/g, '(<fillblank/>)')
                  s = s.replace(/（\s*）/g, '（<fillblank/>）')
                  s = s.replace(/_{3,}/g, '<fillblank/>')
                  return s
                }
                const filled = buildFillText(baseQuestion)
                if (filled) {
                  // overwrite to ensure blanks显示为 <fillblank/>
                  out.titleText = filled
                  out.title = filled
                  out.question = filled
                }

                // also provide typeId mapping for compatibility
                const typeMapToId = (t) => {
                  if (!t) return undefined
                  const lower = String(t).toLowerCase()
                  if (lower.includes('single') || lower === 'a' || lower === '1' || lower === 'single_choice') return '1'
                  if (lower.includes('multiple') || lower === 'b' || lower === '2' || lower === 'multiple_choice') return '2'
                  if (lower.includes('true') || lower.includes('false') || lower === '3' || lower === 'true_false') return '3'
                  if (lower.includes('short') || lower.includes('answer') || lower === '4' || lower === 'short_answer') return '4'
                  return undefined
                }
                if (!out.typeId && out.type) out.typeId = typeMapToId(out.type)

                // enrich display with answers injected into blanks or appended
                const typeLower = ((out.type || out.typeId || '') + '').toLowerCase()
                const options = Array.isArray(out.options) ? out.options : []
                const answerTexts = normalizeAnswers(out.answer || out.analysis, options)

                const ensureTrailingBlank = (text) => {
                  if (!text || typeof text !== 'string') return text
                  if (text.includes('<fillblank/>')) return text
                  return `${text}（<fillblank/>）`
                }

                if (typeLower.includes('true') || typeLower === '3') {
                  const raw = (out.answer || out.analysis || '').toString().trim()
                  const yesVals = ['true', 't', 'y', 'yes', '1', '正确', '是']
                  const mark = yesVals.some((v) => v === raw.toLowerCase()) ? '√' : '×'
                  out.analysis = mark
                  out.titleText = ensureTrailingBlank(out.titleText)
                  out.title = ensureTrailingBlank(out.title)
                  out.question = ensureTrailingBlank(out.question)
                } else if (typeLower.includes('single') || typeLower === '1' || typeLower.includes('multiple') || typeLower === '2') {
                  // keep blanks for highlight; if none, add one at end
                  out.titleText = ensureTrailingBlank(out.titleText)
                  out.title = ensureTrailingBlank(out.title)
                  out.question = ensureTrailingBlank(out.question)
                  if (answerTexts.length) out.analysis = answerTexts.join(',')
                } else if (typeLower.includes('short') || typeLower === '4') {
                  const ans = (out.answer || out.analysis || '').toString().trim()
                  if (ans) out.analysis = ans
                  const addBlankLine = (text) => {
                    if (!text || typeof text !== 'string') return text
                    if (text.includes('<fillblank/>')) return text
                    return `${text}<br/>  <fillblank/>`
                  }
                  out.titleText = addBlankLine(out.titleText)
                  out.title = addBlankLine(out.title)
                  out.question = addBlankLine(out.question)
                }
                return out
              }

              const mapped = normalizeRows(data).map(normalizeRowObject)
              items = items.concat(withBankTag(mapped, bankName))
        } catch (err) {
          console.error(`Failed to load exam file ${file}:`, err)
        }
      })
    }

    if (!items.length && fs.existsSync(fallbackFile)) {
      const raw = fs.readFileSync(fallbackFile, 'utf8')
      const data = JSON.parse(raw)
      items = withBankTag(normalizeRows(data), '默认题库')
    }

    res.status(200).json({ success: true, items })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
}
