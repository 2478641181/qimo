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
          const raw = fs.readFileSync(filePath, 'utf8')
          const data = JSON.parse(raw)
          const bankName = path.basename(file, path.extname(file))
          items = items.concat(withBankTag(normalizeRows(data), bankName))
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
