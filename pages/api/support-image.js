import fs from 'fs'
import path from 'path'

export default function handler(req, res) {
  const candidates = [
    path.join(process.cwd(), 'img.jpg'),
    path.join(process.cwd(), 'public', 'img.jpg')
  ]
  let filePath = null
  for (const p of candidates) {
    try { if (fs.existsSync(p)) { filePath = p; break } } catch (e) {}
  }

  if (!filePath) {
    res.status(404).json({ success: false, error: 'support image not found' })
    return
  }

  try {
    const buffer = fs.readFileSync(filePath)
    res.setHeader('Content-Type', 'image/jpeg')
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
    res.status(200).end(buffer)
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
}
