import fs from 'fs'
import path from 'path'

export default function handler(req, res) {
  const filePath = path.join(process.cwd(), 'data.json')
  try {
    const raw = fs.readFileSync(filePath, 'utf8')
    const data = JSON.parse(raw)
    const rows = Array.isArray(data.rows) ? data.rows : (Array.isArray(data) ? data : Object.values(data))
    res.status(200).json({ success: true, items: rows })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
}
